# Free guided AI

A separate Cloudflare Worker for **published guided practice steps only**. Mira chat,
personal patterns, author previews and the read-only MCP server do not use it.

The website offers it only when `/api/guided-ai/status` reports the current public
practice available. The participant explicitly chooses free AI for this practice.
An unavailable/unconfigured backend leaves existing OpenRouter/local-model routes intact.

## Shared semantics and privacy

The build reads the existing published Commons corpus and existing public-practice
mapping. It validates definitions using the website's generated Rust/WASM bridge.
Requests contain an identity, pending effect ID, consent marker and checkpoint;
**never caller-supplied messages, prompts, source paths, models or system instructions**.
The backend checks the exact published source dependency closure, then replay-validates
and derives the pending effect in the same Rust runtime. It validates the model receipt
through that runtime before returning it. The browser applies the receipt locally.

`@patternverse/guided-ai` contains the single provider-independent effect fulfillment
implementation used by the Worker, OpenRouter and local model adapters. It does not
parse Pattern Language or implement control flow.

The checkpoint includes confirmed practice answers/history, not Mira conversations or
the workspace. It passes through the backend for validation; only current-step context
is submitted to Workers AI. Neither answers, checkpoints, prompts nor model replies are
stored or logged by this Worker. Cloudflare processes requests according to its own
policies; this is **not** the OpenRouter ZDR route. Consent copy and the privacy notice
describe this explicitly. Do not submit identifying health information.

## Limits and free-tier safeguards

- Fixed model: `@cf/meta/llama-3.1-8b-instruct-fp8-fast`.
- Maximum JSON body: 192 KiB; accepted checkpoint commands/revision: 128.
- Maximum complete model messages: 8 KiB UTF-8 (no silent truncation).
- Maximum generated output: 512 tokens; 20-second provider deadline.
- 12 inference attempts per UTC day per network; 2 per minute.
- Eight persistent quota partitions, 16 requests each: **at most 128 attempts/day**.
- Daily partition reset and identity deletion; no per-user account or analytics.
- Daily HMAC network identities (IPv6 /64); `QUOTA_SALT` must be at least 32 characters.
- Reserve atomically **before** inference; failures/timeouts count. No retries/refunds.
- Disabled by default. Origin allowlist is browser protection, **not authentication**.
  Public callers can spoof Origin, but cannot bypass durable global partitions or
  choose arbitrary prompts. Different IPs can consume the shared allowance. Shared
  networks share limits. CAPTCHA/authentication would be a separate future safeguard.
- Sharding intentionally sacrifices pooling: one partition may exhaust before others.

At pricing checked 2026-10-06, each bounded request conservatively reserves 60 neurons
(UTF-8 input bytes as a token upper bound, extra template headroom, maximum output).
128 attempts reserve 7,680 neurons, below Cloudflare's 10,000-neuron daily allowance.
This estimate is **not a billing guarantee**: pricing/tokenization can change, and other
Workers AI services on the account share the allowance. Keep the account on **Workers
Free**: Cloudflare then rejects excess operations instead of billing overages. The
app caps remain in place even if someone later upgrades the account, but do not protect
against unrelated account usage. No account upgrade or billing configuration is automated.

`FREE_LIMIT` pauses the step and offers **Connect with OpenRouter**, or waiting for the
UTC reset. Using an existing OpenRouter connection also requires explicit provider
selection and a separate step retry. No paid request is issued simply by connecting.
Capacity errors, malformed outputs and oversized context are separate, retryable errors.
The original local run/answers remain untouched on any failure.

## Validation (no live inference)

From the repository root:

```sh
pnpm guided-ai:build
pnpm guided-ai:types
pnpm guided-ai:test
pnpm --filter @patternverse/guided-ai-worker check
pnpm guided-ai:dry-run
```

Worker tests use real Rust/WASM and real local SQLite Durable Objects with mocked model
responses; they never call Workers AI. Ordinary `wrangler dev` with an AI binding can
call remote inference: **do not use it as a free offline test harness**. Browser tests
mock the API and verify consent, quota prompts and progress preservation.

## Activation checklist — intentionally not performed by this implementation

1. Confirm the target Cloudflare account remains on **Workers Free**, and review other
   Workers AI usage, provider terms/data processing, and the updated privacy notice.
2. Set `QUOTA_SALT` using Wrangler's secret prompt (a random secret, never in source):
   `pnpm exec wrangler secret put QUOTA_SALT --config apps/guided-ai/wrangler.jsonc`.
3. Deploy this Worker disabled (`ENABLED=false`) through the existing authorized
   publishing workflow, and publish the website changes. The `/api/guided-ai/*` route
   must reach this Worker, not the static Pages fallback. The MCP route stays unchanged.
4. Smoke-test actual inference with synthetic, non-sensitive examples; check latency,
   CPU usage on Workers Free, model quality, typed JSON contracts and quota behavior.
   Local emulation/dry-run do not prove production CPU or model quality. Do not upgrade
   to a paid plan to resolve a failure; keep disabled and investigate instead.
5. Enable the configured `ENABLED` variable only after those checks and regenerate
   binding types after configuration changes. Check the public status response.
6. Stop instantly by setting `ENABLED=false`. Never add automatic paid fallback.

Inline MCP AI execution is a later adapter: this implementation does not broaden the
existing read-only MCP server's privacy contract or allow ChatGPT to send answers here
without a separately designed consent/host bridge.
