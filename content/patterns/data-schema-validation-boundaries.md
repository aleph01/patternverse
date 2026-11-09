---
id: data-schema-validation-boundaries
type: pattern
title: Schema Validation at Boundaries
summary: "Validate incoming records against an explicit structural contract before downstream processing relies on their fields, types, and required values."
status: published
aliases: []
tags:
  - data-engineering
  - quality-observability
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

An inventory feed has worked for months. Then a producer starts sending `"3"` instead of `3`, omits the unit field, and adds a nested object where consumers expect a string. The transport still delivers every message. Failures emerge later, scattered across transformations and reports.

**Schema Validation at Boundaries checks incoming data against an explicit structural contract before downstream processing relies on it.**

Its purpose is to detect incompatible data close to the handoff, explain the violation, and give rejected inputs a controlled path. A successful delivery should not silently become a claim that the delivered record is usable.

## Put the check where assumptions change

A boundary is a point where one component begins relying on another component’s output: an API receives a request, a consumer reads an event, an ingestion job opens a file, or a transformation publishes a table.

The contract describes what the receiver can assume. Depending on the schema language, it can specify required fields, types, nullability, nested structure, allowed values, ranges, and extra-field handling.

The mechanism is straightforward:

**Identify the contract → parse the input → validate → accept or handle failure.**

Parsing and validation answer different questions. A document can be valid JSON while violating the inventory contract. Conversely, malformed JSON cannot reach ordinary field-level validation.

Apply checks where guarantees change. A producer check gives fast feedback; a receiving boundary protects against bypassed clients, incompatible versions, and transformations that introduce new shapes.

![Schema validation at boundaries: three inventory-count events enter a validator requiring a nonempty event ID, a nonnegative integer quantity, and unit EA. E1 passes; E2 fails because its quantity is a string, and E3 fails because its unit is missing. Failed records receive an explicit rejection or quarantine outcome.](../assets/data-engineering/schema-validation-boundaries.svg "Schema requires an integer quantity and an explicit unit. E1 quantity 3 EA passes; E2 string 3 and E3 missing unit fail. Structural validation does not prove the business quantity is correct.")

*Validation establishes the declared contract. It does not establish that the recorded inventory count is factually correct.*

## Example: make an inventory event unambiguous

Suppose an inventory-count event must contain an identifier, a nonnegative integer quantity, and the unit `EA`, meaning individual items.

A compact JSON Schema makes those assumptions executable:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "event_id": {"type": "string", "minLength": 1},
    "quantity": {"type": "integer", "minimum": 0},
    "unit": {"const": "EA"}
  },
  "required": ["event_id", "quantity", "unit"],
  "additionalProperties": false
}
```

These inputs produce different outcomes:

| Input | Outcome |
|---|---|
| `{"event_id":"E1","quantity":3,"unit":"EA"}` | Accept |
| `{"event_id":"E2","quantity":"3","unit":"EA"}` | Reject: quantity has the wrong type |
| `{"event_id":"E3","quantity":3}` | Reject: unit is missing |

Declaring a field under `properties` does not make it required. JSON Schema also allows additional properties by default; this example deliberately closes the object with `additionalProperties: false`. That choice catches unexpected fields but makes additive changes require coordination. [JSON Schema object reference](https://json-schema.org/understanding-json-schema/reference/object)

Missing and null are also different. A required field must be present; its schema determines whether null is an allowed value.

Do not assume validation repairs data. JSON Schema’s `default` annotation does not fill missing values during validation. Any defaulting or coercion should be an explicit transformation with its own meaning and provenance. [JSON Schema annotations](https://json-schema.org/understanding-json-schema/reference/annotations)

The validator configuration belongs to the contract too. For example, `format` is an annotation by default; implementations may require configuration to enforce date or email formats as assertions. [JSON Schema format behavior](https://json-schema.org/understanding-json-schema/reference/type#format)

## Example: enforce an event contract before publication

A shared event topic distributes inventory updates to forecasting, replenishment, and reporting systems. Catching malformed messages before publication can prevent the same defect from reaching every consumer.

Google Cloud Pub/Sub supports attaching an Avro or Protocol Buffer schema to a topic. It validates the message’s `data` field, and a message that does not conform is not published. The producer must handle that rejection and retain any input needed for correction. [Pub/Sub schema overview](https://docs.cloud.google.com/pubsub/docs/schemas)

The exact guarantee matters. A feature named “schema validation” may perform a narrower check than expected.

Confluent Platform’s broker-side Schema ID Validation verifies that the wire-format schema ID belongs to an appropriate registered subject. Its documentation explicitly states that it does **not** inspect the payload itself. Payload correctness therefore still depends on serialization and validation elsewhere. Null keys and null values also pass this check, supporting tombstone behavior. [Confluent Schema ID Validation](https://docs.confluent.io/platform/current/schema-registry/schema-validation.html)

A registry entry establishes which schema exists. Compatibility checks establish relationships between schema versions. Runtime payload validation establishes whether a particular record conforms. Treat each as a distinct guarantee.

## Example: protect a curated table from a changed feed

A staging pipeline writes inventory counts into a curated Delta Lake table. A supplier unexpectedly adds a column or changes a quantity’s type.

Delta Lake’s documented DataFrame write validation checks compatibility with the target table schema. Unexpected columns and mismatched column types can cause an exception. However, columns present in the target but absent from the DataFrame are populated with nulls. Table-schema compatibility therefore does not automatically establish requiredness. [Delta Lake schema validation](https://docs.delta.io/delta-batch/#schema-validation)

If `event_id`, `quantity`, and `unit` must always be present, enforce that requirement explicitly. Delta Lake supports `NOT NULL` and row-level `CHECK` constraints and rejects writes that violate them. [Delta Lake constraints](https://docs.delta.io/delta-constraints/)

Schema evolution may be appropriate when a new supplier field is intentional. Enabling automatic evolution is an acceptance policy, not a substitute for deciding whether downstream consumers understand the change.

Retain the source input separately so a rejected write can be diagnosed and replayed after the contract or transformation is corrected.

## Evolve contracts without changing meaning silently

A boundary needs an identified schema version or immutable schema identity. “Validate against latest” makes historical replay unpredictable: yesterday’s accepted record may fail tomorrow’s rules.

Compatibility has direction. Backward compatibility means a new reader can read older data; forward compatibility means an older reader can read newer data. Transitive policies extend checks across earlier versions rather than only the immediate predecessor. The permitted changes depend on the schema format and field definitions. [Confluent schema compatibility](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)

Structural compatibility does not guarantee semantic compatibility. Changing `amount` from dollars to cents leaves its integer type unchanged while changing every value’s meaning. Units, timezone conventions, identifier scope, and business definitions require explicit contracts alongside structural schemas.

Keep representative valid and invalid examples with each contract. Verify the deployed validator’s behavior, particularly for coercion, nulls, unknown fields, and optional format assertions.

## Give failure a defined consequence

Validation becomes an operational boundary only when its verdict changes what proceeds.

An API may reject the request with a field-specific error. A stream may quarantine the failed record while continuing unrelated work. A file import may reject the entire file when partial acceptance would violate its delivery contract.

Choose the failure unit deliberately. Publishing nine valid settlement entries while rejecting their balancing tenth entry can produce an invalid business result.

Preserve the original input or a durable reference, source position, schema identity, validator version, and useful error location. Quarantine must be durable before acknowledging input whose recovery depends on it.

Also distinguish invalid data from unavailable validation infrastructure. A registry timeout does not prove that the payload violates its schema. Retry the infrastructure failure or pause processing under the boundary’s policy; repeatedly retrying an unchanged type violation merely delays correction.

## Costs, useful situations, and limits

This pattern is especially useful for independently deployed producers and consumers, external feeds, shared event streams, and publication of trusted datasets.

Validation adds parsing and checking work, contract maintenance, and failure-handling capacity. Reuse compiled validators where supported, cache identified schema versions appropriately, and measure overhead against actual payload sizes and structures.

Excessively permissive contracts provide weak guarantees. Excessively closed contracts can reject harmless extensions and increase deployment coordination. The right strictness depends on what receivers must safely assume.

A schema-valid record can still reference a nonexistent customer, duplicate an earlier event, contain a false quantity, or arrive after its reporting deadline. Structural acceptance also says nothing about records that never arrived.

[[data-preserve-raw-inputs|Preserve Raw Inputs]] keeps rejected evidence recoverable. [[data-standardize-at-staging|Standardize at Staging]] makes deliberate conversions explicit. [[data-quarantine-invalid-records|Quarantine Invalid Records]] supplies a recovery path. [[data-business-invariant-checks|Business Invariant Checks]] verifies relationships that structural conformance alone cannot establish.
