# Local workspace foundation

## Historical scope note

The sections below record the accepted **3 October 2026** foundation, not the current
feature set. Later work added personal verse/collection management, saved library
entries (using the existing `favorites` storage name), saved practice history,
situations, CBOR backup with confirmed replacement restore, and feature-flagged
workspace Dropbox sync. The database now has upgrades through v5.

For current behavior see [architecture](architecture.md),
[practice history](practice-history.md), [sync](sync/README.md), and
[compatibility boundaries](compatibility.md). In particular, the older claims below
about JSON export without restore, response import UI, v1-only manual sync and
mandatory future end-to-end encryption are historical: sign-in-only sync deliberately
uses Dropbox account protection instead. Local private data is not made public by
these additions; device credentials and Mira storage remain separate.

## Accepted scope (3 October 2026)

This iteration implements **only the local workspace foundation**. Accounts, new
sync services, shared workspaces, collaboration, and public submission are not
implemented. Future personal synchronization must be end-to-end encrypted: the
service operator must not be able to read personal content. Recovery-key design,
identity provider, and hosting remain decisions for that later stage.

## Ownership boundaries

- Public Patternverse remains a build-time publication. Its canonical identity is
  `(sourceId, entityId)`.
- My Workspace owns private custom articles, organization, usefulness ratings,
  and favorites. A favorite stores a reference, not a public article copy.
- Mira's encrypted conversations, run checkpoints, AI settings, and device key
  remain in its separate database. They are not folded into workspace ownership.
- Provider credentials, local actor identity, transient drafts, and caches are
  device-only. Adding ownership does not turn them into sync data.

The workspace has a stable UUID, a private/personal kind, a display name, creation
time, and a local actor owner. Signing in later must upgrade/reconcile that
existing workspace, not replace it with an empty one. Team/organization kinds are
reserved conceptually; there is no creation or membership API for them yet.

## Persistence and migration

`@patternverse/workspace` keeps the existing `patternverse-workspace-v1` database
name and upgrades its Dexie schema from version 1 to 2. The upgrade transaction
creates one personal workspace and assigns its ID to the existing entity and
usefulness records. IDs, source IDs, article bodies, collection references,
status values, creation times, and modification times remain unchanged. Opening
the upgraded database again reuses the same workspace and owner. Concurrent
first-time connections also resolve to the same workspace.

The four tables are `workspaces`, `entities`, `usefulness`, and `favorites`.
The subsequent [practice history](practice-history.md) feature upgrades to v3
and adds a fifth table, `practiceRuns`, for explicitly saved standalone responses.
Only one personal workspace is supported in this slice. Record lookup remains
compatible with existing clients; a future multi-workspace implementation will
need compound keys and explicit workspace-scoped APIs. `workspaceId` belongs to
the local storage envelope, not the strict public `RawEntity` article schema.

The internal `readWorkspaceData()` read model explicitly allows workspace
metadata, articles, favorites, usefulness, and saved practice runs. It excludes
actor identity and does not open Mira or provider databases. The workspace backup
downloads this read model as an unencrypted content export; it is not a one-click
restore format. Individual practice exports support preview and import as
described in [practice history](practice-history.md).

## User-facing terminology

The editor and My Workspace display ownership, privacy, and device persistence.
`published` and `deprecated` remain canonical schema values for compatibility,
but personal content calls them **ready** and **archived**. “Mark ready” does not
publish, share, or add anything to public Patternverse.

Favorites can be added from public pattern article pages and removed from My
Workspace. Titles and routes resolve from the current public corpus. Missing
articles keep their saved reference with an unavailable notice instead of a
broken link. Browsing list/card controls are unchanged.

Local persistence survives normal reloads and restarts, but clearing site data
can erase it. Browser and desktop profiles have separate local stores.
Personal articles remain unencrypted IndexedDB records in this slice; “private”
describes their audience, not protection from an unlocked device or same-origin
scripts. Mira's existing encrypted store is unchanged. End-to-end encryption of
future remote personal replicas is a separate, accepted requirement.

## Existing Dropbox support

The feature-flagged manual Dropbox adapter remains unchanged. It encrypts a
snapshot of personal articles and Mira conversations with a user-controlled
sync phrase. It does not currently include favorites, usefulness, workspace
metadata, settings, or guided-run checkpoints. OpenRouter credentials remain
excluded. The local ownership fields are stripped when articles pass through
the existing `RawEntity` API, preserving the v1 Dropbox snapshot format and its
existing account-owner binding. This iteration does not silently expand any
remote payload.

Before adding automatic personal sync, consolidate the browser adapter with
the provider-neutral sync/recovery contracts or deliberately replace it.
Handle concurrent local edits, durable recovery, deletions, key recovery, and
existing-account reconciliation explicitly. General workspace export/import is
the next proposed stage, before identity and personal sync.

Shared workspaces and Runs will additionally need server-side authorization.
Unrevealed participant state must never be placed in a document distributed to
other participants. Workspace invitations, Run invitations, and outcome shares
are distinct permissions. No multiplayer grammar is introduced in this slice.
