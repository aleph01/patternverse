# Complete encrypted workspace snapshot (first integration slice)

Implemented locally on 9 October 2026. This is a payload/codec boundary, **not an
enabled Dropbox feature, new sync engine, automatic backup replacement, or a
recovery implementation**. The follow-up [record bridge and recovery checkpoints](./recovery.md#workspace-snapshot-bridge)
reuse this payload with the shared engine, still without enabling live sync.
No live Dropbox data is accessed by the tests.

## Data contract

`apps/web/src/lib/client/sync-snapshot.ts` exposes:

- `captureWorkspaceSyncSnapshot`: reads only `LocalWorkspace.readWorkspaceData()`
  and persisted Mira conversations via `PrivateMiraStore.list()`.
- `parseWorkspaceSyncSnapshot`: validates the complete version-2 snapshot using
  the existing workspace backup validator and Mira session validator.
- `serializeWorkspaceSyncSnapshot`, `sealWorkspaceSyncSnapshot`, and
  `openWorkspaceSyncSnapshot`: allowlisted JSON bytes and authenticated encryption.
- `parseLegacySyncSnapshot` and `migrateLegacySyncSnapshot`: explicit version-1
  compatibility and migration with missing-field provenance.

Version 2 has `{ version: 2, workspace: LocalWorkspaceData, sessions: Session[] }`.
The workspace data is the existing portable read model, including:

| Section                  | Meaning                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `workspace.workspace`    | Private workspace ID, name, kind, visibility, creation time; no local owner/actor                                            |
| `workspace.entities`     | Personal patterns, verses, collections, and other existing entity types, with full article/practice source and relationships |
| `workspace.favorites`    | Saved library references; the historical field name does **not** introduce a second favorites feature                        |
| `workspace.usefulness`   | Source-qualified usefulness ratings                                                                                          |
| `workspace.practiceRuns` | Explicitly saved responses and their opaque resume checkpoints, including saved in-progress responses                        |
| `workspace.situations`   | Persisted situations, including their positions and revisions                                                                |
| `sessions`               | Persisted Mira conversation messages and pattern references                                                                  |

Provider credentials, OAuth connections, local actor identity, app/model settings,
transient drafts, unsaved practice responses, and Mira's separate live-run cache
are excluded. Pending reply IDs are reset to `null` in v2: an in-flight request on
one device is not transferable execution state. This is a structural allowlist,
not a detector for secrets that a person deliberately writes into article or
answer text. Checkpoints remain opaque and must still be replay-validated by the
existing runtime before resuming.

No new preference/settings model or source-subscription store is introduced.
Every v2 workspace list is required; a missing list is rejected rather than
interpreted as an empty list/deletion.

## Compatibility and migration

The deployed adapter still reads and writes **v1** at
`/patternverse-sync-v1.json`. Its UI, feature flags, payload coverage, and sync
behavior are not switched to v2 in this slice. It now uses the shared encryption
implementation and legacy validator rather than a separate copy of them.

A v1 snapshot contains only `entities` and `sessions`. Parsing keeps it version 1.
Migration requires an explicitly supplied portable workspace fallback. It retains
the old snapshot's entities/conversations and the fallback's metadata, saved
references, ratings, saved responses, and situations. The result reports
`inheritedFields`: these fields were **not recorded remotely**, not deleted
remotely. Later first-sync planning must retain that distinction. Migration is
not conflict resolution and does not write to either database.

Do not simply replace a workspace with a migrated remote snapshot. Local-only
articles and concurrent edits require three-way planning/review first. A future
integration must handle workspace-ID rebinding, account ownership, migration of
the old sync base, older-client compatibility, and interrupted multi-store apply.

## Encryption

`sync-envelope.ts` is shared by v1 and v2: PBKDF2-SHA256 with 600,000 iterations,
16-byte salt, a non-exportable AES-256-GCM key, and a fresh 12-byte IV on every
encryption. The existing 8 MiB plaintext limit is retained. V1 retains its original
authenticated-data string for compatibility; v2 additionally authenticates its
salt. The envelope version and plaintext version must match. Wrong phrases,
truncation, tampering, and oversized documents fail before any storage apply.

## Validation

The new tests use fast-check to generate private records, all five entity types,
all ratings/run statuses, source-qualified references (including missing public
articles), Unicode text, answers, situations, and messages. Properties cover:

- lossless serialization of valid portable data and input immutability;
- idempotent validation/serialization;
- exclusion of extra secret/device fields at permissive nested boundaries;
- v1 migration preserving fields absent from the old format;
- isolated database restoration retaining the target device's owner and identity;
- authenticated encryption round trips, fresh IVs, and tamper rejection.

An independent fixture uses the original v1 encryption algorithm to check
backward compatibility. Deterministic negative cases cover incomplete v2 lists,
mixed ownership, duplicate IDs, public entity injection, wrong phrases,
unsupported versions, and size/version mismatches. Existing Dropbox authorization,
ownership, and exchange tests remain in place.

The restoration property deliberately exercises the **existing confirmed backup
replacement API only in a disposable test database**. It is not the production
sync apply path. The follow-up recovery tests now cover conflict convergence and
interruption through virtual records and simulated stores. The subsequent local
apply slice now exercises the real storage implementations, including native
Chromium IndexedDB, page reloads and two tabs. The Dropbox transport adapter,
pending-update review UX, live two-device tests, and mobile authorization checks
remain before release.
