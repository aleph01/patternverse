---
id: externalized-authorization
type: pattern
title: Externalized Authorization
summary: Move access-decision policy behind a dedicated decision interface while keeping enforcement beside every protected operation.
status: published
tags:
  - software-engineering
  - security
  - authorization
verses:
  - software-engineering
attribution: "Externalized authorization terminology: OpenID Foundation AuthZEN; decision/enforcement architecture: OASIS XACML, Open Policy Agent, and AWS Prescriptive Guidance. Original Patternverse report-service example, bounded Python model, and native illustrations."
---

## Purpose and problem

A report platform checks tenant access in three places. The web handler compares account identifiers, an export worker checks a role name, and a new API copies an older version of the rule. A contractor’s access changes, but only one implementation is updated. The same person receives different answers depending on the route.

The services need consistent access rules while retaining control over their own data and operations. Copying permission helpers preserves duplication; moving business processing into one privileged service creates an unnecessarily broad boundary.

## Core idea

**Separate deciding access from enforcing the decision.** A **policy decision point (PDP)** evaluates policy against a request and relevant facts. A **policy enforcement point (PEP)** guards the resource operation, requests a decision, and applies the result.

The OpenID Foundation’s AuthZEN work describes externalized authorization through this family of policy components. OASIS XACML specifies their responsibilities; Open Policy Agent supplies a concrete decision-engine example. “External authorization” commonly names an integration interface. RBAC, ABAC, and relationship-based access control describe policy models, not where decisions run.

Think **ask the policy engine; guard the operation locally**. Externalized means separated from business logic and independently governed. It does not require a network call: a local engine, sidecar, or remote service can fill the decision role.

![A resource handler builds a decision request from a trusted subject and report metadata, sends it to a separate policy engine, and receives a decision with query binding, policy version, and obligations. The same handler validates and enforces that response before reading a protected body. Missing, denied, unusable, or failed decisions never reach the body read.](../assets/software-engineering/externalized-authorization-boundary.svg "The arrows distinguish a decision request, a decision response, and the guarded resource operation. The repeated handler steps are the same enforcement point. The policy engine returns a decision; the handler must enforce its limits.")

## How it works

### Assign ownership to policy, facts, and enforcement

Policy administrators own rule changes and their approval process. Attribute sources supply authoritative facts. XACML calls these roles the policy administration point and policy information point. The PDP evaluates the resulting policy and context; the PEP owns the controlled operation.

Authenticate the subject before building the query. Obtain resource ownership and classification from trusted metadata, not a request parameter that lets callers assign themselves another tenant. Define the action precisely: permission to read a report need not permit exporting, deleting, or sharing it.

Protect the decision interface, policy distribution, and attribute sources. For a remote engine, authenticate the service channel and restrict who can change rules or submit privileged context. A correctly evaluated rule cannot repair fabricated facts or an unguarded storage path.

### Bind the answer to the operation

Use an explicit decision contract. Distinguish policy denial from evaluation failure, missing data, and malformed responses. This article chooses a deny-biased contract: only a usable, explicit permit reaches the operation. If a permit requires masking or another obligation, the handler must perform it or refuse access. XACML’s deny-biased PEP makes this requirement explicit.

The checked subject, action, resource, and relevant attributes must describe what is actually used. Ownership changes between checking and reading require suitable transactions, version checks, locking, or stable resource handles. Request/response correlation alone does not solve that race.

AWS documents centralized, distributed, and library-based PDP arrangements. Local evaluation reduces network dependency but requires controlled distribution of policies and data. A reported policy version identifies the evaluation; it does not prove every instance is current. Define rollout and revocation expectations.

Caching creates another lifetime: a previously allowed decision can outlive a changed grant. Include all decision-relevant context in cache identity, and explicitly bound acceptable staleness. Deadlines, capacity limits, and bounded failure handling also belong in the integration. Never let an outage silently become permission.

## Worked example

### One policy module, a guarded report service

The platform replaces copied tenant rules with one decision interface. The policy module permits Alice to read North’s reports. The service supplies each report’s tenant from its own metadata and retains the report bodies. A trusted policy update revokes Alice without editing the service.

Save these two Python 3 files together and run `python3 demo.py`. This is a sequential, in-process responsibility model. `alice` stands for an already authenticated subject. The policy grant set and report metadata are trusted configuration. Tuple queries and dictionary replies are an illustrative contract, not XACML, AuthZEN, or an OPA wire protocol.

`policy.py` owns the decision rule and its revision:

```python
class Policy:
    def __init__(self):
        self.grants = frozenset({("alice", "read", "north")})
        self.version = 1

    def evaluate(self, query):
        subject, action, resource, tenant = query
        return {"allow": (subject, action, tenant) in self.grants,
                "query": query, "version": self.version,
                "obligations": []}

    def revoke(self, subject):
        self.grants = frozenset(g for g in self.grants if g[0] != subject)
        self.version += 1
```

`demo.py` owns enforcement and the protected body read:

```python
from policy import Policy


class Reports:
    def __init__(self, decide):
        self.decide = decide
        self._tenants = {"R1": "north", "R2": "south"}
        self._bodies = {"R1": "north totals", "R2": "south totals"}

    def read(self, subject, resource):
        if any(type(v) is not str or not v for v in (subject, resource)):
            raise PermissionError("not permitted")
        tenant = self._tenants.get(resource)
        if tenant is None:
            raise PermissionError("not permitted")
        query = (subject, "read", resource, tenant)
        reply = self.decide(query)
        if (type(reply) is not dict
                or set(reply) != {"allow", "query", "version", "obligations"}
                or type(reply["query"]) is not tuple or reply["query"] != query
                or reply["allow"] is not True
                or type(reply["version"]) is not int or reply["version"] < 1
                or type(reply["obligations"]) is not list or reply["obligations"]):
            raise PermissionError("not permitted")
        return self._bodies[resource]


if __name__ == "__main__":
    policy = Policy()
    reports = Reports(policy.evaluate)

    def show(label, service, resource):
        try:
            print(label, service.read("alice", resource))
        except PermissionError:
            print(label, "denied")
        except TimeoutError:
            print(label, "unavailable")

    show("own", reports, "R1")
    show("cross", reports, "R2")
    policy.revoke("alice")
    show("revoked", reports, "R1")

    def offline(query):
        raise TimeoutError("decision deadline expired")

    show("offline", Reports(offline), "R1")
```

The four lines are `own north totals`, `cross denied`, `revoked denied`, and `offline unavailable`. Policy version 1 allows the first read and denies the cross-tenant read. Version 2 denies Alice after revocation. The timeout propagates before any body retrieval; it is an operational failure, not a policy-denial explanation.

The service requires Boolean `True`, a matching query, a positive integer version, and no obligations. Thus a truthy string or a permit requiring unsupported masking cannot release a body. This is deliberately a small supported contract; production adapters must interpret their actual protocol correctly.

The model implements no deadline timer, network authentication, durable policy distribution, cache, process isolation, or concurrent check/use protection. An echoed query is neither a signature nor freshness proof. The callback must represent a trusted engine, and real enforcement must cover alternate access paths.

![Four evaluations show enforcement outcomes. Under policy version 1, Alice’s R1 request is allowed and reads North’s body; R2 is denied without a body read. After revocation, version 2 denies R1. An unavailable decision service produces no response and no body read. Unsupported obligations also block an otherwise permitted read.](../assets/software-engineering/externalized-authorization-decisions.svg "Policy denial and decision-service failure have different operational meanings, but neither releases a body here. Policy revisions label evaluations; they do not prove fleet-wide freshness or make old cached permits safe.")

## When to use it

Use this separation when multiple services repeatedly implement the same access rules, policy ownership differs from application ownership, or decisions need consistent review and evidence across entry points.

For one small application with stable rules, a well-tested local authorization module may suffice. A remote PDP is an additional deployment choice, with additional availability and latency costs.

## Tradeoffs and common mistakes

Schema and policy changes can break clients even when business APIs remain stable. Test representative permit, deny, missing-fact, error, and obligation cases before rollout. Record useful decision context and policy versions without logging credentials or entire sensitive documents.

Common mistakes include trusting client attributes, treating every nonempty response as permission, caching too broadly, and ignoring obligations. Fail-open behavior must be examined explicitly: Envoy documents a `failure_mode_allow` option that can admit requests when its authorization service fails. Externalization alone does not choose safe failure semantics or guarantee consistent enforcement.

## Related patterns

[[data-policy-as-code|Policy as Code]] concerns machine-evaluable, versioned rules. Externalized Authorization concerns the decision/enforcement boundary; neither requires the other to be a remote service.

[[reference-monitor|Reference Monitor]] requires complete, protected mediation. A PDP can support that design, but its correct answer is insufficient if a PEP can be bypassed.

[[federated-identity|Federated Identity]] supplies verified identity evidence from another provider. It does not decide every application-specific resource permission.

[[gatekeeper|Gatekeeper]] separates exposed request handling from private execution. Its screening role can contain a PEP, while deeper resource operations may require their own enforcement.

## Sources

- [OpenID Foundation: AuthZEN](https://openid.net/wg/authzen/) — externalized authorization terminology and policy-component architectures.
- [OASIS: XACML 3.0 Standard](https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html) — PDP/PEP/PAP/PIP roles and deny-biased enforcement with obligations, section 7.2.2.
- [Open Policy Agent: Introduction](https://www.openpolicyagent.org/docs) — separation of policy decisions from application enforcement.
- [AWS: Design models for OPA](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/using-opa.html) — centralized, distributed, and library-based deployment choices.
- [Envoy: External authorization configuration](https://www.envoyproxy.io/docs/envoy/v1.38.6/api-v3/extensions/filters/http/ext_authz/v3/ext_authz.proto) — explicit fail-open configuration and error behavior.

The report scenario, Python contract, program, and diagrams are original teaching material.
