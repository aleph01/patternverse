# Business, Filmmaking, navigation, and article refinements — 26 October 2026

Published to https://patternverse.org with the user's authorization.
Production deployment: `479d1d98-56d8-4fe5-8944-6afee3fd67b8`.
Previous deployment: `4be31574-fc8d-438c-b324-6ab9100f9187`.

The release contains exactly 561 public entries. It adds Business with 128 articles,
16 family collections and their parent collection, plus 128 explanatory graphics.
Filmmaking adds 49 articles, six category collections, a parent collection and a
verse. Its 110 captioned image placements retain their original publisher URLs,
credits, and source links. Article titles, headings and cross-article links were
adapted to the existing reader; the substantive text and examples were retained.

The release also includes the 15 NLP/Meta Model article refinements, the clearer
Meta Model practice prompts, article breadcrumbs, collection paging, and the
consistent Commons/My Library switch and stable Verse selection.

The isolated candidate starts from the exact previous production source. All 343
existing entries outside the selected article refinements are unchanged. The
release excludes all 162 remaining source entries at preparation time, including
Machine Learning, Pedagogy, songwriting, somatic/experiential therapy, and stand-up.
Bearings, Tender Wilds, article contributions, music controls, and the contribute
team section remain outside this release. No backend service or desktop installer
was deployed. No Git push or pull request was made.

## Verification

- Content validation, production compilation, package/site builds, exact content
  inventory and public-output checks pass.
- Type checking reports zero errors and zero warnings. All 59 focused unit tests
  and all 14 deployment safeguard tests pass.
- All 24 selected desktop/phone browser checks pass for the new content,
  breadcrumbs, unavailable-navigation fallback, library scope and Meta Model practice.
- All 30 applicable search/offline/navigation checks pass; two optional previous-worker
  comparisons are skipped. The offline editor test now searches for Learning before
  selecting it, because adding verses moves it beyond the picker's initial results.
- All eight live desktop/phone release checks pass. Homepage and film screenshots
  were visually inspected, including the original remotely hosted film images.
- All 2,672 production HTTP/artifact checks pass: all 2,505 uploaded files match the
  saved build bytes, and all 167 excluded article/app/asset URLs return 404.

Candidate-only test setup fixes and corrected image-count/mobile assumptions are
recorded in the release report. These did not change application behavior or the
verified build. The unavailable-navigation fixture blocks service workers so its
simulated network failure cannot be bypassed by a cached response.

## Artifact

The exact upload, reports, verification scripts, and live screenshots are retained
under `.local/releases/business-film-navigation-2026-10-26/`. The upload contains
2,506 files including `_headers`; Wrangler uploaded 2,505 assets and headers
separately. All saved files match the tested candidate byte-for-byte.

SHA-256 over lexically sorted relative path strings and file contents:
`09377ca7f7429ac424507c8a0415cb7d31958938ec8fc3914ba0f0c751ba532c`.

Session branch: `codex/release-business-film-navigation`.
