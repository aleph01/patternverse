# Patternverse synchronization

Patternverse has two independent extension points:

- **Public Sources** extend the unified read-only library. Patternverse Commons is the
  default Source, and users may subscribe to other statically published corpora.
- **Remote corpus stores** are the provider-neutral replication boundary, distinct
  from publication.

## Current source behavior

Dropbox integration is feature-flagged. Each user authorizes their own App Folder
through PKCE; credentials and automatic-sync preferences stay on the device.
This guide describes source capabilities, not which flags a deployed build enables.

- The older **v1** adapter retains its encrypted personal-article/Mira-session payload.
- **Workspace v2** uses the provider-neutral planner, orchestrator, journal and
  recoverable local apply. Its encrypted snapshot includes personal content, saved
  references, usefulness, saved practice responses, situations and saved conversations.
- **Sign-in-only v3** uses the same v2 portable snapshot and merge/recovery rules,
  but protects remote data through Dropbox account access, not Patternverse encryption.
  Dropbox/account holders can read that content. Local recovery checkpoints remain
  encrypted with a separate device key. Existing older archives block implicit migration.

Settings, provider credentials, unsaved responses and live Mira run caches are excluded.
Conflicts, blocked-intent recovery and older-archive upgrades require explicit review;
there are no automatic conflict choices. See [snapshot](snapshot.md),
[recovery](recovery.md) and [Dropbox modes](dropbox.md) for exact contracts and limits.

Sign-in-only builds default to automatic sync with an option in Sync & backup to
disable it on this device. Successful saves debounce for 1.5 seconds (maximum
ten-second postponement); foreground polling runs once a minute and on focus/online
return. The scheduler invokes the same sync operation, not another merge implementation.
No uploads run while the app is closed. Confirmed backup replacement disables
automatic sync before restoring private data; it remains off until explicitly re-enabled.
Typed workspace notifications distinguish local changes from remote apply and restore,
so refreshing a view does not trigger upload echo loops.

The user has exercised a sign-in-only preview manually across devices. Automatic sync
and interruption/recovery are covered by isolated mocked-provider tests; this is not
evidence of every production/browser/account combination. No account service, team
authorization, or cross-host MCP access to private content is introduced.

## Historical milestones

The implementation is deliberately staged:

1. Milestone 0 records architecture, security, provider, and testing decisions.
2. Milestone 1 implements and exhaustively tests the pure three-way sync domain.
3. Milestone 2 implements the remote-store contract, an in-memory fake, orchestration,
   journaling, and recovery.
4. The original browser adapter supplied UI and OAuth separately. Later workspace
   paths connect those host concerns to the provider-neutral contracts above.

Milestones 0–2 describe the provider-neutral packages, not the complete current
browser integration. Older design documents/ADRs record decisions at their milestone;
the mode-specific Dropbox/recovery documents and source are authoritative for current behavior.

## Documents

- [Architecture](./architecture.md)
- [Portable corpus and algorithm](./algorithm.md)
- [Conflict handling](./conflicts.md)
- [Provider contract](./provider-contract.md)
- [Dropbox](./dropbox.md)
- [Security and privacy](./security.md)
- [Testing](./testing.md)
- [Interruption recovery](./recovery.md)
- [Architecture decision records](./adr/)
