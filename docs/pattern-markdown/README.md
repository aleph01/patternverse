# Pattern Markdown — current language

> Migration note: these language and host documents came from the existing Mira
> application. The Rust language implementation and fixtures are now in
> Patternverse, but references below to desktop chat, editor, encrypted native
> storage, and the PWA describe the **existing Mira apps**, not features already
> connected to the new Patternverse companion. See
> [companion architecture](../companion-architecture.md) for integration status.

This is the starting point for the implemented language. Older milestone documents
describe the state at that milestone; their “remaining work” sections are historical.
Phase 1 adds compiled refinement, participant editing, and pinned local imports.
Phase 2 adds the functional core. Phase 3 adds typed semantic AI. Both are available
under `:language 1` in the Rust runtime and desktop chat/editor. These phases do not
change the PWA interpreter or rewrite existing saved Runs.

## Authoring reference

- [Grouped worksheet forms and YAML migration](../practices.md): `!form`, required/optional
  fields, typed record results, and the shared Patternverse website/editor runtime.
- [Functional core](functional-core.md): universal bindings, pure helpers,
  records/lists, pipelines, `each`, explicit `yield`, and collection transforms.
- [Typed semantic AI](semantic-ai.md): closed enums, exhaustive matching, explicit
  classifier context, candidate-constrained suggestions and bound realization.
- [Core syntax and immutable bindings](core-language.md): `!ask answer`, `!show`,
  `!agent result`, `= name expression`, forward branches and explicit completion.
- [Single choice, multiple choice and ranking](selections.md).
- [Images](images.md): `!image` with required alternatives, optional titles and captions.
- [Videos](videos.md): `!video` with a source URL, excerpt bounds and playback options.
- [Countdown timers](timers.md): `!timer`, bounded duration adjustment, blocking and background countdown widgets.
- [Collections](collections.md): open-ended records and mapped records.
- [Compositional displays](show.md): `!show {{items}}` with mapping, grouping,
  ordering, relationships, and repeated context views.
- [Realized wording and functional loops](realization.md): `~` and `?loop[max]`.
- [Review and refinement](refine.md): `!refine[rounds=4, renewable]` and `-> propose`.
- [Pinned imports](imports.md) and [child Pattern calls](composition.md).
- [Named flows and active-pattern events](flows-events.md).
- [Library](library.md), [editor/preview](editor.md), and [chat integration](inline-chat.md).

## Participant control contracts

| Action | Meaning | Subsequent execution |
| --- | --- | --- |
| Pause exercise | Preserve the exact pending step and accepted work | Explicit resume returns to that step |
| End exercise | Cancel the Run and active descendants, without successful outputs | No authored continuation |
| Stop loop | Exit only the current `?loop`, discard its locals | Continue after the loop; does not accept anything |
| Finish without keeping it | Complete `!refine` with the latest candidate and an unfinished outcome | Continue after the refinement |
| Keep this wording | Participant explicitly endorses this wording for this exercise | Complete refinement as `accepted`, not “objectively true” |
| Edit wording myself | Supply a new candidate directly, without calling AI | Review it again; not automatic acceptance |
| Skip a question | Only possible through an authored choice/branch or existing zero-minimum collection | No generic fabricated answer or implicit default |

`unresolved` means refinement was finished without acceptance. `limit_reached`
means the participant finished at an exhausted, nonrenewable revision budget.
Neither is failure, cancellation, consent, or clinical success. The latest wording
remains available as `result.value`; an author must inspect `result.outcome.value`
before treating it as accepted.

Controls are explicit participant actions. Typed chat text is never silently
classified into acceptance, renewal, or cancellation. The host may interrupt model
work on pause/end; already accepted results are preserved. Late, conflicting or
out-of-phase replies cannot advance a cancelled or paused Run. During an atomic
save, controls wait for confirmation rather than racing the save.

## Stable boundaries

- The same Rust parser/compiler/runtime executes preview and desktop chat.
- Runs pin source and transitive dependencies. Imports never mean “latest”.
- Local bindings are immutable; child Patterns receive only declared inputs.
- `~` changes wording, not control flow. `!agent` returns a contract-checked value.
- Refinement acceptance and budget renewal are never model-controlled.
- Existing saved Runs without refinement remain readable. Optional refinement
  state is verified by deterministic receipt replay, not trusted merely because it
  deserializes. Receipts and state remain in the existing encrypted desktop store.

All current syntax uses `:language 1`. Earlier phase-two `:language 2` files remain
readable for compatibility; their required collection yields remain unchanged.
First-class functions/closures, payload-bearing variants, and global event listeners
remain deferred. Named flows and active-pattern message handlers are implemented;
unsupported event kinds fail compilation.
