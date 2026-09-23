# Contributing to Patternverse

## Add or change Commons content

Patternverse Commons lives in `content/`. Put entities in the directory for their type:

- `content/patterns/`
- `content/concepts/`
- `content/practices/`
- `content/collections/`
- `content/verses/`

The directory is organizational only. The frontmatter `id` is the stable identity, `verses` defines
Verse membership, and a Collection's `items` field defines its members. Do not infer or encode graph
relationships through folder nesting.

Keep assets local under `content/assets/` and refer to them with relative paths. Do not add tags,
raw executable HTML, scripts, or unofficial frontmatter fields.

## Validate a change

Install dependencies once, then run:

```sh
pnpm format:check
pnpm lint
pnpm validate:content
pnpm test
pnpm build
pnpm test:e2e
```

Validation is strict. It checks the manifest, frontmatter, supported fields, entity IDs, wiki links,
source-aware references, Collection membership and cycles, Verse membership, Practice relationships,
and structured Practice blocks. Published invalid Commons content must not be merged.

## Pull requests

Use a short-lived branch, keep the change focused, and explain the user-visible or corpus-level
effect. CI must pass before merging. `main` should remain deployable; pull requests are the place for
review and preview deployments.
