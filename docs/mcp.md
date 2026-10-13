# Read-only Patternverse MCP server

Published Patternverse Commons can be served locally over stdio or remotely over
Streamable HTTP. Both transports use the same three read-only tools and public library.
The HTTP implementation additionally includes a narrowly scoped inline worksheet opener;
see [the inline practice slice](mcp-inline-practice.md) for local validation and remaining
ChatGPT acceptance checks. Servers do not execute practices, edit content, access personal
workspaces, or sync answers. Local stdio use requires no account or network service. The HTTP adapter targets a
separate Cloudflare Worker and needs no database, AI provider, API key for users, or paid storage.

## Build and connect

Use the repository's Node 22 and pnpm versions. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm mcp:build
pnpm mcp:test
```

The build reuses the committed generated Rust WebAssembly bridge. After changing Rust
semantics, regenerate it with `pnpm build:pattern-wasm` before rebuilding the MCP server.
Do not substitute another Pattern Language parser.

For a host supporting local stdio MCP servers, use its MCP configuration interface with:

```json
{
  "mcpServers": {
    "patternverse": {
      "command": "node",
      "args": ["/Users/jeger-benninger/Documents/patternverse/apps/mcp/dist/index.js"]
    }
  }
}
```

Change the absolute path if the repository moves. If the host cannot find Node 22, specify
its absolute executable path. Launch Node directly: package-manager banners must not enter
the stdio protocol stream. The server works independently of the host's working directory.
It loads the public corpus once at startup; restart it after changing source content.
This task does not install or alter any host configuration.

## Tools

| Tool              | Inputs                                                                                              | Result                                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `search_patterns` | Optional `query`, `verse` ID, `limit` (1–50, default 20), `offset` (0–10000)                        | Pattern-only results using existing lexical ranking, resolved organization, canonical links, and pagination               |
| `get_pattern`     | Public pattern `id`; optional `sourceId: "commons"`                                                 | Complete article Markdown, metadata, related pattern links, verses, collections, and practice choices                     |
| `get_practice`    | Public pattern or practice `id`; optional `practiceId` from `get_pattern` and `sourceId: "commons"` | Pattern Language source, root name, input/output contracts, source revision, snapshot identity, and required dependencies |

For example, search with `{"query":"Cognitive Distortions","verse":"therapy"}`, then
retrieve `{"id":"cbt-thinking-patterns"}`. A pattern with no practice returns `NO_PRACTICE`;
multiple attached practices require an explicit selection. Unknown arguments and invalid
IDs are rejected. Successes include both typed `structuredContent` and the same data as
readable JSON text for hosts without rich rendering. Relative article assets resolve
against `https://patternverse.org`; diagrams remain article references, not embedded bytes.

## Shared boundaries

```text
Stored published Commons → existing corpus compiler → shared Library search/projections
Public practice mapping + Pattern Language sources → pattern-host inspect_bundle → snapshot
                                      ↓
                       three read-only MCP tool adapters → stdio / HTTP host
```

`apps/mcp/src/corpus.ts` admits only the repository-owned Commons manifest and fixed bundled
practice catalogs. `library.ts` projects public data and resolved relationships without
exposing filesystem paths. `server.ts` provides MCP schemas and protocol results, not
language semantics. `definition.ts` adapts Node file loading to the same generated Rust
bridge used by the website. The server bundle contains compiler/library code, not Svelte or
Mira UI. The inline widget is a separate browser asset bundle reusing existing Svelte components.

For HTTP, `snapshot.ts` projects only published Commons and records Rust inspections at
build time. `worker.ts` uses the same library with these immutable validated definitions.
The Worker never loads a filesystem or language engine. `http.ts` adds host/origin checks,
bounded bodies, and a Cloudflare rate limiter around the SDK's stateless handler. Both modern
and 2025 protocol clients use the same server factory. No sessions or answers are stored.
The pre-release `language` wire label is now `pattern-language`, matching the product name;
the underlying grammar and Rust behavior are unchanged.

`@patternverse/workspace/public-practices` owns the existing public CBT/reframing mapping;
the website's original imports remain compatibility re-exports. Article-authored practices
and attached practice records retain precedence over catalog fallbacks. Rust's existing
`ExecutableSnapshot` resolves/type-checks the exact transitive dependency closure, rejects
missing imports and cycles, and derives contracts. Its inspection operation is bounded and
never initializes execution state or dispatches agent effects.

## Privacy, limits, and deferred work

- Only `commons` entries with `published` status can be returned, including relationships.
  Drafts, deprecated entries, personal data, answers, and saved runs are inaccessible.
- Tools cannot choose files, supply executable source, initiate model calls, or mutate data.
  Errors omit paths and stack traces. Protocol output is confined to stdout; startup failures
  go to stderr. Tool annotations declare read-only, non-destructive, idempotent behavior.
- Returned articles and definitions are untrusted source material, not host instructions.
  A connected AI host may retain public tool results according to its own policies.
- Source inspection admits at most 128 supplied sources, each at most 64 KiB, plus existing
  Rust graph and request limits. Only required sources are exported, not the whole catalog.
- Keep the source tree alongside the stdio server. The HTTP bundle is self-contained;
  rebuild and redeploy it to update public content or language contracts.
- HTTP bodies are capped at 16 KiB; queries allow at most 400 characters and 16 searchable
  terms to bound fuzzy-search work. Tool arguments also have ID/pagination limits
  and a 32-element complexity limit. Rate limiting is 120 requests per minute per connecting
  IP per Cloudflare location, not a precise global quota. Shared host proxy IPs may share it.
- There is no authentication, personal access, or server-side practice execution. The local
  HTTP implementation now has one MCP App resource/bridge; actual ChatGPT rendering remains
  unverified. The website's frame policy is unchanged.

## Cloudflare free-tier preparation and publishing

```sh
pnpm mcp:dev
# In another terminal:
pnpm mcp:smoke http://127.0.0.1:8787/mcp
pnpm mcp:dry-run
pnpm exec wrangler check startup --cwd apps/mcp --outfile dist/startup.cpuprofile
```

`apps/mcp/wrangler.jsonc` routes only `/mcp` and `/mcp/*` on `patternverse.org`.
It does not replace the Pages website, enable workers.dev/preview URLs, or change account billing.
Confirm the account is on **Workers Free** before publishing: a Free website/zone plan does
not imply Workers Free. Free enforces its own 10 ms CPU ceiling; custom `limits.cpu_ms`
configuration is rejected on Free and deliberately omitted. Configuration is not a billing guard.
No command here upgrades a plan. On Workers Free, daily request exhaustion produces failures
rather than paid overages; other account Workers share that allowance. See Cloudflare's
[limits](https://developers.cloudflare.com/workers/platform/limits/) and
[pricing](https://developers.cloudflare.com/workers/platform/pricing/).

After account/route checks and an explicit publishing decision:

```sh
pnpm mcp:test
pnpm mcp:dry-run
pnpm exec wrangler deploy --config apps/mcp/wrangler.jsonc
pnpm mcp:smoke https://patternverse.org/mcp
```

Initial local validation: 127 public entries, 57 Rust-validated practice definitions,
17 tests passing, approximately 569 KiB gzipped deployment, and approximately 120 ms local
startup. Sampled local active CPU averaged about 4–7 ms per request across browse/search/
article/practice/dependency-closure checks. These measurements are diagnostics, **not proof
of production CPU compliance**. Confirm cold/warm request CPU using live Worker metrics,
especially maximum pagination and broad fuzzy searches. Do not upgrade if limits are exceeded;
reduce work or disable the endpoint and review first.

Published on 2026-10-05 after the dashboard confirmed **Workers Free — Current plan**.
Cloudflare reported 155 ms startup for the final deployment. Live SDK smoke checks passed for browse,
search, article, practice, and dependency retrieval, as did the private-content guard.
The homepage and library still returned HTTP 200. A live maximum-length repetitive query
highlighted avoidable search work, so the shared MCP input contract now caps searchable
terms at 16; this does not change website search ranking or introduce a second search engine.

Optional local profiling, after starting dev with `--port 8788 --inspector-port 9231`:

```sh
pnpm mcp:smoke http://127.0.0.1:8788/mcp http://127.0.0.1:9231
```

## Connect ChatGPT first

Once the endpoint is deployed and the live smoke test passes, add a private connection
in ChatGPT developer mode using `https://patternverse.org/mcp`, with no authentication.
Availability and settings labels depend on the account; follow the current official
[connection guide](https://developers.openai.com/plugins/deploy/connect-chatgpt).
This code does not alter your ChatGPT settings or publish a public directory listing.

Try: “Find a Patternverse pattern for noticing cognitive distortions, then retrieve its
article and practice definition.” Confirm the library tools appear. ChatGPT receives structured
results and readable text on the currently published release. A ChatGPT account/plan may
have its own eligibility requirements, separate from the free MCP hosting.

The first inline adapter is published using the shared Pattern Language runtime. The HTTP
endpoint now advertises `open_practice` alongside the three library tools. The existing private
Patternverse Library plugin was updated to version 0.2.0. Live protocol and asset checks passed.
With user approval, an additional private **Patternverse Inline Test** custom-MCP connection
was connected in ChatGPT. Actual inline execution passed all five steps, validation, visible
prior answers, restart, and reload clearing after the user approved enabling host CSP enforcement.
This verifies the connected ChatGPT web host; Codex inline rendering and actual mobile-device
acceptance remain unverified. The existing cloud plugin and free-tier hosting remain unchanged.
See [release status, tests, and acceptance checklist](mcp-inline-practice.md). Do not duplicate
semantics or relax website frame security.
