# Portable corpus and sync algorithm

## Portable personal corpus

Remote storage contains the same authored format used by export/import:

```text
patternverse.yaml
patterns/*.md
concepts/*.md
practices/*.md
collections/*.md
verses/*.md
assets/*
.patternverse/preferences.json
```

Only personal entities are serialized. Commons and subscribed Source corpora remain
read-only external inputs. Preferences are private personal state, separate from authored
Markdown.

## Snapshot model

A snapshot is an optional revision plus a canonical, uniquely keyed set of files. Each
file has a normalized relative path, SHA-256 content hash, and exact bytes. Revision values
are diagnostics and conditional-write inputs; content hashes determine changes.

The planner compares:

- **Base:** last successfully synchronized snapshot.
- **Local:** current serialized personal workspace.
- **Remote:** one complete successfully acquired remote snapshot.

Partial or failed provider listings must never be presented to the planner as a complete
snapshot, because a missing file would otherwise look like a deletion.

## Planning

`planCorpusSync({ base, local, remote })` is synchronous, deterministic, and side-effect
free. SHA-256 calculation happens while snapshots are constructed at the boundary.

For each canonical path:

| Local relative to base | Remote relative to base | Result                |
| ---------------------- | ----------------------- | --------------------- |
| unchanged              | unchanged               | unchanged             |
| changed                | unchanged               | push local change     |
| unchanged              | changed                 | pull remote change    |
| changed identically    | changed identically     | unchanged convergence |
| changed differently    | changed differently     | conflict              |
| deleted                | unchanged               | push deletion         |
| unchanged              | deleted                 | pull deletion         |
| deleted                | modified                | conflict              |
| modified               | deleted                 | conflict              |
| deleted                | deleted                 | unchanged convergence |

Output changes and conflicts are sorted by path. Planning never performs writes.

## Planning versus execution

```text
complete snapshots -> pure plan -> explicit conflict decisions -> resolved plan
                                                             |
                                                     later executor
                                                             |
                                       staged local + conditional remote writes
                                                             |
                                                   new common base
```

Milestone 2 executes resolved plans through explicit local and remote boundaries, persists
each execution phase through `SyncStateStore`, and replans after stale revisions. A new base
is recorded only after both sides converge and the resulting snapshots are validated.
