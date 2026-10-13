---
id: "adapter"
type: "pattern"
title: "Adapter"
summary: "Translate an existing interface into the contract a client expects."
status: "published"
tags:
  - "gof-design-patterns"
  - "object-oriented-design"
  - "structural"
  - "adapter"
verses:
  - "software-engineering"
attribution: "Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package."
---

An application asks its mail service to send a message with a recipient, subject, and body. A new provider exposes submit, expects a nested payload, and returns a provider-specific delivery token. Rewriting every caller around that API would spread the integration throughout the application. The behavior is useful; the interface is the obstacle.

Adapter translates between the interface a client expects and the interface an existing component provides. The client continues to use its own meaningful contract. The adapter understands both sides and performs the necessary conversion.

![The application uses its mail contract; the adapter translates payloads and results at the provider boundary.](/diagrams/gof/adapter.svg "The application uses its mail contract; the adapter translates payloads and results at the provider boundary.")

### Translation includes meaning

The simplest adapter renames a method or rearranges arguments. A substantial adapter also translates values, errors, lifecycle rules, and sometimes the interpretation of a result. It is a compatibility boundary, not just a cosmetic wrapper.

In the common object adapter form, the adapter holds a reference to the existing component and delegates work to it. The classical class adapter form uses inheritance where the language and type relationships permit it. Composition generally makes the dependency and translation easier to isolate.

The crucial constraint is that the underlying component can actually satisfy the expected behavior. An adapter cannot manufacture synchronous completion from a service that only accepts work for later processing without changing what completion means. A common interface must have an honest semantic contract.

### A mail integration that keeps its promise

Suppose the application's MailSender contract returns a submission identifier when a provider accepts a message for delivery. The adapter maps recipient, subject, and body into the provider's payload, calls submit, and converts the returned token into the application's identifier type.

Before the adapter, order confirmation code knows the vendor's field names and exception types. Afterward, it depends only on MailSender. Switching providers changes the adapter and application wiring, while order logic remains stable.

The wording of the result matters. Acceptance does not prove delivery. If the old interface returned a value named delivered, carrying that name forward could preserve a misleading promise. The adapter may reveal that the application contract itself needs correction.

Failures need equally careful treatment. A malformed recipient and a temporary network failure may require different caller behavior. Converting every vendor error into false makes the integration easy to call but difficult to operate. A useful adapter normalizes errors without erasing distinctions the application needs.

### A legacy temperature source

A building-monitoring application expects temperature readings in Celsius with a timestamp. A legacy device exposes a method returning a Fahrenheit number and provides a separate time value in its own format. A TemperatureSourceAdapter reads both, converts the unit, and constructs the application's reading value.

That isolates conversion from alert rules and charts. Threshold checks no longer need to remember which devices report Fahrenheit. Test cases can exercise the adapter's conversion directly rather than recreating it in every consumer.

However, reading the value and timestamp separately may introduce a consistency problem if the device updates between calls. The adapter should use an atomic reading if the device supports one, or document the limitation. Translating the shape of data does not remove the acquisition behavior of the source.

If a device reports an estimated rather than measured temperature, an adapter should not silently treat them as identical. Sometimes the correct response to incompatibility is a richer contract, not a more elaborate wrapper.

### The boundary that protects the interior

Adapter is useful for vendor SDKs, legacy libraries, file formats, and systems that cannot be changed easily. It allows application code to describe its own needs instead of inheriting a provider's vocabulary. This can make replacement, testing, and incremental migration more manageable.

The pattern is weaker when the expected contract is a forced universal abstraction. A single interface covering every database, transport, or payment provider can become so vague that important behavior disappears. Adapting to the narrow needs of a specific application is often clearer than building a supposed interface for every possible implementation.

Adapters can also accumulate hidden business decisions. Currency conversion policy, permission checks, or retry rules may belong in separate components if they are substantial. Keeping translation distinguishable from policy makes it easier to understand what changes when an external API changes.

### Neighboring designs

Facade simplifies access to a subsystem; Adapter resolves a mismatch with an expected interface. A wrapper can serve both roles, but its reason for existing should be clear. Proxy usually preserves the subject's interface while controlling access. Adapter intentionally changes the interface seen by the client.

Bridge starts by separating two dimensions that are intended to vary independently. Adapter more often connects an already-existing component to a contract it was not designed to implement. A bridge can use an adapter for an implementation supplied by a legacy system.

The best adapter is a small, explicit translation layer with a truthful contract. It protects clients from incidental interface differences while leaving consequential behavioral differences visible.

## Pattern details

**Category:** Structural · **Difficulty:** Introductory

### Use when

- An existing component has useful behavior behind an incompatible interface
- A boundary should isolate an external API from application code

### Not ideal when

- The underlying behaviors cannot satisfy the expected contract
- Both interfaces are owned locally and can be simplified directly

### Prerequisites

- Basic familiarity with objects, interfaces, composition, and inheritance

## Related patterns

[[facade|Facade]] · [[bridge|Bridge]] · [[proxy|Proxy]]

## Source

Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package.

[Canonical GoF reference](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-software-9780201633610)
