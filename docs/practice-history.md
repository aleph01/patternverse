# Private practice history

The workspace now has a **Practice history** section. It is a local-first run
archive, separate from public articles, personal pattern definitions, and Mira
conversations. Saving is opt-in per run: choose **Save to workspace**, then each
confirmed runtime revision is saved to the same record. Unsubmitted field drafts
and live timer clocks are not saved. Repeating a practice creates a different
record rather than overwriting earlier responses.

## Shared boundary

- `packages/workspace/src/practice-history.ts` defines private run records,
  bounded, allowlisted response archives, plain-text projection and search.
- `apps/web/src/lib/pattern-run/history.ts` projects already-executed interaction
  results into question/answer pairs. Forms, choices, ratings and timer results
  reuse the renderer's existing presentation helpers. No branching, validation
  of practice answers, or execution semantics are reimplemented.
- `PracticeHistorySave.svelte` is the website persistence adapter. Opt-in writes
  are serialized; stale or conflicting checkpoints are rejected; renaming a run
  is not undone by subsequent autosaves. Save failures are visible and retryable.
- `PracticeHistory.svelte` provides searchable history, verse/status filters,
  date groupings, 20-record numbered pagination, rename, delete with confirmation,
  plain-text copying and response export. Individual response imports are not
  exposed in the practice history UI; existing saved runs remain unchanged.
  Desktop is master/detail; mobile opens a full-width detail view.
- `lib/client/practice-history-view.ts` projects the shared search results into
  selection, pagination, verse labels, date groups and literal highlighted chunks.
  It accepts the current date explicitly; it never accesses storage or browser APIs.
- `lib/client/practice-history-actions.ts` owns selection/drafts and coordinates
  rename, confirmed deletion, copy fallback and export through injected ports.
  Writes use the existing workspace methods; text/archive formats remain shared.
  Pending actions capture their target, cannot overlap, and cannot apply late
  messages or drafts to a newly selected run. Disposal prevents new writes and
  view updates without pretending to cancel a storage write already in progress.
  `PracticeHistory.svelte` retains browser confirmation/clipboard/download ports,
  focus/routing, layout and the existing deferred workspace refresh boundary.
- `PracticeEmbed.svelte` reports runtime changes to its host, but does not open a
  database, authenticate, send context to a model or save responses itself.

The existing workspace database upgrades from Dexie v2 to v3 by adding only
`practiceRuns`. Workspace identity, entities, favorites and usefulness are
preserved. Records are workspace-scoped. The same run can be continued after
reload when its source-based checkpoint is available: Rust replay-validates
the checkpoint against the current exact definition before rendering it.
A changed/unavailable definition produces an error, not a silent new run.
Catalog/native exercises retain readable responses but do not yet expose a
history resume adapter. Active UI timers restart on reopening.

## Inline ChatGPT exports

There are no Patternverse accounts or cross-host personal replicas yet. An
iframe's storage is not the user's Patternverse workspace. Accordingly the
inline UI offers **Export responses**, not a fictitious connected-save button.
The user names the run and copies a bounded JSON response archive to keep in their
own files. Individual response imports into the workspace are not available in
the UI, so the widget no longer directs users to Practice history for import.
Manual selection/copy remains available if the host blocks clipboard access.
The public MCP server still accepts no answers and has no private-workspace API.
The widget never sends answers, checkpoints or the export through its host
bridge or URLs. No server deployment or plugin permission change is needed for
this local implementation; release of the changed widget is a separate step.

The shared archive parser remains available for validation and future adapters;
removing the import UI does not remove the archive format or saved records.
Checkpoint validation continues to use the existing Rust runtime.
Files/exports are limited to 3 MiB; checkpoints to 2 MiB. Export version 1 is
`{ format: "patternverse-practice-run", version: 1, run: ... }` and excludes
workspace/actor identity. It is not an authentication or sync protocol.

## Privacy and backups

Responses and checkpoints are unencrypted IndexedDB records on this device,
accessible to same-origin scripts and anyone with access to the unlocked browser
profile. They are not uploaded by saving or search. Existing AI-authored practice
steps still use the configured model and their existing consent/routing behavior.
Mira's encrypted conversations, settings and credentials remain unchanged.
The current workspace backup includes saved practice responses/checkpoints and warns
about their private, unencrypted nature. It uses binary CBOR; supported older JSON
backups remain readable. Feature-flagged workspace sync includes explicitly saved
responses; the older v1 Dropbox adapter does not. See [sync](sync/README.md) for
encrypted versus sign-in-only remote protection, consent and rollout boundaries.
Clearing site data or deleting a record removes the local copy, not previously
exported copies. Browser/desktop profiles and different origins remain separate.

Automatic saving from ChatGPT to a connected workspace requires a future
authenticated, explicitly consented, encrypted personal-sync boundary. This
implementation deliberately does not introduce an unauthenticated answer API.
