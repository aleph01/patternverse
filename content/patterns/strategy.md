---
id: "strategy"
type: "pattern"
title: "Strategy"
summary: "Make a varying algorithm or policy explicit and replaceable behind a common contract."
status: "published"
tags:
  - "gof-design-patterns"
  - "object-oriented-design"
  - "behavioral"
  - "strategy"
verses:
  - "software-engineering"
attribution: "Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package."
---

A delivery service calculates a price. Standard delivery uses weight bands, express delivery uses distance and urgency, and collection from a depot uses another rule. The main order workflow contains an expanding conditional and details from every pricing algorithm. Adding a rule risks disturbing unrelated parts of order handling.

Strategy makes the varying policy a collaborator. The order workflow depends on a pricing contract and delegates calculation to the selected strategy. Each strategy owns one coherent algorithm, while the context keeps responsibility for the surrounding process.

![The order workflow delegates to a pricing contract; the selected algorithm is separate from the stable surrounding workflow.](/diagrams/gof/strategy.svg "The order workflow delegates to a pricing contract; the selected algorithm is separate from the stable surrounding workflow.")

### Name the dimension that varies

The context is the object or function that uses the algorithm. The strategy interface describes the inputs and outputs the context actually needs. Concrete strategies implement alternatives that satisfy that contract.

In a class-oriented language, this may mean several objects implementing calculate_price. In a language with first-class functions, it may mean passing a function. A class hierarchy is optional; explicit interchangeable behavior is the essential design.

The contract should be specific enough to be useful. A strategy that accepts an unstructured bag of data and returns an arbitrary value hides rather than clarifies the policy boundary. Inputs, result meaning, error behavior, and any important preconditions should remain understandable.

### Pricing without rewriting the order workflow

Suppose an OrderService validates an order, obtains a delivery price, records the chosen option, and creates a confirmation. It receives a DeliveryPricing strategy. StandardPricing and ExpressPricing each calculate an amount from an agreed delivery request value.

Before the separation, a new pricing option adds another branch to OrderService. Afterward, it adds a strategy and a selection rule at the composition or request boundary. The order workflow continues to perform its stable responsibilities.

The strategy should not quietly take over the rest of the workflow. A pricing implementation that sends confirmation messages or mutates the order introduces hidden effects beyond the calculation contract. If pricing genuinely needs external data, that dependency should be visible and its failure behavior defined.

Selection also has an owner. The strategy does not choose itself merely because it exists. A request handler, configuration layer, or dedicated selection policy decides which implementation applies. Moving conditionals out of the algorithm is useful; scattering selection across callers is not.

### Ranking search results

A search tool returns candidate documents. One ranking strategy favors recency; another favors relevance; a third combines relevance with a domain-specific preference. The search workflow gathers candidates and delegates ranking through a shared interface.

This allows algorithms to be evaluated independently. The same candidate set can be passed to several rankers for comparison, and a test can verify deterministic behavior for a controlled strategy.

However, the contract must say what ranking means. Does it return all candidates in a new order, omit low-scoring candidates, or produce scores for another stage? Strategies that perform different tasks should not be forced into one interface simply because they all touch search results.

Swapping algorithms can also change user-visible behavior even when the interface is identical. A deployment should treat ranking selection as a meaningful product choice, not merely as a technical wiring detail. Strategy localizes the algorithm; it does not make its consequences interchangeable in every sense.

### Flexibility with fewer accidental dependencies

Strategy helps when alternatives are substantial, when they change independently, or when runtime selection is useful. It can make tests more focused and reduce a context's knowledge of implementation details.

It is easy to overuse for a tiny two-branch expression. A clear conditional may communicate the whole policy better than several files and interfaces. The threshold is not a particular number of branches; it is whether the variation has become a distinct responsibility.

Another mistake is sharing a mutable strategy object across contexts when it contains request-specific state. A strategy can be stateless, immutable, or deliberately stateful, but ownership and concurrency rules should follow from that choice. A common interface does not make all implementations safe to share.

Some alternatives cannot meet the same promise. An approximate algorithm and an exact algorithm may need a result type that expresses confidence or accuracy. Pretending they are identical can create incorrect expectations. The abstraction should preserve consequential differences.

### Neighboring designs

State also delegates through a replaceable object. Its variation comes from an object's lifecycle condition and transitions between conditions. Strategy normally varies a chosen algorithm or policy. One can combine them: a lifecycle state may select an appropriate strategy for an operation.

Template Method fixes an algorithm skeleton in a base class and customizes steps through subclassing. Strategy uses composition to replace behavior and often permits changing it without changing the context's type. Bridge separates two broader dimensions, such as a family of high-level abstractions and a family of implementations.

The strongest signal is a policy that keeps changing while its surrounding workflow remains stable. Giving that policy a precise interface makes the change explicit and keeps the context focused on the task it coordinates.

## Pattern details

**Category:** Behavioral · **Difficulty:** Introductory

### Use when

- A task has several meaningful interchangeable algorithms
- Policy varies independently from the context that uses it

### Not ideal when

- There is only one trivial implementation with no useful boundary
- Strategies cannot honestly fulfill the same behavioral contract

### Prerequisites

- Basic familiarity with objects, interfaces, composition, and inheritance

## Related patterns

[[state|State]] · [[template-method|Template Method]] · [[bridge|Bridge]]

## Source

Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package.

[Canonical GoF reference](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-software-9780201633610)
