# Patternverse

Patternverse is a personal-first, offline-capable knowledge environment for reusable procedural
knowledge: approaches that help answer _“What can I do in this situation?”_

The durable artifact is a portable corpus of Markdown, YAML frontmatter, and local assets. The web
application is a reading, authoring, and navigation environment around that corpus.

## Project status

Current source capabilities (not a guarantee that every release enables every feature):

- pnpm/TypeScript packages, a static SvelteKit website, and a desktop wrapper
- strict article schemas, a framework-independent corpus compiler, sanitized Markdown,
  source-aware links, backlinks, and prerendered Commons reading pages
- a Library combining Commons and private content, with verse, saved-entry and usefulness
  filters, search, card/list views, and numbered pagination for patterns and collections
- a local workspace for personal verses, collections, patterns, saved references, ratings,
  situations, and explicitly saved practice history
- article authoring with focus mode, structured metadata, and Pattern Language block/source
  editing with diagnostics and runtime preview
- one Rust Pattern Language compiler/runtime shared by website practices, previews, Mira,
  and the experimental inline worksheet; legacy YAML practices are import-only
- portable Markdown/plain-text workbooks for supported non-AI practices
- validated binary CBOR workspace backups and confirmed replacement restore, including older
  supported JSON backups; Mira retains its separate encrypted archive
- optional Dropbox sync using the shared merge/recovery infrastructure, with reviewed conflicts;
  sign-in-only builds support device-local automatic sync settings
- Mira conversation/session coordination over a shared core and separate encrypted device storage
- read-only public MCP access and a deliberately limited inline worksheet prototype
- installed-PWA offline caching and background application updates
- content checks, type checks, linting, unit/property tests, and desktop/mobile browser tests

Articles remain Markdown with YAML metadata. Executable practices use
`patternverse-language` fences and the Rust runtime, not a YAML interpreter in the UI.
The corpus compiler produces normalized entities and lexical search documents; SvelteKit
loads these at build time. The browser augments them with IndexedDB data through the workspace
boundary. Public content is not edited by private saves or backup restore.
Accounts, shared workspaces, collaborative execution, and authenticated cross-host practice
continuation are not implemented. Feature flags and deployment configuration determine which
optional integrations a build exposes.

Selected early features share a [preview mode](docs/preview-mode.md): open a page with
`?preview=1` to enable them in the current tab. Bearings is currently in preview.
This controls visibility, not private access.

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

Personal workspace data is local-first in this browser's IndexedDB. It persists across reloads,
but clearing site data can remove it. Export a backup from Workspace → Sync & backup;
restoring replaces private workspace data only after preview and confirmation. Backups are
unencrypted and exclude Mira history and credentials. Optional Dropbox sync is a separate,
feature-flagged integration; see the [sync guide](docs/sync/README.md) for its protection modes.

After the first successful online load, the production build can be installed and used offline.
Installation saves a small standalone offline starting page. Browsing saves visited pages and their
loaded resources; open the library, editor, or Mira online before using those screens offline.
Choose **Download library for offline use** in **My workspace → Settings → Offline access** to save the full current Commons text,
search data, and application resources. This optional download uses two requests at a time, can be
paused, and resumes without downloading already cached resources again. A failed request pauses it;
there is no automatic full-library download or retry loop. Browser storage limits or clearing site
data can remove offline content. After a release, download the new library snapshot again.
Updates activate automatically without reloading open tabs. Old snapshots are retained while tabs
may still need their immutable assets. Once those windows close or reload, the next page visit/status
check cleans up retired snapshots.

The library initially loads browsing summaries, membership, and labels. Focusing its search field
or restoring a nonempty search loads the full-text corpus once, from an immutable URL identified
by the accepted page data. The browser verifies its bytes before use, and the service worker checks
the release fingerprint when serving or caching it. Index
construction is deferred until a query needs it; ordinary browsing does not download the corpus
or construct the full-text index. Personal documents and queries remain on the device.

While the full corpus is loading or unavailable, search is explicitly limited to public titles,
summaries and labels, plus full-text personal content. A failed download requires an explicit retry.
Successfully loaded search data is cached for offline use, and the Settings library download also
includes it without requiring a prior search. Old tabs retain their matching search snapshot under
the existing update policy. Browser storage eviction can still remove cached data.

See [library loading measurements](docs/performance/library-loading.md) for the implementation,
local before/after results, validation, and reproduction commands.

Prerendered documents and page data are pinned to the accepted application release. Repeat visits
use matching cached responses immediately; they do not wait for the network. On a cache miss, the
worker checks the response against a fingerprint generated from that release's static files before
saving or displaying it. Query filters and SvelteKit invalidation flags can reuse these static
responses; browser-side filters and private IndexedDB reads still run normally. Unknown routes,
authentication, explicit no-store requests, and sensitive responses bypass navigation caching.

A background deployment check runs at most once every five minutes, with simultaneous checks
deduplicated. Changed content on a cache miss also requests an update. Workers activate automatically;
open tabs retain their certified older page data and unsaved work until they reload. New visits can
load the current deployment directly. Tabs opened before this navigation policy existed must reload
to certify their release. An older tab needs to reload before downloading the newer library;
download completion notices apply only to the matching release.
Static hosting may compress responses, but must preserve the generated HTML/JSON bytes; rewriting
them invalidates their fingerprints. Installation still downloads only the standalone offline page.

## Commands

```sh
pnpm dev               # run the web application
pnpm build             # build all packages and the static site
pnpm test              # run unit tests
pnpm test:e2e          # run essential Playwright journeys
pnpm check             # run TypeScript and Svelte checks
pnpm lint              # run ESLint and checks
pnpm audit:components  # flag large or complex components and supporting modules
pnpm test:audit        # test the component-audit configuration and report
pnpm format            # format the repository
pnpm format:check      # verify formatting
pnpm validate:content  # validate the complete V1 Commons corpus
pnpm compile:content   # write development output to generated/commons.json
pnpm compile:content:production # compile Commons without drafts
```

The component audit uses the already-installed ESLint and Svelte tooling; it needs no service,
account, or additional dependency. It scans application and shared-package source, excluding tests,
type declarations, and generated output. It reports long files/functions, oversized Svelte
script/template/style blocks, complex branching, deeply nested logic, excessive statements, and
large parameter lists. The thresholds live in `eslint.components.config.js`.

Use `pnpm audit:components --all` for every location or `pnpm audit:components --json` for a complete
machine-readable report. Warnings are advisory and do not change normal linting or CI;
`pnpm audit:components --strict` opts into failing on warnings. Parse errors and existing lint errors
always fail the audit. These signals suggest places to inspect, not automatic refactoring decisions:
a long stylesheet is not the same as a component mixing storage, navigation, and domain logic.

Read [the architecture](docs/architecture.md), [the content format](docs/content-format.md),
[the sync architecture](docs/sync/README.md), and [the contribution guide](CONTRIBUTING.md) for the
current boundaries and planned evolution.

See the [compatibility inventory](docs/compatibility.md) before removing legacy imports,
storage names, old routes or archived checkpoint sources. Historical milestone documents
are labelled separately from the current architecture.

## Repository layout

```text
apps/web/           SvelteKit reading interface
apps/mcp/           read-only MCP tools over published Commons (stdio + HTTP)
packages/schema/    shared types and runtime schema boundary
packages/compiler/  framework-independent corpus compiler boundary
packages/workspace/ IndexedDB-backed personal workspace boundary
packages/companion-core/ Mira session transitions and reply persistence ports
packages/sync-domain/ pure provider-independent synchronization rules
packages/remote-store/ provider contract, fake, executor, journal, and orchestration
crates/pattern-core/ Pattern Language compiler and runtime semantics
crates/pattern-host/ bounded native/WASM host and checkpoint replay
content/            portable Patternverse Commons source
docs/               architecture and content documentation
```

## Deployment

The web build is fully static and lands in `apps/web/build`. `apps/web/wrangler.jsonc` declares that
directory for Cloudflare Pages. After the one-time Cloudflare/GitHub setup, CI automatically
publishes updates pushed to `main`, only after the corpus, packages, site, and essential browser
journeys pass verification. See the [website deployment guide](docs/web-deployment.md).
Use `pnpm deploy:web --build-only` to check a release without uploading it.

For the macOS Patternverse app with locally run **mira** and optional local dictation, see the
[desktop setup guide](apps/desktop/README.md).

For AI-host access to public patterns and Pattern Language definitions, see the [MCP setup guide](docs/mcp.md).
