---
id: data-consumer-driven-contract-tests
type: pattern
title: Consumer-Driven Contract Tests
summary: "Let consumers define executable expectations for the interfaces they actually use, then verify those expectations against provider changes before rollout."
status: published
aliases:
  - Consumer-Driven Contract Test
  - Consumer Driven Contract Test
  - Consumer-Driven Contract Testing
tags:
  - data-engineering
  - contracts-evolution
  - testing-testability
verses:
  - data-engineering
  - software-engineering
attribution: "Original Patternverse field-guide explanation and illustrative examples, revised around Ian Robinson's Consumer-Driven Contracts and official Pact guidance. Original stock-reader simulation and illustrations; sources are linked in the article."
---

## Purpose and problem

An inventory team renames `available` to `quantity`. Its API tests pass: the response contains an integer and the documentation matches. The replenishment pipeline fails that evening because its reader still expects `available`. The provider checked what it intended to supply; nobody checked what this consumer depended on.

Independent releases need early compatibility feedback without launching every service together. A provider schema alone cannot reveal which fields, units, errors, or request details consumers actually use. Consumer tests against an invented response cannot establish that a changing provider still supplies it.

## Core idea

**Exercise the consumer's expectations, then verify the same agreement against the provider.** A consumer-driven contract captures the interactions a particular consumer needs. Its tests establish that the actual client or handler can use those interactions; provider verification checks that the candidate implementation satisfies them.

Ian Robinson's [Consumer-Driven Contracts](https://martinfowler.com/articles/consumerDrivenContracts.html) makes consumer obligations visible to guide service evolution. **Consumer-Driven Contract Test**, **Consumer-Driven Contract Tests**, and **Consumer-Driven Contract Testing** name this testing mechanism in singular, plural, and process form. A general contract test need not be consumer-driven; the origin and validation of expectations matter. Consumers and providers still negotiate supportable obligations.

![The real stock reader runs against a controlled interaction and produces a versioned consumer contract. Separately, a verifier arranges provider state and calls the candidate inventory API with the same request. Its actual response is checked against that contract. Consumer success alone and provider success alone leave different evidence gaps.](../assets/data-engineering/consumer-driven-contract-tests.svg "Two checks share one agreement. Consumer execution grounds the expectations; provider verification checks the implementation intended for release. Neither check requires the other application to run alongside it.")

## How it works

### Keep both halves connected

The consumer team owns tests of its actual request generation and response interpretation. In [Pact's workflow](https://docs.pact.io/getting_started/how_pact_works), those tests use a controlled provider and produce a transferable interaction contract. Merely writing expected JSON independently on the provider side misses this connection.

The provider team owns state setup and verification. Arrange each scenario independently, invoke the candidate provider, and compare its actual response with the contract's matchers. Keep relevant request parsing, validation, and serialization in the exercised path. Replace downstream dependencies only below the boundary under examination.

Specify only meaningful obligations: an integer quantity, a recognized unit, an error status the reader handles. Additional unused fields should usually remain permissible. A type matcher cannot establish that a number means individual units rather than cases; semantic examples and provider functional tests still matter.

Record consumer and provider versions with verification results. Evaluate versions that will coexist, including supported older consumers. [Pact Broker's compatibility matrix](https://docs.pact.io/pact_broker/can_i_deploy) connects this evidence with recorded deployments or releases. Missing results mean unknown compatibility. Changed fixtures, stale artifacts, and unrecorded releases weaken that evidence.

## Worked example

### Required quantity, optional location

The existing stock-reader scenario uses SKU `S17`, an integer quantity, and unit `EA` for individual units. This complete standard-library Python 3 simulation runs with `python3 consumer_contract.py`. It serializes one contract after exercising the real reader, then verifies three candidate provider variants against it. Functions stand in for HTTP transport; this is not a Pact implementation or a live service test.

```python
import json


def read_stock(send, sku):
    status, body = send("GET", f"/stock/{sku}")
    data = json.loads(body)
    if status != 200 or data.get("sku") != sku:
        raise ValueError("unexpected stock response")
    if type(data.get("available")) is not int or data.get("unit") != "EA":
        raise ValueError("expected integer individual units")
    return data["available"]


def consumer_test():
    contract = {
        "consumer_version": "reader-3",
        "state": "S17 exists",
        "request": ["GET", "/stock/S17"],
        "status": 200,
        "example": {"sku": "S17", "available": 4, "unit": "EA"},
        "quantity_rule": "integer",
    }
    calls = []

    def controlled_provider(method, path):
        assert [method, path] == contract["request"]
        calls.append((method, path))
        return contract["status"], json.dumps(contract["example"])

    assert read_stock(controlled_provider, "S17") == 4
    assert len(calls) == 1
    return json.dumps(contract)


def inventory_api(method, path, rows, variant):
    if (method, path) != ("GET", "/stock/S17"):
        return 404, "{}"
    body = {"sku": "S17", "available": rows["S17"], "unit": "EA"}
    if variant == "added":
        body["zone"] = "A3"
    if variant == "renamed":
        body["quantity"] = body.pop("available")
    return 200, json.dumps(body)


def verify(serialized, variant):
    contract = json.loads(serialized)
    assert contract["state"] == "S17 exists"
    rows = {"S17": 7}  # Fresh provider state; quantity may vary.
    status, body = inventory_api(*contract["request"], rows, variant)
    actual = json.loads(body)
    assert status == contract["status"]
    assert contract["quantity_rule"] == "integer"
    assert type(actual.get("available")) is int
    for field in ("sku", "unit"):
        assert actual.get(field) == contract["example"][field]


if __name__ == "__main__":
    artifact = consumer_test()
    print("consumer: passed")
    for variant in ("original", "added", "renamed"):
        try:
            verify(artifact, variant)
        except AssertionError:
            print(variant + ": incompatible")
        else:
            print(variant + ": compatible")
```

Output: `consumer: passed`, `original: compatible`, `added: compatible`, and `renamed: incompatible`. The provider returns seven rather than the consumer example's four: the contract protects integer shape, not one incidental value. Adding `zone` passes; removing the required name fails. Exact `type` checking excludes Python booleans from this integer rule. No contract file is written and no broker or version gate is configured.

For shipment events, apply the same pairing to the actual message handler and production message-building path. An array changing into an object can break iteration despite retaining the information. Message contracts do not prove broker permissions, routing, delivery, ordering, or retries.

For warehouse data, preserve semantic obligations too. If an order dataset changes from one row per order to one per line, names and types may stay unchanged while `COUNT(*)` doubles. A fixture with a multi-line order and the consumer's actual reporting query can expose the changed grain. This uses a data-specific harness rather than Pact's HTTP machinery.

![For reader-3, an original provider response with available equal to seven and unit EA passes. Adding an unused zone field also passes. Renaming available to quantity fails. A separate version matrix shows reader-3 with provider-8 passing, reader-3 with provider-9 failing, and an unverified reader-4/provider-8 pair remaining unknown.](../assets/software-engineering/consumer-driven-contract-evidence.svg "Matching permits harmless extensions but protects required fields and units. The version matrix is an illustrative release-evidence example, separate from the runnable simulation; unknown is not a passing result.")

## When to use it

Use this pattern when identifiable teams release independently across APIs, events, files, or datasets, and interface misunderstandings repeatedly escape local tests. It helps when a shared integration environment is slow or unreliable but consumers can express stable requirements.

For components released together, direct integration tests may suffice. An uncontrolled public API may not accept your contracts; local compatibility checks remain useful, but cannot make its owner participate. Retain focused real-environment checks for configuration, authentication, and transport wiring.

## Tradeoffs and common mistakes

**Strictness has a cost.** Whole-payload snapshots turn unused fields into obligations; permissive matchers conceal dependencies. Cover meaningful nulls, errors, empty collections, and alternate shapes without copying the provider's entire functional suite into consumer contracts.

**Verification can bypass the defect.** Stubbing a response serializer or using a generic client instead of the application's reader leaves important code untested. Provider-state fixtures need isolation and cleanup; parallel runs must not mutate shared records accidentally. Contract artifacts need controlled access and sanitized examples, not customer secrets or live tokens.

**Compatibility evidence is bounded.** Green results cover known versions and tested interactions, not every workflow, business invariant, or operational property. Unknown consumers and stale contracts remain risks. Retire obsolete obligations deliberately; when a legitimate redesign cannot satisfy old consumers, agree on a migration or versioned interface instead of simply deleting failing tests.

## Related patterns

[[test-double|Test Double]] controls a collaborator during a focused test. Provider verification checks whether its agreed behavior remains representative of the actual provider.

[[data-explicit-data-contracts|Explicit Data Contracts]] express the wider agreement on meaning, ownership, freshness, and evolution; consumer-driven tests make selected dependencies executable.

[[data-tolerant-readers|Tolerant Readers]] accept permitted extensions. Matchers should preserve this tolerance while protecting required behavior.

[[data-compatibility-checks-in-delivery|Compatibility Checks in Delivery]] use verification evidence to gate relevant releases; these tests supply consumer-specific evidence.

## Sources

- Ian Robinson, [Consumer-Driven Contracts: A Service Evolution Pattern](https://martinfowler.com/articles/consumerDrivenContracts.html), 2006: original consumer-obligation and evolution pattern.
- Pact documentation: [How Pact works](https://docs.pact.io/getting_started/how_pact_works), [Writing consumer tests](https://docs.pact.io/consumer), [Verifying pacts](https://docs.pact.io/provider), and [Provider states](https://docs.pact.io/getting_started/provider_states): paired checks, matching scope, retained implementation paths, and isolated preconditions.
- Pact documentation: [Can I Deploy](https://docs.pact.io/pact_broker/can_i_deploy) and [Event-driven systems](https://docs.pact.io/implementation_guides/javascript/docs/messages): version evidence and message-testing boundaries.

The inventory, shipment, warehouse-grain, and matrix scenarios are original Patternverse teaching examples, expanded from the existing article. The Python program is a bounded illustration, not production contract-testing infrastructure.
