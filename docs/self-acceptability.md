# Explore What Feels Wrong

This companion to Identify Limiting Beliefs catalogues **the aspect of oneself regarded as unacceptable and the self-judgment attached to it**. It does not catalogue anticipated consequences, protective requirements or actual ethical wrongdoing.

## Content

- Article: `content/patterns/explore-what-feels-wrong.md`, included in CBT.
- Canonical editorial source: `apps/web/src/lib/article-widgets/self-acceptability/library.mjs`.
- Version 0.2: nine domains, 63 subfamilies, 317 recognition examples, and ten self-judgment views. Five or six examples sit beneath each subfamily. These include mild discomfort with an unspecified judgment and more explicit local or global judgments.
- Stable `S0001`–`S0063` IDs still identify the original statements. New examples use explicit suffix IDs, such as `S0050-E02`, and a `subfamily_id` grouping link. They do not replace or renumber the limiting-belief library.
- Concrete additions are authored in `apps/web/src/lib/article-widgets/self-acceptability/examples.mjs`. The original article and resource are preserved under `docs/self-acceptability/history/`. The complete editorial register is in [audit-v0.2.md](self-acceptability/audit-v0.2.md).
- Rebuild the offline widget and typed resource with `node apps/web/scripts/build-self-acceptability-browser.mjs`. Both derive from the same entries.

The article browser supports aspect and self-judgment views, search, native subfamily expansion and optional example details. Examples are plain text; selection checkboxes, counts, review and clearing controls were removed at the author’s request. Browsing makes no model calls or storage writes.

The practice imports `commons:self-acceptability` using the existing general Pattern Language data mechanism. It sends the entire catalogue and the participant's description to the selected AI provider. Structured results use typed references; canonical lookup supplies displayed statements. Only participant words can supply evidence. The source prompts distinguish tentative subject recognition from unconfirmed ownership, labels and scope. They exclude inferred consequences, strategies, diagnoses and attachment histories.

No match leads to one focused generated question, one optional answer and one final matching attempt. Unspecified global wrongness can remain unresolved. Harmful actions must not be reframed as innocent needs or boundaries. The browser and prompts preserve the distinction between an ordinary feature and a harmful act involving it.

History reopening now uses the exact source already stored in an associated checkpoint. Rust still rebuilds and replay-validates the source, frozen catalogue and receipts. The controller checks the saved pattern identity first. Explicit handoff/embed restoration continues to require an exact source match. A 0.1 history run retains its original 63-entry catalogue; a new run resolves the latest 317-example resource.

This is an editorial candidate taxonomy, inspired by the author's “What is it in me?” manuscript section. Its inclusion does not establish empirical completeness, personal endorsement, causal history or treatment efficacy.

## Recognition and recommendation wording

These phrases describe intended entry points, rather than claims about what a person believes:

- I feel like something is wrong with me but cannot say what.
- I feel ashamed of needing reassurance.
- I feel selfish when I want time alone.
- I think being inexperienced makes me boring.
- Being seen trying hard feels embarrassing.
- I feel bad for being angry even when I have not hurt anyone.
- I feel wrong for having different interests.
- I feel uncomfortable receiving praise or care.
- Saying no makes me feel like a bad person.
- My ordinary mistakes feel like proof that I am inadequate.
- I am not sure whether this is my own judgment or someone else's.
- I feel ashamed of my background or circumstances.

## Verification

Widget tests exercise catalogue reachability, independent views, keyboard navigation, search, plain-text examples and trusted host mounting. Practice tests use the real compiler, WASM runtime and structured AI adapter with injected provider responses to verify complete context, canonical lookup, optional clarification, replay and invalid-reference rejection. Component tests verify compact cards and context editing for both explorers. These tests do not establish live-model matching quality.

Suggested live editorial checks: reassurance → S0025; time alone → S0035 or S0034; ordinary anger → S0020; limited experience → S0041; visible effort → S0048. For a concern consisting only of deliberately coercing someone, or an unspecified global feeling with no clarified subject, an empty result is appropriate. Suggestions must not invent hidden consequences or personal history.

Version 0.2 has eight explicit cases in [matching-evaluation.json](self-acceptability/matching-evaluation.json), including experience, slight housekeeping mess, parents, shame about embarrassment, visible effort and three negative controls. Run `pnpm --filter @patternverse/mcp eval:self-acceptability` with explicitly configured `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` for an opt-in live evaluation. Optional `--case=...` and `--out=...` flags select a case and save a report. No browser/workspace credentials are read. The scorer checks specific expected examples, contradicted/global alternatives, participant quotes and visible missing premises.

[runtime-check-v0.2.json](self-acceptability/runtime-check-v0.2.json) records all eight paths using **injected fixture responses** (`live: false`), not live matching-quality evidence. The real compiler, runtime and provider adapter measured a 210,743-byte resource, maximum 1,848,957-byte saved checkpoint and maximum 236,882-byte model-message payload. The resource and checkpoints fit their existing 1 MiB and 2 MiB limits. Full-catalogue free-worker use was already unavailable at 0.1 because of its tighter message limits; the existing provider gate continues to require a suitable connected provider or local model. No catalogue is truncated or limit increased.

### Version 0.2 live checks, 2026-11-02

[live-smoke-v0.2.json](self-acceptability/live-smoke-v0.2.json) records five fictional examples run through the normal connected OpenRouter UI. Travel-related boringness returned S0041-E02, slight household mess returned S0050-E02 without the explicitly rejected global inadequacy statement, parents’ manners returned S0008-E02, and shame about having that embarrassment returned S0008-E06. Each positive case returned only the specific expected example. A practical cooking-skill gap without negative self-judgment returned no initial match and no final match after the optional clarification was left blank.

All five selected checks passed. The selected model identifier was not exposed in that view and remains unrecorded; no credentials were inspected and no practice runs were saved. These checks supplement the eight-case injected runtime suite; they do not establish matching quality across all 317 examples. That inspection preceded the later removal of article selection controls. The subfamily-first hierarchy and individual example details remain.

### Version 0.1 live smoke checks, 2026-11-02

Two fictional descriptions were submitted through the normal connected OpenRouter UI, without reading credentials or saving the runs. The selected model identifier was not exposed in that view and is not recorded. Runtime source/data revision shown by the UI: `m4-v3:c67cecd46a2ffd60112bb4d5d1dd2029c5b1c5fa512686b9ed8e14ccb7736323`.

- “Fictional example: I think needing reassurance makes me too needy, and I feel selfish for saying no to a request.” Returned exactly S0025 and S0032 as compact canonical statements. Expanded S0025 marked the proposition expressed, quoted the participant text and left added assumptions empty.
- “Fictional example: I knowingly lied to get a colleague punished for my mistake. I feel guilty about that action. I am not saying that an ordinary need, feeling or identity is unacceptable.” Returned no initial matches, asked one optional question about whether a separate self-judgment existed, and returned no final matches when that question was left blank. It did not reframe the harmful act as an innocent need or boundary.

Both selected checks passed. This is a bounded live smoke check, not an evaluation of all entries or a guarantee about later model outputs.
