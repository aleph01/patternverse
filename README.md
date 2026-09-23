# Patternverse

Patternverse is a personal-first, offline-capable knowledge environment for reusable procedural
knowledge: approaches that help answer _“What can I do in this situation?”_

The durable artifact is a portable corpus of Markdown, YAML frontmatter, and local assets. The web
application is a reading, authoring, and navigation environment around that corpus.

## Project status

This repository currently implements **Milestone 7: PWA and offline behavior** plus **Cloud Sync
Milestones 0–2**, with product Milestone 6 intentionally deferred:

- a pnpm/TypeScript monorepo
- SvelteKit static web application
- strict V1 runtime schemas and a framework-independent compiler
- an eleven-entity Patternverse Commons example corpus
- prerendered Pattern, Concept, Practice, Collection, and Verse pages
- sanitized Markdown/GFM rendering with resolved wiki links
- backlinks and derived relationship sections
- responsive editorial reading, Collection, and Verse layouts
- IndexedDB-backed personal entity CRUD behind a workspace boundary
- Draft/Published local state and private usefulness ratings
- personal entities blended with Commons in the homepage Library calculation
- a browser Markdown editor with structured metadata, validation, local Drafts, and explicit saves
- one source-aware Library assembled from local entities and Patternverse Commons
- offline-capable lexical search across titles, aliases, summaries, bodies, Verses, and Collections
- source and entity-type filters over the blended result set
- Commons Verse pages enhanced with matching personal entities from the local workspace
- an installable web app manifest with desktop/mobile install icons and shortcuts
- a versioned service worker that precaches the application shell, complete textual Commons corpus,
  static search payload, editor, and local visual assets
- offline reloads for home, search, every Commons reading route, and the local editor
- connectivity feedback plus a deliberate update-ready action that protects active writing sessions
- formatting, linting, unit tests, browser smoke tests, and CI
- Cloudflare Pages-compatible static output
- a provider-neutral, pure three-way corpus sync planner with explicit conflict resolution
- Dropbox selected as the sole first complete remote provider behind a future `RemoteCorpusStore`
  abstraction
- architecture and security records that keep read-only public Sources separate from personal sync
- a provider-neutral remote-store contract, deterministic in-memory provider, execution journal,
  stale-revision replanning, and partial-write recovery

The compiler parses Markdown/YAML, validates the corpus, resolves source-aware wiki links, derives
relationships, validates declarative Practices, detects broken references and Collection cycles, and
produces normalized JSON and lexical search documents. SvelteKit loads that output at build time and
prerenders stable Commons URLs. Personal entities and usefulness state persist locally in IndexedDB;
the browser builds a single MiniSearch index over those entities and the static Commons documents.
SvelteKit's service-worker build then precaches that complete static layer while IndexedDB keeps
personal entities available without a connection. Save/Copy and portable import/export remain
deferred with Milestone 6; Practice execution remains Milestone 8.

## Requirements

- Node.js 22.23.2 (see `.nvmrc` and `.node-version`)
- pnpm 10.14.0

## Run locally

```sh
pnpm install
pnpm dev
```

The development server prints the local URL. No database, Docker service, Python runtime, API key,
or account is required. Changes beneath `content/` trigger a development reload. Commons drafts are
included during local development and excluded from production builds; set
`PATTERNVERSE_INCLUDE_DRAFTS=true` for a draft-enabled preview build.

Personal workspace data is stored only in this browser's IndexedDB. It persists across reloads, but
it is not a cloud backup and is removed if the site's browser data is cleared. Portable workspace
export arrives in Milestone 6.

After the first successful online load, the production build can be installed and used offline.
Patternverse caches all current Commons text and search data as one versioned snapshot. When a new
snapshot is ready, the application offers an explicit update action rather than replacing the open
version during an editing session.

## Commands

```sh
pnpm dev               # run the web application
pnpm build             # build all packages and the static site
pnpm test              # run unit tests
pnpm test:e2e          # run essential Playwright journeys
pnpm check             # run TypeScript and Svelte checks
pnpm lint              # run ESLint and checks
pnpm format            # format the repository
pnpm format:check      # verify formatting
pnpm validate:content  # validate the complete V1 Commons corpus
pnpm compile:content   # write development output to generated/commons.json
pnpm compile:content:production # compile Commons without drafts
```

Read [the architecture](docs/architecture.md), [the content format](docs/content-format.md),
[the sync architecture](docs/sync/README.md), and [the contribution guide](CONTRIBUTING.md) for the
current boundaries and planned evolution.

## Repository layout

```text
apps/web/           SvelteKit reading interface
packages/schema/    shared types and runtime schema boundary
packages/compiler/  framework-independent corpus compiler boundary
packages/workspace/ IndexedDB-backed personal workspace boundary
packages/sync-domain/ pure provider-independent synchronization rules
packages/remote-store/ provider contract, fake, executor, journal, and orchestration
content/            portable Patternverse Commons source
docs/               architecture and content documentation
```

## Deployment

The web build is fully static and lands in `apps/web/build`. `apps/web/wrangler.jsonc` declares that
directory for Cloudflare Pages. Deployment remains a separate explicit action; CI first proves that
the corpus, packages, site, and essential browser journeys are healthy.
