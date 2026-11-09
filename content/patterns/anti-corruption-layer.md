---
id: anti-corruption-layer
type: pattern
title: Anti-Corruption Layer
summary: Protect a local domain model by translating an external system's concepts, operations, and failures through an interface expressed in the local model's own terms.
status: published
aliases:
  - Anticorruption Layer
  - Anti Corruption Layer
  - ACL
tags:
  - software-engineering
  - messaging
  - integration
  - domain-modeling
verses:
  - software-engineering
attribution: "Anticorruption Layer: Eric Evans, Domain-Driven Design and DDD Reference. Supporting Microsoft Azure Architecture Center, AWS Prescriptive Guidance, and Martin Fowler. Original Patternverse supplier-availability example, code, and native illustrations."
---

## Purpose and problem

A shop integrates with a supplier whose inventory record has `record_status: "A"` and `quantity: 10`. Developers start treating “active” as “available for sale.” But the supplier means only that the record is operational: seven units are committed elsewhere and two are damaged. Only one unit is sellable.

Soon checkout contains supplier status codes, stock arithmetic, and vendor exception handling. The shop's model is being shaped by another system's concepts instead of the shop's own requirements.

## Core idea

An **Anti-Corruption Layer** presents external capabilities through a locally defined contract, translating requests, results, and failures so foreign concepts do not spread through local business code.

Think **use their capability through our language**. Eric Evans's [DDD Reference, Anticorruption Layer](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf#page=41) describes an isolating layer that provides upstream functionality in the downstream model's terms. Anticorruption Layer is the original spelling; ACL is common shorthand. Here ACL means this integration pattern, not a security access-control list.

An upstream model can fit its work. “Corruption” means unwanted influence on another model, not proof of bad data, malicious behavior, or poor software.

![The shop asks availability for local SKU-42. A shop-owned Anti-Corruption Layer maps it to supplier ITEM-9 and calls the supplier lookup. The supplier's active record reports quantity 10, committed 7, and damaged 2. The layer returns a local Availability with one sellable unit; the shop's own model decides whether a request for two units can be supplied.](../assets/software-engineering/anti-corruption-layer-model.svg "The boundary translates capability and meaning. Supplier active status does not become local availability, and the local supply rule remains in the domain model.")

## How it works

### Let the protected model define the interface

Define local needs before adapting the external API. `availability(sku)` returns a local concept, not a renamed supplier response with unexplained codes.

The layer owns the integration vocabulary, identity mappings, conversions, and normalized failures. It can use adapters, facades, and message translators internally. [Microsoft's guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer) emphasizes semantic isolation and permits either an application component or a separate service. A network hop is not required.

Keep local business policy with its owner. The layer interprets supplier quantities as sellable stock under a declared contract; the domain decides whether that amount satisfies a requested quantity. It should not become a general workflow engine or a second business model hidden in integration code.

### Translate meaning without inventing facts

Local and external identifiers need an explicit relationship. Equal labels or product descriptions do not establish identity. Unknown mappings and unsupported external states should remain unresolved rather than becoming guessed local facts.

The arithmetic below assumes one coherent supplier snapshot and disjoint committed and damaged quantities, both included in total quantity. Without that agreement, subtracting both could double-count exclusions. [Fowler's Bounded Context explanation](https://martinfowler.com/bliki/BoundedContext.html) shows why shared words can conceal different concepts.

The boundary also translates failure meaning. “Could not retrieve stock” is not “zero stock.” A timeout on a write likewise does not prove the external operation failed; retry safety needs its own contract.

### Own the operational boundary

A successful translation adds no freshness, reservation, ordering, or cross-system transaction guarantee. Reads can become stale before checkout acts. A real supply commitment requires an allocation operation or another explicit consistency protocol.

Set timeouts, bound work, define cache validity, and decide who closes clients and connections. Validate external payloads and authorize operations; conceptual isolation is not authentication or a security sandbox. Retain diagnostic provenance without exposing credentials or whole sensitive payloads.

[AWS guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/acl.html) discusses latency, scaling, monitoring, team dependencies, and migration lifetime. Assign an owner to the layer and decide whether it is a lasting boundary or temporary migration support.

## Worked example

### Active records are not sellable stock

Previously checkout tested the supplier's `A` code. Now local code receives an `Availability` value. Save the three files together and run `python3 demo.py` with Python 3.10+; no packages are required. Quantities are nonnegative integer **units of one SKU**, and requests must be positive integer units. The gateway returns a decoded six-field version-1 dictionary; missing or extra fields are rejected.

**domain.py — the protected model knows no supplier codes**

```python
from dataclasses import dataclass


class StockUnavailable(Exception):
    pass


@dataclass(frozen=True)
class Availability:
    sku: str
    sellable_units: int

    def __post_init__(self):
        if type(self.sku) is not str or not self.sku.strip():
            raise ValueError("Local SKU required")
        if type(self.sellable_units) is not int or self.sellable_units < 0:
            raise ValueError("Nonnegative integer stock required")

    def can_supply(self, requested_units):
        if type(requested_units) is not int or requested_units <= 0:
            raise ValueError("Positive integer request required")
        return self.sellable_units >= requested_units
```

**boundary.py — isolate the external contract**

```python
from domain import Availability, StockUnavailable


class SupplierStockACL:
    def __init__(self, gateway, sku_map):
        self.gateway = gateway
        self.sku_map = dict(sku_map)

    def availability(self, sku):
        if type(sku) is not str or not sku.strip():
            raise ValueError("Local SKU required")
        external = self.sku_map.get(sku)
        if type(external) is not str or not external.strip():
            raise StockUnavailable("No supplier mapping")
        try:
            row = self.gateway.lookup(external)
        except TimeoutError as error:
            raise StockUnavailable("Supplier unavailable") from error
        fields = {"version", "item", "record_status", "quantity", "committed", "damaged"}
        if type(row) is not dict or set(row) != fields:
            raise StockUnavailable("Unusable supplier response")
        if (type(row["version"]) is not int or row["version"] != 1
                or row["item"] != external or row["record_status"] != "A"):
            raise StockUnavailable("Unsupported supplier record")
        counts = [row[k] for k in ("quantity", "committed", "damaged")]
        if any(type(n) is not int or n < 0 for n in counts):
            raise StockUnavailable("Invalid supplier quantities")
        sellable = counts[0] - counts[1] - counts[2]
        if sellable < 0:
            raise StockUnavailable("Inconsistent supplier quantities")
        return Availability(sku, sellable)
```

**demo.py — local decisions, distinct uncertainty**

```python
from domain import StockUnavailable
from boundary import SupplierStockACL


class SupplierStub:
    def __init__(self, fail=False):
        self.fail = fail

    def lookup(self, item):
        if self.fail:
            raise TimeoutError("Supplier did not answer")
        return dict(version=1, item=item, record_status="A",
                    quantity=10, committed=7, damaged=2)


mapping = {"SKU-42": "ITEM-9"}
stock = SupplierStockACL(SupplierStub(), mapping).availability("SKU-42")
print("sellable units:", stock.sellable_units)
print("can supply 1:", stock.can_supply(1))
print("can supply 2:", stock.can_supply(2))
try:
    SupplierStockACL(SupplierStub(fail=True), mapping).availability("SKU-42")
except StockUnavailable as error:
    print("lookup:", error)
# sellable units: 1
# can supply 1: True
# can supply 2: False
# lookup: Supplier unavailable
```

The local module imports only the standard library. Supplier fields and exceptions stay in the boundary, which depends on local definitions. Copying the mapping at construction prevents later changes to the caller's dictionary from silently changing this instance's identity relationship.

A mismatch, unknown status, or inconsistent quantity raises a local integration failure instead of fabricating stock. The example translates only `TimeoutError`; a real gateway needs an explicit error taxonomy rather than treating every programming bug as an outage. The stub performs no network access. Client lifecycle, synchronization, authorization, mapping updates, freshness checks, retries, and atomic reservation are outside this model.

![A valid supplier snapshot with quantity 10, committed 7, and damaged 2 yields one sellable unit; a request for two is false under the local rule. A timeout yields StockUnavailable, not a zero-stock Availability. An unmapped local SKU fails before calling the supplier. These outcomes do not reserve or change stock.](../assets/software-engineering/anti-corruption-layer-outcomes.svg "Insufficient stock is a known local result. Missing evidence is an integration failure, and must not be disguised as a business fact.")

### During a gradual migration

A monolith can retain its contract while an Anti-Corruption Layer redirects a capability to a new service. The AWS example demonstrates this direction: model protection is not limited to new applications calling old systems. Retire temporary code once callers no longer need it; keep enduring model boundaries.

## When to use it

Use it when an external or independently owned model would otherwise dictate local concepts, changes cannot be coordinated easily, or a migration must preserve meaningful local operations.

If the foreign model already fits and adopting it is an acceptable design decision, a direct integration may be cheaper. A small adapter is enough when only a mechanical interface difference exists.

## Tradeoffs and common mistakes

The layer costs translation code, compatibility tests, monitoring, and sometimes latency. It can become a bottleneck or hide a dependency that still fails at runtime. Keep the surface narrow and test real contract examples.

Renamed fields can still expose the foreign lifecycle. Moving local business rules into the layer creates a second leak in the opposite direction. A shared “universal” layer can also force several local contexts into one model.

Identity mappings and interpretation rules can change. Version and govern them, define replay and cache policies, and investigate unknown values. Compilation does not establish semantic equivalence.

## Related patterns

[[data-bounded-contexts|Bounded Context]] establishes where a model applies. An Anti-Corruption Layer protects one model when it integrates across that boundary.

[[ports-and-adapters|Ports and Adapters]] gives an application its own interaction contracts. An outgoing adapter can house this layer, but model protection is the specific reason for its semantic translation.

[[adapter|Adapter]] reconciles interfaces. An Anti-Corruption Layer may use adapters while also insulating domain meanings and failure interpretations.

[[message-translator|Message Translator]] converts message representations. It can be one mechanism inside the larger model-protection boundary, alongside request adaptation and local error contracts.

## Sources

Evans's linked DDD Reference establishes the pattern and original spelling. Microsoft and AWS document semantic isolation and implementation choices; Fowler explains relationships between models. The inventory contract, arithmetic assumptions, local policy, Python code, and diagrams are original teaching material.
