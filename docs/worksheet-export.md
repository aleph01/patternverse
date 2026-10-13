# Blank Pattern Language workbooks

An eligible article's **Worksheet** shortcut opens a read-only preview. Users can copy plain
text or Markdown, or download `.txt` / `.md`. The personal practice editor offers the
same export for its current definition. There is no export of saved answers or run
state, no new interpreter, and no model call.

`ExecutableSnapshot::worksheet()` projects validated compiler steps and pinned child
definitions. The source host's `worksheet` operation accepts exactly one authored
source or audited catalog identity. It never starts a runtime session. The existing
Markdown renderer sanitizes the preview; the existing Markdown parser produces the
plain-text formatting projection. `worksheet_availability` uses this same projector,
not a separate browser eligibility heuristic. Both availability and direct export
reject AI-dependent definitions, including unselected branches, repeatable blocks,
realized question wording, and the entire pinned dependency closure. Unrelated
supplied sources that are not dependencies do not affect eligibility. The shortcut
and its article action card are hidden when unavailable; the editor explains why.

## Mapping and fidelity

- Forms become titled sections. Ask/show wording stays authored; question fields are
  blank and retain their required/optional designation. References to earlier answers
  use readable names instead of internal binding paths.
- Choices preserve visible labels and cardinality. Rankings request every offered
  item exactly once. Ratings retain inclusive bounds and endpoint labels.
- Constant expressions use the existing core evaluator. Unanswered references remain
  explicit placeholders. Answer-dependent calculations become manual instructions and
  flag the export as partial rather than silently inventing values.
- Timers become external-timer instructions with duration, adjustment bounds and
  blocking policy. Collections/loops become one reusable block with bounds, carried
  values and stop instructions, not eagerly expanded repetitions.
- Forward branch/match/jump paths become readable conditional sections. A decision
  table is used for constant-only alternatives, preserving every recommendation.
  Ordered alternatives explicitly require the first matching condition, with exact
  decimal bounds. Shared continuations appear once. Independent conditions stay
  independent. Terminal sections say to finish, while empty sections say to continue.
  Nested sections preserve this distinction. No numeric routes are exposed.
  Child definitions are included from the pinned closure, with readable input/output
  mappings and return instructions. Safety/readiness branches are not discarded.
- Structured displays retain source data and dimension/group/order/link/split
  instructions. This initial projection does not recreate graphical layouts.
- Non-AI refinement retains participant review, revision budgets and explicit renewal.
  Conversational message handlers and AI-dependent steps make the workbook unavailable,
  rather than producing an incomplete exercise.

Fidelity is `complete`, `adapted` (manual controls/conditional sections/repetition), or
`partial` (manual answer-dependent calculations). Notices are included in
the copied/downloaded content, not only in the dialog. An unresolvable dependency or
invalid definition fails export; it never falls back to a misleading complete sheet.
Ambiguous choice labels, crossing/tangled conditional sections, and expressions that
lack a readable manual projection also fail export; raw language syntax is not a
fallback. Exports are limited to eight conditional levels, 16 dependency levels,
2,048 projected steps and 1 MiB output. These are presentation limits, not changes
to the executable language or runtime.

## Verification

Core mapping tests: `cargo test --manifest-path crates/pattern-core/Cargo.toml --test worksheet`.
Source/catalog transport and safety tests: `cargo test --manifest-path crates/pattern-host/Cargo.toml --lib`.
Browser coverage: `apps/web/tests/worksheet.spec.ts` tests desktop/mobile preview,
clipboard success/failure, downloads, fidelity, safe exits, keyboard dismissal,
conditional tables, AI exclusion, and eligibility changes while editing.
