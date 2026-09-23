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
for tests; the web application will later implement it in IndexedDB so recovery survives a
reload or browser restart.
