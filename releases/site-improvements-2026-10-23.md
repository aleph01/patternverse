# Site improvements release — 23 October 2026

Published on 24 October 2026 at https://patternverse.org after user authorization.

## Scope

- Homepage verse grid, desktop verse tiles, mobile search controls and deferred full-text search.
- Authored graphics for the existing catalog, ChatGPT connection instructions and contribution page.
- Updated privacy, legal and safety notices, and support for interactive article examples.
- Existing live content only: 129 patterns, 17 collections, nine verses, one concept and one practice.

The inventory in `site-improvements-2026-10-23.json` was checked against the live library on
23 October. It excludes 242 additional or draft entities, including photography, statistics,
new collaboration/creativity articles, songwriting and somatic/experiential therapy. New content
assets, course diagrams and artwork records belonging to excluded patterns are omitted as well.
The editable project retains all of this work and its existing publication flags.

The contribution form's email delivery remains disabled. Private owner statistics and the MCP,
guided-AI and contribution services are separate deployments.

## Prepare and inspect

Run `pnpm release:prepare:site` from the repository root. This creates a new source snapshot under
`.local/releases/site-improvements-2026-10-23/`, validates and compiles its retained content, builds
the core-profile website and scans the public artifact. It has no upload operation and removes
Cloudflare publishing credentials from the build environment. Installed dependencies are reused
locally; private environment files are not copied. Only the existing public Dropbox app identifier
is carried into the build.

`latest.json` identifies the candidate directory. Its `release-report.json` records the retained
and excluded entries, checks, and SHA-256 fingerprint of the public build. The deployable directory
is that candidate's `apps/web/build`. Use that exact reviewed artifact for any later publication;
the ordinary `deploy:web` command builds the mixed working project and would include held content.

To test a fixed candidate, set `PATTERNVERSE_TEST_BUILD_DIR` to its absolute `apps/web/build` path
and run these commands from `apps/web`:

```sh
pnpm exec playwright test --config playwright.site-release.config.ts
pnpm exec playwright test --config playwright.library-search.config.ts
```

These use the static artifact without rebuilding the editable project. The site-release suite
also checks that every excluded entity and representative content assets return 404.

The final local verification results are recorded in the candidate's release report.

## Verification results — 24 October 2026

All rerun checks pass: 2,102 workspace unit tests (including all 1,701 web tests), 320 Rust tests,
the WebAssembly build, 27 script tests, repository formatting, lint and workspace type checks.
The refreshed candidate also passes content validation, compilation, its production build and
public-output checks. All 82 applicable browser checks pass across desktop/mobile release,
search/offline/navigation and standalone worksheet suites. Eight other browser checks are
intentionally skipped because they apply to the other viewport or require an optional older build.

The previous failures were corrected by updating worksheet test controls, preserving the space
in collection counts, checking actual article metadata for graphics/therapy contracts, and
keeping website-only article examples out of the standalone worksheet bundle. Tests still require
artwork for every published pattern; unfinished drafts can use the existing neutral fallback.
The catalog test inspects frontmatter without parsing every article body. Eight existing files
were formatted without changing their behavior or content data.

The 157 retained entries and their memberships match the previously reviewed candidate. All
242 excluded entities return 404, and their assets remain absent. Logs, the exact public-build
fingerprint and review captures are saved with the latest candidate.

## Publication — 24 October 2026

The reviewed static artifact is live at https://patternverse.org. Deployment ID:
`b661a031-ab52-4ab2-9f83-608f80501ecf`. All 258 live checks pass, including all 242 excluded
entity URLs and representative excluded assets. Six browser checks confirm the contact pages
work online and offline without browser errors.

Live verification detected Cloudflare email obfuscation changing contact-page HTML. The release
adds `Cache-Control: no-transform` for `/contribute`, `/privacy` and `/impressum`, preserving
the offline integrity fingerprints. This changes only response headers; the other 934 public
files are unchanged. The 14 deployment safeguard tests pass again.

No separate backend service was deployed. New content and its assets remain excluded.
