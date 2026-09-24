# M9 — Pattern editor and simulation

Open **Pattern Library** in Mira desktop. The initial view is a searchable card grid;
select a card for its full-width editor, then **All patterns** to return with the
same search/filter. Unsaved changes still require confirmation before leaving.
Fork an immutable example using the fork icon beside the pen, or create a Pattern.
The top-right pen opens Mira-assisted authoring. **Source**, **Structure**, and
**Preview** are independent toggle buttons: any one, two, or all three can be visible.
Source and Preview are initially selected; the final visible pane cannot be hidden.
The sliders icon exposes percentage-width controls. Drag a divider, or focus it and
use Left/Right (Home/End for limits), to resize its adjacent panes. Each pane retains
at least 20% of the available width. Adding/removing a pane distributes widths equally.
Narrow windows stack the selected panes rather than squeezing their contents.
Hiding, resizing, or rearranging panes never remounts the preview or discards its
unfinished reply. Layout preferences last while the document is open.

## Source and saved drafts

Source remains canonical. The editor extends the existing native textarea:
50 in-memory undo/redo entries, Command/Control-Z and Shift-Z, debounced compiler
diagnostics with source selection, and explicit **Save draft**. Undo survives saves,
but not switching documents or closing the editor. Source selection translates Rust
UTF-8 byte spans to DOM UTF-16 positions, including non-ASCII text.

Autosave runs after 1.5 seconds without editing. Each save still uses the encrypted
library's generation check and atomic publication; edits briefly become read-only
while the save is pending. An unconfirmed or conflicting save stops further writes,
retains copyable text, and requires explicit reload. No automatic retry or browser
storage fallback is introduced. Invalid source saves normally and leaves the last
valid executable intact. There is no live mutation of an active Run.

The M8 limits remain: 32 distinct valid revisions per artifact, 64 KiB per source,
64 entries and 8 MiB total serialized library. The UI warns as revision capacity
approaches. Fork before reaching the limit to continue in a new lineage without
erasing history; after a rejected save, copy unsaved text before reloading. A complete
revision archival/pruning/export workflow remains later work.

No capable code editor existed in this frontend. CodeMirror 6 was considered against
this milestone's needs; the existing textarea was retained to avoid new dependencies
and a frontend language implementation. An inert, scroll-synchronised highlighting
layer now colours directives, branch constructs, metadata, strings, and references.
It never interprets source or injects HTML. Native selection, clipboard, accessibility,
and undo remain intact; forced-colour mode falls back to plain visible text.
Folding and persistent undo are not provided.

## Local autocomplete and inline linting

Suggestions appear while typing syntax. **Ctrl+Space** opens them explicitly;
**Up/Down** selects, **Tab/Enter** inserts, and **Escape** closes. Clicking a suggestion
also inserts it. A template is one undoable edit, preserves surrounding text and
indentation, and places the caret at its first editable point. Completion does not
run during input-method composition or modify immutable examples.

Suggestions include language-one commands and templates, effect parameters,
bindings and interpolations, enum variants/cases, classifier names, pure helpers,
forward labels, and pinned import aliases. Record-field suggestions use the last
successful Rust inspection only when the source preceding the edited line still
matches. New or invalid drafts therefore may have fewer typed suggestions until
they compile. Local lexical hints are authoring assistance—not a second compiler
or a guarantee of type correctness or definite assignment. Templates can contain
example names that need replacing. No AI, network call, automatic import resolution
or workflow execution is used for completion.

The existing 400ms Rust inspection now also supplies inline error/warning underlines
and clickable line-number markers with explanations. The diagnostic list shows
line numbers and jumps to the exact range, translating UTF-8 correctly. Stale
checks and dependency diagnostics are never painted onto a newer/root source.
Changing text clears stale markers while the next check is pending. Linting reads
the draft; it does not save, run or fix it automatically.

## Structure and diagnostics

The debounced native inspection command compiles a bounded unsaved root against its
saved pinned children, without writing the draft. Stale generation checks and React
request invalidation keep delayed diagnostics from describing newer source.

`CompiledPattern::inspect` derives an outline from the validated AST: statement
kinds, names, readable unresolved templates, source spans, labelled outgoing edges
(including ordinary fallthrough), nested collection scopes, and declared
child references. It does not expose executable instructions or interpret control
flow in React. Symbolic dependency names remain distinct even when two children have
the same executable identity. The vertical flow lays out those exact edges, with
branch/rejoin connectors and scrollable bounds for larger graphs. Cards jump to
source; expand controls expose branch labels, collection scopes, and exact pinned
child flows. This is a read-only graph, not a drag-and-drop workflow editor.

The native inspection contract retains metadata, validated interfaces and bindings,
but the editor no longer displays the metadata or revisions/dependencies inspectors.
Source, the validated flow and diagnostics remain available. Invalid drafts have
diagnostics rather than guessed structure. Editing the source's `:title` changes the exercise heading, not the library
display title or lineage. Child source editing/dependency replacement is not added.

## Real runtime, isolated simulation Host

**Try this pattern** resolves an exact saved revision and explicit inputs.
It uses the production Rust `manager::start`/`transition` and the same transcript
projection and effect renderer used by inline chat. Preview is not a second
interpreter and does not use the legacy persistent pilot slots or a conversation.

The dedicated Host keeps one bounded run tree in native memory: no `AtomicStore`,
no disk checkpoint, no memory-only fallback for ordinary chats. Starts replace only
an earlier editor preview. Root identity plus a revision counter rejects stale
commands, and scoped drop requests cannot erase a newer preview. At most 512
transitions and 64 KiB per input set/command are accepted, in addition to existing
runtime/Manager limits. Rejected transitions leave the previous state intact.

The UI explicitly labels this ephemeral lifetime. It drops preview state on editor
unmount (including late start responses); restarting the app also clears it. If the
WebView crashes before cleanup, the single native slot remains only until replaced
or the app exits. Source autosaves do not restart or hot-patch a preview. Pause,
resume, and restart use minimal icon controls. Prompts and accepted replies appear
as a conversation, with choice buttons, a text composer, or rating controls only
where the runtime requests them. Paused forms stay disabled and retain typed replies.
Technical binding/output inspectors are not displayed; the native projection is retained.
Collection locals remain scoped; completed record values appear in their root collection.

**View current step in Structure** follows the effect's snapshot identity and byte
range, including child patterns. Inspection documents are pinned when the preview
starts. A changed draft cannot redirect that link: old/child steps expose read-only
source excerpts, and **Return to draft structure** restores the live compiler view.
Preview options default to the selected local AI, with mock replies still available. No inference starts automatically.
The expand icon uses native window full screen in Mira, and browser full screen in
browser builds. Full screen removes the title and library chrome, leaving a compact
toolbar, the selected panes and a diagnostic status line. Escape, the collapse icon,
or a native window exit restores the regular editor without resetting the draft or
preview. Unmounting restores windowed mode only if this editor entered full screen.
Failure is reported rather than substituting a pretend full-screen overlay.

- **Mock replies** is the default. A person supplies text or tagged JSON fixture
  responses for agent effects. The real runtime validates types/cardinality; no
  model runs and no automatic fixture guessing advances workflow.
- **Real AI** requires a separate deliberate **Generate real local reply** click
  at each agent effect. It uses the selected installed local model and existing
  `generateReply` adapter: only the rendered step prompt, result contract, and
  shared safety/identity instructions, never ambient chat history or bindings.
  Switching modes/steps, pausing, restarting, or leaving cancels the old adapter;
  stale effects cannot advance a different run. The adapter has a two-minute
  timeout, bounded output, explicit stop, and no cloud fallback.

## Verification and scope

### Library experience refresh

Verified with 237 workspace tests (177 desktop), 141 portable Rust tests, one doctest,
and 79 native tests. Type checking, production build, release metadata, Rust formatting,
strict Clippy, and private documentation builds pass. The existing large-chunk advisory
remains. New/updated checks cover grid navigation and unsaved guards, source highlighting
and scrolling, branch/rejoin layout, exact child source selection, paused reply retention,
restart, and snapshot-pinned navigation. Synthetic browser review checked grid, source,
flow, and conversational preview, including bounded horizontal panning at 640px.
No personal conversations, real inference, publishing, or iOS changes were used.

### Original milestone verification

Four portable tests cover validated scopes/spans, exact child interfaces and names,
and assigned runtime binding projection. Four native tests cover read-only checks,
last-valid pinning, no simulation storage writes, rejected/stale commands, child
effects, pause/resume, scoped cleanup and real runtime mock-contract validation.
Eight new frontend tests cover debounced autosave, undo across saves, uncertain-save
retention, stale diagnostic responses, last-valid starts, Unicode offsets, mock
reply recovery, late-start cleanup and explicit/cancelled synthetic AI requests.

Full gates: 132 portable tests, one doctest, 74 native tests, and 183 workspace tests
(390 total). Rust formatting, strict Clippy and private documentation builds pass;
all 426 production Rust functions have documented contracts. Frontend type checking,
build and release metadata validation pass with the existing large-chunk advisory.
Synthetic browser review checked Source/Structure/Preview layout and no horizontal
overflow at the default desktop viewport. No actual model inference, private session
inspection, signed-app/Keychain restart, website publishing or iOS work was performed.

M10 now provides [reviewable Mira-assisted source edits](authoring.md), not mutations
of active Runs. M11 representative migrations is next.
