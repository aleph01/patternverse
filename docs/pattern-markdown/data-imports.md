# Reference data and structured results

Content entries can publish named JSON libraries through frontmatter:

```yaml
libraries:
  - id: materials
    src: ../assets/libraries/materials.json
```

The content compiler registers `commons:materials` for the Commons source. Paths
are relative to the declaring content file and must stay inside the content root.
Excluded content does not publish data. This metadata is separate from search tags.

The resource contains a Pattern Language type and plain JSON records:

```json
{
  "record_type": {"record": {"id": "text", "name": "text", "density": "number"}},
  "records": [
    {"id": "wood", "name": "Wood", "density": 600},
    {"id": "steel", "name": "Steel", "density": 7850}
  ]
}
```

Records must exactly match their declared type and have unique, nonblank text IDs.
Each resource is bounded to 1 MiB and 1,000 records; a snapshot admits at most 64
resources and 2 MiB of resource JSON. Loading data never executes code.

```pattern
:language 1
:import materials from "commons:materials"
description = !ask {
What are you making?
}
matches = !agent {
  :returns list[{item: ref[materials], reason: text}]
  :min 0
  :max 3
  :context description
  :context materials
Suggest only materials supported by this description. Return no matches if none fit.
}
rows = each match in matches {
  material = lookup(materials, match.item)
  -> yield {name: material.name, density: material.density, reason: match.reason}
}
!show {{rows}} {
}
-> end
```

`materials` is immutable. `records(materials)` returns its typed record list.
`ref[materials]` refers to a known ID in that exact resolved resource, so
`lookup(materials, match.item)` returns its record. Cross-resource references are
rejected. Lookup with arbitrary text returns `Optional[record type]` because the ID
might be absent.

`!agent` supports typed records, lists and nested values. `:min` and `:max` constrain
list length; zero permits an empty result. Repeated `:context` attributes explicitly
share up to eight bound expressions with the model, including complete catalogue
records. Other bindings are not automatically shared. Hosts request JSON and
validate exact fields, types, bounds and reference membership. Rust checks the
receipt again before advancing. These structural checks do not establish relevance.

Use ordinary collection displays for canonical lookup values and generated fields.
A branch on `count(matches)` can provide a custom empty message. No domain-specific
matching or display operation is required.

## Resolution and saved runs

Data imports resolve the latest resource when a new run or fresh inspection starts.
The web host loads a same-origin index and checks the resource's SHA-256. Rust
validates and freezes the schema, records and reference IDs in the snapshot.
Reopening a saved run uses that copy without fetching current data. Resource edits
change new snapshot identities while preserving old runs.

Existing executable imports, `:import "helper@m4-v1:…" as helper`, stay pinned.
Neither form permits arbitrary remote URLs. Native hosts supply data through
`ExecutableSnapshot::build_with_data`; source transport accepts a `data` map.
The free AI service retains its request/context limits. Large catalogues can require
a connected provider; data is never silently truncated to fit a provider.
