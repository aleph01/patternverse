# M6 — native Mira Host bridge

M7 subsequently adds a separate session-attached adapter and generic inline widgets;
see [inline chat](inline-chat.md). This document describes the Settings-preview adapter.

## Architecture decision

The first integration is desktop-native: the existing Tauri process links
`pattern-core` directly and exposes a serializable `pattern_run` command. This avoids
introducing WASM packaging and browser key management before the desktop boundary works.
The portable core remains independent of Tauri, UI code, storage encryption and inference.
The PWA is unchanged; it must use a future audited WASM/Host bridge, not a TypeScript
reimplementation or an implicit server fallback.

The deliberately opt-in entry is **Settings → Step-by-step patterns → Pattern preview**.
It is not a migration of existing therapy techniques. Three bundled, immutable examples
exercise the boundary: Choose a next step (ask/rate/show), Project review (isolated child
asks/show), and Theme Explorer (local structured generation/choose/show).

Each example has one saved slot. Opening a slot loads its pinned checkpoint; it never
starts inference. Starting requires an empty slot and explicit inputs. Pause, resume,
end and confirmed erase operate on the existing root. A new start uses a random root ID,
so stale commands cannot affect a replacement run with revision zero. Multiple concurrent
sessions and inline chat are handled by M7's separate session adapter. Library editing and
arbitrary source imports remain later work.

## Thin command boundary

`pattern_run` accepts a typed pilot name and one operation:

- `load`: validate/decrypt the current checkpoint and project its view.
- `start { inputs }`: build the bundled snapshot and commit a new checkpoint.
- `apply { root_id, revision, command }`: require the same root and revision, then delegate
  the command unchanged to the core's Manager/persistence boundary.
- `forget { root_id, revision }`: explicitly erase this example's saved checkpoint.

Work runs off the main native thread. A private file lock covers load, revision checking,
transition, commit and projection, including calls from separate app processes. The Host
never picks workflow nodes, computes branches, constructs child outputs or infers results
from a transcript. Child replies route using the effect's Run ID, while storage revisions
belong to the root checkpoint. Invalid replies leave encrypted bytes unchanged.

The UI receives root ID, revision, status, the current actionable effect and committed
`show` content. M7 adds effect/accepted-result transcript items to this projection. The UI
does not receive the complete executable snapshot, private bindings or replay traces.
Content is a replacement projection of already-durable state keyed by effect ID, not
another persistent chat transcript. Consequently the preview does not acknowledge/delete
outbox content or dispatch replayed historical requests. M7 likewise projects the durable
checkpoint directly. A consumer with a separately persisted transcript must instead use
M5's durable upsert-before-ack protocol.

After any unconfirmed mutation the screen disables further replies and requires an
explicit reload. It does not silently retry a model call or overwrite inaccessible data.
There is no browser, memory-only or plaintext fallback for native saved runs.

## Encrypted storage

Checkpoints live in `pattern-runs-v1/<pilot>.enc` under the existing app-data directory,
separately from `sessions-v1.enc`. They reuse the existing macOS Keychain session key
with a **distinct AES-256-GCM authenticated domain** containing the format and pilot name,
and a fresh random nonce on each write. Swapping files between pilots, changing ciphertext
or using the wrong key fails closed. The existing chat-session format is not modified.

Directories use mode 0700; lock, checkpoint and temporary files use mode 0600. Regular-file
checks and no-follow opens reject symlink file targets on macOS. Bounded reads enforce
the checkpoint size limit before decryption/decoding. A locked same-directory temporary
file is synced, renamed atomically, then its directory is synced before success is returned.
Failed publication/sync reports an unknown outcome requiring reload. Interrupted temporary
ciphertext is removed on the next operation for that slot, including an explicit erase.

Saved state still contains sensitive inputs and accepted replies. End/cancel is **not**
deletion. Each preview has a confirmed erase control; clearing ordinary chat sessions does
not erase preview slots. The Privacy screen explains this separation. OS backups may retain
copies and are not erased by Mira. No key, prompt, receipt or state is logged by this Host.
Authentication is not anti-rollback protection against restoring a valid old file from a
backup. Untrusted source import and comprehensive execution quotas remain outside M6.

## Local inference

Only an explicit **Prepare local reply** click dispatches an agent effect, through the
existing managed Ollama provider. It sends the rendered effect prompt, shared identity,
baseline product-safety instructions and an output-format contract. No session transcript,
other run's bindings, modality state or hidden continuity is appended.

Generated JSON is parsed as data and returned as a typed fulfillment. Rust remains the
authority for type, choice identity/cardinality and cursor advancement. Malformed, incomplete,
failed or oversized replies do not become accepted results. Requests have a two-minute
cancellation timer; leaving/changing the preview aborts its request. Provider cleanup now
cancels by native generation ID so a late cancellation cannot cancel a newer ordinary chat.
There is no cloud fallback. The existing baseline safety directive is reused; M6 does not
claim to add clinical assessment or model-quality validation.

Delivery remains at-least-once. If generation finishes but its receipt is not committed,
retry may repeat inference. UI revision checks prevent stale acceptance, not duplicate work
across independent windows. A cross-window inference lease is not implemented; the native
conversation provider permits only one active generation per app process.

## Verification and limits

- 46 native tests pass, including eight new Host tests and one scoped-cancellation test.
  They use isolated temporary directories, synthetic inputs and injected test keys—no
  user Keychain, private sessions or real-model request. Coverage includes encrypted
  reopen/resume, child routing, duplicate/rejected replies, stale writers, competing Host
  instances, tampering/wrong keys/swapped files, oversized reads and erase/restart identity.
- 161 workspace tests pass (104 desktop), including nine new bridge/UI/provider tests.
  Screen tests cover start/fulfill/reload, saved-content deduplication, unconfirmed saves,
  inaccessible storage, paused recovery and confirmed erase. Native wire tests check the
  same serialized command shape as the UI adapter.
- All 116 portable-core tests still pass. Desktop type checking and production frontend
  build pass. The new native module and portable core pass formatting checks.
- Native Clippy passes with the existing `model_setup.rs` unnecessary-cast lint allowed;
  unmodified full `-D warnings` still reports that pre-existing platform-specific cast.
  The frontend build reports its large-chunk warning; neither warning is a runtime failure.
- Browser visual review confirms the Settings entry and explicit native-unavailable
  state. The native persistence and React boundaries are automated tests, not a manual
  signed-app/Keychain restart or a real-model quality evaluation.

M6's thin bridge is implemented. Generic inline chat widgets, immutable fulfilled items,
composer takeover and completion/provenance items are now delivered in M7's session adapter.
Compiled `!refine` and representative therapy migrations remain pending; no bulk conversion,
website deployment or private-data migration is part of this milestone.
