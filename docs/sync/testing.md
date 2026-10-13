# Sync testing strategy

## Pyramid

1. Pure sync-domain unit and generated property tests.
2. Reusable `RemoteCorpusStore` contract tests against an in-memory fake. Implemented in
   Milestone 2.
3. IndexedDB snapshot, staging, journal, and recovery integration tests.
4. Dropbox adapter HTTP-boundary tests with no live credentials.
5. Web component and state tests for connection, sync, and conflicts.
6. Playwright flows through the fake provider.
7. Optional Dropbox sandbox smoke tests outside ordinary CI.

## Milestone 1 acceptance matrix

The planner tests cover unchanged, one-sided create/update/delete, identical convergence,
all four conflict shapes, manifests, assets, preferences, path normalization, deterministic
ordering, input immutability, and rerun convergence.

Generated tests assert:

- identical local and remote snapshots never conflict;
- the same input always yields a deeply equal plan;
- planning does not mutate any snapshot or byte array;
- applying a non-conflicting plan produces equal local and remote file sets;
- replanning converged results produces no changes.

Vitest is the test runner. Fast-check is a development-only dependency for generated
properties. Provider credentials are never required by the normal test suite.

## Milestone 2 acceptance coverage

The deterministic fake-provider tests exercise two independent devices, initial upload and
download, concurrent edits, explicit keep-both resolution, deletion propagation, deletion
conflicts, offline local edits, stale remote revisions, interrupted partial writes, journal
recovery, expired authorization, invalid remote data, and isolated binary snapshots.

## Opt-in workspace Dropbox adapter

`dropbox-workspace-sync.test.ts` runs without live credentials, using real workspace,
Mira and encrypted checkpoint databases against a revision-aware mocked HTTP endpoint.
It covers new-archive creation, two-device exchange of all sections, encrypted bytes,
account/key/expiry checks, legacy-upgrade preview, exact error tags, bounded streams,
strict upload races (including deletion), canonical record validation, quota/permission
errors, lost upload responses, stale review tokens, protected Mira caches and blocked
partial apply. Generated private text round-trips use 35 deterministic fast-check cases.

The remote-store tests additionally bind choices to base, local and remote versions,
including the case where a stale review's conflicts disappear. Component tests cover
unselected defaults, completeness, token submission, fresh-review reset, escaped text,
deletions, busy controls, cancellation and non-destructive blocked recovery.

`sync-recovery-review.test.ts` checks explicit recovery choices, encrypted copies of
original and current versions, stale record/intent/cache tokens, active Mira
protection, deletion, post-confirmation edit races and 50 seeded text/choice cases.
The coordinator test verifies recovery settlement followed by a separate remote
conflict review. `dropbox-upgrade.test.ts` covers backup-before-marker-before-v2
ordering, no local replacement, old-client rejection, real v1 ancestry/offline
deletion, lost responses at all three writes, backup collision, malformed/missing/
tampered resume data, stale confirmation, old-client upload races and competing v2
creation, changed-key preservation and refusal to overwrite existing v2 history.
These use disposable databases and mocked HTTP, not a live account.

The isolated `playwright.sync.config.ts` suite runs desktop/mobile Chromium and
desktop/iPhone-sized WebKit with
native IndexedDB, Web Locks and browser fetch. Dropbox requests are intercepted with
realistic CORS/exposed revision headers; there are no live tokens or network writes.
It checks reload recovery, two-tab protection, full-attempt serialization, encrypted
HTTP transfer, confirmation/protected choices, recovery after reload and responsive
review/upgrade controls. The private mount harness is served
only by the test Vite configuration, not as a public app route. The test server
uses a synthetic public app key and full profile; ordinary/public builds are unchanged.
It permits the app's generated client modules and dependencies so the real callback
and navigation hydrate, rather than testing only mounted fixture components.

`sync-auth-browser.spec.ts` additionally exercises actual PKCE redirects/callbacks,
state mismatch, rejected codes, expiration, disconnect and account-owner protection.
The successful exchange verifies the verifier against the authorization challenge
and confirms that no client secret is sent. All provider behavior is synthetic.
The mocked-provider suite blocks service workers: worker-owned fetches can bypass
[Playwright route interception](https://playwright.dev/docs/api/class-browsercontext#browser-context-route).
Do not interpret an unmocked synthetic-token rejection as a real-account application failure.

`playwright.sync-pwa.config.ts` separately builds a full-profile test site and enables
the **actual production service worker**, without a provider sign-in or sync request.
It checks that unsolicited callbacks are rejected, single-use credentials leave the
URL/storage, auth pages never enter caches, and the cached workspace works offline
with a simulated standalone display. These are not installed iOS PWA tests: real
Safari, OS-level browser/PWA handoff, storage retention and authorization with a real
Dropbox account remain manual release gates. The general Playwright suite excludes
these private-server fixtures; run their dedicated configurations explicitly.

Run the focused additions with:

```sh
pnpm --filter @patternverse/web exec vitest run src/lib/service-worker-cache.test.ts src/lib/client/dropbox-workspace-sync.test.ts src/lib/client/dropbox-upgrade.test.ts src/lib/client/sync-recovery-review.test.ts src/lib/components/WorkspaceSyncReview.component.test.ts src/lib/components/WorkspaceSyncUpgrade.component.test.ts
pnpm --filter @patternverse/remote-store test
pnpm --filter @patternverse/web exec playwright test --config playwright.sync.config.ts
pnpm --filter @patternverse/web exec playwright test --config playwright.sync-pwa.config.ts
```

Do not run the production-worker configuration concurrently with a build, type-check,
unit test or dev browser suite: they share SvelteKit's generated output. Its test-only
full-profile build is not a publish artifact; rebuild with the ordinary release
configuration before deployment.

### Browser verification results (2026-10-09)

- Isolated provider/auth/recovery suite: **44 passed**, across all four browser profiles.
- Production-worker suite: **4 passed** in Chromium; **4 failed** in WebKit, before
  callback/offline assertions, because the worker cannot finish installation.
- Local reproduction with disposable WebKit cache storage identifies the install
  failure: `Cache.addAll` rejects `/` and `/#home-about` with
  `InvalidStateError: addAll cannot store several matching requests`. The generated
  precache includes both URLs. Chromium accepts the same minimal reproduction and
  full asset list. This is not a provider-mocking failure.

This test expansion retained the failing gate, rather than disabling the worker or
simulating a successful install. No service-worker application behavior was changed
in that round. The subsequent fix and verification are recorded below.

### Offline cache fix and verification (2026-10-10)

The worker now normalizes precache URLs to fetch identity (resolve URLs, remove
fragments, then deduplicate). Query parameters and deployment base paths are
preserved; authorization pages and `_headers` remain excluded. Five unit regression
checks cover homepage section links, equivalent URLs, distinct queries, base paths,
input immutability and empty lists.

The production-worker suite now reports **8 passed** across desktop/mobile Chromium
and WebKit. Worker installation and callback-security checks run against the real
production build. Offline navigation uses a disposable localhost proxy which first
serves the built app, then destroys all connections. The worker must serve its own
cached responses; the test does not supply fallback HTML or fake cache entries.
Chromium also uses Playwright's offline switch.

In this WebKit test browser, `context.setOffline(true)` produces internal browser
errors for both fetch and reload, whereas the same worker serves cached pages
successfully during a real local server outage. The transport-outage test avoids
that emulation limitation, but does not verify WebKit's `navigator.onLine = false`
behavior. WebKit coverage still does not replace actual Safari, installed iOS PWA,
OS-level handoff or live staging checks below.

## Controlled real-account staging test (still pending)

Before any live write, agree on a dedicated **staging App Folder/account** whose
Patternverse archive paths are empty. Do not point this test at an existing personal
archive or silently upgrade it. Use disposable browser profiles and small synthetic
notes only. Authorize through Dropbox directly; do not paste access tokens or the
sync phrase into chat/logs. The test requires two profiles/devices on one staging
account, plus another test account/profile for ownership isolation.

1. Confirm App Folder access, exact staging callback, least required scopes and
   development-user eligibility. Inspect the target paths before seeding anything.
2. Exchange a tiny workspace on both devices, including a verse/collection, saved
   reference, rating, explicitly saved responses and one Mira conversation.
3. Test offline edits, concurrent edits, explicit conflict choices and deletion
   propagation. Confirm no unrelated records or settings disappear.
4. Seed a tiny v1 staging archive, confirm the upgrade, inspect the encrypted backup,
   verify old-client rejection and run the subsequent v2 merge.
5. Interrupt before/after each upgrade/apply/upload boundary and resume; do not
   blindly restore v1 over active v2. Preserve both archives before any rollback exercise.
6. Check actual Safari and an installed iPhone PWA separately: same-window OAuth,
   return target, missing session state, reload, disconnect/reconnect and local data
   retention. A different browser/standalone storage context must fail safely.
7. Record results and the coordinated rollback/support procedure before enabling
   the v2 flow publicly. Cleanup of staging files needs explicitly identified targets.
