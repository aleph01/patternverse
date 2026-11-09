# Deferred library search

Measured on 23 October 2026. Changes are local and uncommitted; nothing was published.

## Behavior

The library loader now sends browsing summaries, collection/verse labels and membership, plus a
small search descriptor. It does not serialize full search documents into HTML or page data.

Focusing the search field, entering a query, or restoring a nonempty desktop search starts one
shared request for `/library/search/<sha256>.json`. This endpoint is prerendered for static hosting.
Its URL identifies the exact public corpus referenced by the accepted library data. The client
checks its SHA-256 before parsing; the worker also checks it against the accepted release manifest.
No search query or private document is sent with this request, and credentials are omitted.

Until the corpus arrives, search uses public titles, summaries and relationship labels, plus full
personal documents. The interface explicitly identifies those incomplete results. Failure leaves
that fallback available and offers an explicit retry. Typing, changing filters and refocusing do
not retry a failed request automatically. Late responses do not restore old queries or replace a
newer descriptor.

MiniSearch's existing fields, ranking, prefix/fuzzy matching and source-qualified identities are
preserved. Index construction now waits for a nonempty query and is reused across queries and
filter changes. Content changes, including local edits, still create an up-to-date catalog.
MiniSearch's JavaScript remains in the existing bundle; no worker or external search service was
introduced.

Collection and verse labels are independent browsing metadata. Removing search bodies therefore
does not remove those labels, counts, filters, saved items, or collection membership.

## Offline and deployments

The static build explicitly includes the search endpoint in the navigation fingerprint manifest
and the optional full-library download. Installation still requests only the standalone offline
page. An ordinary library visit does not request the search corpus.

Successful searches use runtime caching. If a search completes before the first worker controls
the page, the loader asks the existing bounded visit warmer to capture that asset after control.
The Settings library download includes the search corpus even if no search has been performed.
Without that corpus offline, browsing and the clearly labeled partial search remain usable.

Older tabs retain their matching search asset and manifest after another tab accepts an update.
Missing or incompatible bytes cannot replace the accepted corpus. Explicit updates, authorization
exclusions, network probes and cache cleanup remain in place. Browser storage pressure or clearing
site data can still remove offline content.

Testing the actual static output also exposed an existing fallback loop: navigation to a missing
page could redirect `/offline.html` to itself. The worker now serves that installed document
through its application-asset path before general navigation handling. A regression test covers
both the missing-page redirect and the subsequent offline document request.

## Calculated production file sizes

Bytes, measured from fixed before/after production artifacts. Compression columns are local gzip
and Brotli calculations, rather than network measurements. The deferred corpus has 227 browsable
public search documents; non-browsable documents and the redundant compiler `ref` field are omitted.

| Resource                                   | Before raw | After raw | Before gzip | After gzip | Before Brotli | After Brotli |
| ------------------------------------------ | ---------: | --------: | ----------: | ---------: | ------------: | -----------: |
| Library HTML                               |  1,358,158 |   161,367 |     394,055 |     28,939 |       291,249 |       21,644 |
| Library page data                          |  1,253,080 |    98,332 |     388,799 |     27,695 |       288,151 |       19,433 |
| Separate search corpus                     |          — | 1,200,445 |           — |    364,022 |             — |      274,693 |
| Initial requested JavaScript, direct entry |    604,552 |   605,997 |     188,748 |    189,164 |             — |            — |

Both direct-entry samples requested 34 JavaScript files. The small JavaScript increase does not
contain the displaced article bodies. The initial browsing payload remains proportional to entry
metadata and membership; synthetic article-body growth does not increase it.

## Controlled browser measurements

Chromium 151.0.7922.34, local static server with gzip, 40 ms emulated latency, 500,000 bytes/second
download and upload throughput. HTTP caching was disabled and service workers were blocked to
isolate cold loading. Each row uses the median of three fresh browser contexts. The link journey
starts on an article, then hovers and clicks the actual library link.

“Library usable” means the Explore control is enabled and the first library entry is visible.
“First full search” runs immediately on search intent, without an artificial thinking interval.
These application milestones are not Core Web Vitals measurements.

| Milestone                       |   Before |    After |
| ------------------------------- | -------: | -------: |
| Direct entry: library usable    | 1,665 ms | 1,106 ms |
| Article link: library usable    | 1,409 ms |   374 ms |
| Direct entry: first full search |    41 ms |   907 ms |
| Article link: first full search |    19 ms |   915 ms |
| Direct entry: subsequent search |    12 ms |    10 ms |
| Article link: subsequent search |    10 ms |    11 ms |

The first full search now pays for the deferred download and indexing. Focusing the field earlier
can start that work before typing, but these measurements make no assumption about that interval.

The following are actual CDP encoded transfer totals from the local server, including response
headers and all recorded resources during each measured navigation. They are separate from the
calculated file sizes above.

| Journey      | Before browsing bytes | After browsing bytes | Before bytes through first search | After bytes through first search |
| ------------ | --------------------: | -------------------: | --------------------------------: | -------------------------------: |
| Direct entry |               614,613 |              249,947 |                           614,613 |                          614,152 |
| Article link |               404,045 |               44,083 |                           404,045 |                          408,288 |

Total transfer through the first search remains approximately the same. The improvement comes
from deferring search work until search intent. No production network timing or real-device
speedup is claimed.

A separate Node 22.23.2 measurement of MiniSearch with the same configuration and 227 documents
found a 107.5 ms median index build and 0.55 ms query lookup, using ten samples after three warmups.
This isolates the indexing operation in Node; it is not a browser main-thread measurement.
Construction is deferred, rather than eliminated. First full search can still briefly occupy the
main thread; a worker would require a separate responsiveness evaluation on real devices.

## Reproduction and validation

Build the public production site, then keep a fixed copy if other sessions are rebuilding:

```sh
PATTERNVERSE_INCLUDE_DRAFTS=false pnpm --filter @patternverse/web build
cp -R apps/web/build /tmp/patternverse-library-check
PATTERNVERSE_TEST_BUILD_DIR=/tmp/patternverse-library-check pnpm --filter @patternverse/web exec playwright test --config playwright.library-search.config.ts
node scripts/measure-library-loading.mjs /path/to/baseline-build /tmp/library-before.json
node scripts/measure-library-loading.mjs /tmp/patternverse-library-check /tmp/library-after.json
```

The dedicated browser configuration serves static files from the chosen artifact, with separate
fixture and result paths. It does not depend on the mutable SvelteKit preview output. Browser
checks cover both desktop Chromium and Pixel 7 emulation, including:

- No corpus request during browsing; delayed search and request deduplication.
- Rapid query changes, clearing, explicit retry, and desktop snapshot restoration.
- Full-text search after an online search and after a full-library download without a prior search.
- Honest offline fallback before the corpus was downloaded.
- Actual worker updates with an older tab retaining its matching search asset.
- Existing offline reading, private editing, throttled installation and cache cleanup.

All 30 applicable browser checks passed. Two optional comparisons against the much older
network-first worker are skipped unless its artifact is explicitly provided.

Unit tests cover body-growth isolation, labels, publication rules, ranking parity, immutable
endpoint identity, base paths, interrupted downloads, wrong snapshots, explicit retry, early
worker control, lazy indexing, local content, authentication exclusions and release compatibility.
The focused web run passed 127 of 128 tests; all 63 workspace tests and the build-adapter test passed.
Production build/public-file checks, web/workspace type checks, targeted lint and formatting pass.
The existing collection component test has an unrelated `6patterns` versus `6 patterns` raw-text
assertion failure. The same failure was reproduced with the pre-change library component; its
assertion and presentation were left unchanged.

Chrome DevTools MCP was unavailable; measurements use Playwright's CDP network interface and
browser assertions. Safari, real phones and live-site timings remain untested. Mobile retains its
existing fresh-list behavior on returning from an article; desktop restores its existing snapshot.
