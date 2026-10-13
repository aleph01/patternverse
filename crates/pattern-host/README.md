# Patternverse pattern host

This crate is the portable execution boundary for ten current CBT patterns, two DBT
exercises, and the reframing library. It delegates parsing, step selection,
reply validation, and replay to `pattern-core`. It performs no inference or I/O
inside the library. The optional one-shot native binary accepts one JSON request
on stdin and returns one JSON response on stdout; it does not put private text
in command-line arguments or logs.

Version 1 requests include `"version":1` and one of `catalog`, `start`, `load`,
`apply`, and `rewind` as `"operation"`. A run response contains
both `saved` (the complete pinned checkpoint) and `view` (a projection for the
UI). Only `view.pending` may be answered or dispatched; `view.items` is historical
display data and must never trigger a model call. `apply` requires the UI's
`expected_revision`. `rewind` also requires that revision plus the accepted
participant step’s `run_id` and `effect_id`. It reopens that interaction from the
pinned journal prefix, invalidates later results, and increments the revision.
The worksheet opens a temporary rewound checkpoint while keeping later answers
visible. Saving validates the changed answer and carries compatible participant
answers forward along the same source nodes and loop iterations. Model effects,
timers, a different path, or rejected answers stop that carry-forward; earlier
responses remain visible and can still be included in saved practice history.
Historical model results are never redispatched. Invalid commands and malformed checkpoints fail closed.

The host **does not persist or encrypt checkpoints**. The Patternverse browser
adapter uses a small WebAssembly bridge and encrypted IndexedDB records. It
compares the previous revision and commits `saved` before showing the new view.
AI-dependent effects remain unavailable in the browser until an explicit,
privacy-preserving effect adapter is added.

The current CBT catalog is scripted and offline. Retired ACT and redundant CBT IDs
cannot start new runs. Exact original sources remain in `legacy_library` solely for
replay-validated checkpoint restoration; changing the catalog never rewrites a saved run.

`editor::execute` is the existing bounded source-run transport used by the website,
authoring preview and standalone embed prototype. Its historical name/export and
`editor.preview` root identity remain compatible. It supports `inspect`, `start`,
`apply`, `rewind` and `restore`; source runs are separate from catalog admission. Restore
uses the same checkpoint bounds and RunManager replay validation as apply, requires
the exact pinned source, and returns a view without dispatching historical or pending
effects. The neutral browser adapter is `apps/web/src/lib/pattern-runtime`.

Run `cargo test --locked`, `cargo fmt --check`, and
`cargo clippy --locked --all-targets -- -D warnings` here to verify the host.
