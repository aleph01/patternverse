# First inline practice: Define the Decision

This is a deliberately small MCP Apps vertical slice, not a second renderer or runtime. It opens the published `define-the-decision-before-comparing-options` worksheet using the existing `PracticeEmbed`, `PatternForm`, Markdown preview, and Rust/WASM Pattern Language runtime.

## Boundaries

- The HTTP Worker adds `open_practice` and `ui://patternverse/define-the-decision/v1.html`. The three existing read-only tools remain independent of UI. The stdio library remains read-only, without a widget requiring hosted assets.
- The opener accepts only the supported public pattern ID (defaulted when omitted). Other practices, answers, checkpoints, arbitrary source, and workspace access are rejected.
- The browser bundle pins the exact published practice source at build time. The host passes identity and revision, not executable source. A stale or different result cannot launch it; duplicate result notifications do not reset a run.
- `PracticeEmbed` owns the existing local run and calls the shared runtime. All five forms, validation, transitions, and completion are the same behavior used by the website. Previous answers stay visible.
- The MCP Apps SDK handles initialization, initial tool result, and automatic size notifications. Inline is the only declared/preferred display mode. No navigation entrypoint, full-page iframe, model context update, host tool invocation, AI call, session persistence, or answer synchronization is added.
- Answers stay in widget memory. Restart or destruction clears the run; reopening starts over. The host may see widget dimensions, but the application sends it no answers, outputs or checkpoints. This is not a claim that the chat host cannot observe its own UI.

## Assets and hosting

`pnpm mcp:build` builds the validated public snapshot, then the standalone Svelte widget, then the Worker. The roughly 3 MB WASM binary and content-hashed JS/CSS are static assets, not Worker runtime dependencies. Only `/mcp/ui/assets/<safe-filename>.{js,css,wasm}` is served. HTML is returned through `resources/read`, not a new public website route. Public asset CORS is separate from restricted MCP CORS; no credentials are used. Worker rate limits and free-tier configuration remain unchanged.

The resource declares only `https://patternverse.org` for static resources and connections. No nested iframe permission is requested. Browser WebAssembly compilation additionally requires the host's sandbox CSP to permit `wasm-unsafe-eval` (or equivalent WebAssembly support). MCP Apps domain metadata does not grant that permission. Therefore a successful local fixture test is **not** proof that ChatGPT allows this runtime. If the host blocks it, the worksheet shows an error and a public website fallback; do not loosen website security or silently send answers to a server. Resolve that host constraint before advertising broad inline support.

## Run and validate locally

```sh
pnpm mcp:test
pnpm mcp:widget:test
pnpm mcp:widget:preview
```

Preview opens at `http://127.0.0.1:4204/`. The fixture uses the official host bridge and an opaque-origin sandbox with `allow-scripts` only, narrow asset/network CSP plus explicit WebAssembly permission. It is local-only and excluded from website and Worker releases. It does not imitate the ChatGPT UI.

The browser tests cover all five steps and completion, required responses, earlier answers, restart/reload clearing, no horizontal overflow at desktop/mobile sizes, and absence of answer sentinels from network requests or host messages. Transport tests cover resource metadata, opener fallback, unsupported/private inputs, revision pinning, both 2025 and modern MCP negotiation, asset routing, and separation of asset/MCP CORS.

## Deployment and actual ChatGPT acceptance

1. Run checks and `wrangler deploy --dry-run --config apps/mcp/wrangler.jsonc` after building.
2. Publish only the MCP Worker/assets, not unrelated website changes. Update the existing private plugin skill/description only once the new tool is live.
3. Refresh the plugin's tool discovery in ChatGPT. Ask: “Open Define the Decision as an inline practice.”
4. Verify visible inline placement, WASM startup under the actual host CSP, all five steps, previous answers, restart, and the fallback. A tool JSON response alone is insufficient evidence.

### Release status — 2026-10-05

- Published only `patternverse-mcp` and its widget assets at the existing `/mcp` routes. Worker version: `2734be28-5111-4148-a26e-a0a4016b2fc9`. No website deployment, paid plan upgrade, or answer-storage binding was added.
- Fresh MCP build and all 21 tests passed. The live SDK smoke test passed all four tools, the UI resource, hosted JS/CSS/WASM assets and their public CORS/cache headers, and the private-content guard.
- Updated the existing private, personal **Patternverse Library** plugin to `0.2.0`, preserving its identity, endpoint, icons, and starter prompts. Release: `pluginrel_6ac3e3b693cc81919cc9fcedd06d81c2`. Source readback and the ChatGPT plugin detail page confirmed the update.
- **Actual ChatGPT inline execution verified.** With explicit approval for creation and connection consent, connected the additional private [Patternverse Inline Test](https://chatgpt.com/plugins/plugin_asdk_app_6ac3e4e234fc8191ab837a66c0a65341). The existing cloud plugin remains intact. Its initial test selected the opener and visibly rendered the worksheet; ChatGPT reported “Worked for 4s,” which is a host status, not a measured performance benchmark.
- The host initially displayed **CSP off**. After separate user approval, enabled **Enforce CSP for custom apps**, reloaded the conversation, and reran the worksheet. The CSP-off indicator disappeared and the shared WASM runtime initialized successfully. All five steps completed with synthetic answers; missing required fields blocked progress; previous answers remained visible; restart and chat reload both cleared the answers. The test page reported no captured warning/error logs after the final reload. This verifies this connected ChatGPT web host, not all hosts, devices, or future releases.
- Desktop worksheet document width and scroll width were both 768 px (no horizontal overflow). Local automated desktop/mobile and blocked-WASM fallback tests remain the evidence for those other scenarios; an actual mobile ChatGPT device and forced-block fallback were not tested here. Current Codex tool invocation returned the correct result but created no inspectable MCP App tab, so Codex inline rendering is not established.
- Test conversation: [Open Inline Practice](https://chatgpt.com/c/6ac3fa20-d148-83ed-8c6f-6d8db8311838). It is left at an empty first step. No answers were submitted to the model or server by the widget, and no persistence or cross-host continuation was added. This does not claim the host cannot observe its own UI.

Supporting CBT's ask/choose interactions and dependency execution is a later slice; do not route it into this form-only widget.

### Shared interface coordination

The editor's `PatternPreview` and `PracticeEmbed` use the same small
`pattern-run/lifecycle.ts` request coordinator for starting, restoring, and
submitting runs. It serializes requests, reports host-specific errors, and
suppresses outdated results after replacement or disposal. An abort signal is
available to adapters, but the synchronous WASM bridge cannot interrupt work;
the generation check still prevents late results reaching UI or export callbacks.

This is not another execution engine: runtime Cancel/Pause/Resume remain ordinary
commands validated by Rust. Disposing or resetting the coordinator only
invalidates pending UI requests; it neither sends Cancel nor rolls back a write
already performed by a host adapter. Checkpoint serialization, persistence,
timers, AI access, and layouts remain host-owned. Mira and the standalone runner
share the existing `pattern-run/view.ts` prompt, option, and answer projections.
The larger runner's AI/revisit lifecycle and Mira's persisted-run coordination
have not been migrated to the request coordinator in this bounded first pass.

### Local follow-up: private response handoff

The source now offers an explicit **Export responses** action. It creates a
local response/checkpoint archive for the user to copy into their own files.
The [Practice history](practice-history.md) view no longer offers individual
response imports, and the widget no longer points to that removed control. It does not add
authentication, automatic persistence, remote saving, or answer-bearing host
messages. A manual text-selection fallback works when clipboard access is
blocked. Changing the run resets the export preview; restart/reload still clears
unsaved widget state. This follow-up has not been published or accepted in the
actual ChatGPT host; the earlier release status above describes the live version.
