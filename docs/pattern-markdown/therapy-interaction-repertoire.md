# Therapy interaction repertoire and expressibility audit

Implementation update: [choices and ranking](selections.md) now covers header parameters,
single/multiple selection, and ranking in the core, desktop chat and Preview. The audit
below records the earlier baseline; its proposed colon selection syntax is superseded.

Date: 2026-09-21. Scope: current repository, primarily the desktop Pattern Markdown
compiler/runtime, inline chat, and editor Preview. **Design report, not a release or
implementation of the proposed features.** The examples are product test cases, not
complete treatment protocols, diagnostic instruments, or clinically validated adaptations.

## Finding in brief

Single selection already works through `!choose`: authored or generated options,
stable option IDs, one validated answer, and immediate-submit buttons in chat/Preview.
Multiple selection does not work yet. It needs a language contract, a validated runtime
reply, and a UI with a draft selection followed by explicit confirmation. Merely adding
checkboxes would not provide the missing executable semantics.

The useful next step is a small reusable interaction vocabulary exercised by a varied
example suite. Technique-specific logic belongs in authored patterns; validity,
branching, and persistence belong in the Rust runtime; layout and unsent drafts belong
in Mira. A new visual layout does not automatically require a new language instruction.

## Evidence and current boundaries

| Capability | Current implementation | What is still missing |
| --- | --- | --- |
| Free text | `!ask`; desktop chat composer and Preview textarea | Structured optional/skip outcomes; current Preview marks text required although the core can accept empty text |
| Single selection | `!choose`, static `:option` or dynamic `:from`; output `choice`; `Selected(String)` reply | Radio/card/dropdown preferences and explicit confirmation are not authored options today |
| Multiple selection | No participant interaction | Cardinality, unique subset validation, empty selection, explicit submit, checkbox UI, replay tests |
| Lists of choices | `choices` values can supply options, including validated agent-generated options | They are not a multi-select response; `Value::Choices` is currently nonempty |
| Ratings | `!rate`, finite inclusive bounds, endpoint labels; `:prefer slider` already parses | Desktop currently renders a number field; discrete step size is not a semantic contract |
| Repeated entries | Open `!collect` produces bounded records; mapped collection processes a list once | Editing, deleting, or reordering accepted records; grouped table/form entry |
| Conditional paths | `?branch`, `?match`, forward jumps, declared typed outputs | Membership/search/sort/aggregation functions beyond existing expressions and `count` |
| Composition | `!use`, explicit inputs/outputs, pinned child snapshots | No implicit access to other chats or ambient patient history |
| AI assistance | Explicit agent generation/turns and typed generated contracts | Human-review workflows still need authorship; an AI suggestion must not submit a participant answer |
| Progressive wording refinement | Accepted `!refine` design and tested standalone Rust frame | Source/compiler/Manager/chat integration remains missing; design examples are not runnable |
| Review and summaries | `!show` plus explicit follow-up questions | Structured record/table rendering, safe Markdown rendering, compare/diff views; content currently renders as plain text |
| Pause/restart recovery | Durable desktop run checkpoints and ephemeral editor Preview | A diary/calendar with dated entries, trends, reminders, or cross-session comparisons is a separate Host capability |
| PWA | Modality-compatible prompt-based techniques | No equivalent desktop Pattern effect executor/widget bridge found; desktop support is not website parity |

Evidence locations:

- `crates/pattern-core/src/compiler.rs`: `choose` accepts only `option`/`from`, declares `Type::Choice`; rating hints and collection typing.
- `crates/pattern-core/src/runtime.rs`: `Request::Choose`, `Fulfillment::Selected(String)`, subset membership validation for a single ID.
- `crates/pattern-core/src/value.rs`: distinct `Choice`, nonempty `Choices`, and typed lists that can be empty.
- `crates/pattern-core/src/expression.rs`: pure operators and `count`, without membership, sorting, indexing, or arbitrary functions.
- `apps/desktop/src/pattern-runtime/PatternRunCard.tsx`: actual ask/choice/rating/show widgets, shared by Preview.
- `apps/desktop/src/pattern-runtime/bridge.ts`: corresponding wire types.
- `apps/desktop/src/pattern-runtime/PatternSimulation.tsx`: isolated preview, explicit mock/local-AI selection.
- `apps/desktop/src-tauri/src/session_patterns.rs`: durable conversation integration.
- `docs/pattern-markdown/refine.md`: explicitly identifies refinement as not yet compiled/integrated.
- `apps/pwa/src/therapyTechniques.ts`: prompt-based selection, not Pattern execution.

Some milestone documents describe their historical stage rather than today's whole
application. This audit uses implementation evidence and the current therapy pack
README to distinguish already-connected features from proposed ones.

## Anchor example: a CBT thought diary

The basic ABC formulation concerns an activating event, beliefs/thoughts, and
consequences. Identifying thinking styles is an optional extension, not a required
field in every ABC worksheet. CCI distinguishes its basic ABC diary from expanded
versions that add thinking styles and balanced thoughts. [CCI thought-diary resources](https://cci.health.wa.gov.au/Resources/For-Clinicians/Depression)

Original illustrative flow, not a reproduction of a worksheet:

| Step | Example interaction | Representation | Status |
| --- | --- | --- | --- |
| Readiness | “Would you like to explore one manageable moment?” | Single choice: begin / not now | Available |
| A — event | “What happened, as far as you could observe?” | Text | Available |
| B — interpretation | “What went through your mind?” | Text, optionally multiple thought records | Available through ask/collect |
| C — response | Name emotions, sensations, urges, and what you did | Text now; selectable emotions plus individual ratings later | Text/rating available; emotion multi-select missing |
| Strength | Rate one feeling or how convincing a thought felt | Number or slider, before and after | Numeric contract available; slider UI missing |
| Thinking styles | “Do any of these descriptions seem to fit? More than one may fit; none is okay.” | Multi-select, brief explanations, explicit Continue | Missing selection semantics and UI |
| Personal wording | Add something not represented, or say unsure/prefer not to answer | Separate authored choice/text branch initially | Composable; inline “Other” is additional UX/contract work |
| Evidence | Record observations that support or complicate the interpretation | Two bounded lists, potentially side by side | Sequential collections available; two-column editable record UI missing |
| Alternative | Write a perspective that feels more accurate/useful, if wanted | Text; optionally participant-controlled iterative refinement | One-pass available; general refinement integration missing |
| Review | Confirm the diary, compare ratings, choose a next step | Summary plus choice | Plain summary available; worksheet/history/correction UI missing |

A selection is a participant's tentative description, not Mira's diagnosis. For example,
“mind reading” or “all-or-nothing thinking” may be offered as possibilities, with plain
explanations. No option should be preselected because a model inferred it. “No labels
fit,” “unsure,” and “prefer not to answer” are different meanings and should not all
be silently represented by an empty list. Likewise, zero intensity is not a skipped
rating. Describing a concern as a thinking style must not dismiss a real danger.

### What already works

This is the existing single-choice syntax (the accompanying runnable fixture includes
consent, context, a skip path, and completion):

```pattern
!choose thinking_style {
    :option all_or_nothing "All-or-nothing thinking"
    :option mind_reading "Assuming what someone else thinks"
    :option none "None of these fits"
    :option unsure "I am not sure"

    Which description, if any, feels closest to your experience?
}
```

Clicking an option currently submits it immediately. This is not a checklist and it
does not allow multiple answers. Selecting a *technique* in Shift+Space is a separate
operation from answering this question *inside* a running technique.

### Proposed multi-select extension — not supported syntax yet

```pattern
!choose thinking_styles {
    :selection multiple
    :min 0
    :max 3
    :prefer checklist
    :option all_or_nothing "All-or-nothing thinking"
    :option mind_reading "Assuming what someone else thinks"
    :option predicting_worst "Predicting the worst outcome"

    Which descriptions seem to fit, if any? Choose up to three.
}
```

Recommended initial contract, subject to design approval:

1. Existing `!choose` remains single-select by default, with unchanged `choice` result
   and old receipt/checkpoint interpretation. Explicit `:selection single` may be an alias.
2. Multiple mode returns **`list<choice>`**, reusing the existing typed-list support.
   This permits a valid empty answer without redefining the existing nonempty `choices`
   option-catalog type. Existing `count` and mapped `!collect` can consume the result.
3. A distinct multi-selection receipt carries stable IDs, never participant-supplied
   replacement labels. Rust validates uniqueness, membership in the offered snapshot,
   and bounds before advancing atomically. Canonical option order makes click order
   irrelevant; this interaction is not ranking. Duplicate submissions remain idempotent.
4. Require an explicit finite maximum; minimum defaults to one. Permit zero explicitly.
   Reject negative/inverted bounds and static catalogs that cannot satisfy the minimum.
   Dynamic catalogs require the same feasibility check before presenting the question.
5. Checkbox/chip/card style is a preference; it cannot change cardinality or accepted
   values. Unsupported Hosts must refuse the capability or offer an equivalent validated
   fallback, never silently reduce a multiple-answer question to single-answer.
6. The UI holds an unsent selection, displays the allowed count, and submits only on
   Continue. Disable controls during submission; retain the draft after recoverable
   errors. An accepted answer becomes immutable transcript content.
7. If zero items are selected, authors can branch on `count(thinking_styles) == 0`
   and ask whether nothing fits, the person is unsure, or they prefer to skip. A global
   skipped-result type is a separate design decision, not an implicit empty-list rule.
8. Initially implement “Other” through an authored follow-up. Rich per-option help,
   exclusive options, inline custom values, and participant-edited option catalogs need
   explicit contracts before addition. They must not smuggle arbitrary generated IDs
   into a fixed catalog.
9. Preserve snapshots of active runs; use a compiler/capability version boundary for
   new instructions. Test old saved single-select runs rather than assuming compatibility.
10. Durable unsent drafts need a separate privacy/storage policy: committed answers
    already persist, but a not-yet-submitted checklist should not secretly become a
    committed reply during restart or navigation.

## Repertoire: concrete interaction test cases

These are suggested software scenarios, deliberately spanning different interaction
shapes. “Available” means the primitive sequence is expressible, not that a complete
clinically reviewed exercise has been authored and installed.

| ID | Technique-inspired example | What the participant does | Current coverage and revealing gap |
| --- | --- | --- | --- |
| CBT-01 | ABC diary with thinking styles | Write event/thought/response; select several possible styles; rate; review | Core text/single choice/rating available; multi-select and explanatory option cards missing |
| CBT-02 | Evidence review | Add observations supporting and complicating a thought; write a balanced perspective | Two bounded collections available; side-by-side editable worksheet missing |
| CBT-03 | Behavioral experiment | Write prediction; estimate confidence; choose a safe test; return with observations | Manual pause/resume and text/rating available; dated follow-up, reminders, linked comparison are Host work |
| CBT-04 | Behavioral activation plan | Choose activities; break one into steps; pick a time; later record experience | Basic plan already exists; multi-select, date/time contract, schedule and history missing |
| CBT-05 | Graded task/experiment ladder | Create small steps, estimate difficulty, arrange them, select one | Collection + ratings possible; ranking/reordering typed records missing; clinician review before exposure-oriented use |
| CBT-06 | Responsibility pie | List contributing factors; allocate percentages that total 100 | Text/ratings available individually; cross-field sum constraint and allocation interaction missing; pie is presentation |
| DBT-01 | Emotion/skills diary | Record a date, emotions and intensities; select skills practiced; review a week | Sequential data entry possible; multi-select, grouped form, daily record store and trend view missing |
| DBT-02 | Behavior chain reflection | Add event/thought/feeling/action links; inspect sequence; insert a missed link | Append-only bounded collection available; correction/insertion/reordering and timeline presentation missing |
| DBT-03 | Pros and cons | Add entries to four named categories; review tensions; choose freely | Four collections available; four-panel worksheet and review editing are UI/protocol work |
| DBT-04 | Interpersonal rehearsal | Clarify priorities, draft words, rehearse, revise or keep the wording | A basic interpersonal pattern exists; repeated participant-approved revision needs compiled refinement |
| DBT-05 | Cope-ahead plan | Describe a foreseeable everyday situation; choose skills; rehearse; save a plan | Single-pass text/choice available; multi-select, iterative rehearsal and dated follow-up missing |
| ACT-01 | Values clarification | Select personally meaningful qualities, optionally narrow/prioritize, choose an action | Text/single-selection sequence available; multi-select/ranking missing; do not turn values into an externally scored test |
| ACT-02 | Defusion practice | Name a thought, choose willingness, try a brief wording change, describe experience | Finite version already installed; no new primitive required; do not make lower distress the condition for success |
| ACT-03 | Toward/away reflection | Place participant-authored experiences/actions into labelled areas; reconsider placements | Sequential categorised records possible; move/classify existing items and spatial board are missing |
| CT-01 | Overt-statement wording | Read a candidate, correct it, inspect the revised version, keep it or finish without accepting | Accepted refinement design covers the intended semantics; compiler/Manager/chat integration still missing |
| NARM-01 | Present-focused intention | Name what is wanted, notice present experience, choose what to explore or leave | Existing text/choice primitives can support a modest finite reflection; ongoing relational responsiveness is not a deterministic worksheet |
| GEN-01 | Personal coping menu | Select useful options, add personal wording, pick one, later report usefulness | Multi-select and typed custom additions missing; ordinary text/choice fallback possible |
| GEN-02 | Review a proposed summary | Read a draft, correct one part, approve or decline, inspect changed wording | One-pass ask/show possible; general review/edit semantics and structured correction history missing |

Conceptual sources (not endorsements of Mira): CCI covers thought diaries and activity
planning in its [clinician resources](https://cci.health.wa.gov.au/Resources/For-Clinicians/Depression),
and separates predictions, observations, and learning in its
[behavioral experiment worksheet](https://www.cci.health.wa.gov.au/~/media/CCI/Mental-Health-Professionals/Anxiety/Anxiety---Worksheets/Anxiety-Worksheet---10---Behavioural-experiment.pdf).
The University of Washington's [DBT diary-card resource](https://depts.washington.edu/uwbrtc/wp-content/uploads/NIMH4-S-DBT-Diary-Cards-with-Instructions.pdf)
illustrates repeated ratings, skill tracking, and dated records. VA's
[DBT resource page](https://www.mirecc.va.gov/visn19/cpg/recs/9/) identifies diary cards
and chain analysis as resources. ACBS describes
[ACT's processes](https://contextualscience.org/six_core_processes_act), including
defusion, chosen values, and committed action; its
[exercise library](https://contextualscience.org/values_exercises) explicitly does not
make every contributed exercise an approved protocol. CT/NARM rows are original
product examples based on Mira's existing design scope, not claims of clinical fidelity.

## Reusable gaps and suggested order

### 1. Selection and a complete first example

Build backward-compatible single/multi-selection contracts and generic renderers in
both desktop chat and Preview. Add bounds, explicit confirmation, keyboard controls,
help text design, skip/none distinctions, and a runnable CBT-01 fixture. Export the
participant's structured responses, not just a generic `reflected` outcome if the
example needs later review. Keep those outputs within the existing privacy boundary.

### 2. Better existing controls and repeated records

Honor the existing slider preference with an accessible numeric fallback. Decide if
integer step restrictions are needed separately from slider styling. Use CBT-02 and
DBT-03 to exercise grouped record summaries. Do not batch several effects into one
atomic editable form without designing a grouped-submit contract.

### 3. Refinement integration

Connect the already-specified text-refinement frame to parsing, compilation, snapshot
validation, Manager, chat and Preview. Use CT-01 and DBT-04 as contrasting test cases.
Preserve explicit acceptance, renewable-budget decisions, finish-without-acceptance,
and no re-generation of already accepted AI replies. Do not replace this with a
JavaScript loop or assume independent collection records can carry a changing candidate.

### 4. Structured editing and ranking

Use DBT-02, CBT-05 and ACT-01 to decide how to revise a working record list and commit
an order. Add keyboard move-up/down alongside any drag affordance. Ranking is not
selection order. Revising a previously accepted answer must create a new revision or
fork/replay with explicit invalidation of downstream results—not mutate active bindings.
CBT-06 separately tests cross-field constraints, not merely another picture of ratings.

### 5. Longitudinal Host features and other clients

Use DBT-01 and CBT-03 to design dated entries, local time zones, reminders, comparisons,
export and consented cross-session inputs. These are not satisfied merely by saving
a paused Run. Decide how shared Pattern data reaches the PWA; preserve one semantic
implementation rather than adding an independent JavaScript interpreter. Scheduling
must not wake AI or disclose therapy content without explicit permission.

## Definition of done for each example

- A source fixture or explicitly labelled design-only example; no pretend-runnable syntax.
- Participant steps, permitted inputs, output types, allowed empty/skip paths, and explicit maximums.
- A successful scenario plus none/unsure/decline/invalid-bound cases as applicable.
- Tests for unknown IDs, duplicate selection, repeat submissions, pause, cancellation,
  recovery, and stale replies after navigation/source changes.
- Equivalent meaning in chat and Preview; Preview remains ephemeral. Separate client
  support status for desktop and PWA.
- Keyboard and screen-reader operation; no mouse-only drag or unlabeled icons.
- Clear participant versus AI provenance; tentative suggestions require participant
  confirmation, and quoted responses can never become executable Pattern instructions.
- No inference of diagnosis, causality, readiness, consent, improvement, or successful
  treatment from completion or a rating. Content review is distinct from runtime tests.
- Clinical review before deployment of more demanding exposure, trauma, risk-assessment,
  or crisis-related material. Do not copy proprietary worksheets or present a diary
  card as an emergency monitoring service.

## Verification performed for this report

Read current compiler, runtime, types, generic widgets, collection/expression contracts,
refinement status and PWA technique selection. Added a small **single-selection design
fixture** alongside this report and checked it with the production CLI. Checked that
the proposed selection attribute and existing refinement design example are rejected
by the current compiler. No production language/runtime/UI changes, migration, model
calls, private diary access, or deployment are part of this audit.
