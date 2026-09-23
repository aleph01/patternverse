# ADR 0003: Three-way file-level synchronization

**Status:** accepted

Synchronization compares the last successful base, current local snapshot, and complete
remote snapshot by canonical path and content hash. Timestamps are diagnostic only. Planning
is pure and provider-neutral; remote revisions protect execution from stale writes.
