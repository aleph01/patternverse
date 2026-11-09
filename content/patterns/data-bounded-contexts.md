---
id: data-bounded-contexts
type: pattern
title: Bounded Context
summary: "Give each business model an explicit boundary for its terms and rules, then connect models through deliberate mappings rather than assuming shared meanings."
status: published
aliases:
  - Bounded Contexts
  - DDD Bounded Context
tags:
  - data-engineering
  - meaning-boundaries
  - domain-modeling
verses:
  - data-engineering
  - software-engineering
attribution: "Original Patternverse field-guide explanation and illustrative examples, revised around Eric Evans's Bounded Context pattern with authoritative sources linked below. Retains the Northstar, inventory, and API-federation contexts from the earlier article; Python code and new SVGs are original teaching material."
---

## Purpose and problem

A software business wants one customer table. Sales calls a customer active when the commercial relationship is established. Billing means that a payer has no overdue invoices. Service access means that a workspace's users can use the product.

Combining these interpretations into one `status` field creates contradictions. An overdue invoice for one division suddenly disables another division's workspace. Each team needs a precise model, but the models must still cooperate without pretending their concepts are identical.

## Core idea

A **Bounded Context** defines the scope within which a particular domain model and its language apply consistently. Inside that scope, people, rules, code, and data agree on what terms mean. Across boundaries, relationships and translations are deliberate.

The mental model is **coherent meaning within; explicit relationships between**. Evans's [DDD Reference, Bounded Context](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) connects the boundary with team organization, application usage, code, and schemas. [Fowler](https://martinfowler.com/bliki/BoundedContext.html) explains how familiar words can represent different concepts in different models.

A bounded context is not automatically a department, database, microservice, security boundary, or transaction boundary. A subdomain describes a part of the business problem; a context defines the applicability of a chosen model.

![Sales models commercial account AC-72 as an established relationship. Billing models payer BILL-19 as current and BILL-20 as overdue. Service Access models workspace WS-301 as enabled and funded by BILL-19. Identity mappings connect the models, while the funding relationship identifies which payer matters to the workspace.](../assets/software-engineering/bounded-context-meanings.svg "Northstar participates in three models. Mapped identities do not merge their states, and BILL-20's overdue condition does not define WS-301's access policy.")

## How it works

### Establish a usable scope

Identify where a concept, its identity, and its rules can be used without repeatedly correcting their meaning. Work with domain experts on operations and examples, not just a glossary or a diagram of boxes. Give responsibility for the model, its changes, and its published interfaces to identifiable people.

Microsoft's [domain-analysis guidance](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis) places contexts before tactical models and service design. Its [service-boundary guidance](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/microservice-boundaries) adds operational constraints when choosing deployment units. One process can contain several contexts; one context can require several cooperating services.

### Map relationships instead of equating names

In the retained Northstar example, Sales account AC-72 corresponds to two Billing payers. Workspace WS-301 is funded by BILL-19. Joining on company name and copying BILL-20's status into the workspace loses that relationship.

A context map records the relationships and responsibilities between models. It should distinguish who supplies information, who depends on it, and who owns translation. A mapping may be one-to-many, incomplete, or time-dependent; a matching identifier alone does not establish shared lifecycle or ownership.

An [Anti-Corruption Layer](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer) can translate external semantics while protecting the receiving model. A small integration may need only a focused function. Translation must preserve uncertainty: missing mappings need an unresolved outcome or error, rather than a guessed identity.

### Keep facts, policies, and timing explicit

Billing supplies a payment condition; Access decides its consequence for product use. The teaching policy below requests review when the funding payer becomes overdue. It does not automatically suspend access. Other businesses may choose different rules.

The boundary provides no delivery, ordering, or synchronization guarantee. A delayed notice may be acceptable for reporting but unsuitable for a time-sensitive access decision. Production integration needs contracts for freshness, revisions, retries, corrections, and effective-dated mappings. Cross-context invariants require an explicit coordination protocol or a reconsidered model boundary.

![A published BillingCondition for BILL-19 and a workspace funded by BILL-19 enter Access-owned interpretation. A current condition means keep current access; an overdue condition means review access. The function rejects mismatched or unresolved payer mappings and never directly changes the workspace's enabled state.](../assets/software-engineering/bounded-context-translation.svg "The receiving context owns the interpretation. Billing's overdue state becomes a request for access review, not a copied access status.")

## Worked example

### Translate a published condition into a local assessment

Before separation, callers assigned a universal customer status. Afterward, Billing publishes a small contract and Access interprets it using an explicit funding relationship. Importing that contract does not require sharing either context's internal entity model.

Save these three files together and run `python3 demo.py` using Python 3.10 or later. IDs are nonblank opaque text; payment states use the exact vocabulary `current` and `overdue`. An absent funding mapping is represented by `None`.

**billing.py — the published payment-condition contract**

```python
from dataclasses import dataclass


def require_id(value):
    if type(value) is not str or not value.strip():
        raise ValueError("Nonblank ID required")


@dataclass(frozen=True)
class BillingCondition:
    payer_id: str
    payment_state: str

    def __post_init__(self):
        require_id(self.payer_id)
        if type(self.payment_state) is not str or self.payment_state not in ("current", "overdue"):
            raise ValueError("Unknown payment state")
```

**access.py — a different model and an explicit interpretation**

```python
from dataclasses import dataclass
from billing import BillingCondition


def require_access_id(value):
    if type(value) is not str or not value.strip():
        raise ValueError("Nonblank access ID required")


@dataclass(frozen=True)
class Workspace:
    workspace_id: str
    funding_payer_id: str | None
    enabled: bool

    def __post_init__(self):
        require_access_id(self.workspace_id)
        if self.funding_payer_id is not None:
            require_access_id(self.funding_payer_id)
        if type(self.enabled) is not bool:
            raise TypeError("Enabled must be Boolean")


def assess_access(workspace, condition):
    if type(workspace) is not Workspace or type(condition) is not BillingCondition:
        raise TypeError("Workspace and BillingCondition required")
    if workspace.funding_payer_id is None:
        raise ValueError("Funding mapping unresolved")
    if workspace.funding_payer_id != condition.payer_id:
        raise ValueError("Funding payer mismatch")
    return "review_access" if condition.payment_state == "overdue" else "keep_current_access"
```

**demo.py — related identities, independent meanings**

```python
from billing import BillingCondition
from access import Workspace, assess_access


workspace = Workspace("WS-301", "BILL-19", True)
print("current:", assess_access(workspace, BillingCondition("BILL-19", "current")))
print("overdue:", assess_access(workspace, BillingCondition("BILL-19", "overdue")))
print("still enabled:", workspace.enabled)
try:
    assess_access(workspace, BillingCondition("BILL-20", "overdue"))
except ValueError as error:
    print("wrong payer:", error)
try:
    assess_access(Workspace("WS-unknown", None, True), BillingCondition("BILL-19", "current"))
except ValueError as error:
    print("unmapped:", error)
# current: keep_current_access
# overdue: review_access
# still enabled: True
# wrong payer: Funding payer mismatch
# unmapped: Funding mapping unresolved
```

The correct payer's condition produces an Access action. The other division's notice is rejected. Unresolved identity remains an error. Neither assessment mutates the workspace or grants, revokes, or persists permissions.

[Python's frozen dataclasses](https://docs.python.org/3/library/dataclasses.html#frozen-instances) protect these immutable snapshots through normal API use. They do not verify producer authority or freshness. This single-process example has no invoice calculation, transport, version handling, historical crosswalk, database, or concurrency protocol.

### Different models need not contradict the same fact

A warehouse reports twelve units on hand while Order Capture reports seven available to promise after five reservations. These are different measurements for different decisions. They still need an agreement about reservations, damaged stock, and timing. Two systems claiming different physical counts at the same instant have a discrepancy to investigate.

The retained [Salesforce API-federation example](https://engineering.salesforce.com/api-federation-growing-scalable-api-landscapes-a0f1f0dad506/) demonstrates coherence within a context through semantics, entity identifiers, and compatible schemas. It does not require identical schemas or one universal enterprise model.

## When to use it

Use bounded contexts when vocabulary conflicts recur, related concepts need different identities or rules, or an external model would otherwise dictate local decisions. Explicit boundaries help teams evolve those models deliberately.

One small team with a coherent model may need no further split. A module boundary or a few clearer names can be sufficient. Contexts should emerge from meaningful differences, not from creating a separate model for every noun.

## Tradeoffs and common mistakes

**Translation becomes work.** Separate models require mappings, interface tests, documentation, and ownership. Copied data introduces delay, reconciliation, and deletion policies.

**Boxes without coherence.** Separate services that still share one unrestricted entity model have not established independent meanings. Conversely, compatible models need not be split merely to match an organization chart.

**A boundary mistaken for enforcement.** Authorization, atomic updates, and reliable delivery need their own mechanisms. A context name does not supply isolation.

**Analytics flattening meanings.** An enterprise customer dimension can be useful when its identity and scope are explicit. Local states must remain identifiable instead of becoming a misleading global flag.

## Related patterns

[[domain-model|Domain Model]] expresses business behavior and state. Bounded Context defines where that model and its language apply.

[[aggregate|Aggregate]] protects invariants within a transactional consistency boundary. A bounded context usually contains several aggregates and is a different scale of boundary.

[[data-identity-crosswalks|Identity Crosswalks]] represent explicit links between identifiers without assuming their concepts, cardinalities, or histories are identical.

[[data-explicit-data-contracts|Explicit Data Contracts]] publish meaning and delivery expectations across a boundary. A contract complements local model ownership rather than eliminating it.

## Sources

Evans's [DDD Reference, printed page 2](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) establishes Bounded Context; its Context Map section explains relationships. Fowler, Microsoft, Salesforce Engineering, and Python documentation linked above support the modeling, integration, and implementation details.

The Northstar and inventory scenarios are retained original Patternverse teaching examples. The code and revised illustrations are original additions, not a production billing or authorization system.
