---
id: gatekeeper
type: pattern
title: Gatekeeper
summary: Screen public requests in a limited-privilege tier that forwards a narrow contract to private services holding the data access and business authority.
status: published
tags:
  - software-engineering
  - security
  - trust-boundaries
verses:
  - software-engineering
attribution: "Gatekeeper pattern: Microsoft Azure Architecture Center. Original Patternverse label-preview example, bounded Python simulation, and native illustrations."
---

## Purpose and problem

A shipping application exposes label previews to customers. Its public endpoint parses arbitrary request bodies in the same environment that holds order-storage credentials. A parsing vulnerability could therefore expose much more than the preview operation. Moving validation into a helper function improves organization, but leaves the same privileges available to compromised endpoint code.

The application needs to accept untrusted traffic while keeping powerful operations and credentials out of the exposed tier. It also needs a useful contract: rejecting everything protects storage but serves no customers.

## Core idea

**Gatekeeper separates public request screening from private business execution.** A restricted front tier admits a small, validated request vocabulary; a separately protected service performs the operation with its own authority.

Microsoft’s architecture catalog establishes this pattern as a dedicated validation façade with limited privileges and private back ends. Its defining move is the separation of exposure and privilege, rather than merely adding a gateway-shaped box.

Think **untrusted bytes → restricted admission → private operation**. A gatekeeper may authenticate clients, reject malformed input, or enforce coarse admission rules. It should not become the application’s business engine.

![Public clients reach a limited-privilege gatekeeper, which screens requests and forwards only the fixed label-preview operation over an authenticated internal channel. A separate private service owns authorization and order access. Only that service reaches the order store; the gatekeeper has no storage credentials or direct storage route.](../assets/software-engineering/gatekeeper-boundary.svg "The deployed boundary separates exposure from privilege. A private address alone is insufficient: restrict reachable operations, authenticate the service hop, and keep storage authority out of the public tier.")

## How it works

### Separate the privileges, not just the files

Deploy the public adapter with permission to invoke only the intended internal operation. Keep storage credentials, administrative endpoints, and unrestricted outbound destinations unavailable to it. Separate runtime identities and compute boundaries make that restriction enforceable; two classes in one interpreter do not.

The gatekeeper owns transport-level admission and conversion to the internal contract. The private service owns business decisions and data access. Agree on exact fields, types, size limits, errors, and versions. Reject ambiguous or unexpected input instead of “sanitizing” it into an unintended operation. Forward selected fields, not arbitrary headers, URLs, queries, or caller-supplied identity claims.

### Preserve authority across the hop

The back end must distinguish the calling service from the end user. An authenticated gatekeeper connection proves which workload connected, not which customer is entitled to an order. Verify the user context through the chosen authentication protocol and authorize the specific operation against current authoritative state.

OWASP’s authorization guidance supports least privilege, default denial, and permission checks on every request. A compromised gatekeeper can still abuse whatever internal capability it legitimately has. Restrict that capability, and retain necessary authorization inside the trusted service. This architecture reduces exposure; it does not make the public tier harmless after compromise.

Policy changes and in-flight operations need defined semantics. An admission check can precede an ownership transfer; the service must decide using the state required by its operation. For asynchronous handoff, specify identity lifetime, queue permissions, and when authorization is evaluated. “Previously admitted” is not perpetual permission.

Bound request bodies while reading them, bound internal concurrency, and give calls deadlines. Reject or report failure when required validation or the internal service is unavailable. Bypassing the private path during an outage defeats the boundary. Additional hops and replicated gatekeepers introduce latency, capacity, configuration consistency, and operational costs.

## Worked example

### A narrow label-preview contract

The original endpoint accepts a general document and reads orders itself. The revised endpoint accepts only `order_id` and `copies`, then calls a fixed preview operation. The private service independently checks order ownership and its three-copy business limit. The public schema permits up to ten copies, making the distinction between valid syntax and an authorized operation visible.

This Python 3 program is a **bounded behavioral simulation** of those responsibilities. `alice` represents a principal already verified by trusted infrastructure, never a field extracted from the submitted JSON. The function call stands in for a protected service channel. It supplies no authentication, process isolation, network policy, or credential protection.

Save as `gatekeeper.py` and run `python3 gatekeeper.py`. The input limit is 128 UTF-8 bytes; copies are a count. The output describes a preview, not printed labels or a durable submission.

```python
import json
import re
from dataclasses import dataclass


class Rejected(ValueError):
    pass


@dataclass(frozen=True)
class Preview:
    order_id: str
    copies: int


def unique_fields(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise Rejected("duplicate field")
        result[key] = value
    return result


def admit(raw, forward):
    if type(raw) is not bytes or not 1 <= len(raw) <= 128:
        raise Rejected("body size or type")
    try:
        data = json.loads(raw.decode("utf-8"),
                          object_pairs_hook=unique_fields)
    except (ValueError, UnicodeError) as error:
        raise Rejected("invalid JSON") from error
    if type(data) is not dict or set(data) != {"order_id", "copies"}:
        raise Rejected("unexpected shape")
    order, copies = data["order_id"], data["copies"]
    if (type(order) is not str or not re.fullmatch(r"O[0-9]{3}", order)
            or type(copies) is not int or not 1 <= copies <= 10):
        raise Rejected("invalid fields")
    return forward(Preview(order, copies))


class LabelService:
    def __init__(self):
        self._owners = {"O100": "alice", "O200": "bob"}

    def preview(self, principal, request):
        if (type(request) is not Preview
                or type(request.order_id) is not str
                or type(request.copies) is not int
                or not 1 <= request.copies <= 3
                or type(principal) is not str
                or self._owners.get(request.order_id) != principal):
            raise PermissionError("not permitted")
        return f"{request.order_id} x{request.copies}"


if __name__ == "__main__":
    service = LabelService()
    forward = lambda request: service.preview("alice", request)
    cases = [
        ("accepted", b'{"order_id":"O100","copies":2}'),
        ("extra-field", b'{"order_id":"O100","copies":2,"owner":"alice"}'),
        ("boolean", b'{"order_id":"O100","copies":true}'),
        ("quota", b'{"order_id":"O100","copies":4}'),
        ("other-owner", b'{"order_id":"O200","copies":1}'),
    ]
    for label, raw in cases:
        try:
            print(label, admit(raw, forward))
        except Rejected:
            print(label, "rejected")
        except PermissionError:
            print(label, "denied")
```

The five lines are `accepted O100 x2`, `extra-field rejected`, `boolean rejected`, `quota denied`, and `other-owner denied`. The two malformed requests never reach `forward`. The two well-formed but unauthorized requests reach the service and are denied there. In Python, booleans are integer subclasses; the exact type check deliberately prevents `true` becoming one copy.

Duplicate JSON fields are rejected using the decoder’s pair hook. The byte limit precedes parsing, but the simulator receives an already assembled body; a real server must also limit ingestion. The frozen transfer value avoids sharing a mutable request dictionary. Neither immutability nor an underscore on `_owners` establishes a security boundary.

![Five requests divide into three outcomes: a two-copy preview for Alice’s O100 order is admitted and allowed; an extra owner field and boolean copy count are rejected before forwarding; four copies and another owner’s order pass admission but are denied by the private service.](../assets/software-engineering/gatekeeper-decisions.svg "Admission and business authorization answer different questions. A valid request may still be denied; a blocked request must not reach the service. These are simulator outcomes, not proof of deployment isolation.")

## When to use it

Use Gatekeeper when exposed parsing and protocol handling should have less authority than the operation behind them. Sensitive back ends, incompatible public/internal contracts, and an independently maintained ingress tier are recognizable signals.

If platform controls already enforce the needed isolation and request contract, another custom tier may add little. A small application still needs authorization, but does not automatically need another service.

## Tradeoffs and common mistakes

The gatekeeper becomes an availability and maintenance dependency. Keep instances and contract versions compatible, observe rejects separately from business denials, and avoid logging credentials or complete sensitive bodies.

Common mistakes include giving ingress the same storage role as the back end, exposing an alternate public back-end route, forwarding a caller-selected destination, and trusting an `owner` header because it arrived internally. Generic content filtering does not replace operation-specific validation or parameterized data access.

## Related patterns

[[reference-monitor|Reference Monitor]] states stronger whole-boundary requirements, including complete mediation and tamper protection. Gatekeeper is a deployment arrangement that may contribute to those requirements.

[[facade|Facade]] simplifies access to a subsystem. Gatekeeper adds an explicit exposure and privilege boundary; a façade alone need not provide isolation.

[[proxy|Proxy]] mediates access through a representative interface. Gatekeeper may deliberately narrow the public contract instead of preserving the back-end interface.

[[data-workload-isolation|Bulkhead]] isolates capacity and failures. Separating resource pools can protect the ingress path, but capacity isolation and access authority are different decisions.

## Sources

- [Microsoft Azure Architecture Center: Gatekeeper](https://learn.microsoft.com/en-us/azure/architecture/patterns/gatekeeper) — established cloud pattern, limited privileges, private services, and deployment tradeoffs.
- [OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — least privilege, default denial, authoritative checks, and safe failure.
- [Python: JSON decoder](https://docs.python.org/3/library/json.html) — untrusted-input limits and `object_pairs_hook`.
- [OPA Gatekeeper: Introduction](https://open-policy-agent.github.io/gatekeeper/website/docs/) — a separately named Kubernetes policy-enforcement product, not an alias for this architectural pattern.

The label-preview scenario, contract, simulation, and diagrams are original teaching material.
