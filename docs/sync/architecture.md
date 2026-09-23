# Sync architecture

## Boundaries

```text
                         UNIFIED LIBRARY

 Personal workspace        Commons          Subscribed Sources
 editable                  read-only        read-only
       |                       |                  |
       +-----------------------+------------------+
                               |
                      browse / search / links


                   PERSONAL WORKSPACE ONLY
                               |
                  serialize portable corpus
                               |
                      pure sync domain
                               |
                    RemoteCorpusStore
                               |
                       Dropbox adapter
```

Public Sources and remote stores are intentionally different contracts. A public Source
is a static, read-only corpus fetched over HTTPS. A remote store is private, writable
storage used to synchronize one personal workspace.

Browsing a Source never copies its entities into IndexedDB. Saving a Source entity stores
an entity reference. Copying creates a new editable personal entity and records
`copied_from` provenance. Public corpus files are never uploaded to Dropbox.

The portable personal corpus may synchronize source subscriptions, saved references, and
usefulness as private state in `.patternverse/preferences.json`. It does not synchronize
analytics, transient UI state, or ephemeral Practice responses.

## Runtime layers

### Sync domain

Pure provider-independent functions understand corpus files, hashes, snapshots, changes,
deletions, and conflicts. They have no access to IndexedDB, HTTP, OAuth, Dropbox, or UI.

### Application orchestration

Later milestones will serialize the personal workspace, acquire complete snapshots, invoke
the planner, stage local changes, execute remote changes, and record a new base only after
a successful converged sync.

### Provider adapter

The first complete adapter will implement `RemoteCorpusStore` for Dropbox. It translates
Dropbox revisions and failures into the common contract. It never decides merge semantics.

### Authentication infrastructure

OAuth is separate from both the sync domain and adapter semantics. The preferred design is
a narrowly scoped token broker that completes OAuth, retains refresh credentials outside
JavaScript, and supplies short-lived access tokens to browser memory. Corpus bytes should
move directly between the device and Dropbox.

## Current repository boundaries

- `@patternverse/schema` owns authored entity and reference schemas.
- `@patternverse/compiler` already serializes personal entities to portable Markdown.
- `@patternverse/workspace` owns editable IndexedDB records and unified-library assembly.
- `@patternverse/sync-domain` owns the new pure snapshot planner.
- `@patternverse/remote-store` owns the provider contract, fake, executor, journal boundary,
  and orchestration.
- A later `@patternverse/source-client` package may own subscribed static-source loading.

## Local-first guarantees

- Reading and editing use IndexedDB and never wait for Dropbox.
- A failed sync never rolls back a successful local save.
- Remote snapshots are synchronization inputs, not a live database.
- One workspace has zero or one active remote store.
- Provider switching requires disconnect plus an explicit migration/export workflow.

## Known follow-up work

The current workspace database has no saved-reference, subscription, sync-base, connection,
or durable execution-journal tables. Milestone 2 supplies the storage interfaces and an
in-memory implementation; IndexedDB wiring remains a later application integration. The
current public-source manifest also lacks a compiled distribution revision and file
inventory.
