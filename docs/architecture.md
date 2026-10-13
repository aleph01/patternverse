# Architecture

## Guiding boundary

Patternverse treats the knowledge corpus as the durable product. The application may evolve or be
replaced; the Markdown, YAML frontmatter, and local assets must remain understandable and portable.

The implementation favors pure transformations and explicit inputs and outputs. File access,
IndexedDB, browser APIs, and network access belong at system boundaries.

## Workspace, Source, and Library

- **Workspace** — the ownership boundary for private, editable content, persisted locally.
- **Source** — a read-only external corpus. Patternverse Commons is the first Source.
- **Library** — a unified, derived view of Workspace entities, saved references, Commons, and future
  Sources.

Global identity is `(sourceId, entityId)`. UI code should consume Library-level data and should not
assume that Commons files are the only source.

One stable private personal workspace owns authored content, saved library references,
usefulness ratings, saved practice runs, and situations. Workspace ownership is distinct
from publication source identity. The stored `favorites` table/backup field is a
compatibility name for saved entries, not a second favorites feature. Accounts and shared
workspaces are not implemented. Mira's encrypted device storage remains separate.
See the historical [local workspace foundation](local-workspaces.md), current
[practice history](practice-history.md), and [sync boundaries](sync/README.md).

## Static and dynamic split

Commons content is compiled during the build and public pages are prerendered where practical.
Personal content loads in the browser from IndexedDB and enhances the unified Library. This keeps the
initial system backend-free while supporting useful offline behavior.

Static SvelteKit output uses `@sveltejs/adapter-static`. Cloudflare Pages can serve the resulting
`apps/web/build` directory without a conventional application server.

All website server routes use `lib/server/commons.ts`. Outside development it shares one
validated `CompiledCorpus` promise per draft-inclusion setting and server-module lifetime,
including concurrent route loads during prerendering. Each build process starts fresh; there
is no persistent disk cache or cached private workspace data. Compiler errors still fail the
load and evict only that failed snapshot, allowing a retry. Development deliberately bypasses
the cache so Vite's existing content/manifest reloads always read current files. Route-specific
article rendering and Library projections remain separate from the compiler snapshot.

## Frontend styling boundary

`apps/web/src/lib/styles/tokens.css` is the shared source for the existing palette
and verse colors, basic spacing/type decisions, borders, control sizes, and
keyboard focus. `app.css` imports it before global foundations and page rules.
Existing `--ink`, `--paper`, `--line`, and palette names remain compatible;
`--muted` and `--ink-muted` now explicitly resolve to light-surface secondary text.
Dark features opt into `--text-on-dark` and `--text-muted-on-dark` locally rather
than changing the entire application when the operating system theme changes.

The first feature extraction moves sync layout, controls, colors, and responsive
rules into `SyncAndBackup.svelte`. Its intentionally global legacy selectors
preserve existing cascade weights and shared control styling; compact overrides
remain scoped. Paragraph rules now target direct children so light review/upgrade
panels do not inherit dark-surface text, and those panels reset their muted text
aliases explicitly. This is an incremental ownership cleanup, not a new CSS
framework or component library.

`app.css` is now an import-only composition root. Feature bases live under
`lib/styles/features/`; Mira's existing base lives in `lib/mira/base.css`, before
its route-owned `workspace.css` overrides. Shared foundations, headings, footer,
and reduced-motion rules have explicit files. Existing mixed responsive blocks
remain in `lib/styles/responsive-compatibility.css` rather than being duplicated
or reordered. The extraction preserves the complete ordered CSS rule stream,
including media queries and intentionally cross-feature legacy selectors.
`lib/styles/README.md` documents ownership and these compatibility exceptions.
Composition tests guard import order and single loading; browser checks exercise
the existing layouts. This changes ownership, not the design or CSS framework.

Feature-only measurements and exceptions stay local instead of becoming tokens
simply because they occur once. Standalone embedded renderers that do not load
the website stylesheet retain their existing fallbacks and host-owned styling.

## Packages

### `@patternverse/schema`

Owns shared TypeScript types and strict Zod runtime schemas. It is independent of Svelte. The package
defines the complete V1 discriminated entity union, source identity, usefulness state, and the
legacy Practice step/block union retained for import validation. Pattern Language semantics
belong to Rust, not the legacy schema.

### `@patternverse/compiler`

Owns parsing, normalization, resolution, relationship derivation, diagnostics, serialization, and
search-document generation as framework-independent transformations. Filesystem access and compiled
JSON writing are isolated in a boundary module; domain transformations remain explicit functions.

The intended pipeline is:

```text
Markdown + frontmatter -> RawEntity[] -> CompiledCorpus
```

`CompiledCorpus` contains normalized entities, resolved links, backlinks, Collection membership,
Verse membership, Pattern/Practice relationships, extracted Pattern Language source and import-only
structured Practice definitions, unresolved references, diagnostics, and lexical search documents.
Derived relationships are never serialized
back into authored Markdown.

### `@patternverse/workspace`

Owns the browser-local persistence boundary. Dexie contains the IndexedDB integration, while the
package exposes a small functional API for creating, reading, updating, and deleting personal
entities plus private usefulness values, workspace metadata, source-qualified saved entries,
practice history, situations, validated backup/restore, and recoverable conditional writes.
Article/reference writes are checked by the shared
runtime schema, new content defaults to Draft, entity IDs cannot change during updates, and personal
entities always use the `personal` source.

The package entry point composes operation groups around one Dexie connection, one
workspace metadata cache and the existing injectable clock. `api.ts` keeps the public
contracts; `persistence/database.ts` keeps database versions 1–5 and the ownership upgrade;
`records.ts` keeps stored-record projections. Entity writes, library annotations,
practice history and situations have their own persistence modules. These are internal
implementation boundaries, not new package APIs or interchangeable storage backends.

`persistence/transfer.ts` keeps snapshots, conditional sync writes and backup replacement
together so cross-table transaction scopes remain explicit. Restore still captures its
recovery copy inside the same transaction as replacement. Sync still validates and plans
record-level conditional writes before applying them atomically. Metadata cache updates
occur only after successful transactions. No database name, table/index definition,
record format, backup format, default status, or saved-entry/favorites alias changes.

The package also owns the source and Library abstractions. A Library is a pure assembly of ordered
Sources, entries, and normalized search documents; source-qualified identity preserves a personal
and Commons entity with the same ID as distinct entries. Personal entities are transformed into the
same search-document shape produced by the compiler. MiniSearch sits behind a small local search
interface with field weighting, prefix/fuzzy matching, and source/type filters.

### `@patternverse/web`

Owns the SvelteKit interface. Components must not acquire compiler/domain responsibilities or call
IndexedDB directly. Reading, authoring, management, and Practice application are distinct visual
modes, not variations of one dashboard.

The website loads Commons through the compiler in server-only modules and prerenders one stable page
per entity. A small view-model boundary converts derived references to compact entity summaries.
Markdown is parsed into an AST, resolved wiki links become ordinary internal links, and the HTML tree
is sanitized before a dedicated renderer component receives it. Raw authored HTML is never enabled.

Client components acquire the workspace only through a lazy client boundary; Svelte components do
not call IndexedDB directly. The Library receives build-time Commons entries/search
documents, adds browser-local entities, and constructs one in-memory lexical index without a server
request. Search therefore blends personal and Commons content and remains available offline.
Commons Verse pages apply the same Library principle by adding matching local members after
hydration. Usefulness controls persist private user state for both personal and Commons references.

`WorkspaceLibrary.svelte` delegates catalog and result preparation to
`lib/client/workspace-library-view.ts`. The catalog reuses the workspace's browsing
policy and lexical search, indexing verse membership and collection-name metadata
once per content snapshot. Its pure view combines saved scope, source-qualified
ratings, verse/category filters, featured ordering, limits and result labels.
Verse navigation is based on the full library, not current search results; a verse
removed from the saved library resets the selection to all. The host supplies the
editor path and retains refresh/subscriptions, focus, layout controls and pagination.
No new search engine, relationship semantics, persistence or routes are introduced.

The situations notebook uses `lib/client/situation-notebook.ts` for its single draft,
450ms debounce and serialized save queue. Each accepted write advances the revision
without replacing newer input. Workspace validation and stale-revision rejection
remain authoritative; failures keep the notebook and its text open. Closing waits
for all current edits, while in-app navigation flushes pending notes without late view updates.
Hard document unload retains the unsaved-change warning; it cannot await IndexedDB writes.
`situation-drag.ts` owns pointer capture, reorder previews, keyboard targets and edge
scroll frames through explicit browser ports. Cancelled or unchanged previews never
write; unmount releases capture and scrolling without committing a move.
`Situations.svelte` retains dialog/focus handling, queue CRUD, notifications and the
existing layout. It reuses `createWorkspaceRefresh` to defer background reads during
edits/drags and resume them when idle. Storage schemas, backup and sync formats are
unchanged. Tests cover overlapping saves, stale revisions, lifecycle cleanup and
generated cancelled-move sequences, plus actual desktop/mobile browser interactions.

Interactive practices use one `patternverse-language` fence and the shared Rust
`pattern-core` compiler/runtime, transported through `pattern-host` and WebAssembly.
The `!form` interaction preserves grouped worksheet questions and required/optional
answers as one atomic typed record. The website, standalone practice routes, and
editor preview share effect components; they do not reinterpret source or own
control-flow rules. The old `/pattern/:id/practice` URL remains compatible.
Answers stay in memory by default. An explicit **Save to workspace** opts the run into
private practice history, including subsequent confirmed revisions. Unsubmitted drafts
and live timer clocks are not persisted; editor previews remain ephemeral.

Small controlled input components live in `lib/practice-inputs`: text answers,
numeric/slider ratings, and single/multiple/ranked choices. The runner, source
preview, Mira selection adapter and step editor reuse these controls or their
selection helpers. Callers own draft initialization, confirmation buttons, copy,
layout and lifecycle; controls never reset drafts, parse source, advance runs,
or write storage. Runtime contracts remain authoritative. Website CSS keeps
worksheet controls unchanged; the guided choice presentation retains Mira's
existing styles rather than forcing one complete renderer on every host.

The neutral browser boundary now lives in `lib/pattern-runtime`: shared Rust view
types, one WASM initialization path, and explicit source-run start/apply/serialize/restore
operations. Mira retains its catalog and encrypted-storage adapter; the editor retains
inspection and input-authoring responsibilities. Their previous type/bridge exports remain
compatibility aliases. The generated WASM files stay at the existing build-script location.

The standalone runner delegates start/restore, submission, answer revisits, provider
selection and declared AI-effect dispatch to `lib/pattern-run/controller.ts`. It reuses
`createPracticeLifecycle` for command/connection coordination and `saveRevisitedStep`
for validated replay. Immutable snapshots preserve pending-effect identity across
unrelated busy/connection updates. Stop and unmount invalidate in-flight work; late
bridge or provider results cannot replace the accepted run. `run-adapters.ts` owns the
existing source/installed-technique, history-read, credential and model-provider ports.
The controller has no Svelte, routing, DOM, timer-clock or persistence-write dependency.
`PatternRun.svelte` retains input drafts, timers, focus, responsive layout and the
existing explicit history-save component. No new execution semantics or storage format
are introduced, and provider/credit checks never redispatch an active paid step.

`PracticeEmbed.svelte` is a second presentation shell for the public Define the Decision
worksheet, using the same `PatternForm.svelte` as the website. It consumes Rust effects;
it does not parse Pattern Language, determine transitions, or persist responses. The prototype supports
worksheet forms only, not all interaction kinds. Checkpoint restoration reuses the bounded
Rust replay/admission path and requires the exact source revision. This is a portability
proof, not a complete embeddable SDK. The separate read-only MCP server in `apps/mcp`
exposes published Commons search, articles, and Pattern Language definitions over stdio
and stateless HTTP. It reuses the corpus
compiler, library search, shared public practice mappings, and Rust `inspect_bundle`
operation; it never starts a run or touches private workspace storage. The Cloudflare Worker
serves a build-time public snapshot with Rust-validated definitions, avoiding runtime
compilation and filesystem dependencies. Transport adapters do not implement language
semantics. See [MCP](mcp.md).

The local editor separates article content from executable source, with highlighting,
completion, Rust diagnostics and a real runtime preview. Legacy `PracticeDefinition`
YAML is read only for import: a shared converter produces language source. Opening a
personal record does not rewrite storage; saving the converted draft writes only
Pattern Language. Article YAML frontmatter is unchanged. See [practices](practices.md).

`lib/pattern-editor/completion.ts` remains the source editor's public completion API.
Its `completion/` modules separate cosmetic lexical context, authoring catalogs,
compiler-projected names/types, and range insertion with indentation/caret restoration.
The facade keeps candidate precedence, prefix filtering, insertion-based deduplication,
and the thirty-item limit. These modules do not validate or execute language constructs;
Rust remains the authority. Pre-extraction snapshots lock down suggestions and edits,
compiler-backed tests cover metadata freshness and scope, generated tests cover range
invariants, and component/browser tests exercise the existing editor controls.

`lib/pattern-editor/edits.ts` projects the compiler's inspected fields into editor drafts
and constructs source edits for prompts, choice labels, rating ranges, timer controls,
and switch/rule paths. It reuses `blocks.ts` UTF-8-aware patches and authoring helpers;
it does not parse source, evaluate expressions, or decide runtime transitions. Block
fields and Paths components retain draft lifecycle, pending/discard interactions,
confirmation and layout. `PracticeBlockEditor` remains the commit boundary: candidates
must pass the Rust inspector, and edits against a changed source are rejected before
the source callback runs. Attribute edits preserve unrelated attributes and intervening
source instead of replacing a whole attribute group. Compiler-backed unit tests and
generated timer cases guard these transformations; no extra persisted block schema is
introduced.

Rich-text article controls live under `lib/novel-editor/`: `instance.ts` owns the
existing Tiptap extensions and Markdown setup, `slash.ts` owns command lookup and
transactions, `links.ts` captures/restores link selections, and `tables.ts` owns
contextual table placement and pointer listeners. `NovelMarkdownEditor.svelte`
retains rendering, reactive UI state and mount/unmount ownership. The existing
layout is retained, except narrow-screen link controls wrap to avoid the previous
overlap with the writing surface. Layout, focus mode, disabled-state changes and
parent Markdown echoes do not recreate the
editor or replace its content, so Tiptap's selection and undo history stay with
one instance. Table controls detach both listeners before that instance is
destroyed. Tests exercise the real editor transactions as well as desktop/mobile
focus, link and table interactions; no alternative rich-text document model is
introduced.

### Authoring and library policy

`packages/workspace/src/authoring.ts` owns creation eligibility, the private-content guard
and authoring's required verse-home rule. The editor keeps field labels, form state,
compiler diagnostic presentation and browser navigation. `structure-management.ts` re-exports the
policy for existing consumers and retains deletion/move orchestration. These rules are
explicit authoring checks, not new restrictions on legacy imports or storage reads.
Older concepts and standalone practices remain editable, but are not new creation choices.

`lib/editor/save-workflow.ts` owns the editor's explicit save sequence. It flushes pending
keyword controls before capturing one JSON-safe draft, inspects attached source through the
existing Rust compiler, calls `validateEditorValues`, checks verse homes against a fresh
catalog using `assertVerseHome`, and writes through the existing workspace API. It never
opens IndexedDB, interprets Pattern Language, publishes content, or changes storage formats.
An internal busy guard prevents duplicate/reentrant saves. The persisted identity and normalized
signature are accepted before the post-save catalog refresh, so a failed refresh is reported
as a saved-but-refresh-failed result rather than triggering another create. The Svelte host
keeps newer writing dirty instead of replacing it with an older captured draft, retains the
saved identity for its next update, and owns focus mode, messages and URL replacement.
Unmount prevents later compiler/catalog results from starting writes or publishing UI changes;
an already-started workspace write may still commit and is not rolled back. Editor previews
and compiler definitions are unchanged.

The schema layer owns the existing source-qualified `entityRefKey` encoding; the compiler
keeps its reference export as a compatibility re-export. The workspace library adapts entry
identities to that same helper and owns the patterns-and-collections browsing projection.
The general library/search API still
supports all schema types. Renderers consume the browsing projection rather than repeating
its eligibility filter. Key encoding is unchanged, so saved entries, usefulness records
and collection URL context remain compatible.

Bare-ID relationships in existing personal records are a separate compatibility boundary:
`legacyRelationshipIndex` resolves private records before public ones, before type filtering.
The editor, verse validation, search metadata and personal collection expansion share this
rule. Public collection references remain source-qualified and must never pass through this
bare-ID resolver. No relationship storage migration or routing change is introduced.

### Mira conversation coordination

`apps/web/src/lib/mira/conversation.ts` is Mira's application-level session/reply
coordinator. It restores interrupted replies, publishes session mutations, serializes
reply requests, projects ephemeral streaming progress, and refreshes the saved session
after a request. All transitions and reply persistence still use
`@patternverse/companion-core`; this is not another conversation state machine.
The coordinator receives storage, provider, clock, identity and publication ports.
It has no Svelte, routing, browser-storage or provider-selection dependency.

The Mira page supplies the existing encrypted `PrivateMiraStore` and explicitly chooses
the native or OpenRouter provider. Credentials, budget checks, active-session preferences,
archive import/export, article loading, voice, focus and layout remain host concerns.
Changing approach aborts the request and uses the core modality transition to invalidate
its reply. Deleting the session aborts its request; late completions cannot restore a
removed record. Disposal aborts work and prevents late UI publication, without changing
the core's persistence or checkpoint formats. Guided-practice coordination remains separate.
This is the first bounded extraction from the Mira page, not a complete page rewrite.

Mira's settings and session-history drawers now live in `MiraSettingsPanel.svelte`
and `MiraSessionsPanel.svelte`. They receive typed view data, explicit editable drafts
and action callbacks; neither opens storage nor selects a provider independently.
`MiraPanel.svelte` preserves the existing drawer markup and shared stylesheet, and
uses the same dialog keyboard helper as the approach and pattern pickers. The route
supplies DOM focus, navigation, accepted settings and provider actions.
Cost formatting and UTC usage freshness are shared between settings and chat.

`overlay-controller.ts` owns one exclusive chat/settings/sessions/patterns/modalities
surface. Mouse, keyboard, voice and the guided selector's controlled binding use its
open/close actions. Explicit opening is idempotent; header buttons additionally toggle.
Render revisions prevent obsolete open/close operations from moving focus into or out
of a newer dialog. Switching via voice retains the original return target; explicit
triggers replace it. Pickers retain the shared keyboard trap but delegate return focus
to the coordinator in Mira (standalone users retain the default picker behavior).
Closing a selector changes presentation only: it does not cancel an active guided run,
clear its checkpoint or discard settings drafts. The coordinator has no browser,
Svelte, session, practice or persistence dependency.

`local-provider-controller.ts` coordinates native runtime polling, installed-model fallback,
explicit selection and download progress through the existing `native.ts` IPC adapter.
It coalesces overlapping three-second polls and suppresses obsolete setup/download results.
`openrouter-provider-controller.ts` coordinates connection actions, ZDR model discovery and
usage through the existing OpenRouter adapters. Discovery uses the editable key; usage uses
the accepted key. Request revisions suppress stale results and busy/error cleanup after key
edits, newer requests, disconnect or disposal. The send preflight reuses this usage action;
spending remains a warning, not a blocking limit.
Both coordinators receive explicit ports and have no Svelte, routing, browser-storage or
automatic provider-fallback dependency. The page retains editable drafts, accepted settings
and its encrypted `PrivateMiraStore` write adapter, OAuth URL/storage/navigation, reply-provider
selection and layout. Disposal stops polling and prevents late UI publication or follow-up
actions; it does not undo storage writes or cancel provider/native work already started.

`dictation.ts` coordinates composer capture through the existing browser/native
speech adapters. It owns request/record/finish phases and timeout cleanup, guards
transcripts by capture identity and originating session, and releases late microphone
grants on disposal. Switching sessions cancels dictation without sending a message.
`voice-commands.ts` remains the only parser/model-intent validator; `voice-controller.ts`
still owns microphone lifetime, serial dispatch, context checks and readback coordination.
`voice-dispatch.ts` maps those validated intents to the page's existing panel, selector,
conversation and speech actions. It owns command feedback and the chat-only draft/send
guards, but no Svelte state, DOM, provider, persistence, microphone or interpretation logic.
Selecting a pattern only previews it; starting and sending still require separate explicit
commands, and the unchanged model-intent validator cannot authorize either. The page
supplies live state and component-method adapters, not a second command implementation.

`reply-playback.ts` owns manual/toggled and opt-in automatic reply playback, speaking IDs,
completion/error cleanup and playback identity guards. It delegates pause/resume to the
existing voice controller. Cancellation invalidates callbacks before invoking the device;
replaying the same reply cannot let an old end/error event clear newer playback. Disposal
cancels speech without publishing state/errors or restarting listening. The small
`browser-reply-speech.ts` adapter retains browser synthesis, device language (or `en-US`),
rate `0.96` and event mapping. The page retains encrypted auto-read preferences and calls
automatic playback only for a completed assistant reply; partial streaming text is not read.
Neither module requests AI audio or stores reply text.

`MiraSessionHeading.svelte`, `MiraTranscript.svelte` and `MiraComposer.svelte` are
presentation-only chat components. They retain the existing DOM structure, global styling
hooks and accessible controls. The heading owns only input focus/selection; rename drafts
remain shared with session history through the page. The transcript receives messages,
session-scoped streaming text and retry availability without interpreting conversation
transitions. The composer reports edits and explicit actions, displays interim voice text
without committing it and binds its textarea back to the page for existing focus adapters.
Conversation state, persistence, provider requests, voice lifecycles, release flags and
overlay coordination remain outside these components. Guided practice remains mounted
independently of this presentation boundary.

`lifecycle.ts` coordinates Mira page startup and teardown through host-supplied ports.
It restores sessions using the existing conversation controller, loads encrypted settings,
validates the requested active session and applies the web-only default model. Those two
startup corrections share one encrypted settings write. The optional private pattern lookup
runs independently and never delays readiness or substitutes Commons content on failure.
Native polling begins only after preferences are restored, preventing model selection
against temporary empty settings during slow storage initialization.
DOM subscriptions and controller cleanup are registered once; teardown marks the page
disposed and aborts reference requests before detaching listeners and stopping the existing
controllers. One failed cleanup cannot skip the remaining resources. The page uses this
same lifetime guard for post-save continuations; started storage writes may finish, but late
results cannot publish UI, focus inputs, open panels or start another operation. Interrupted
reply recovery does not start repairs if its initial read returns after disposal. No storage
schema, practice semantics, provider-selection policy or visual layout changes are involved.

`archive-controller.ts` serializes explicit Mira transfers and snapshots export inputs.
It reuses `portable.ts` for encryption, complete validation and collision-safe import;
the host supplies downloading and refresh/publication callbacks. Failed transfers retain
the user's file/passphrase for retry. Disposal suppresses late downloads/UI updates and
prevents an import from starting after a delayed file read. An import whose validated
storage writes already started is not rolled back or interrupted. The archive version,
credential exclusions and separate encrypted Mira storage remain unchanged.

Browser file transfer lives in `lib/client/download.ts`: one object-URL/temporary
anchor lifecycle for text and binary blobs. Features still own serialization,
MIME types, filenames, encryption, confirmation and feedback. Workspace CBOR,
worksheet Markdown/plain text, practice response JSON, Mira encrypted archives
and private illustration exports reuse this adapter. The practice-specific
download name remains a compatibility re-export, not a second implementation.
Successful transfers defer URL revocation (one second by default; Mira retains
its existing sixty seconds); failed setup/clicks release the URL immediately.
Anchors are attached only for the click and always removed. Importing the module
does not access browser globals, and neither downloads nor serialization persist
or upload private data.

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
- **YAML:** `yaml` for manifests, frontmatter, legacy practice import, and export serialization.
- **Runtime validation:** Zod strict objects and discriminated unions.
- **Personal persistence:** Dexie 4 over IndexedDB, with `fake-indexeddb` used only for boundary tests.
- **Local lexical search:** MiniSearch 7 over normalized Commons and personal search documents.

## Backup and synchronization boundaries

`packages/workspace/src/backup.ts` validates one allowlisted portable workspace envelope,
encodes extension-free CBOR, and accepts supported older JSON exports. Restore is previewed
and explicitly confirmed before replacing private records. The database transaction retains
device ownership and a recovery backup; public articles and Mira storage are outside its
scope. Neither binary encoding nor local workspace storage encrypts these responses.

The website's workspace adapter emits content-free typed invalidation events and distinguishes
local writes, remote apply, and restore. Confirmed restore disables automatic sync before
replacement, so restoring old content does not silently publish it to Dropbox.
Read/refresh guards prevent stale results from overwriting newer views or active edits.

Feature-flagged Dropbox paths reuse the provider-neutral planner and recovery boundaries.
The encrypted v2 path and sign-in-only v3 path share the portable snapshot. The latter
deliberately does not encrypt remote content against Dropbox; local recovery checkpoints
still use a device key. Automatic scheduling is device-local and limited to sign-in-only
builds while the app is open. Older v1 archives and clients require explicit compatibility
handling, not an implicit format switch. See [sync](sync/README.md) for configuration,
privacy, account binding, review, and rollout limits. Documentation of a capability does
not enable a release flag or establish which version is deployed.

Mira retains a separate encrypted portable archive. Copying between multiple workspaces,
team authorization, and automatic cross-host continuation remain future work.

## Privacy and safety

Personal content is local-first. Usefulness is user state, never authored knowledge metadata.
Practice responses are ephemeral unless explicitly saved; saved workspace responses are
unencrypted local records and can enter the configured workspace-sync snapshot. Mira guided
checkpoints have their own encrypted device-storage/archive boundary; live Mira run caches
and provider credentials are excluded from workspace sync. Imported content is untrusted: raw HTML and unsafe
URL schemes will be rejected or sanitized, and declarative Practice blocks can never execute code.

## Compatibility and history

Compatibility readers, old exports/routes, storage names, and exact archived run sources are
retained deliberately. They are not alternative execution engines. See the
[compatibility inventory](compatibility.md) before removing a seemingly unused legacy path.
