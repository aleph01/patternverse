# Interruption recovery

Milestone 2 keeps the last successful base separate from an in-progress execution journal.
The journal has four durable phases:

```text
planned -> local-applied -> remote-applied -> verifying -> clear
   |             |                |              |
   +-------------+----------------+--------------+
                  retry reads both sides and replans from the unchanged base
```

The executor writes the journal before side effects. Local changes are staged first, then
remote changes are sent with the revision that was read during planning. The remote store
must reject stale revisions.

If the revision is stale, orchestration rereads both sides and creates a new plan. If a
non-atomic provider applies only part of a request before failing, the journal remains and
the next sync also rereads and replans. Already completed changes appear as converged paths;
remaining changes are planned again. Operations are guarded by path and previous-hash
preconditions, so a stale plan cannot silently overwrite newer data.

After execution, orchestration reads both snapshots again and compares canonical paths and
content hashes. Only a verified convergence becomes the new base. Any error leaves the old
base and journal intact.

`SyncStateStore` is the durable boundary. Milestone 2 provides an in-memory implementation
for tests. The next local integration slice supplies an encrypted IndexedDB implementation,
but the deployed Dropbox button is not switched to it yet.

## Workspace snapshot bridge

Implemented locally on 9 October 2026:

- `apps/web/src/lib/client/sync-corpus.ts` maps the complete v2 snapshot to virtual
  per-record files for the existing `@patternverse/sync-domain` planner. These are
  an internal merge representation, **not** additional unencrypted Dropbox files.
- Entities (including verses and collections), saved references, usefulness,
  saved practice responses, situations, conversations, and workspace name are
  independent conflict units. Article/practice source, collection item order,
  conversation message order and opaque practice checkpoints remain intact.
- Local workspace ID, actor and creation time are not merge units. Reconstructing
  a candidate keeps the destination device's identity and rebinds private rows.
- A v1 remote lacks modern fields. Its projection inherits those virtual records
  from the last successful base, not the current local data. Consequently absence
  is not a remote deletion, and new local saves/ratings or removals still produce
  outgoing changes. With no base, modern local records are outgoing additions.
- `corpusToSyncSnapshot` verifies hashes, paths, IDs and canonical schema through
  the existing validators before any commit. Unknown records or ID/path mismatches
  fail closed. `createWorkspaceCorpusStore` delegates commit to an explicitly
  supplied compare-and-swap storage boundary; it does not call restore. The next
  slice below implements recoverable apply across the two existing databases.

`apps/web/src/lib/client/sync-state.ts` implements `SyncStateStore` in the separate
`patternverse-sync-recovery-v1` database. Base and resolved execution journal are
encrypted with the existing v2 envelope. Keys are supplied by the caller and not
stored here. A payload binding checks provider/account/local-workspace identity
and checkpoint slot, so swapping ciphertext between them fails. Reads and writes
validate/projection-check the checkpoint and record hashes. Corrupt or inaccessible
checkpoints fail rather than silently starting with an empty base. Each serialized
checkpoint has an 8 MiB limit; byte-array JSON overhead means the practical
recoverable payload limit may be lower than the snapshot limit. An oversized journal
fails before the first side effect.

The shared orchestrator now discards previous conflict choices during revision
retries. A newer conflicting remote version requires a fresh choice instead of
implicitly reusing permission to overwrite an earlier version. Recovery rereads
both sides and replans; it does not blindly replay a stale journal. If intervening
edits create ambiguity, it conservatively returns a conflict with the old base
and journal retained.

### Validation

`sync-recovery.test.ts` has 23 tests, including 200 seeded generated cases. It checks
every conflict unit, device rebinding, Unicode/escaped IDs, legacy absence, candidate
validation, concurrent local-write rejection, encrypted storage isolation, wrong
keys, swapped ciphertext, and records larger than 60 KiB. Tests instantiate fresh
state-store objects over fake IndexedDB to simulate a reload at each of the four
journal phases, as well as partial uploads, subsequent offline edits and remote
edits during recovery. Checkpoint-write failure leaves both sides unchanged.
A package-level regression test checks stale conflict choices after revision retry.
These are isolated tests, not live Dropbox or actual two-browser verification.

### Before connecting the live button

1. Use the recoverable local adapter below, including pending-update review before
   release. The two existing databases cannot be atomically committed by a single
   ordinary IndexedDB transaction. Do not substitute `replaceFromBackup` for this
   boundary.
2. Adapt the encrypted single-document Dropbox transport to `RemoteCorpusStore`,
   retaining account binding, guarded remote revisions, old base migration and an
   explicit older-client policy. No transport, OAuth or public feature flag changes
   were made in this slice.
3. Serialize complete sync attempts across tabs, and bind user conflict choices
   to the exact reviewed snapshots before invoking the engine. Record-aware UI
   labels can use the virtual paths; they must not expose arbitrary keep-both paths
   without cloning/remapping record identity.
4. Test restart recovery and concurrent edits on real devices, then deliberately
   enable the new integration. The existing v1 sync remains unchanged meanwhile.

## Recoverable local database apply

Implemented locally on 9 October 2026, still not connected to the Dropbox button.

`createRecoverableWorkspaceCorpusStore` in `sync-local-store.ts` now supplies the
bridge's concrete storage boundary. An encrypted `apply` checkpoint in the same
scoped recovery database contains the allowlisted expected and desired snapshots:

```text
exclusive workspace lock
  -> recover any pending local update
  -> preflight changed records against current data
  -> persist encrypted intent
  -> workspace transaction (record CAS)
  -> Mira transaction (encrypted session CAS)
  -> clear intent
  -> return the actual current snapshot
```

The lock covers only local apply/recovery. Production uses native Web Locks and
fails closed if unavailable. The opt-in v2 Dropbox coordinator now holds a separate
whole-attempt lock across transport and verification. The preflight rejects
already-stale intents before persistence. Transactions recheck conditions to guard
ordinary edits racing with that preflight.

`LocalWorkspace.applySyncData` validates through the existing backup schemas, but
is **not** a restore. Within one transaction it applies only changed records across
entities, saved entries, ratings, saved practice runs, situations and workspace
name. It retains device identity, unrelated records and entity creation metadata;
it neither clears the workspace nor overwrites the before-restore safety backup.
`conditionalRecordWrites` is the shared per-record storage precondition helper,
not a new sync planner. Already-applied desired values are no-ops. Unrelated live
edits survive. A target matching neither expected nor desired aborts the batch.

`PrivateMiraStore.applySyncSessions` validates/projects portable conversations and
prepares encryption outside the write transaction. It then checks the exact
encrypted envelopes again inside a single session/run-store transaction before
performing any writes. This catches an edit between reading and encrypting. New
conversations receive the existing device encryption; settings and keys are not
sync writes. Unrelated sessions and device-local practice caches are left alone.
An in-flight reply or any stored local practice cache on a conversation that would
be changed/deleted causes a conservative stop, not cache deletion. The shared
`portableMiraSession` allowlist is also used by the snapshot codec.

Recovery retries the recorded local intent through the same CAS methods, before
the orchestrator reads local data or writes remotely. After a crash between
database commits, completed records are idempotent and remaining records can be
applied. If a target acquired a newer edit, recovery returns `local-changed` and
retains the encrypted intent. No rollback or overwrite is guessed. Unrelated
intervening work remains in the final read model. This is recoverable sequencing,
**not** simultaneous visibility or cross-database atomicity: a partial update may
be visible until recovery succeeds.

### Apply validation and remaining limits

- Six workspace tests check atomic batches, idempotence, all sections, ownership,
  incidental table order, collection order, stale targets and unrelated edits.
- Four additional Mira tests cover encrypted CAS, settings preservation, pending
  replies/cache protection and a write racing with encryption.
- Eleven integration tests exercise both storage implementations over disposable
  fake IndexedDB, including 100 seeded interruption/text cases, all commit stages,
  pending-state encryption, competing attempts and recovery via the shared engine.
- Four isolated Chromium browser checks (desktop and Pixel-sized viewport) verify
  actual page-reload recovery and two-tab conflict protection using native
  IndexedDB and Web Locks. These do not access a user's browser profile or Dropbox.
  Run them with `pnpm --filter @patternverse/web exec playwright test --config
playwright.sync.config.ts`; the dedicated development server is test-only.

The [opt-in Dropbox slice](dropbox.md#opt-in-workspace-sync-v2) adds a review panel,
guarded encrypted transport, stale-choice tokens and whole-attempt locking. Its
additional browser checks cover transport and confirmation controls on desktop/mobile.
`sync-recovery-review.ts` now uses that same planner to select only remaining
pending paths, rather than introducing a second merge implementation. It rechecks
a token covering expected/desired/current records and Mira reply/cache protections
under the local lock. Every record needs a choice and the user must confirm.
Unknown, incomplete, stale or protected remote choices cause no record writes.

`replaceApplyForReview` atomically stores an encrypted `recovery-copy` and a new
`apply` intent after checking the exact original ciphertext. The copy includes
both the original intent and the current snapshots a pending choice might replace.
The regular CAS adapter executes the new intent, so later ordinary edits still
block overwrite. The copy survives successful apply and is overwritten only by a
later confirmed recovery resolution; this is not a full historical backup system.
The shared orchestrator then replans from the unchanged successful base and may
ask for a separate remote conflict choice.

Mira replies and stored practice caches still cannot be replaced by recovery
choices: keep this device or settle the active work first. A preflight stop with
no persisted intent remains a retry, not a forced-write control. Completing a
practice does not necessarily remove its cache.
Do not silently drop an interrupted intent just to unblock sync. The per-document
8 MiB checkpoint cap still applies to the combined expected/desired intent, so
large data can fail before writes, including the larger recovery copy containing
three snapshots. [Explicit legacy upgrade](dropbox.md#explicit-legacy-archive-upgrade)
now preserves the actual v1 ancestor and parks older clients after verified backup.
Real-account staging, Safari/PWA authorization and an operational rollback/support
procedure remain release requirements. No OAuth, public flag or
live sync UI behavior has been switched to the new path.
