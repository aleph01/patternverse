# ADR 0001: Separate public Sources from remote stores

**Status:** accepted

Public Sources are read-only compiled corpora loaded over HTTPS and combined in the unified
library. `RemoteCorpusStore` is private writable storage for the personal workspace. Saving
an external entity stores a reference; copying creates a personal entity with provenance.
Source corpus files must never enter the personal remote snapshot.
