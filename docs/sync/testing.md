# Sync testing strategy

## Pyramid

1. Pure sync-domain unit and generated property tests.
2. Reusable `RemoteCorpusStore` contract tests against an in-memory fake. Implemented in
   Milestone 2.
3. IndexedDB snapshot, staging, journal, and recovery integration tests.
4. Dropbox adapter HTTP-boundary tests with no live credentials.
5. Web component and state tests for connection, sync, and conflicts.
6. Playwright flows through the fake provider.
7. Optional Dropbox sandbox smoke tests outside ordinary CI.

## Milestone 1 acceptance matrix

The planner tests cover unchanged, one-sided create/update/delete, identical convergence,
all four conflict shapes, manifests, assets, preferences, path normalization, deterministic
ordering, input immutability, and rerun convergence.

Generated tests assert:

- identical local and remote snapshots never conflict;
- the same input always yields a deeply equal plan;
- planning does not mutate any snapshot or byte array;
- applying a non-conflicting plan produces equal local and remote file sets;
- replanning converged results produces no changes.

Vitest is the test runner. Fast-check is a development-only dependency for generated
properties. Provider credentials are never required by the normal test suite.

## Milestone 2 acceptance coverage

The deterministic fake-provider tests exercise two independent devices, initial upload and
download, concurrent edits, explicit keep-both resolution, deletion propagation, deletion
conflicts, offline local edits, stale remote revisions, interrupted partial writes, journal
recovery, expired authorization, invalid remote data, and isolated binary snapshots.
