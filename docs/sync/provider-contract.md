# Remote corpus store contract

`RemoteCorpusStore` is the provider-neutral boundary implemented in Sync Milestone 2.

Conceptually it exposes:

```ts
type RemoteCorpusStore = {
  readonly providerId: string;
  readonly capabilities: RemoteCorpusCapabilities;
  readSnapshot(connection: RemoteConnection): Promise<RemoteSnapshotResult>;
  applyChanges(
    connection: RemoteConnection,
    request: ApplyRemoteChangesRequest,
  ): Promise<ApplyRemoteChangesResult>;
};
```

Writes include an expected remote revision. A stale revision returns a normalized revision
conflict, after which orchestration reads again and replans. Essential correctness may not
depend on atomic multi-file writes.

The initial capability model covers atomic batches, change cursors, visible files, revision
history, and folder selection. Normalized errors cover authentication, expiry, permission,
not-found, stale revision, rate limits, temporary unavailability, quota, and invalid remote
corpus.

The in-memory fake passes the reusable contract suite, including complete reads, binary and
nested files, conditional create/update/delete, stale revisions, normalized failures,
disconnection, isolated snapshots, and partial writes. Dropbox remains the only real adapter
planned for the first complete provider milestone.
