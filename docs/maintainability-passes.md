# Patternverse maintainability passes

Improve responsibility boundaries through at most three evidence-based refactoring cycles.
Preserve product behavior, Rust Pattern Language semantics, saved runs, public interfaces and UX.
Session date: 13 October 2026. Budget: 150,000 tokens. Branch: `codex/maintainability-passes`.

## Architecture and work protection

- Rust `pattern-core` owns executable semantics; `pattern-host` owns bounded replay and admission.
- Shared packages own schemas, corpus compilation, workspace persistence, sync and conversation rules.
- Svelte hosts own presentation/lifetimes; client adapters own browser and provider boundaries.
- Existing compatibility aliases, exact archived sources and persisted formats are deliberate.
- 1,073 paths were already uncommitted. Their inventory and hashes are recorded in `/tmp`;
  all hashes remain unchanged after implementation and verification.
  Refactor only initially clean files and new session-owned files; never commit existing dirty work.

## Baseline

| Check                                | Initial result                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Node and pnpm                        | Required versions: 22.23.2 and 10.14.0                                                                                          |
| `pnpm check`                         | Pass; Svelte reports zero errors and warnings                                                                                   |
| `pnpm exec eslint .`                 | Pass                                                                                                                            |
| `pnpm build`                         | Pass, including public-build safeguard; existing large-chunk warnings                                                           |
| Shared-package unit tests            | Pass: 277 tests across eight packages                                                                                           |
| Guided AI Worker tests               | Pass: 14 tests with localhost access                                                                                            |
| MCP tests                            | 20 pass, one existing failure: stdio search expects `cbt-abc-diary` first; current results start with Double Standard Technique |
| Web unit tests                       | 1,360 pass; four existing failures: LibraryCollections saved-count assertion and three PatternFeed duplicate-control queries    |
| Rust host tests                      | Pass: 23 tests, including archived checkpoint restoration                                                                       |
| Rust core tests                      | Stops at existing function-documentation failure: `sticky_default` and `is_sticky` in `compiler/timer.rs`                       |
| Formatting                           | Existing failures in `PatternverseGuide.svelte`, `mira/openrouter.ts`, `tests/about.spec.ts`, `tests/home.spec.ts`              |
| Content validation                   | Pass: 126 entities                                                                                                              |
| Component audit                      | 362 files; 103 flagged, 226 advisory warnings, zero errors                                                                      |
| Browser journeys and safeguard tests | Browser baseline: 303 pass, 65 fail, four skip. Deployment tests: 5 pass. Audit tests: 12 pass.                                 |

Sandbox-only failures (Worker localhost binding and Wrangler log permissions) are recorded separately
from repository failures; the Worker suite passes when run with local-server access.

## Prioritized opportunities and critique

| Rank | Opportunity and code evidence                                                                                                                           | Benefit / confidence / effort / risk   | Decision and critique                                                                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Native adapter: `packages/native-pattern-adapter/src/index.ts` mixes 88 lines of contracts, IPC/link/command coordination and tagged response decoding. | Medium / high / small / low            | Separate contracts and wire decoding behind the unchanged package facade. Preserve permissive unknown payloads, nullable fields, errors and checks; do not reinterpret Rust effects or add a generic decoder framework. |
| 2    | Mira portable archive: `mira/portable.ts` combines PBKDF2/AES-GCM envelope handling, content validation and collision-safe storage import.              | Medium / high / medium / medium        | Isolate the archive codec from store/import policy. Use exact pre-refactor v1/v2 fixtures to protect bytes, AAD, errors and credentials exclusion; do not generalize encryption across incompatible storage formats.    |
| 3    | Compiler filesystem loading: `compiler/src/filesystem.ts` nests manifest validation, discovery and per-file reading/parsing inside `loadCorpus`.        | Medium / high / small / low            | Reassess after the first two cycles. Only extract concrete loading phases if diagnostics and policy become easier to test; file size alone is insufficient.                                                             |
| 4    | Corpus relationship derivation: `compiler/src/compile.ts` has a 211-line pipeline with nested relationship/diagnostic rules.                            | High / medium / medium / medium        | Defer: extensive existing uncommitted changes; avoid mixing this session with another owner's work.                                                                                                                     |
| 5    | Dropbox orchestration and Mira send flow: large functions combine sequencing, cancellation and provider checks.                                         | High / medium / large / high           | Defer: both are under existing work, and lifetime/order changes need dedicated interaction coverage.                                                                                                                    |
| 6    | Rust expression dispatch (`expression.rs`, 668 lines) and sync planner/resolver.                                                                        | Low to medium / medium / medium / high | Defer: explicit case dispatch is often clearer than a new abstraction; language semantics and conflict policies have disproportionate regression risk.                                                                  |

## Completed cycles

### Cycle 1 Native adapter boundaries

- `index.ts` retains link resolution, command membership and IPC orchestration. `types.ts` owns
  unchanged public contracts; `wire.ts` owns unchanged response projections and shape checks.
- All exports still resolve from the package root. No IPC command, effect/event payload,
  revision matching, nullable field, status or error text changes.
- Added 24 public-API regression cases, including opaque future payloads, nested run commands,
  exact article revision checks, malformed response categories and native error propagation.
- All 30 native-adapter tests pass against both the original implementation and the refactor.
  Package type check/build and targeted lint pass.
- Review: intentionally retained permissive payloads and object references; no generic schema
  framework or stricter validator. Storage, language runtime and UI modules are untouched.
- Reassessment: portable archives remain the next justified boundary; compiler loader extraction
  needs a stronger benefit than reducing the facade's size.

### Cycle 2 Mira portable archive boundaries

- `portable-format.ts` owns the existing envelope, PBKDF2/AES-GCM encoding, decoding and
  complete content validation. `portable.ts` retains checkpoint validation, collision-safe
  import, interrupted-reply recovery and settings merge, and re-exports the original API.
- The extracted format and import bodies are byte-for-byte identical to the original bodies.
  Shared session validation remains authoritative; no generic crypto abstraction, new schema,
  storage operation, format version, key policy or import behavior was introduced.
- Added 16 compatibility cases. A v2 fixture captures original export bytes; an independently
  encrypted historical v1 fixture was accepted by the original reader. Coverage checks Unicode,
  exact v2 serialization, credential exclusion, AAD tampering, envelope errors, limits, and
  checkpoint validation before destination access. All 29 focused tests pass before and after.
- All 304 Mira unit tests pass. All ten affected browser journeys pass on desktop and mobile,
  including explicit encrypted archive export/import, collision handling and lifecycle cleanup.
- Native public declarations were compared structurally before/after: no differences.

## Final verification

- Type checks and ESLint pass; the full package/static-site build and public-build safeguard pass.
- Final units: 1,711 pass and the same five baseline failures remain (MCP one, web four).
  Native adapter: 30 pass; web: 1,376 pass; all other package/Worker tests pass.
- Rust core: 282 tests pass when the known failing documentation test is explicitly excluded.
  The original unfiltered failure remains unresolved. Rust host: 23 pass.
- A fresh WASM build is blocked by the existing environment: `wasm32-unknown-unknown` is absent.
  Checked-in WASM assets remain untouched; no language/runtime sources changed.
- Full browser baseline failures were not repaired or broadly rerun. The ten directly affected
  journeys pass. Formatting remains at its four pre-existing failures; session files are formatted.
- Detailed baseline failures and reproduction commands are in [maintainability-baseline.json](maintainability-baseline.json).
- Code increments are committed locally on `codex/maintainability-passes`, above their existing
  native/browser dependencies. All 1,073 pre-existing dirty paths retain their original bytes.
  Nothing was pushed, published or submitted as a pull request.

## Remaining issues and stopping rule

Stopped after two implemented and reviewed cycles when the 150,000-token budget was reached.
No third refactor was started. Reassessment also lowered the isolated compiler-filesystem split:
that 147-line module already owns the filesystem boundary, and further extraction mainly adds
indirection without removing duplicated rules.

The most valuable next opportunities are relationship/diagnostic phases in `compiler/src/compile.ts`
and Dropbox synchronization sequencing, after their existing uncommitted work is settled. First
reconcile the recorded baseline test failures so broader regression checks provide a clean signal.
Do not change language semantics, historical checkpoint sources, persistence or UX to satisfy stale
assertions without a separate behavior decision.
