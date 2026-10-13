---
id: "observer"
type: "pattern"
title: "Observer"
summary: "Let subscribers receive notifications when a subject changes without hard-coding its dependents."
status: "published"
tags:
  - "gof-design-patterns"
  - "object-oriented-design"
  - "behavioral"
  - "observer"
verses:
  - "software-engineering"
attribution: "Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package."
---

A document model updates its title. The window heading, recent-files list, autosave indicator, and search index all need to react. If the model calls each of those components directly, every new dependent requires another reference and another special-purpose call.

Observer lets dependents subscribe to changes. The subject maintains a notification relationship and publishes relevant updates. Subscribers decide what to do with those updates, while the subject does not need to know their concrete roles.

![The document publishes one coherent title change to independent subscribers. Their subscription lifetimes remain explicit.](/diagrams/gof/observer.svg "The document publishes one coherent title change to independent subscribers. Their subscription lifetimes remain explicit.")

### A one-to-many relationship with a lifecycle

The core roles are a subject, observers, and a subscription mechanism. An observer can be an object with an update method or a callback. The subject records subscriptions and notifies them when the chosen change occurs.

There are two common data styles. A push notification carries the relevant state or event information. A pull notification tells observers that something changed and lets them query the subject. A design may combine both by sending a change description and allowing further queries.

Neither style is automatically correct. Push makes a specific update easier to interpret without another read. Pull can avoid large payloads, but the queried state may already have changed again by the time a delayed observer reads it. The notification contract should say whether it describes an event, a version, or the latest available state.

### Several views of one document

Suppose a document publishes TitleChanged with its identifier, old title, new title, and version. The window heading updates its display. The recent-files list changes its label. A search index marks the document for indexing according to its own policy.

Before Observer, the document model knows concrete UI and indexing components. Afterward, it knows only how to publish a meaningful change. A new dependent can subscribe without requiring another model-specific call.

The timing matters. The title and related invariants should normally be consistent before notification. An observer that queries the document halfway through a multi-field update may see an invalid state. Publishing after a coherent update or emitting one transaction-level change can avoid that problem.

Subscriptions also need an owner. When a window closes, it should stop observing the document if the subscription would otherwise retain it or trigger useless updates. An explicit subscription handle can make disposal clear.

### Progress notifications during an import

An import job publishes progress while a status view and a diagnostic recorder subscribe. The job does not need to know whether either is present. The view updates a progress indicator; the recorder stores selected milestones.

The notification rate requires a policy. Reporting every row can overwhelm a UI or produce excessive logs. Aggregation or throttling may be appropriate at the producer or consumer boundary, depending on which information must be preserved.

Asynchronous delivery introduces another distinction. The producer might finish before a subscriber processes its final update. If completion must be observed, the system needs an explicit delivery or acknowledgment contract. A basic Observer relationship alone does not guarantee durable, ordered, exactly-once notification.

The example can stay in-process and simple. If it grows into cross-service messaging, transport, persistence, retry, and consumer identity become separate architectural concerns. Calling a message broker Observer does not explain those guarantees.

### Hidden dependencies can return through ordering

Observer reduces direct knowledge of concrete dependents, but subscribers can still depend on one another indirectly. If the status view assumes the indexer has already run, notification order becomes part of correctness. An unordered list of listeners is then an inadequate contract.

Where order genuinely matters, an explicit workflow or mediator may be clearer. Alternatively, the subject can publish after the prerequisite work completes. The important step is to make the dependency visible rather than encode it in subscription timing.

Reentrancy is another common problem. An observer reacts by changing the subject, which emits another notification, which invokes the observer again. Guards, idempotent reactions, or deliberately queued updates can help, but each approach changes timing and semantics.

Failure handling should be explicit. Should one observer exception stop later observers, be collected, or be isolated and reported? Different applications need different answers. Silently swallowing every failure can make updates appear successful when dependent state is stale.

Tests should cover subscribing and unsubscribing as well as notification. A listener that receives the right update at the wrong lifetime boundary can still produce incorrect behavior.

### Neighboring designs

Mediator can use Observer to hear events, then decide how participants should collaborate. Observer provides the notification relationship; Mediator provides coordination policy. They often work together without being interchangeable.

Chain of Responsibility offers candidate handlers a request according to a continuation rule, often stopping when one handles it. Observer normally notifies interested subscribers rather than searching for a single suitable receiver. Command can represent actions that observers enqueue in response to a change.

Observer is strongest when the subject has an open-ended set of independent dependents and a well-defined update boundary. Clear event meaning, subscription ownership, and timing rules are what make the decoupling useful in practice.

## Pattern details

**Category:** Behavioral · **Difficulty:** Intermediate

### Use when

- An open-ended set of dependents reacts to one subject
- The subject should publish change information without knowing each consumer

### Not ideal when

- A fixed direct call is clearer
- Subscribers rely on unspecified order or atomic delivery

### Prerequisites

- Basic familiarity with objects, interfaces, composition, and inheritance

## Related patterns

[[mediator|Mediator]] · [[chain-of-responsibility|Chain of Responsibility]] · [[command|Command]]

## Source

Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package.

[Canonical GoF reference](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-software-9780201633610)
