# Architecture

## Guiding boundary

Patternverse treats the knowledge corpus as the durable product. The application may evolve or be
replaced; the Markdown, YAML frontmatter, and local assets must remain understandable and portable.

The implementation favors pure transformations and explicit inputs and outputs. File access,
IndexedDB, browser APIs, and network access belong at system boundaries.

## Workspace, Source, and Library

- **Workspace** — the user's editable Patternverse, stored in browser-native persistence initially.
- **Source** — a read-only external corpus. Patternverse Commons is the first Source.
- **Library** — a unified, derived view of Workspace entities, saved references, Commons, and future
  Sources.

Global identity is `(sourceId, entityId)`. UI code should consume Library-level data and should not
assume that Commons files are the only source.

## Static and dynamic split

Commons content is compiled during the build and public pages are prerendered where practical.
Personal content loads in the browser from IndexedDB and enhances the unified Library. This keeps the
initial system backend-free while supporting useful offline behavior.

Static SvelteKit output uses `@sveltejs/adapter-static`. Cloudflare Pages can serve the resulting
`apps/web/build` directory without a conventional application server.

## Packages

### `@patternverse/schema`

Owns shared TypeScript types and strict Zod runtime schemas. It is independent of Svelte. The package
defines the complete V1 discriminated entity union, source identity, usefulness state, and the
declarative Practice step/block union.

### `@patternverse/compiler`

Owns parsing, normalization, resolution, relationship derivation, diagnostics, serialization, and
search-document generation as framework-independent transformations. Filesystem access and compiled
JSON writing are isolated in a boundary module; domain transformations remain explicit functions.

The intended pipeline is:

```text
Markdown + frontmatter -> RawEntity[] -> CompiledCorpus
```

`CompiledCorpus` contains normalized entities, resolved links, backlinks, Collection membership,
Verse membership, Pattern/Practice relationships, structured Practice definitions, unresolved
references, diagnostics, and lexical search documents. Derived relationships are never serialized
back into authored Markdown.

### `@patternverse/workspace`

Owns the browser-local persistence boundary. Dexie contains the IndexedDB integration, while the
package exposes a small functional API for creating, reading, updating, and deleting personal
entities plus reading and writing private usefulness values. Every write is checked by the shared
runtime schema, new content defaults to Draft, entity IDs cannot change during updates, and personal
entities always use the `personal` source.

The package also owns the source and Library abstractions. A Library is a pure assembly of ordered
Sources, entries, and normalized search documents; source-qualified identity preserves a personal
and Commons entity with the same ID as distinct entries. Personal entities are transformed into the
same search-document shape produced by the compiler. MiniSearch sits behind a small local search
interface with field weighting, prefix/fuzzy matching, and source/type filters.

### `@patternverse/web`

Owns the SvelteKit interface. Components must not acquire compiler/domain responsibilities or call
IndexedDB directly. Reading, authoring, management, and Practice application are distinct visual
modes, not variations of one dashboard.

Milestone 2 loads Commons through the compiler in server-only modules and prerenders one stable page
per entity. A small view-model boundary converts derived references to compact entity summaries.
Markdown is parsed into an AST, resolved wiki links become ordinary internal links, and the HTML tree
is sanitized before a dedicated renderer component receives it. Raw authored HTML is never enabled.

Client components acquire the workspace only through a lazy client boundary; Svelte components do
not call IndexedDB directly. The homepage Library receives build-time Commons entries/search
documents, adds browser-local entities, and constructs one in-memory lexical index without a server
request. Search therefore blends personal and Commons content and remains available offline.
Commons Verse pages apply the same Library principle by adding matching local members after
hydration. Usefulness controls persist private user state for both personal and Commons references.

Interactive Practices use a strict `PracticeDefinition` shared by the compiler, visual builder, and
runner. A Pattern article remains at `/pattern/:id`; an optional embedded Practice has the stable
route `/pattern/:id/practice`. The route receives compiled data and safely rendered Markdown blocks,
while a framework-independent session module owns immutable response, navigation, validation, and
timer updates. The runner keeps the session only in component memory and clears it on completion or
confirmed exit. It does not call the workspace, sync, analytics, or logging boundaries.

The Pattern editor presents Article and Practice modes over one editor value. Article Markdown is
kept out of the visual Practice controls. On save, the validated `PracticeDefinition` is serialized
into one `patternverse-practice` YAML fence; on reopen, the same definition is parsed back out and the
article is restored separately. Existing fences are replaced in place, so unrelated article Markdown
is not rewritten. Pure builder functions implement add/remove/move/duplicate/update operations with
immutable inputs and regenerated durable IDs.

### PWA and offline boundary

Milestone 7 uses SvelteKit's native service-worker build rather than the previously considered
`@vite-pwa/sveltekit` wrapper. The installed SvelteKit version exposes the complete build asset,
static file, prerendered page, and build-version lists through `$service-worker`, so an additional
runtime dependency would not improve the current static-first use case.

The service worker maintains two versioned cache families:

- **Precache** — the application shell, manifest/icons, editor, homepage/search documents, every
  prerendered Commons entity page and its SvelteKit data payload. This is an atomic textual Commons
  snapshot and makes any current or future saved Commons reference available offline too.
- **Runtime** — successful same-origin reading requests that are not already part of the snapshot.
  This is deliberately limited to safe `GET` responses.

Navigations use the cached versioned shell and probe connectivity in the background. Local entities
and usefulness state remain in IndexedDB, so reload, search, creation, and editing do not depend on
the network. A waiting service worker never calls `skipWaiting` on its own: the UI exposes an update
action, then reloads only after the user accepts the new version. Old versioned caches are removed on
activation. The app does not cache cross-origin requests or non-GET operations.

## Implemented compiler libraries

- **Markdown AST:** Unified with Remark Parse; wiki links are extracted only from Markdown text nodes,
  so code spans and code blocks are not interpreted as relationships.
- **Markdown rendering:** Unified/Remark with GFM, Remark/Rehype conversion, and Rehype Sanitize.
  Raw HTML is disabled; unsafe URL schemes are removed. Machine-readable Practice blocks are omitted
  from reading prose while remaining present in compiled data.
- **YAML:** `yaml` for manifests, frontmatter, structured Practice blocks, and export serialization.
- **Runtime validation:** Zod strict objects and discriminated unions.
- **Personal persistence:** Dexie 4 over IndexedDB, with `fake-indexeddb` used only for boundary tests.
- **Local lexical search:** MiniSearch 7 over normalized Commons and personal search documents.

## Deferred boundary

Milestone 6 Save/Copy and archive import/export remain intentionally unimplemented. This does not
reduce current offline coverage because the entire Commons corpus is already cached; the future
saved-reference model can reuse the same offline snapshot without changing canonical ownership.

## Privacy and safety

Personal content is local-first. Usefulness is user state, never authored knowledge metadata.
Interactive Practice responses are always ephemeral and are excluded from personal workspace and
remote sync data. Imported content is untrusted: raw HTML and unsafe
URL schemes will be rejected or sanitized, and declarative Practice blocks can never execute code.
