# Patternverse synchronization

Patternverse has two independent extension points:

- **Public Sources** extend the unified read-only library. Patternverse Commons is the
  default Source, and users may subscribe to other statically published corpora.
- **Remote corpus stores** synchronize only the editable personal workspace.

Dropbox is the first and only provider planned for the initial complete sync
implementation. The sync domain and remote-store contract remain provider-neutral so a
future provider does not change synchronization rules.

The implementation is deliberately staged:

1. Milestone 0 records architecture, security, provider, and testing decisions.
2. Milestone 1 implements and exhaustively tests the pure three-way sync domain.
3. Milestone 2 implements the remote-store contract, an in-memory fake, orchestration,
   journaling, and recovery.
4. Later milestones will introduce UI, authentication, and finally the Dropbox adapter.

No real provider access, credentials, OAuth flow, or sync UI belongs to Milestones 0–2.

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
