---
id: message-translator
type: pattern
title: Message Translator
summary: Convert a message into the representation another application expects while making field mappings, units, meaning, and unsupported cases explicit at the integration boundary.
status: published
aliases:
  - Message Translation
tags:
  - software-engineering
  - messaging
  - integration
verses:
  - software-engineering
attribution: "Message Translator: Gregor Hohpe and Bobby Woolf, Enterprise Integration Patterns. Supporting Apache Camel and Python documentation. Original Patternverse parcel contract, translation example, and native illustrations."
---

## Purpose and problem

A carrier publishes parcel events with `gross_kg: "1.250"` and `state: "R"`. A warehouse expects an integer `gross_mass_g` and a named pickup state. Passing the carrier document through unchanged fails validation. Renaming `gross_kg` without converting its value produces the wrong measurement.

Independent applications still need agreement on parcel, weight, and status meanings. Repeating carrier-specific conversions inside every warehouse handler spreads that dependency throughout the receiving application.

## Core idea

**Message Translator** places a conversion at the messaging boundary. It accepts one representation and produces the representation the receiver understands, according to an explicit mapping contract.

Think **different representation, justified meaning**. Hohpe and Woolf's [Message Translator catalog entry](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageTranslator.html) describes translating between applications' formats and identifies it as the messaging equivalent of Adapter. Message Translation names the activity. Message transformation is a broader family, and a [Messaging Mapper](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessagingMapper.html) has a different responsibility connecting messages and application objects; those names should not be treated as interchangeable aliases.

Translation can involve names, types, structure, codes, units, or encoding. A JSON-to-XML conversion can be sufficient when meanings already agree. Matching field names cannot establish semantic equivalence when they do not.

![Carrier schema 1 supplies event E901, parcel P42, gross_kg as the decimal string 1.250, and state R. Mapping carrier-a-v1/warehouse-v2 preserves event and parcel identity, converts kilograms to 1250 integer grams, and maps the documented carrier code R to ready_for_pickup. Warehouse schema 2 receives a newly constructed message with mapping provenance.](../assets/software-engineering/message-translator-contract.svg "Translate a declared contract, not just field names. The example preserves identity and gross-mass meaning while changing units and status representation.")

## How it works

### Own a directional contract

The translator's owner agrees source and target schemas with both applications. State which fields are required, which values map, which units apply, and what information is discarded. Validate before exposing output that a consumer might mistake for a valid business fact.

Mappings are directional. Several source codes may collapse into one target value; omitted fields and rounded measurements may be unrecoverable. Do not promise a reverse transformation merely because the forward conversion succeeds.

A translator is not required to introduce a universal internal format. The [Canonical Data Model pattern](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CanonicalDataModel.html) chooses a shared representation between participants; Message Translators implement the conversions to or from it. Two applications may need only a direct mapping.

### Preserve meaning and uncertainty

Both weight fields must mean gross parcel mass. If one describes contents without packaging, multiplying by 1000 does not resolve the difference. Obtaining missing packaging data introduces an enrichment responsibility, with its own source and consistency assumptions. The [Content Enricher catalog](https://www.enterpriseintegrationpatterns.com/patterns/messaging/DataEnricher.html) describes augmenting a message with information it lacks.

Unknown codes, unsupported versions, and unrepresentable values need explicit outcomes. Rejecting, retaining an unresolved record, or routing for investigation can be reasonable. Converting every unfamiliar status to `ready_for_pickup` invents a claim that downstream work may act on.

### Separate conversion from transport

A pure conversion can be deterministic for fixed input and mapping rules. Remote lookups, current time, or changing reference tables can alter that property. Version mappings and define replay behavior; recording a version helps investigation but does not by itself make replay use those rules.

Construct output separately so failure cannot expose a half-updated input object. Preserve relevant business identity and correlation metadata deliberately, even if a transport creates a new envelope ID. Allowlist outbound fields rather than copying credentials or private partner metadata indiscriminately.

Conversion success does not guarantee publication or consumer completion. A messaging adapter must separately handle input acknowledgment, output handoff, retries, and duplicate effects. Multiple workers can translate concurrently when they use a coherent mapping snapshot; translation alone supplies neither ordering nor transactional delivery.

## Worked example

### Kilograms and carrier codes to a warehouse event

Previously the warehouse rejected the document or misread its units. The translator now produces the warehouse contract before processing.

Save both files together and run `python3 demo.py` with Python 3.10+; no packages are required. Input is a decoded six-field dictionary; identifiers allow 1–64 ASCII letters, digits, colons, underscores, or hyphens. Schema 1 identifies this illustrative carrier contract. Its documented codes are `R = ready for pickup` and `D = dispatched`.

`gross_kg` must be a decimal string with one to six whole digits and up to six fractional digits. The target accepts **whole grams greater than zero and at most 50000**, meaning a maximum of 50 kilograms. Fractional grams are rejected. [Python's decimal documentation](https://docs.python.org/3/library/decimal.html) supports exact decimal input and local arithmetic contexts; this example fixes sufficient precision rather than depending on the caller's global precision.

**translation.py — validate, convert, then construct**

```python
import re
from decimal import Decimal, localcontext


class TranslationError(ValueError):
    pass


def translate(source):
    fields = {"schema", "source", "event_id", "parcel", "gross_kg", "state"}
    if type(source) is not dict or set(source) != fields:
        raise TranslationError("Unexpected source shape")
    if type(source["schema"]) is not int or source["schema"] != 1:
        raise TranslationError("Unsupported source schema")
    if source["source"] != "carrier-a":
        raise TranslationError("Unsupported source namespace")
    for key in ("event_id", "parcel"):
        value = source[key]
        if type(value) is not str or not re.fullmatch(r"[A-Za-z0-9:_-]{1,64}", value):
            raise TranslationError("Invalid identifier")
    states = {"R": "ready_for_pickup", "D": "dispatched"}
    if type(source["state"]) is not str or source["state"] not in states:
        raise TranslationError("Unknown carrier state")
    weight = source["gross_kg"]
    if type(weight) is not str or not re.fullmatch(r"[0-9]{1,6}(?:\.[0-9]{1,6})?", weight):
        raise TranslationError("Invalid decimal kilogram string")
    with localcontext() as context:
        context.prec = 20
        grams = Decimal(weight) * 1000
        if grams != grams.to_integral_value() or not 0 < grams <= 50000:
            raise TranslationError("Weight must be 1..50000 whole grams")
    return {
        "schema": 2,
        "source_system": "carrier-a",
        "event_id": source["event_id"],
        "parcel_id": source["parcel"],
        "gross_mass_g": int(grams),
        "pickup_state": states[source["state"]],
        "mapping_version": "carrier-a-v1/warehouse-v2",
    }
```

**demo.py — preserve meaning or report failure**

```python
from translation import translate, TranslationError


source = dict(schema=1, source="carrier-a", event_id="E901",
              parcel="P42", gross_kg="1.250", state="R")
result = translate(source)
print(result["event_id"], result["parcel_id"], result["gross_mass_g"],
      result["pickup_state"], result["mapping_version"])
print("source weight:", source["gross_kg"])
for change in [dict(state="X"), dict(gross_kg="1.2505")]:
    try:
        translate(source | change)
    except TranslationError as error:
        print("rejected:", error)
# E901 P42 1250 ready_for_pickup carrier-a-v1/warehouse-v2
# source weight: 1.250
# rejected: Unknown carrier state
# rejected: Weight must be 1..50000 whole grams
```

The translator returns a new dictionary only after validation succeeds. It preserves the source namespace and event identifier for provenance, but does not implement deduplication. The target schema and mapping version identify different things: the output contract and the rule set used to produce it.

This function performs no network calls, enqueueing, acknowledgment, timers, authentication, or persistent quarantine. The `source` label selects a contract; a sender-provided label does not prove identity. A real ingress adapter must establish the partner and enforce payload-size and parser limits. Failure raises a typed exception; the caller owns retention and investigation. This projection omits the original decimal spelling and source code, so byte-for-byte reverse reconstruction is not promised.

![A known carrier status R and weight 1.250 kilograms produce a complete output with 1250 grams. Unknown state X produces a TranslationError without output. Weight 1.2505 kilograms would require 1250.5 grams, which the target cannot represent; it is rejected instead of rounded. Original input stays unchanged, and error retention belongs to the caller.](../assets/software-engineering/message-translator-rejection.svg "Unknown meaning and unsupported precision are translation failures. This example emits no partial target and does not silently substitute a status or rounded weight.")

### A framework implementation

[Apache Camel documents Message Translator](https://camel.apache.org/components/4.22.x/eips/message-translator.html) through transforms, processors, beans, templates, and data formats. A serializer still cannot decide whether a source code means the target's business state.

## When to use it

Use it when independent applications exchange incompatible representations, partner changes are spreading through consumers, or repeated conversions need one explicit owner.

If both sides already share a suitable contract, direct messaging is simpler. A small boundary function may be enough; the pattern does not require a separate service, broker, or mapping product.

## Tradeoffs and common mistakes

A translator depends on both contracts and needs coordinated compatibility checks. Strict schemas expose unexpected changes early but require deliberate version handling. Permissive copying can conceal changes or leak fields.

Keep business decisions distinct from representation changes. Currency conversion, inferred identities, or guessed timestamps can require external facts and policy beyond a field mapping. Document any rounding, defaults, information loss, and cardinality changes.

Parsing and serialization add cost; expanding one message into many records can change memory requirements and ordering obligations. Tests should check representative expected output, preserved identity and units, rejection cases, and source nonmutation. Test round trips only when reversibility is promised.

## Related patterns

[[adapter|Adapter]] changes a component interface; Message Translator applies that compatibility move to messages crossing application boundaries.

[[data-reshape-at-boundaries|Reshape at Boundaries]] specializes translation in structural changes such as nesting and flattening. This article covers the broader message contract, including codes and units.

[[data-canonical-mapping|Canonical Mapping]] reconciles sources with a shared model. A Message Translator can implement one such mapping without requiring a shared model for every integration.

[[correlation-identifier|Correlation Identifier]] maintains an association between messages. Translation must preserve or deliberately map that association when envelopes or schemas change.

## Sources

The linked Enterprise Integration Patterns entries establish translation, shared-model indirection, and enrichment. Camel documents implementation mechanisms; Python documents decimal arithmetic. The parcel contracts, range limits, status codes, Python example, and illustrations are original teaching material.
