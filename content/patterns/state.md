---
id: "state"
type: "pattern"
title: "State"
summary: "Move state-dependent behavior into explicit state objects and delegate through the current state."
status: "published"
tags:
  - "gof-design-patterns"
  - "object-oriented-design"
  - "behavioral"
  - "state"
verses:
  - "software-engineering"
attribution: "Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package."
---

An upload can be idle, transferring, paused, completed, or failed. Its start, pause, resume, and cancel methods each inspect a status field. Adding a new state means editing several conditionals, and one forgotten branch lets a completed upload resume.

State organizes behavior around explicit state objects. The upload context delegates an operation to its current state. Each state defines the behavior appropriate to that lifecycle stage, including whether an operation is allowed and which transition follows.

![The upload delegates behavior to its active state. Pause and resume are lifecycle transitions; completion leads to a different valid operation set.](/diagrams/gof/state.svg "The upload delegates behavior to its active state. Pause and resume are lifecycle transitions; completion leads to a different valid operation set.")

### The same request, different valid behavior

An Upload context retains the upload's data and a reference to its current state. TransferringState may implement pause by stopping further transfer scheduling and transitioning to PausedState. PausedState may implement resume by restarting work and transitioning to TransferringState. CompletedState may reject resume as an invalid operation.

The public upload interface remains stable. Its behavior changes through delegation rather than through repeated status checks in every method. This can put rules that belong together into the same state implementation.

State does not require moving all data into the state objects. Shared upload information, such as destination and bytes transferred, can remain in the context. State objects should contain state-specific behavior and any carefully defined state-local data.

### An upload with visible transitions

Before the pattern, cancel has separate branches for idle, transferring, paused, completed, and failed. Some branches clean up temporary data; others forget. Afterward, the relevant states implement their own cancellation semantics, while shared cleanup can remain in a context service.

The transition boundary must still be consistent. A pause request may race with completion. The system needs to decide which event wins and ensure the context does not enter a state inconsistent with the transfer result. State classes alone do not serialize concurrent events.

Entry and exit actions also deserve a policy. Entering TransferringState might schedule work, while leaving it might stop a timer. If those actions can fail, the design must define whether the transition has occurred. A transition should not become an unreviewable sequence of assignments and side effects.

A concise transition table or diagram remains useful even when behavior lives in state objects. It makes the lifecycle visible as a whole, rather than forcing readers to discover every possible transition by searching individual classes.

### A document approval lifecycle

A document can be a draft, submitted, approved, or archived. Editing a draft changes content. Editing a submitted document may require withdrawing it first. Editing an approved document may create a new revision rather than mutate the approved one.

State objects can express these differences through the same edit and submit operations. SubmittedState defines withdrawal behavior; ApprovedState defines revision behavior; ArchivedState defines restricted operations. The context supplies document data and services needed to carry out valid changes.

The pattern helps when lifecycle rules are substantial and repeated across operations. It is less compelling if the only rule is that submit changes a single enum from draft to submitted. A small explicit transition function can be easier to understand than four nearly empty classes.

Persistence also needs care. A stored document should normally record a stable state identifier and relevant domain data, not rely on serializing arbitrary runtime state objects. Reconstruction can map that identifier to the appropriate implementation while checking invariants.

### More explicit behavior, sometimes less visible flow

State localizes state-specific behavior and can reduce duplicated conditionals. Adding a state may become more focused because its rules have a natural home. Nevertheless, transitions can become scattered if every state changes the context freely.

One design lets state objects initiate transitions through a narrow context interface. Another centralizes transition selection in the context or a transition service while state objects define behavior. The right arrangement depends on whether transition rules or per-state operations dominate the complexity.

Avoid state classes that access every internal field of the context through an unrestricted back door. A controlled interface preserves the separation and makes invariants easier to enforce. Shared mutable state objects are also dangerous if several contexts use them and they contain context-specific data.

Hierarchical states, parallel regions, and timers can exceed what a hand-built State implementation handles comfortably. A dedicated state-machine representation may be clearer for such systems. The GoF pattern is a way to organize state-dependent behavior, not a complete specification language for every state machine.

### Neighboring designs

Strategy encapsulates an interchangeable algorithm or policy. A context usually receives or selects a strategy according to configuration. State represents a lifecycle condition, and transitions are part of the domain's behavior. Their delegation structures can look similar, but the reason the behavior changes is different.

Memento can capture the current lifecycle state and other data for restoration, provided restoration fits the domain. Template Method fixes an algorithm skeleton and customizes steps through inheritance, rather than changing behavior by switching the current state object.

State works when the lifecycle is real, its operations have meaningfully different behavior, and repeated branching has become difficult to maintain. Keeping the transition model visible is as important as eliminating the conditionals.

## Pattern details

**Category:** Behavioral · **Difficulty:** Intermediate

### Use when

- Several operations repeatedly branch on the same lifecycle state
- States have distinct behavior and deliberate transitions

### Not ideal when

- A small transition table or enum remains easier to read
- The design hides transition rules across too many objects

### Prerequisites

- Basic familiarity with objects, interfaces, composition, and inheritance

## Related patterns

[[strategy|Strategy]] · [[memento|Memento]] · [[template-method|Template Method]]

## Source

Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package.

[Canonical GoF reference](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-software-9780201633610)
