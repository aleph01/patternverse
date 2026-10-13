# Guided CBT patterns

The bundled CBT host catalog contains ten exercises, in this order:

1. Thought Record / Cognitive Restructuring (`cbt.thought-record`)
2. Behavioral Activation (`cbt.activation`)
3. Exposure (`cbt.exposure`)
4. Behavioral Experiment (`cbt.experiment`)
5. Problem Solving (`cbt.problem-solving`)
6. Identify Cognitive Distortions (`cbt.thinking-patterns`)
7. Downward Arrow (`cbt.downward-arrow`)
8. Worry Time / Stimulus Control for Worry (`cbt.worry-time`)
9. Activity–Mood Monitoring (`cbt.activity-mood`)
10. Graded Task Assignment (`cbt.graded-task`)

The release catalog and Rust host retain these ten. The public CBT article collection
also includes the Double Standard Technique and Semantic Method, so its twelve members
must not be confused with the ten bundled host IDs above. Readable article practices
use the same Rust source runtime without requiring a bundled catalog entry.
All ten guided sequences are scripted and run offline; none
requires model generation. ACT and the former Therapy techniques umbrella collection
are no longer offered. The two existing DBT host exercises also start directly at
their exercise-specific step.

The sequences are original self-help adaptations, not diagnosis or treatment. They
start directly when opened and allow pausing or ending. The DBT exercises retain
their situation-specific safety and support choices. Thinking-pattern labels include
disqualifying/discounting the positive and are
tentative, not verdicts. Exposure is a planning/reflection exercise for manageable,
objectively safe everyday situations, not trauma processing or specialist OCD or
physical-sensation treatment. Planning never creates calendar events or notifications.

## Sources and execution

`patterns/` contains the active version-1 Pattern Markdown programs. Their content
release is version 2.1.0, with Worry Time at 2.2.0 (DBT 1.1.0); the language and checkpoint formats have not
changed.
`content/patterns/` contains exact readable source copies plus scope/source notes.
`content/collections/cbt.md` defines curated order.
`apps/web/src/lib/mira/therapy-library.ts` maps article slugs to executable IDs.

Rust owns branching, reply validation, checkpoints, and replay. After editing a source
or host catalog, rebuild the checked-in browser engine with `pnpm build:pattern-wasm`.
Run the native host tests and browser tests to verify source/catalog parity.

## Retired content and existing private runs

`legacy/` is outside the public content compiler. It preserves the removed ACT and
redundant CBT articles, original executable sources, scenarios, and former audit notes.
`legacy_library.rs` accepts exact archived sources only when restoring a replay-validated
checkpoint; retired IDs cannot start a new run and are absent from all catalogs.
Updated CBT and DBT IDs keep their older sources in `legacy/patterns/` and
`legacy/readiness/` and `legacy/worry-time/` available for existing runs, so a catalog change
does not rewrite or strand private exercise answers.

Old ACT conversations remain stored unchanged and are labeled as a retired approach.
Their ordinary chat uses neutral reflection, not the retired stance or a silently
substituted therapy approach. Stored custom prompts are preserved but not activated for
the retired approach. New sessions use an available preference, falling back to NARM.
