# Patternverse Editorial Pipeline

A local, resumable editorial workflow for domain research, discovery, collection design,
article production, enrichment, and collection auditing. It uses independent, non-interactive
`codex exec` processes with the existing **ChatGPT subscription login**. It has no API client,
API key requirement, publisher, hosted orchestrator, or automatic production run.

## Start here

Requires this repository's Node 22 and pnpm 10 toolchain, installed workspace dependencies,
and a recent Codex CLI supporting `exec --output-schema --ignore-user-config`. Run
`pnpm install --frozen-lockfile` if needed. For live work, run `codex login` and choose
ChatGPT; `codex login status` must report **Logged in using ChatGPT**. Subscription
entitlements, model availability and limits apply. No API fallback is implemented.

Commands below run from the repository root. Script arguments such as `--dir` and `--config`
are resolved from **packages/editorial**, where pnpm runs the script. Use absolute paths
for custom locations. The default repository and collection locations do not depend on cwd.

Preview a plan without creating files or spending model usage:

```sh
pnpm --filter @patternverse/editorial editorial plan \
  --id photography-pilot --domain Photography --target 3 --dry-run
```

Initialize and preview (writes a catalog snapshot and configuration, makes no model call):

```sh
pnpm --filter @patternverse/editorial editorial plan \
  --id photography-pilot --domain Photography --target 3 \
  --config examples/photography.config.json
```

Live execution is explicit on **every invocation**. Before using it, authorize sending the
catalog and task context to ChatGPT. The repository catalog contains IDs, titles, summaries,
tags, and verse membership across domains. Research, outlines, article drafts, reviews and
source ledgers are included when relevant. The CLI has read-only access to its local working
context; do not use this with content that is not authorized for that service.

```sh
# 1. Research the domain, discover a broad pool, design a collection (three calls normally).
pnpm --filter @patternverse/editorial editorial plan \
  --id photography-pilot --domain Photography --target 3 --execute

# 2. Independent collection review; bounded design revisions if needed.
pnpm --filter @patternverse/editorial editorial review \
  --dir ../../.local/editorial/photography-pilot --execute

# 3. Produce one pattern at a time. Review also runs first if it is still needed.
pnpm --filter @patternverse/editorial editorial produce \
  --dir ../../.local/editorial/photography-pilot --execute

# 4. Local compiler checks and a separate model audit of the whole collection.
pnpm --filter @patternverse/editorial editorial audit \
  --dir ../../.local/editorial/photography-pilot --execute

# Inspect all saved statuses, budgets and artifact paths.
pnpm --filter @patternverse/editorial editorial status \
  --dir ../../.local/editorial/photography-pilot

# Resume the last requested operation, granting at most four further attempts.
pnpm --filter @patternverse/editorial editorial resume \
  --dir ../../.local/editorial/photography-pilot --execute --max-tasks 4

# Explicit retry after a failed/interrupted/usage-limited attempt. Attempts stay bounded.
pnpm --filter @patternverse/editorial editorial resume \
  --dir ../../.local/editorial/photography-pilot --execute --retry

# Pause from another terminal, or press Ctrl-C. Running subprocesses are terminated.
pnpm --filter @patternverse/editorial editorial pause \
  --dir ../../.local/editorial/photography-pilot

# Create an immutable draft export inside the collection directory; never installs/publishes.
pnpm --filter @patternverse/editorial editorial export \
  --dir ../../.local/editorial/photography-pilot
```

An audit can perform the remaining earlier stages, so choose `plan`, `review`, or `produce`
when you want a specific stopping point. `resume` remembers the last operation; after `plan`
finishes, request `review` or `produce` to advance. Every execution stops at the per-run task
budget. A usage limit pauses immediately; wait for reset and resume with `--retry`. No limit
reset, credits purchase, automatic wakeup, or model substitution is attempted.

To see what a saved collection would do, add `--dry-run` to any execution command. This
never calls Codex or changes collection files. Failed tasks require explicit `--retry`;
retries receive prior local validation feedback. A semantic review rejection or exhausted
revision/attempt bound needs editorial attention, not an endless retry loop.

## Mock demonstration and tests

Mock mode exercises the same persistence, scheduler, validation, acceptance and compiler
paths using deterministic synthetic responses. Its output is conspicuously labeled
**synthetic / do not publish**, with example.com sources. It is not a photography collection
quality demonstration and makes no claim that sources were researched.

```sh
pnpm --filter @patternverse/editorial editorial plan \
  --id photography-mock --domain Photography --target 3 --mock
pnpm --filter @patternverse/editorial editorial audit \
  --dir ../../.local/editorial/photography-mock --max-tasks 40
pnpm --filter @patternverse/editorial editorial export \
  --dir ../../.local/editorial/photography-mock

pnpm --filter @patternverse/editorial test
pnpm --filter @patternverse/editorial check
pnpm exec eslint packages/editorial/src packages/editorial/test
```

The normal three-pattern path is **32 executions**: 3 planning, 1 collection review,
9 per pattern, and 1 final audit. Each article has research → outline → draft → critique →
fact-check → revision → fresh critique → fresh fact-check → enrichment. At least one distinct
revision is mandatory, even when the first draft passes. Additional review/design rounds
and failed attempts consume more calls. Focused article executions receive their own evidence and the current article rather than
the full discovery pool. No stages are combined into a single model request. Importing existing domain research
reduces that collection to 31 new executions, with the upstream provenance retained.

## Architecture and repository integration

- `src/contracts.ts`: strict Zod task/config/state schemas and JSON Schemas generated from them.
- `src/pipeline.ts`: serial scheduler, context assembly, gates, acceptance, recovery and draft export.
- `src/executor.ts`: subscription-only Codex transport, JSONL logs, cancellation, timeout and usage accounting.
- `src/store.ts`: atomic state replacement, process lock, checksums and immutable artifact reads.
- `src/quality.ts`: cross-reference, selection, progression, source, word-range and compiler checks.
- `src/mock.ts`: deterministic offline executor for infrastructure tests.
- `prompts/*.md`: version-controlled stage-specific instructions and field-guide house style.

The repository's existing `@patternverse/schema` remains authoritative for frontmatter;
`@patternverse/compiler` parses and compiles generated entities, wiki links, collection
membership and practice `implements` links. No public entity schema or web UI changes are
necessary in this checkout. Interactive embedding depends on the article-widget renderer
and asset loader already present in the shared workspace; this pipeline does not take
ownership of other sessions' frontend changes. Standalone simulation HTML remains usable
independently. Exports use existing Markdown entities and the richer
`docs/pattern-packages/photography.json` sidecar convention. Recommendation queries stay in
sidecars; the current search index does not automatically ingest them. Typed relations are
stored in sidecars and rendered as ordinary wiki-linked article prose.

`model: null` uses the installed CLI default. User config is ignored for execution so an
API provider, hooks, MCP configuration or workspace settings cannot silently change this
transport. `model_provider="openai"`, `forced_login_method="chatgpt"`, read-only sandbox and
non-interactive approval policy are set explicitly. API-key and provider environment
variables are stripped from the child environment. Saved ChatGPT authentication is reused;
credentials are never copied into artifacts. Web search is enabled only for domain research,
focused research and fact-checking; other stages use the saved evidence. The CLI's auth cache/session machinery still
needs its usual local filesystem/network permissions.

The pipeline snapshots the current corpus at initialization. Planning sees the full catalog; focused article stages see domain-relevant and related
catalog summaries. Once relationships are selected, critics receive full existing neighbor
articles for overlap checks; the complete parsed corpus is saved locally for compiler resolution. Existing
IDs cannot be selected or overwritten. Plan review additionally checks conceptual overlap;
changing an ID alone does not make a duplicate useful. A three-pattern pilot should normally
be deliberately scoped rather than purporting to cover all of photography or psychology.

## Control Systems Engineering pilot and shared simulations

The approved first live domain is Control Systems Engineering. The separate roadmap targets
15 patterns; the pilot targets only three articles. The eight supplied seeds remain hypotheses
for research and curation, not a quota or automatic publication decision.

```sh
# Planning only: no 15-article production run.
pnpm --filter @patternverse/editorial editorial plan \
  --id control-systems-roadmap --domain control-systems-engineering --target 15 \
  --brief examples/control-systems.brief.json --config examples/control-systems.config.json --execute

# Three-article production pilot (subsequent review/produce/audit commands use its directory).
pnpm --filter @patternverse/editorial editorial plan \
  --id control-systems-pilot --domain control-systems-engineering --target 3 \
  --brief examples/control-pilot.brief.json --config examples/control-pilot.config.json \
  --from-research ../../.local/editorial/control-systems-roadmap --execute

# Build standalone local previews without any model call.
pnpm --filter @patternverse/editorial editorial simulations \
  --dir ../../.local/editorial/simulation-preview
```

`--brief FILE` persists a schema-validated editorial brief: scope, audience, candidate seeds,
longer collection goal, approved simulation IDs, notes and optional background. Every focused
task receives it. A brief does not grant arbitrary code execution. `--from-research DIR` can
import successful, validated domain research into a fresh collection with the same domain
and mock/live mode. It records the source artifact checksum and provenance, consumes no
model usage, and still requires independent pattern research and fact-checking. Collection
research is reusable evidence, not a substitute for article review.

Two environments are authored in this package and reused through the existing
`patternverse-widget` component. The thermostat exposes proportional gain, room time constant,
sensor delay, heater limit, relay hysteresis, idealized feedforward and a window disturbance.
The signal lab exposes deterministic measurement noise, sampling interval and a first-order
low-pass time constant. The plots and numerical summaries update immediately. They require
no Python runtime, network or new production UI components. Python Control is a useful research
reference, but these small native simulations use explicit equations and numerical tests.

Models live in `src/simulations.ts`; `src/simulation-assets.ts` produces self-contained HTML.
Enrichment references an approved environment and specifies a learning goal, setup, experiment,
observations and limitations. Export bundles each used HTML asset once under
`content/assets/widgets/`, ready for the existing sandboxed article widget host. A hash pins
the asset to its accepted pattern; changing a model requires a reviewed new collection version.
No model-generated JavaScript is executed or added to assets.

The thermostat includes heater lag and optional sensor delay; high gain can oscillate in this
chosen model. A delay-free first-order plant with proportional feedback does not universally
oscillate as gain increases. The simulation labels chosen parameters, equations, units,
saturation, sensor perturbation and integration step. It is not an identified building or
validated control design. The signal lab distinguishes noise reduction from lag and aliasing;
its deterministic two-frequency perturbation is not a statistical model of all sensor noise.

## Durable records and recovery

Default collection storage is `.local/editorial/<id>/`, already ignored by repository rules:

```text
state.json                         configuration, counters, task states, accepted hashes
catalog.json                       repository snapshot and compiler entities
goal.json                          requested plan/review/produce/audit boundary
PAUSE                              operator cancellation flag, if present
attempts/<task-id>/<attempt>/
  request.json                     stage, settings, prompt hash and start time
  prompt.md                        exact prompt, including relevant context
  schema.json                      exact model output contract
  response.json                    raw final JSON response (if returned)
  events.jsonl, stderr.log          execution logs
  execution.json, usage.json        observed usage/time, or conservative recovery estimate
  validated.json                   schema and semantic validation passed
  failure.json                     error, if unsuccessful
  compiler-report.json             deterministic collection check before audit
accepted/<pattern-id>/
  patterns/<id>.md                  canonical draft article
  practices/<id>-practice.md        optional separate Markdown practice
  package.json                     richer metadata, queries, sources, typed relations, visual brief
exports/<content-hash>/             immutable draft bundle and sidecar
```

Attempts never reuse directories, and previous responses/reviews remain readable. A fresh
process reclaims a dead lock only on the same host, verifies accepted trees and successful
artifact checksums, and recovers a validated result saved just before interruption. A raw final response from a
completed CLI turn is adopted only after passing the same schema and semantic gates. An
incomplete result is retried in a fresh execution; this pipeline resumes **its workflow**,
not the interrupted Codex conversation. Dead/unknown remote locks are never removed merely
because they are old. A malformed lock or an interrupted lock-reclamation marker requires
operator inspection rather than deleting a possibly live owner's files.

State is replaced atomically. Accepted artifacts are built in a temporary directory and
renamed; a matching artifact left by a crash is adopted without replacing it. Divergent
accepted bytes stop the workflow. Do not hand-edit accepted artifacts or validated task
outputs; start a new collection/version for editorial changes. The final audit proposes
specific improvements; it does not silently rewrite accepted articles. Taxonomy and wording
can change during bounded design review; after acceptance, use the audit to plan the next
version. There is intentionally no bulk invalidation or automatic rewriting command.

## Configuration and budgets

See `examples/photography.config.json`. A partial JSON configuration can be supplied when
creating a collection. To adjust future executions without losing usage accounting:

```sh
pnpm --filter @patternverse/editorial editorial configure \
  --dir ../../.local/editorial/photography-pilot --config /absolute/path/overrides.json
```

Settings include `model`, `stage_models` (stage name → model), `reasoning_effort`, `web_search`,
`candidate_multiplier`, `min_candidate_score`, `min_review_score`, `min_article_words`,
`max_article_words`, `max_revisions`, `max_attempts`, `max_calls`, `max_tasks_per_run`,
`max_tokens`, `max_seconds`, `task_timeout_seconds`, `max_output_bytes`, `max_context_bytes`,
and `unreported_token_reserve`. Stage models must be available to the subscription; they
are never auto-selected to bypass an unavailable model or exhausted allowance.

Call count is reserved before work starts. Time and token use are reconciled from persisted
attempt receipts after restart. CLI-reported input (including cached input) plus output
tokens count conservatively. If an execution ends without usage reporting, a configurable
50,000-token estimate is charged. A process crash without a time receipt charges the full
task timeout. The attempt and lifetime counters do not reset on resume/configure.

Calls, revisions, attempts, output/context size and subprocess duration are bounded. Token
and lifetime time budgets are admission checks **between tasks**: a running call can exceed
the remaining token/time allowance before its usage is known. These are operational controls,
not an exact subscription usage meter or hard token quota. Budget exhaustion pauses; an
operator can explicitly raise the limit. A single call may consume more usage than expected.

## Quality controls and limits

Research must supply checked sources and source-linked claims. Discovery scores six explicit
dimensions and starts with at least 3× the target by default. Selection enforces distinctiveness
and grounding thresholds as well as mean score. Weak patterns are not added to reach a quota.
Taxonomy covers selected items; progression contains each once; prerequisites cannot cycle or
come after dependents. Relationship IDs and source IDs must resolve. Review passage-level
issues, score thresholds and fact-check corrections all gate acceptance. A qualified claim
passes only if its wording already carries that qualification. Unsupported claims block.

Articles have a configured word range; known filler phrases, embedded practices, unknown
local images, invalid frontmatter and broken wiki links are rejected. Final compilation uses
the real corpus snapshot plus all staged entities. Practices are optional separate Markdown
entities, compatible with existing rendering. This version does not author or validate
executable Pattern Language exercises. Every pattern has an explicit visual decision; visuals
other than `none` or an approved shared simulation produce **briefs only**, not falsely claimed finished assets. Add and verify
actual images/SVGs through the existing authoring workflow before publication.

These checks cannot prove editorial excellence, factual truth, novelty, balanced coverage,
source credibility, licensing clearance or medical safety. Separate model executions can
share biases; they are not independent human experts. Source verification is model-assisted,
not a network citation crawler or an evidence-certification system. A human editor should
read the audit and inspect the primary sources and exported content, especially for high
stakes domains. Model JSON validation is necessary but does not establish accuracy.

Large domains may exceed the context cap because the final audit reads the collection.
Narrow the scope, use several collections, or deliberately increase the cap; this version
does not silently truncate research or use lossy summaries. Context from the repository and
web is untrusted data in prompts. Read-only sandboxing prevents normal model file writes;
this is not a hardened isolation boundary against all tool or platform vulnerabilities.

Exports are immutable staging bundles, and may contain links to existing Commons entities.
They are compiled **with** the repository snapshot, not promised to be standalone libraries.
An export recompiles staged entities against the live repository and checks ID collisions;
a human must still reconcile subsequent corpus changes before installation. No command writes
into `content/`, changes published status, deploys the site, pushes a branch, or publishes.

Official transport references: [non-interactive mode](https://developers.openai.com/codex/noninteractive)
and [ChatGPT authentication](https://developers.openai.com/codex/auth). CLI flags and saved
login reuse were also checked against the installed CLI during implementation.
