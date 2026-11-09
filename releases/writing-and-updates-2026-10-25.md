# Writing and completed website updates — 25 October 2026

Published to https://patternverse.org with the user's authorization, excluding songwriting,
somatic/experiential therapy, and stand-up comedy. Production deployment:
`18790612-2f23-431c-9679-bd9eb055fda7`. Previous deployment:
`6561a058-faee-42e9-b92e-4d39656a36a0`.

The release contains 357 public entries. It adds all 54 completed writing articles, a Writing
Patterns collection and nine family collections, and 54 authored writing card graphics.
It includes the revised statistics articles, eight missing statistics card graphics, photography
example expansion, the NLP Meta Model article and practice, and the completed interface updates.
The writing synthesis guides and foundations tip have not been authored and are not advertised
as available. Existing core feature switches and the Tender Wilds public exclusion remain in effect.
No separate backend services or desktop installers were deployed; no Git push or PR was made.

All 123 held entries remain absent from public pages and search. This includes the complete
songwriting course, somatic/experiential articles and collections, and stand-up pilots and taxonomy.
Their source content remains available locally. Songwriting diagrams and excluded card artwork
were removed from the isolated release copy before building.

## Verification

- Content validation, production compilation, package/site builds, public-output scans, and
  exact public and excluded inventories pass.
- Svelte/TypeScript checking reports zero errors and zero warnings.
- All 171 focused numerical, content, graphics, rendering, practice, and backlinks tests pass.
- All 99 applicable article/navigation browser checks pass across desktop and phone; five
  viewport-specific checks are intentionally skipped.
- All 28 applicable search/offline/navigation browser checks pass; two optional older-worker
  comparisons are skipped. An obsolete broader navigation UI assertion remains excluded,
  consistent with the previous release.
- All 14 deployment safeguards pass.
- All 889 production HTTP/artifact checks pass, including every excluded article URL and
  the retained asset responses. All eight live desktop/phone writing and Meta Model checks pass.

Candidate-local browser checks were corrected to follow the current photography library rather
than the removed overview, and to use the heading shared by desktop and phone. Cache assertions
were preserved. The linked-dependency test setup could not run all candidate unit suites, so the
same source/content/artwork passed focused unit checks in the editable checkout. Browser checks
ran against the exact static candidate. The build's public file hashes were checked on production.

Two retired, previously public photography overview URLs still serve old cached HTML at their
bare custom-domain addresses. Both return 404 at the new deployment URL and with a fresh query
string on the custom domain. A targeted cache purge was attempted but the existing OAuth login
lacks the required permission. These cached pages are outside the three excluded content groups;
all 123 requested exclusions return 404 without cache-busting.

## Artifact and reports

The exact reviewed upload is retained under
`.local/releases/writing-and-updates-2026-10-25/production-candidate/build/`, with the source
candidate location, inventories, logs, and browser reports alongside `release-report.json`.
The artifact contains 1,789 files including `_headers`; Wrangler uploaded 1,788 assets and
the headers separately. Its SHA-256 fingerprint over sorted relative paths and file bytes is:

```text
7eea2ea63f9599e0152e1d2d7806088d1d31404eea37f5c973a0ffb5fbf58843
```

The session branch is `codex/publish-writing-and-updates`. Publication flags were changed only
for the authorized 54 writing articles. Existing unrelated source changes were not committed,
discarded, or rearranged.
