# Pattern Language — current reference

The website, editor preview, and Mira share the Rust Pattern Language compiler and
runtime. Articles remain Markdown; executable practices use Pattern Language.

The [interactive language reference](https://patternverse.org/about/pattern-language) pairs
editable, highlighted examples with the same preview runtime used by the editor. It covers
syntax, command parameters, types, composition, and execution; model steps use explicit fixture replies.
The [component gallery](https://patternverse.org/about/pattern-language/components) provides
searchable live examples, variants, parameters, defaults, constraints, and return values.
The [built-in function reference](https://patternverse.org/about/pattern-language/functions)
documents inline calls and pipelines, with signatures and runnable examples for all pure built-ins.

Start with [readable authoring](readability.md). New practices use `name = ...`,
explicit braces, local branch arms, and `[optional]` form questions. These additive
conventions use `:language 1`; older spellings and pinned saved sources retain their
interpretation. Some linked documents retain milestone history, which is not the
current feature-support checklist. See [interactive practices](../practices.md) for
website integration and [companion architecture](../companion-architecture.md) for
Mira integration.

## Authoring reference

- [Readable authoring and compatibility](readability.md).
- [Grouped worksheet forms and YAML migration](../practices.md): `!form`, required/optional
  fields, typed record results, and the shared Patternverse website/editor runtime.
- [Shuffle](shuffle.md): run-scoped permutations and reproducible seeded calls.
- [Functional core](functional-core.md): universal bindings, pure helpers,
  records/lists, pipelines, `each`, explicit `yield`, and collection transforms.
- [Python-style type annotations](type-annotations.md): additive `:language 1` binding and
  interface annotations, `list[T]`, `Optional[T]`, and explicit `None` values.
- [Typed semantic AI](semantic-ai.md): closed enums, exhaustive matching, explicit
  classifier context, candidate-constrained suggestions and bound realization.
- [Core syntax and immutable bindings](core-language.md): `answer = !ask`, `!show`,
  `result = !agent`, immutable expressions, local branches, and explicit completion.
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
- [Reference data and structured results](data-imports.md): published JSON libraries,
  typed references, lookup and list results.
- [Named flows and active-pattern events](flows-events.md).
- [Library](library.md), [editor/preview](editor.md), and [chat integration](inline-chat.md).
- [Local widgets](local-widgets.md): private widget packages, the Widgets panel,
  code editing, versioned practice insertion, typed answers, backup and sync.

## Participant control contracts

| Action                    | Meaning                                                                             | Subsequent execution                                      |
| ------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Pause exercise            | Preserve the exact pending step and accepted work                                   | Explicit resume returns to that step                      |
| End exercise              | Cancel the Run and active descendants, without successful outputs                   | No authored continuation                                  |
| Stop loop                 | Exit only the current `?loop`, discard its locals                                   | Continue after the loop; does not accept anything         |
| Finish without keeping it | Complete `!refine` with the latest candidate and an unfinished outcome              | Continue after the refinement                             |
| Keep this wording         | Participant explicitly endorses this wording for this exercise                      | Complete refinement as `accepted`, not “objectively true” |
| Edit wording myself       | Supply a new candidate directly, without calling AI                                 | Review it again; not automatic acceptance                 |
| Skip a question           | Only possible through an authored choice/branch or existing zero-minimum collection | No generic fabricated answer or implicit default          |

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
- Runs pin source, transitive dependencies and resolved reference data. Executable
  imports are pinned; data imports resolve the latest resource for a new run.
- Local bindings are immutable; child Patterns receive only declared inputs.
- `~` changes wording, not control flow. `!agent` returns a contract-checked value.
- Refinement acceptance and budget renewal are never model-controlled.
- Existing saved Runs without refinement remain readable. Optional refinement
  state is verified by deterministic receipt replay, not trusted merely because it
  deserializes. Receipts and state remain in the existing encrypted desktop store.

Existing syntax uses `:language 1`. Earlier phase-two `:language 2` files remain
readable for compatibility; their required collection yields remain unchanged.
Python-style annotations and optional values are additive under `:language 1`;
older source, identifiers, and saved runs keep their original interpretation.
Inline callback lambdas support `n => expression` and `_` placeholders, including
captures of earlier immutable values. Stored or returned function values,
payload-bearing variants, and global event listeners remain deferred.
Named flows and active-pattern message handlers are implemented;
unsupported event kinds fail compilation.

## Proposed extensions

- [Widget authoring and Settings design](widget-authoring-design.md): concrete
  management and code-editing flow, practice insertion, versioning, and the needs
  selector's Simple/Detailed behavior. The implemented private workflow is described
  in [Local widgets](local-widgets.md); this document also contains future design work.
- [Widget system, imports, and Python-style type annotations](widget-system-spec.md):
  proposed package and publisher model, HTML/CSS/JavaScript widget contracts,
  Settings authoring, `!widget`, `list[T]`, and `Optional[T]`. This design specification
  includes future public-registry proposals; private widgets and the documented
  type-annotation syntax are implemented.
