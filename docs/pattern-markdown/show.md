# Compositional displays

`!show` can display an immutable typed collection, independently of how it was
created. The existing `!show { Markdown }` form remains supported unchanged.

```pattern
:language 1
ideas = [
  {id: "a", name: "Improve onboarding", effort: 2, impact: 5, priority: 3, category: "Product", scenario: "Expected", affects: "b"},
  {id: "b", name: "Improve handovers", effort: 4, impact: 3, priority: 2, category: "Service", scenario: "Expected", affects: ""},
]
!show {{ideas}} {
  :map effort, impact
  :group category
  :order priority desc
  :link affects
  :split scenario
}
-> end
```

The double braces reference an existing binding or record field, not an inline
expression. Transform collections using the existing expression language first.
All five properties are optional, may be combined in any order, and may occur
only once. There are no framework names or renderer-specific layout properties.

| Property | Meaning |
| --- | --- |
| `:map attribute` | One dimension: numeric spectrum, temporal timeline, or labelled categorical bands |
| `:map first, second` | Two-dimensional map; first dimension is horizontal, second vertical |
| `:group attribute` | Labelled sections/categories, without overriding mapped positions |
| `:order attribute [asc\|desc]` | Stable ordering; `asc` is the default |
| `:link attribute` | Directed relationships, inferred as a tree or network |
| `:split attribute` | Separate context-labelled views with shared axis domains |

No properties means a labelled collection. Order alone means an ordered list;
group plus order means ordered items within labelled groups. A mapping takes
precedence over tree/network layout while retaining relationship arrows and text.
Split applies the same mapping/grouping/ordering to each context.

## Attribute types and inference

- Numbers retain numeric distance. Equal values are centred, not divided by zero.
- Closed enums use declaration order, including declared levels with no items.
  For example, `type Level = event | pattern | structure | assumption` supplies
  ordered bands. Ordinary text categories use first-encounter order for mapping;
  text ordering is lexicographic. Boolean and choice values are categorical.
- There is no separate date type in the current language. Text that consistently
  contains ISO dates (`2026-10-03`) or zoned date-times
  (`2026-10-03T12:30:00Z`, `2026-10-03T13:30:00+01:00`) maps chronologically.
  Dates mean midnight UTC. Fractional seconds are accepted. Unzoned date-times
  are not inferred. Invalid calendar dates or mixed date/non-date strings produce
  a warning and a labelled fallback, not invented dates.
- Nested scalar fields such as `scores.effort` work. Records/lists cannot be
  mapped, grouped or ordered directly. Lists of scalars expose `value` for
  mapping; choices expose `value` and `label`.
- Labels prefer `name`, `title`, `label`, `idea`, `text`, then `id`; otherwise the
  original value is displayed. All source fields remain visible as text.

## Relationships

Use unique text `id` fields. Choice collections use their choice value as the ID.
Other collections receive stable `item-1`, `item-2`, … identifiers before sorting.
A relation contains one target ID, a list of IDs, or choice values. Empty text or
an empty list means no relation.

An attribute whose final path segment is `parent` means “this item's parent”, so
arrows run from parent to child. Other attributes mean “this item points to these
targets”. Acyclic graphs with at most one incoming edge per node are trees;
multiple-parent or cyclic graphs are networks. Cyclic edges are dashed and also
labelled “cycle” in the visible text alternative.

Duplicate IDs and unresolved targets produce source-span warnings and a labelled
collection fallback. Cross-context links cannot be drawn within an individual
split panel: they produce a warning and remain in the original field text.
These are explicit heuristics, not guesses about the meaning of causal labels.

## Existing collection and rating commands

Collections are immutable. `!rate` binds a scalar answer, not a mutable collection
attribute. Use the existing `each`/`!collect` syntax to construct rated records,
then pure `map`, `filter`, or `sort` expressions before display:

```pattern
:language 1
fn scored(item: {name: text, effort: number, impact: number}) -> {name: text, effort: number, impact: number, priority: number} => {name: item.name, effort: item.effort, impact: item.impact, priority: item.impact - item.effort}
ideas = [{name: "Improve onboarding"}, {name: "Improve handovers"}]
rated = each idea in ideas {
  effort = !rate 1..5 {
    How much effort would {{idea.name}} take?
  }
  impact = !rate 1..5 {
    How much impact would {{idea.name}} have?
  }
  -> yield {name: idea.name, effort: effort, impact: impact}
}
ranked = map(rated, scored)
!show {{ranked}} {
  :map effort, impact
  :order priority desc
}
-> end
```

See the tested interactive example in `crates/pattern-core/tests/show.rs` for a
complete collecting/rating/transformation run. Displays do not mutate bindings,
consume a reply, or add an interaction step. They remain in replayed history.

## Rendering, accessibility and limits

Rust resolves intent to a serialized `ShowView`; Svelte handles layout only.
The same Rust compiler/runtime powers the browser WASM and native host. Legacy
`content.show` Markdown payloads remain unchanged; structured displays add an
optional `view` beside a complete plain-text alternative.

Every view has visible labels and a full attribute/relationship list. Charts do
not rely on colour, hover or dragging. SVG titles/descriptions and arrow IDs are
unique per instance. Light/dark treatment uses application tokens. On narrow
screens (600px and below), graphics become readable lists while dimensions,
context labels, groups and relationships remain visible.

The native SVG graph layout is deterministic, not a force simulation. Graphs
above 80 nodes or 1,000 edges fall back to complete labelled data with a warning;
graphics above 80 items are omitted. Coincident points share a numbered marker,
with every item still available in the full list. No visualization dependency was added.

## Local review

Run `pnpm show:demo`, then open `http://127.0.0.1:4203`. This private development
entry is excluded from the public website. It contains editable source and runs
the actual compiled WASM engine, without AI, network calls or saved user data.
It stops at the first interaction; static demo fixtures need no replies.

- [Initiatives: collection, order, grouping, spectra, maps, scenarios](examples/show-initiatives.pattern.md)
- [Relationships, feedback loops, dates and ordered layers](examples/show-relationships.pattern.md)

Compiler errors identify the offending source bytes and suggest close field-name
matches. Unsupported constructs fail compilation; malformed runtime data remains
readable with warnings. These fixtures and the tests use only the five properties.
