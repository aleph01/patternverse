# Private website statistics

The owner dashboard is `https://patternverse.org/owner/stats`. Cloudflare Access
protects the whole `/owner` subtree on both `patternverse.org` and
`www.patternverse.org`, including `/owner/stats/data`.

Only `contact@patternverse.org` is allowed, using One-time PIN email login with an
8-hour session. The app does not accept all identity providers, WARP login, public
bypass rules, or service tokens. Its login cookie is HTTP-only, bound to the
browser, and scoped to the owner path. The app is hidden from the App Launcher.

Account configuration:

- Access application: `13bc4173-fd9b-4d68-8b0d-9a33e01e8f49`
- Owner policy: `968b69f5-a1ad-4e81-bde9-8861d6a4b005`
- One-time PIN provider: `c86f0837-9485-4b63-b0f8-00ffef8a46b9`
- Team: `snowy-butterfly-6cf2.cloudflareaccess.com`
- D1 database: `patternverse-usage` in WEUR

These are configuration identifiers, not credentials. Never put Cloudflare
administration tokens in application source or runtime bindings.

## What is measured

Production uses `COLLECTION_MODE=edge`. The Worker passes website requests to
Cloudflare Pages and returns the original response bytes and headers unchanged.
It counts only successful HTML loads for published public reading paths when the
request identifies a browser document navigation. Counting runs in `waitUntil`;
counting failures do not interrupt the website. More-specific MCP and guided-AI
Worker routes retain precedence.

A visit is an online browser page load, not a unique person or a time-based
session. Reloads and repeat visitors can count again. Navigation handled inside
the app, offline/cache-only reading, failed requests, known bots, and privacy
opt-outs are not counted. Fabricated browser requests can still affect totals.
The dashboard states these limits and shows public arrival pages, broad sources,
and totals for today, the last 7 days, and the last 30 days. Dates use UTC.

The geographic panel shows country clusters on a self-contained world map, with
exact country totals beside it. Cloudflare's trusted `request.cf.country` supplies
the broad country code; client headers and event bodies cannot supply locations.
Countries are aggregated separately from pages and sources. No city, region,
visitor coordinates or raw address is retained. Country positions on the map are
fixed public label positions, not visitor locations. VPNs/proxies can affect the
country estimate. Existing visits are never backfilled with invented locations.
The same period, opt-outs, bot exclusions, owner protection and 180-day retention
apply. Missing/unknown countries remain unavailable.

The checked-in map data comes from public-domain Natural Earth (110m land and
50m country label positions). The map makes no external requests. Refresh those
static assets explicitly with `node apps/owner-stats/scripts/update-geography.mjs`;
normal builds never download geographic data.

This runs independently of the static website release, so enabling analytics does
not publish other unfinished website changes. The former general-purpose,
automatically injected Cloudflare RUM script is disabled. Do not re-enable it:
automatic HTML changes can invalidate the site's offline release fingerprints.

## Privacy and access boundaries

- No analytics scripts, cookies, localStorage, fingerprints, or visitor IDs.
- D1 stores daily totals, country totals, published page counters, and four broad referrer
  categories. No raw events, connection addresses, user agents, full referrer
  URLs, query strings, fragments, search terms, answers, workspace content or Mira
  conversations are stored. A daily job retains only the current 180-day window.
- The build compiles the allowed public paths without drafts. Workspace, editor,
  practice execution, Mira, OAuth, owner and unknown paths are never counted.
- Do Not Track and Global Privacy Control request headers are honored. Headless
  browsers and common crawler user agents are excluded. Client events sent to
  `/api/usage` are ignored in edge mode, preventing duplicate counts.
- Cloudflare processes connection data as the site's host. A transient Cloudflare
  rate limiter uses connection addresses for abuse protection, separately from
  the statistics database; shared networks may be undercounted. Worker request
  logging is disabled.
- The Worker independently verifies each Access JWT's RS256 signature, issuer,
  application audience, expiry and exact owner mailbox. Missing configuration
  denies access. An email header alone is never accepted.
- Private HTML, JSON and errors are `no-store`. The dashboard is not a static
  SvelteKit route, and no statistics are included in public build assets or Pages
  preview deployments. Worker preview URLs and `workers.dev` are disabled.
- Owner sign-in uses necessary authentication cookies. Website visitors do not
  receive analytics cookies.

The dashboard never creates sample counts in production. A database failure
produces an unavailable response instead of false zeroes.

## Operations

`COLLECTION_ENABLED` controls collection. Keep `COLLECTION_MODE=edge` in production.
Rebuild the public-path allowlist when publishing new Commons pages.

```sh
pnpm --filter @patternverse/owner-stats build
pnpm --filter @patternverse/owner-stats check
pnpm --filter @patternverse/owner-stats exec vitest run
pnpm exec wrangler deploy --config apps/owner-stats/wrangler.jsonc --dry-run
pnpm exec wrangler deploy --config apps/owner-stats/wrangler.jsonc
```

For a new database only:

```sh
pnpm exec wrangler d1 migrations apply patternverse-usage --remote --config apps/owner-stats/wrangler.jsonc
```

Verify that signed-out owner URLs on both hosts redirect to Access; the exact owner
mailbox can sign in; a different mailbox and forged assertions cannot reach data;
and public responses, MCP and guided AI retain their normal behavior. Do not add
bypass policies for testing. To stop collection, deploy with
`COLLECTION_ENABLED=false`. The Access restriction remains in place.

References: [Access JWT verification](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/),
[One-time PIN](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/),
[Worker routes](https://developers.cloudflare.com/workers/configuration/routing/routes/),
[D1](https://developers.cloudflare.com/d1/),
[Workers rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
