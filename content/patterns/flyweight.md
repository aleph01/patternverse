---
id: "flyweight"
type: "pattern"
title: "Flyweight"
summary: "Share reusable intrinsic state while keeping context-specific state outside the shared object."
status: "published"
tags:
  - "gof-design-patterns"
  - "object-oriented-design"
  - "structural"
  - "flyweight"
verses:
  - "software-engineering"
attribution: "Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package."
---

A map displays hundreds of thousands of trees. Each tree object stores its coordinates, species name, visual description, and rendering asset. Coordinates differ, but most of the other information is identical across trees of the same species. The system spends memory repeatedly storing state that does not belong uniquely to each tree.

Flyweight separates shared intrinsic state from context-specific extrinsic state. A shared TreeType can hold the species and rendering asset. Each logical tree retains its own coordinates and other unique values, then supplies those values when using the shared type.

![Two logical trees retain independent location and selection while referencing one shared intrinsic tree type.](/diagrams/gof/flyweight.svg "Two logical trees retain independent location and selection while referencing one shared intrinsic tree type.")

### Logical objects and physical representation

The pattern does not make all trees one tree. It changes how their state is represented. Many logical instances refer to a smaller collection of reusable objects containing the common portion of their data.

Intrinsic state is independent of a particular usage context: a glyph shape, style definition, or marker icon. Extrinsic state depends on the context: position, selection, layout, or ownership. The boundary is domain-specific. A color could be intrinsic in one representation and extrinsic in another.

A factory or pool often manages shared instances using a key derived from intrinsic properties. When a requested type already exists, it returns that type rather than creating another equivalent representation. Shared objects are easiest to reason about when their intrinsic state is immutable after construction.

### A dense map with repeated assets

Suppose a tree instance currently repeats a large visual descriptor and references to textures along with x and y coordinates. The revised design stores a compact tree record containing coordinates and a reference or index to TreeType. A TreeType pool holds one entry for each distinct visual configuration.

Rendering asks the shared type to draw at the tree's supplied location, or asks a separate renderer to combine the type with that location. Selecting one tree changes its record's selection state, not the shared type used by every tree of that species.

That last distinction prevents a common bug. If selection is moved into TreeType because it looks like another tree property, selecting one pine can select every pine. The correct division depends on which values are shared in meaning, not merely which values fit into the same object.

The savings depend on the actual representation. If all original tree objects already reference the same immutable asset and duplicate little else, introducing a pool might save very little. Measuring allocation and retained memory is more informative than counting repeated field names.

### Styles in a text editor

A document contains many characters with the same font family, size, weight, and color. Instead of allocating a separate mutable style object for every character, the editor can intern immutable Style values. Characters or runs reference a shared style and keep their own text position and content.

Changing one character's style means assigning a different Style value to that character or run. It does not mutate the existing shared Style, because other text may still use it. The pool can return an existing equivalent style or create a new one.

This can reduce memory and make equality checks convenient. It also requires a stable key and a policy for lifetime. A pool that retains every style ever created may itself become a memory leak, especially in a long-running editor that imports arbitrary documents.

Sharing can occur at different granularities. A style flyweight may be useful even if glyphs are handled elsewhere. The design should target the substantial repeated state rather than reproduce a textbook structure that does not match the system's allocations.

### Sharing moves responsibility outward

Flyweight reduces duplicated state by making clients or context objects supply the extrinsic portion. That can make method calls more detailed and place more responsibility on the caller. A draw operation may need position, scale, and selection information that previously lived in one self-contained object.

The tradeoff is worthwhile when object populations are large and the repeated portion is significant. It is less convincing for a few dozen objects, or when nearly every value differs. Pool lookups, keys, references, and management can cost more than they save.

Threading needs care as well. Immutable shared state is naturally easier to read concurrently, but constructing and managing the pool can still require synchronization. Flyweight does not make the surrounding registry or external rendering resources automatically safe for concurrent use.

Identity must also be understood. Reference equality of two shared styles might be an optimization, but it should not accidentally become the identity of two separate text positions. Logical instance identity remains in the context-specific representation.

### Neighboring designs

Prototype creates a new object from an existing representative, often separating mutable identity. Flyweight intentionally shares a representation. Copying and sharing can coexist, but their goals are different.

Composite supplies a recursive structure whose nodes may reference flyweights for repeated intrinsic data. Proxy controls access to another object; a caching proxy may reduce repeated work, while Flyweight primarily reduces repeated state.

The strongest signal is a measured population of objects with a large, stable common portion. Flyweight works by locating that portion precisely and keeping the independent state genuinely independent.

## Pattern details

**Category:** Structural · **Difficulty:** Advanced

### Use when

- A very large population repeats the same substantial state
- Shared state can remain stable across many contexts

### Not ideal when

- Most object state is unique or heavily mutable
- Sharing overhead exceeds the measured memory benefit

### Prerequisites

- Basic familiarity with objects, interfaces, composition, and inheritance

## Related patterns

[[prototype|Prototype]] · [[composite|Composite]] · [[proxy|Proxy]]

## Source

Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package.

[Canonical GoF reference](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-software-9780201633610)
