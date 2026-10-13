---
id: "composite"
type: "pattern"
title: "Composite"
summary: "Give individual objects and groups a common interface for recursive tree operations."
status: "published"
tags:
  - "gof-design-patterns"
  - "object-oriented-design"
  - "structural"
  - "composite"
verses:
  - "software-engineering"
attribution: "Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package."
---

A graphics editor can move a rectangle, a text label, or a selected group. Groups can contain other groups. Without a shared structure, every caller starts checking whether the target is a shape or a collection and then repeats the recursion. Features such as moving, rendering, and calculating bounds each reinvent the same distinction.

Composite gives individual objects and containers a common interface for operations that make sense for both. A leaf performs the operation directly. A composite delegates to its children and combines their results where appropriate. Clients can work with a component without first asking which kind it is.

![Groups contain components, including nested groups. A shared move operation follows the part–whole tree.](/diagrams/gof/composite.svg "Groups contain components, including nested groups. A shared move operation follows the part–whole tree.")

### A recursive part–whole model

The component contract might include draw, move, and bounds. Rectangle and TextLabel are leaves. Group is a composite that contains components. Because another Group also satisfies the component contract, nesting works naturally.

The common interface does not imply identical implementation. A rectangle moves by updating its position. A group may move all its children or update a group transform. A rectangle's bounds come from its dimensions; a group's bounds enclose its children's bounds.

The value is that callers can express an operation at the level of the selected component. Recursion belongs inside the structure or in a cooperating traversal mechanism rather than spreading through every feature.

### Grouped objects in an editor

Suppose a user groups a title label with two shapes and then places that group inside a larger diagram group. When the editor moves the selected outer group, it calls move once on that group. The operation propagates through the nested components according to the chosen transform model.

Before Composite, the move tool includes separate loops for different group depths and item types. Afterward, it depends on the component contract. Adding a new leaf such as an image does not require rewriting the group recursion if the image implements the same operations correctly.

However, transform ownership needs consistency. If a group updates its own transform and also updates every child's coordinates, the movement may be applied twice when rendering. Composite organizes the tree; it does not decide the coordinate system automatically.

Bounds present another real detail. An empty group might have no bounds rather than a rectangle at the origin. A hidden child may or may not contribute. The component contract should define these cases so uniform access does not produce inconsistent meaning.

### Prices in a nested product bundle

A catalog contains individual products and bundles. A bundle may contain products and smaller bundles. Both expose a price operation. An individual product returns its listed price. A bundle calculates a total and applies its own discount rule.

Checkout can ask any purchasable component for its price. It does not need a separate algorithm for a bundle inside a bundle. The recursion follows the same part–whole relationship.

This example also reveals a limitation. If the same product appears in several bundles, the catalog may be a graph of references rather than an ownership tree. That can still be represented, but rules for duplication, counting, and cycles must be explicit. An accidental cyclic bundle can cause unbounded recursion.

Pricing policy may also outgrow a simple method. Discounts based on customer status or the whole basket might fit a separate pricing service or Visitor better than methods distributed through the tree. Composite describes structure; it does not require every operation to live inside component classes.

### Uniformity has a boundary

Two common interface choices create a tradeoff. A transparent component interface includes child-management operations on all components. Clients can treat everything uniformly, but leaves must reject meaningless operations such as adding a child.

A safer interface puts add_child and remove_child only on composite objects. The common interface covers drawing, moving, or pricing, while callers that manage structure must know they have a container. This sacrifices some uniformity to preserve meaningful operations.

Neither choice is universally correct. For an editor with explicit group controls, separate child-management operations may be clear. A framework built around a uniform manipulation protocol may choose another tradeoff. The mistake is pretending leaves and containers are equivalent in every respect.

Deep trees can also make recursive traversal expensive or exceed call-stack limits. Iterative traversal, cached results, and invalidation policies may be needed. A clean model does not remove performance or lifecycle concerns.

### Neighboring designs

Iterator provides a traversal interface for a collection or tree without exposing its internal representation. Composite supplies the tree's uniform part–whole structure. Visitor can add operations over the component types without putting all those operations into the structure itself.

Decorator also wraps objects behind a compatible interface, but normally represents added responsibility around a single wrapped component. Composite primarily represents a group of children. An object can participate in both relationships, provided the roles remain clear.

Composite works best when the domain genuinely contains recursive whole–part relationships and there are important operations shared by leaves and groups. It removes repeated structural distinctions while preserving the semantic differences that matter.

## Pattern details

**Category:** Structural · **Difficulty:** Intermediate

### Use when

- A domain contains nested part–whole structures
- Clients should treat a leaf and a group uniformly for selected operations

### Not ideal when

- The relationship is primarily a graph with shared ownership or cycles
- Leaves and groups have almost no meaningful common operations

### Prerequisites

- Basic familiarity with objects, interfaces, composition, and inheritance

## Related patterns

[[iterator|Iterator]] · [[visitor|Visitor]] · [[decorator|Decorator]]

## Source

Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package.

[Canonical GoF reference](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-software-9780201633610)
