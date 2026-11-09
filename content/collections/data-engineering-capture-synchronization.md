---
id: data-engineering-capture-synchronization
type: collection
title: Capture & synchronization
summary: Data engineering patterns for capture & synchronization.
status: published
verses:
  - data-engineering
items:
  - data-chunked-snapshotting
  - data-claim-check
  - data-consistent-snapshot-reads
  - data-cursor-based-incremental-extraction
  - data-deletion-tombstones
  - data-full-snapshot-extraction
  - data-keyset-pagination
  - data-log-based-change-data-capture
  - data-manifest-based-file-ingestion
  - data-overlapping-extraction-windows
  - data-snapshot-then-stream
  - data-trigger-based-change-capture
---

Explore 12 field-guide articles on capture & synchronization. Each article develops a concrete problem, explains the design response, and discusses examples and limits.

The existing Publish–Subscribe Distribution entry continues as [[data-publish-subscribe-distribution|Publish-Subscribe]] in [[software-messaging-integration|Messaging and Integration]], with its canonical ID preserved.

[[data-transactional-outbox|Transactional Outbox]] commits publication intent with its business change and supports polling or CDC delivery. Its primary home is Persistence and Transactions in Software Engineering; this capture perspective remains relevant here.
