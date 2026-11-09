# Belief matching evaluation

The ten cases in `matching-evaluation.json` are editorial acceptance examples,
not inventory items or evidence of clinical validity. Each includes a description,
optional clarification, acceptable candidate IDs and a rationale. Several IDs can
be acceptable; the food/guard example specifically requires P0065 to be retrieved.
Negative cases cover an actual dietary constraint, a bounded skill gap and a
feeling without an identifiable thought or situation.

The evaluator uses the production Markdown compiler, Rust runtime, full 185-record
resource and production structured-model adapter. It sends no expected IDs or
scoring rationale to the model. For a clarification case it positions the real
retry effect with setup receipts; this evaluates the retry matcher, not whether
the model would have chosen an empty first result or that clarification question.

Run against an explicitly selected OpenRouter model using the same mandatory ZDR
request policy as the app:

```sh
OPENROUTER_MODEL=your-model-id pnpm --filter @patternverse/mcp eval:beliefs --out=/tmp/belief-evaluation.json
```

Supply `OPENROUTER_API_KEY` through your environment. The evaluator does not extract
credentials from the workspace or browser, print keys, switch providers or retry
paid requests automatically. `--case=food-guard-clarification` runs one case.

Each case makes one live matching request. Rust validates IDs, types and list
bounds. The scorer then checks acceptable retrieval, duplicate IDs, actual quoted
evidence, nonblank connections and visible missing premises for hypotheses. The
report records the model, source/resource hashes, outputs and per-case results.
Read the explanations too: the mechanical scorer cannot establish that a stated
assumption is a sound interpretation. Repeated live runs are useful for checking
variation across models and prompt revisions.

Normal unit and component tests use injected replies to verify contracts, control
flow, context and rendering. The evaluator's own injected-reply tests explicitly
mark their reports `live: false`; they are not evidence of semantic recall. Run them
with `node --test apps/mcp/scripts/evaluate-beliefs.test.mjs` from the repository root.

## Recorded live smoke check

[The 2026-11-01 UI report](matching-live-smoke-2026-11-01.json) records four live
probes against the verified current definition using the existing OpenRouter
connection. Both guard/exception examples retrieved P0065, the visible-effort
example retrieved P0214 and P0217, and the bounded dietary constraint returned no
candidates on either attempt. Hypothesis rows displayed their missing premises.
The model ID was not exposed on the practice screen, so the report does not infer
it from the app's default. This is a selected smoke check, not a full ten-case or
multi-model evaluation. The report preserves the exact source/resource hashes and
rendered wording for review. Earlier cached-source probes are excluded.
