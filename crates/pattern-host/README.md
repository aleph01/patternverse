# Patternverse pattern host

This crate is the portable execution boundary for the seven bundled CBT, ACT,
and DBT Pattern Markdown exercises. It delegates parsing, step selection,
reply validation, and replay to `pattern-core`. It performs no inference or I/O
inside the library. The optional one-shot native binary accepts one JSON request
on stdin and returns one JSON response on stdout; it does not put private text
in command-line arguments or logs.

Version 1 requests include `"version":1` and one of `catalog`, `start`, `load`,
and `apply` as `"operation"`. A run response contains
both `saved` (the complete pinned checkpoint) and `view` (a projection for the
UI). Only `view.pending` may be answered or dispatched; `view.items` is historical
display data and must never trigger a model call. `apply` requires the UI's
`expected_revision`. Invalid commands and malformed checkpoints fail closed.

The host **does not persist or encrypt checkpoints**. The Patternverse browser
adapter uses a small WebAssembly bridge and encrypted IndexedDB records. It
compares the previous revision and commits `saved` before showing the new view.
AI-dependent effects remain unavailable in the browser until an explicit,
privacy-preserving effect adapter is added.

Run `cargo test --locked`, `cargo fmt --check`, and
`cargo clippy --locked --all-targets -- -D warnings` here to verify the host.
