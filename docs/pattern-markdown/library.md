# M8 — Local Pattern Library and drafts

Open **Pattern Library** in the desktop sidebar or Settings. To use a saved Pattern,
open **Conversation settings → Choose from Pattern Library**, select it, and choose
**Use in conversation**. Confirm its explicit inputs in the conversation before starting.
No inference starts merely by opening the library or selecting a Pattern. Saved Patterns
are also available through **Shift+Space → Therapy techniques**. The library's
**Chat availability & suggestions** section controls visibility, modality compatibility,
description and optional discovery cues; see [unified chat techniques](chat-techniques.md).

## Authoring model

- An artifact has an immutable lineage ID, a display title, and an author-facing
  symbolic name. These are distinct from revision and release identities.
- Built-in/installed entries are immutable releases with explicit version metadata.
  The three synthetic examples are installed durably on first library access.
  Later app bundles do not overwrite the saved releases.
- **Make my own copy** forks the exact last-valid revision into a new local identity.
  Its ancestry records the original artifact and revision. Upstream changes cannot
  silently alter this copy. Forks copy the complete pinned local dependency closure.
- **New pattern** creates an owned standalone working document. The initial source
  is a small ask/complete example; arbitrary source edits still require the compiler.
- **Save draft** explicitly persists the current root source. Invalid drafts survive
  restarts and show compiler diagnostics without replacing the last-valid revision.
  Successful compilation appends a content-addressed revision; saving the same source
  again reuses its identity. Reverting source does not delete newer historical revisions.
- Source bundles, not compiled instructions, are canonical library persistence.
  Restoring the library verifies revision identities against rebuilt exact source.
  A draft generation counter provides optimistic concurrency, independent of revision
  identity. Stale writers cannot overwrite newer drafts.

The portable implementation is in `pattern-core::library`; it has no filesystem,
network, therapy, or UI dependency. Native storage and React only adapt its operations.
The native UI receives source metadata, diagnostics and declared input types, not IR.

## Execution and dependency boundary

Library start resolves an exact immutable revision before taking the session lock.
It then uses the same session controller, persistence/CAS path, inline widgets and
Composer as the bundled examples. There is no library-specific runner or interpreter.
The checkpoint embeds its executable snapshot and saves library title/reference
provenance. Editing the draft or removing access to library storage cannot change or
prevent continuation of an already-saved run. Library starts inherit session lifecycle,
reset-token, anchor, input-size, and active-run limits.

The first UI exposes the root working document plus basic child-name and revision
visibility. Forked dependencies remain exact local source copies in the bundle.
The editor does not yet offer cross-library dependency selection, semver resolution,
or editing child files. Missing/new references produce compiler errors; they never
trigger a network lookup. Structured inputs beyond text/numbers/booleans currently
use explicitly tagged JSON, validated by Rust before starting.

Legacy session checkpoints with a pilot name remain readable. New library checkpoints
have an optional library provenance field and no pilot identity. Existing core run and
checkpoint schemas are unchanged; an older desktop build should not be used to open
sessions containing new library runs.

## Privacy and durable storage

`pattern-library-v1/library.enc` uses the existing macOS Keychain key with a separate
AES-256-GCM authenticated domain and a fresh nonce for every save. Authored drafts can
contain sensitive text, so neither source nor diagnostics are logged or stored in
browser storage. Private directories/files, no-follow opens, a cross-process lock,
bounded reads, encrypted temporary files, atomic rename, and file/directory sync protect
the publication boundary. An uncertain save requires explicit reload, never an automatic
retry. The UI retains unsaved text for copying before reload and warns before ordinary
link navigation away from an unsaved editor.

The library is separate from chat sessions and preview checkpoints. Deleting a session
does not delete library drafts/revisions. OS backups may retain encrypted copies.
Per-entry deletion/export and secure backup administration are not provided in M8.
No plaintext, cloud, or memory-only persistence fallback is introduced.

Current limits: 64 entries, 32 unique valid revisions per entry, 64 KiB per source,
32 source files / 256 KiB per bundle, and 8 MiB for the serialized library. Reaching a
limit rejects the save without replacing prior ciphertext; it does not truncate source
or silently discard old revisions. Comprehensive hostile-import quotas remain later work.

## Verification and next scope

Eight portable library tests cover invalid-draft restart, content identity/deduplication,
immutable built-in and installed releases, forks/ancestry, stale saves, resource limits,
dependency pinning and rejected tampered/future schemas. Five native tests cover encrypted
reopen, rejected writes preserving ciphertext, competing writers, wrong keys/tampering/
oversized files, and inline session execution pinned across library edits. Five React
tests cover read-only releases, forks, invalid-draft usability, explicit inputs/start,
unconfirmed-save recovery and unavailable native storage.

The full gate passes: 128 portable tests, one doctest, 70 native tests and 175 workspace
tests; formatting, strict Clippy, documentation, type checks, build and release checks.
All 416 production Rust functions have documentation. Synthetic light-theme browser
review verified the library layout; temporary fixtures were removed. No private sessions,
real AI calls, signed-app/Keychain restart, website deployment, or iOS changes were tested.

M9 now adds the [Source / Structure / Preview editor](editor.md), simulation through
the real runtime, inspectors, autosave, and undo/redo. External import/export, release updates,
Patternverse, compiled refinement and representative therapy migration remain later work.
