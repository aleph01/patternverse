# Pattern Markdown core

Portable Rust compiler and runtime migrated from Mira into Patternverse. The
engine and its therapy-pattern fixtures are tested here, but the Patternverse
web companion does **not yet execute** these programs. Native and web hosts
must explicitly connect to this crate before guided exercises become available.

Production function docs are enforced for this crate. Run `cargo test --locked`,
`cargo fmt --check`, and `cargo clippy --locked --all-targets -- -D warnings`
from this directory.

## What works

- Chumsky directive/argument/reference parsing with explicit line/block structure,
  UTF-8 byte spans, parsed AST, semantic validation, validated AST and lowered nodes.
- `:language 1`, `:title`, explicit typed inputs and declared outputs.
- `!agent` structured generation and conversational turns, static/dynamic `!choose`,
  nonblocking `!show`, text `!ask`, bounded numeric `!rate`, and `-> end`.
- Typed pure expressions, derivations, ordered branches, exact matches, labels and
  strictly forward jumps. Definite/single assignment and output-completeness checking
  across joins, with unreachable-code warnings.
- Explicit/shorthand action blocks and escaped literal Markdown. The exact rules and
  remaining limits are in the [M2 language notes](../../docs/pattern-markdown/core-language.md).
- Text, finite numbers, booleans, choice and choices contracts. Choices use unique
  nonempty semantic values and nonempty labels; `:min`/`:max` constrain choices counts.
- Open/mapped `!collect`, typed record lists, immutable per-record scope and ordinary
  choice effects for continuation. Limits are finite and incomplete records stay separate.
- Homogeneous list inputs, `count` on lists/choices, typed record-field paths and
  structural equality. See the [collection rules](../../docs/pattern-markdown/collections.md).
- Immutable bindings resolved to IDs; interpolation of bindings, record paths and
  choice fields (`.value` / `.label`). A choice interpolates as its label. Generated strings stay data.
- Pure transitions, typed effect envelopes, accepted-result ledger, deterministic
  retries/duplicate handling, output projection and semantic traces.
- Single-Run pause/resume preserves the current record and pending effect identity;
  cancel/fail stop the Run without projecting success outputs.
- `!use` with explicitly typed child inputs and declared output records. A separate
  pure Run Manager starts isolated children, waits for completion and propagates
  pause/resume/cancel/fail. Child calls are Manager actions, never UI effects.
- Immutable executable snapshots resolve local names to exact compiled dependencies,
  reject recursive graphs and pin the entire source closure. See
  [composition notes](../../docs/pattern-markdown/composition.md).
- Serialized explicit state pins the exact source and compiled representation.
  Deserialization recompiles the source and deterministically replays accepted
  receipts to check the saved cursor, bindings, pending effect and outputs. It makes
  no AI calls and emits no external effects during restore.
- Fixture simulation and interactive CLI use the same runtime, not a preview interpreter.
- Versioned checkpoints commit accepted results, pending work and content acknowledgements
  together through an atomic compare-and-swap storage boundary. Stale writers fail closed.
- A recoverable content queue, ordered accepted-result ledger and deterministic replay
  support restart recovery without dispatching historical effects. Scripted scenarios,
  property tests and process-exit fixtures exercise the same runtime. See the
  [persistence protocol](../../docs/pattern-markdown/persistence.md).
- The approved `!refine` semantic frame remains in `refine.rs` for subsequent integration.

## Development harness

Run from the repository root:

```sh
cargo run --manifest-path crates/pattern-core/Cargo.toml --offline --bin pattern -- check docs/pattern-markdown/examples/theme-explorer.pattern.md
cargo run --manifest-path crates/pattern-core/Cargo.toml --offline --bin pattern -- simulate docs/pattern-markdown/examples/theme-explorer.pattern.md docs/pattern-markdown/examples/theme-explorer.fixture.json
cargo run --manifest-path crates/pattern-core/Cargo.toml --offline --bin pattern -- run docs/pattern-markdown/examples/theme-explorer.pattern.md docs/pattern-markdown/examples/theme-explorer.inputs.json
cargo run --manifest-path crates/pattern-core/Cargo.toml --offline --bin pattern -- simulate docs/pattern-markdown/examples/check-in.pattern.md docs/pattern-markdown/examples/check-in.fixture.json
cargo run --manifest-path crates/pattern-core/Cargo.toml --offline --bin pattern -- simulate docs/pattern-markdown/examples/ideas.pattern.md docs/pattern-markdown/examples/ideas.fixture.json
cargo run --manifest-path crates/pattern-core/Cargo.toml --offline --bin pattern -- check-bundle docs/pattern-markdown/examples/project-review.bundle.json
cargo run --manifest-path crates/pattern-core/Cargo.toml --offline --bin pattern -- simulate-bundle docs/pattern-markdown/examples/project-review.bundle.json docs/pattern-markdown/examples/project-review.fixture.json
cargo run --manifest-path crates/pattern-core/Cargo.toml --offline --bin pattern -- scenario-bundle docs/pattern-markdown/examples/project-review.bundle.json docs/pattern-markdown/examples/project-review.scenario.json
```

`check` renders structured errors and warnings with Ariadne. `simulate` consumes an exact
fixture sequence and returns state, effects and traces as JSON. `run` prompts for
manual AI fixtures and participant choices; it does not contact a model. Enter
generated values as tagged JSON, for example:

```json
{"type":"choices","value":[{"value":"time","label":"Making time"},{"value":"confidence","label":"Finding confidence"},{"value":"starting","label":"Taking the first step"}]}
```

Then enter `starting` as the participant's choice. Unknown IDs and invalid responses
leave the same interaction pending. The fixture files contain only synthetic data.
`check-bundle` and `simulate-bundle` accept an explicit local source bundle (`root`
name plus `patterns` name-to-source map), not URLs or implicit filesystem lookup.
They build and execute a pinned snapshot through the same Run Manager. The sample
bundle is a checked copy of the canonical `.pattern.md` examples, not another language.
`scenario-bundle` adds restart, lifecycle, duplicate/rejected-reply and acknowledgement
steps plus explicit expectations. It uses the real persistence boundary with a fixture-only
memory store. JSON reports contain semantic state and traces; treat them as sensitive
if replacing the supplied synthetic data with personal inputs.

```sh
cargo test --manifest-path crates/pattern-core/Cargo.toml --offline
cargo fmt --manifest-path crates/pattern-core/Cargo.toml --check
cargo clippy --manifest-path crates/pattern-core/Cargo.toml --offline --all-targets -- -D warnings
```

## Deliberate limits

This core delivers **M5, not the complete language**. M6's separate native Host provides
encrypted persistence for bundled preview examples; M7 adds desktop session-attached
[inline widgets](../../docs/pattern-markdown/inline-chat.md). Record literals/input schemas,
compiled refine, the library and editor
remain later work. Unsupported directives fail closed instead of silently changing
meaning. Attributes precede body content. Markdown is dedented and source escapes
are resolved; a future UI Host must render it safely.

Compiled IDs include the compiler schema version, exact source and resolved child
interfaces/revisions. Executable snapshot IDs pin the exact root/dependency sources. Node
IDs are unique instruction IDs within that pinned executable; collection-body IDs
follow root instruction IDs. They are not source lines or cross-revision authoring IDs.
Single-Run replay validates bounded collection frames and typed child completions;
Run Manager replay additionally validates the complete tree against actual child execution.
State validation is not encryption, authenticity
or a resource-limited untrusted-import boundary. Serialized files can contain
sensitive inputs and results: production persistence requires the existing privacy
boundary and atomic durable storage. M5 retains Run schema 4 / compiler m4-v1 and
executable/manager schema 1, adding checkpoint schema 1; M1–M3 development snapshots are rejected.
Snapshot-version migration is not yet supported. One manager owns a root tree;
independent roots use independent instances. There is no concurrent-child syntax.

The memory store is not durable. The plaintext atomic file adapter exists only in test
support and uses isolated synthetic fixtures. No app data is read or migrated. Test-only
dependencies are proptest, insta, tempfile and fs2; production dependencies are unchanged.

The standalone refinement frame retains its existing development serialization;
its frame must be driven by compiled bodies in this runtime, never by a second Host
interpreter. See the [checkpoint](../../docs/pattern-migration/checkpoint.md).
