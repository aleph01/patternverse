---
id: "chain-of-responsibility"
type: "pattern"
title: "Chain of Responsibility"
summary: "Let a request pass through candidate handlers without coupling its sender to a specific receiver."
status: "published"
tags:
  - "gof-design-patterns"
  - "object-oriented-design"
  - "behavioral"
  - "chain-of-responsibility"
verses:
  - "software-engineering"
attribution: "Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package."
---

A keyboard shortcut can belong to the focused text field, its enclosing panel, the current window, or the application. The code that detects the shortcut should not need a complete list of every component that might handle it. The right receiver depends on the current context.

Chain of Responsibility gives the request a path through candidate handlers. Each handler decides whether it can handle the request; otherwise it passes the request onward. The sender knows the entry point rather than the eventual receiver.

![A shortcut moves outward only when a candidate passes. Handling stops propagation; the application is a fallback.](/diagrams/gof/chain-of-responsibility.svg "A shortcut moves outward only when a candidate passes. Handling stops propagation; the application is a fallback.")

### Routing by opportunity

In the classic form, each handler has a reference to its successor. An equivalent arrangement can store handlers in an ordered collection and iterate through them. The defining relationship is the sequence of opportunities to handle a request, not whether objects are linked by pointers.

The stopping rule is central. A handler may return handled, pass, or an explicit failure. Those outcomes mean different things. A handler that cannot handle a request should not silently convert that into success; a handler that encounters an actual error may need to stop rather than pass.

Some modern middleware designs let every stage perform work and then continue. They resemble the chain structure, but the original routing intent emphasizes allowing a request to find a suitable receiver. Being explicit about which variant is used prevents confusion between fallback routing and an all-stage pipeline.

### Keyboard events through a component hierarchy

Suppose a user presses Delete while a text field has focus. The field handles the request by deleting selected text, and propagation stops. If focus is instead on a diagram canvas, the canvas may delete the selected shape. If the focused component has no applicable action, the request moves to its parent or another successor.

Before the chain, a central shortcut controller asks what every possible component currently contains. New component types require changes to that controller. Afterward, components can express their own handling rules and participate in the routing structure.

Ordering encodes priority. The nearest context normally gets the first chance, while a broader application action becomes a fallback. Reversing that order could let a global action consume an event intended for a local editor.

A clear terminal policy also matters. An unhandled shortcut may be ignored, reported, or delegated to the platform. An accidentally broken successor link should not be indistinguishable from deliberate no-op behavior when diagnostics are needed.

### Resolving a setting from several sources

A command-line tool reads a setting from command-line arguments, then environment variables, then a configuration file, then a default. Each provider can report whether it has a value. A resolver sends the lookup through this ordered chain until one provider supplies the setting.

The caller asks for a setting without knowing where it comes from. Adding an organization-wide configuration source means inserting another provider at the chosen priority position rather than rewriting callers.

The distinction between missing and invalid is essential. An absent command-line value should permit fallback. An explicitly supplied but malformed value may need to produce an error, because silently using a lower-priority value would ignore the user's instruction.

The result can also include provenance so the tool can explain why a value was selected. Chain of Responsibility hides receiver selection from ordinary clients, but it need not hide that selection from diagnostics or user-facing explanations.

### Flexible routing creates a configuration obligation

The pattern helps when handlers vary, when receiver selection depends on context, or when fallback order is meaningful. It can reduce coupling between a sender and the specific component that ultimately responds.

The cost is that handling behavior is distributed across several objects. A reader may need to inspect the assembled chain to understand which handler wins. Construction should make the order visible, and tests should cover overlap, fallback, and terminal behavior rather than only individual handler success.

Cycles, duplicate handlers, or overly broad first handlers can prevent later candidates from receiving requests. A handler that claims every request can effectively turn a carefully designed chain into a single receiver. Instrumentation that records attempts and outcomes can make these problems easier to diagnose.

If the appropriate receiver is already known, direct delegation is simpler. If all subscribers should receive an event, a chain with early stopping is usually the wrong model. The intended delivery relationship should determine the design.

### Neighboring designs

Observer distributes a notification to interested subscribers. Chain of Responsibility routes a request through candidates according to a continuation policy. A broadcast and a fallback search are different communication patterns, even when both use a list of callbacks.

Command represents a request as a value or object. A command can travel through a chain, but packaging the action and choosing its receiver are separate concerns. Decorator adds responsibilities around a component, often with guaranteed nested delegation. A chain handler can choose not to delegate because it has handled the request.

The pattern is strongest when it makes a real priority or fallback rule explicit. A chain should reveal who gets a chance, what counts as handling, and what happens when no candidate can respond.

## Pattern details

**Category:** Behavioral · **Difficulty:** Intermediate

### Use when

- The appropriate receiver depends on context or runtime configuration
- Candidate handlers need a deliberate fallback order

### Not ideal when

- The receiver is fixed and direct delegation is clearer
- Several independent listeners must all receive the same event

### Prerequisites

- Basic familiarity with objects, interfaces, composition, and inheritance

## Related patterns

[[observer|Observer]] · [[command|Command]] · [[decorator|Decorator]]

## Source

Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package.

[Canonical GoF reference](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-software-9780201633610)
