# Mira guided therapy-informed Patterns · 1.0.0

This is a **historical release record**. Its ACT availability, collection counts and
UI paths describe an earlier version, not the current public catalog. Sources in
this archive are retained for exact checkpoint restoration, not new-run discovery.
See the [active package](../README.md) and
[compatibility inventory](../../../docs/compatibility.md). Do not rewrite the archived
programs or their scenarios as documentation cleanup.

## Core library expansion (September 2026)

The Apps → mira landing page exposes the existing private session store. The Therapy
collection now links CBT and ACT subcollections with 35 readable/runnable entries:
32 new scripted sources plus three existing activation, defusion, and values episodes.
The historical pack below remains pinned and unchanged so old checkpoints still restore.

New sources use the existing Rust host, version-1 language, shared consent/decline/support
entry, and optional user-controlled cancellation. Checklist and ranking interactions are
rendered generically in the web host. No model inference is used by these core exercises.
They are original self-reflection adaptations, not validated treatments or comprehensive
clinical protocols. Article references identify the underlying approach, not app efficacy.

Article IDs map to executable IDs in `apps/web/src/lib/mira/therapy-library.ts`.
The native/browser executable allowlist lives in `crates/pattern-host/src/core_library.rs`.
`core_library_sources_complete_decline_and_restore` tests every new source across restart
boundaries and all three entry choices. Rebuild the checked-in WASM after source changes.

## Original pack

Seven **guided self-reflections**, implemented in Pattern Markdown and executed by the
existing Rust compiler/Manager. They are not complete treatment protocols, clinical
assessment tools, or clinician-reviewed/validated interventions. No efficacy claim is made.

The original six episodes described below remain entirely scripted. The additional
[`cbt.worry-chain`](patterns/cbt.worry-chain.pattern.md) demonstrates explicit AI
wording (`~`) and an always-cancellable `?loop[10]`. It has its own opt-in introduction,
no declared outcome, no readiness child and no proactive suggestion cues. Unlike the
original six, it requires a selected local model. See the [realization guide](../../../docs/pattern-markdown/realization.md)
for its safety/semantic limits and restart/stop fixture. The shared contracts below
describe the original six, not this new language-feature demonstration.

Choose CBT, ACT or DBT in Conversation settings, then use **Shift+Space → Guided
exercise**. New releases are installed locally when the encrypted library next opens,
including on existing installations. NARM remains the default. The website is unchanged.
Every episode asks permission before collecting personal content, provides a decline
and support exit, and supports the existing pause/resume/end controls at every wait.

## Release and migration manifests

Historical release identities, modality links, legacy aliases and discovery cues were
recorded in `catalog.json`. That manifest is not archived here; the
[active catalog](../catalog.json) describes current releases, not this historical pack.
Archived source files are in `patterns/`; each has a
deterministic successful path in `scenarios/`. The original six roots pin the `therapy.ready` child.
These are **new finite guided versions**, not claims of exact behavioral parity with the
legacy free-form prompts. No legacy source or saved customization is removed.

| Pattern | Legacy source / entry | Explicit user steps after consent | Result / deliberate difference |
| --- | --- | --- | --- |
| `cbt.moment` | `packages/approaches/cbt/src/techniques.ts`, `cbt-situation-thought-map` | event → interpretation → feeling → response → consequence → review | `reflected`; retains separation and tentative meaning, adds a fixed user-reviewed map instead of adaptive ongoing questioning |
| `cbt.activation` | same file, `cbt-behavioral-activation` | direction → small action → timing → obstacle → fallback → optional acceptance | `option_kept`; preserves small safe actions and no mood promise, adds explicit planning and a decline branch |
| `act.defusion` | new ACT episode; no legacy technique | thought → willingness → noticed experience → optional continuation → chosen direction | `noticed`; changes the relationship to thought without disputing truth or requiring relief; explicitly stops when unwelcome |
| `act.values` | new ACT episode; no legacy technique | life area → chosen quality → small action → obstacle → keep/adapt/leave | `option_kept`; distinguishes freely chosen qualities from outcomes and obligations; supports smaller alternatives |
| `dbt.pause` | `packages/approaches/dbt/src/techniques.ts`, `dbt-pause-observe` | safe-to-pause choice → observed event → feeling → urge → safe-next-step/support/stop | `option_considered`; preserves optional conservative pausing without physiological techniques; not a full STOP or crisis-treatment protocol |
| `dbt.interpersonal` | same file, `dbt-interpersonal-effectiveness` | safety choice → event → objective → relationship → self-respect → priority → user's draft → fallback | `drafted`; preserves competing interpersonal aims and user agency, adds structured rehearsal; not a full DEAR MAN protocol and sends nothing |

### Shared contracts

- **Prerequisites:** participant chooses a manageable everyday topic and explicitly
  opts in. No diagnosis, inferred readiness, forced disclosure, exposure, trauma work,
  extreme-temperature practice, exertion or breath-holding. Direct confrontation is
  not rehearsed when the participant reports possible coercion/danger.
- **Inputs:** `{}` for each root. All context is collected explicitly within the run;
  ordinary chat, other sessions and hidden modality state are not injected.
- **Outputs:** one declared `outcome: text`, bound on every completed path. Other
  completion codes are `declined` and `support_requested`. Ask/choice bindings stay in
  their run; user responses remain in the encrypted checkpoint and transcript, not a
  generated diagnosis or automatic session summary. Cancellation has no success output.
- **Runtime primitives:** `!use`, `!ask`, `!choose`, `!show`, immutable assignments,
  participant-chosen branching and forward exits. No `!agent`, `!turn`, unbounded loop
  or Host-owned therapeutic step logic. **No model inference is required by this pack.**
- **UI state:** only ordinary pending/submitting, input drafts, selection and run
  lifecycle controls. The existing generic renderers handle all six; no therapy-specific
  widget or alternate executor was added.
- **LLM context:** none for these episodes. Ordinary ACT chat separately uses the
  editable ACT stance prompt and neutral turn bookkeeping. Future adaptive model steps
  require separate context contracts, tests and review.
- **Safety limits:** the support choices stop the workflow and point toward real-world
  help. They are **not automatic crisis detection**. The scripts cannot assess risks or
  interpret free-form disclosures. Pause/end remains available; this app is not urgent care.

## Compatibility, rollback and editing

Only built-in release IDs in the manifest can represent a legacy technique in the chat
catalog. A corresponding guided entry replaces the **default discovery item**, not
the old execution engine. It never takes over an already-active legacy technique.
If the legacy prompt was customized, that legacy option remains canonical. If the
legacy entry is disabled, its guided counterpart is also omitted from chat discovery.
The guided version remains explicitly accessible from Pattern Library.

Disable a guided entry in **Chat availability & suggestions** to return to its legacy
picker option; a failed/unavailable library also leaves the legacy route available.
Custom prompts and active sessions are never silently migrated. New ACT exercises have
no legacy fallback and are independent from NARM. Local forks have no authority to hide
a built-in technique, begin disabled, and can be edited/enabled explicitly.

Installation adds missing release identities atomically. Existing source, preferences,
forks and checkpoints are not overwritten; a full library is left usable without a
partial pack installation. Releases remain read-only: use **Make my own copy** to edit.
The editor currently edits only the root, not the pinned readiness child. A new release
must use a new identity; source changes must never silently replace an installed version.

Keep the legacy technique files, configuration IDs, prompt overrides, and existing
session engine. Removal requires separate user approval after source/behavior review,
evidence for live-model behavior where relevant, downgrade planning and parity tests.
This pack does not complete all original M11 candidates or bypass the M12 reassessment.
Generated-choice exercises, collection-based episodes, compiled `!refine`, and PWA
support remain separate work; overt statements are not approximated with this pack.

## Content references and review boundary

Wording is original and intentionally brief; no proprietary worksheet is reproduced.
The conceptual references are:

- [Beck Institute resources](https://beckinstitute.org/cbt-resources/resources-for-professionals-and-students/cbtresources/)
  and [behavioral activation discussion](https://beckinstitute.org/blog/beyond-behavioral-activation-what-to-do-when-unhelpful-thoughts-hinder-enjoyment/): separating experience into useful parts and planning realistic activity.
- [ACBS overview of ACT](https://contextualscience.org/about_act) and
  [defusion in practice](https://contextualscience.org/qa_cognitive_defusion_in_practice_with_john_blackl): flexible contact with thoughts and freely chosen values; avoid invalidating use of defusion.
- [Behavioral Tech on DBT skills](https://behavioraltech.org/dbt-skills-coping-with-cancer-part-2/): mindfulness, tolerating distress and communicating needs while considering relationships and self-respect. Existing Mira DBT prompts supply the conservative pause/goal-clarification scope.

These references do not endorse Mira or validate these adaptations. Clinical content
review and evaluation with representative users remain outstanding before any broader
therapeutic claim or distribution. Deterministic tests establish software behavior only.

## Verification

`crates/pattern-core/tests/therapy_patterns.rs` runs all six saved scenarios through the
real portable runtime. It covers completion, early/late refusal, support exits,
pause/restart/resume, rejected choices, duplicate replies, cancellation at every user
boundary, pinned source, and rejection of ambient undeclared inputs. Native tests cover
encrypted additive installation, no overwrite, no partial pack at capacity, and saved
session modality checks. Catalog tests cover canonical defaults, customization/disable
preservation, active legacy sessions and rollback. ACT state/switch/restore tests keep
the new modality independent while retaining the NARM default.
