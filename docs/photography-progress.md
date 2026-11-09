# Photography collection progress

Status: photography illustrations were refreshed to the light editorial style on 31 October 2026. All 29 SVG layouts pass visual checks; 48 focused tests, the production build and 117 static page checks pass. The startup error was subsequently fixed by separating production-generated files from development/test files; all 62 interactive photography browser checks now pass. The illustration refresh is local and uncommitted; nothing was pushed or published. Historical verification below describes the earlier runs.

## Content and assets

All 30 articles are written (approximately 900–1,000 words each), with the foundations Concept, Photography Verse, seven groups, parent collection and requested eight-pattern path. All articles have eight recommendation queries and schema-compatible canonical metadata. All 59 photography image assets have provenance and matching checksums, including the original 39 and 20 additions (six generated sources, seven native SVG layouts and seven mobile companions). No guided practices were added.

| Article                         | Text/metadata      | Visual assets                | Final browser review  |
| ------------------------------- | ------------------ | ---------------------------- | --------------------- |
| Choose Your Subject             | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Find a Relationship             | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Show the Scale                  | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Change Your Position            | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Separate Subject and Background | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Use Negative Space              | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Explore the Rule of Thirds      | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Use Symmetry                    | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Use Leading Lines               | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Build Layers                    | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Check the Edges                 | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Follow the Light                | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Find Soft Light                 | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Use Backlight                   | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Limit the Color Palette         | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Focus on What Matters           | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Choose Your Depth of Field      | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Freeze or Show Motion           | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Expose for What Matters         | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Work the Scene                  | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Find the Frame, Then Wait       | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Anticipate the Moment           | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Give People Something to Do     | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Crop with a Purpose             | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Edit to Guide Attention         | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Select the Strongest Frame      | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Tell a Story in a Sequence      | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Review One Thing at a Time      | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Use a Creative Constraint       | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |
| Return to the Same Place        | Written; validated | Present; provenance recorded | Passed: 1440 / 390 px |

## Local verification — 23 October 2026

- Imported the checksum-verified transfer archive (`f1316fc0553bc8e388256492b854680e5232924b0619b6775ebb8518e037506e`): 94 additions plus the two shared renderer/style files. The renderer conflict was merged with existing article widget support. All 2,940 other pre-existing source files remained byte-identical, with backups outside the checkout.
- Restored the existing checkout from Downloads to its original Documents location at the user's request. Dedicated GitButler branch: `codex/photography-browser-verification`. All photography work remains uncommitted.
- Strict content validation: **399 entities; no unresolved references** in the current combined local corpus.
- Production web build and public-build guard: **passed** (`VITE_RELEASE_PROFILE=full`).
- Web TypeScript/Svelte check: **zero errors, zero warnings**.
- Focused collection, renderer, and existing article widget tests: **41 passed** across three files.
- ESLint: imported/merged code and the reusable review script passed.
- Production-preview Playwright tests: **62 passed** (all 30 articles plus navigation/assets checks at 1440×1000 desktop and 390×844 mobile).
- Collection-wide review: **123 successful page/viewport checks** (30 articles and 11 navigation/reference routes at 1440, 390, and 320 pixels), **72 rendered figure captures**, all **39 visual assets** served successfully, and full GFDL license text available. No page errors or document overflow.
- Visually inspected every distinct source asset and every rendered article figure at desktop and mobile widths, plus all collection/reference layouts. Wide diagrams remain contained, horizontally scrollable, and readable when opened full-size. No visual defects requiring changes were found.
- Actual reading-path links, foundations navigation, keyboard scrolling, full-size visual links, and browser back navigation passed at desktop/mobile sizes. Mobile uses Chromium viewport/touch emulation; physical-device and other-browser testing were outside this review.

## Remaining issues and historical checks

There is no remaining photography browser blocker. The cloud Chromium/socket restriction is resolved by running the browser locally with the required runtime permission.

A targeted rerun of the two component files that failed in the cloud now reports **12 passed and one failure**: `LibraryCollections.component.test.ts:80` expects `6 patterns`, while the unchanged component's DOM text is `6patterns`. This fixture uses its own six synthetic patterns and does not depend on photography content. These existing component/test files were preserved. This is a broader unit-test issue, not a failed photography browser check.

The earlier cloud full web run reported 1,410 passes/four failures, confirmed at its base revision; that historical result should not be presented as the current local suite result. The full workspace suite was not rerun during this focused browser verification. Earlier cloud formatting findings and full-workspace socket-test restrictions are historical, not newly reproduced local blockers.

## Reproduce and inspect

Start a production preview on port 4186, then run `node scripts/review-photography.mjs` from the repository root. Set `PHOTOGRAPHY_REVIEW_URL` to use another local preview and `PHOTOGRAPHY_REVIEW_OUTPUT` to choose the capture directory. The script records page/image checks, captures article figures and navigation layouts, and returns a failing exit code for detected errors. It replaces the original cloud-only review script's hard-coded paths and avoids its Chromium timeout when screenshotting a standalone SVG document.

This run's logs, screenshots, original archive contents, and import backups are under `/tmp/photography-transfer-import/`. The successful detailed report is `final-browser-review/report.json`; contact sheets are in `contact-sheets/`; all 39 full-size asset captures are in `asset-review/`. Reading-path/full-size navigation results are in `navigation-flow.json`. These are local review artifacts, not published files.

## Files and conventions

Canonical content remains in `content/patterns`, `concepts`, `collections`, and `verses`; assets in `content/assets/photography`. The existing Markdown renderer now supports canonical photo assets and reuses the existing scrolling SVG treatment. `apps/web/src/lib/server/content-assets.ts` and the prerendered `/assets` route expose only intended file types. No new dependency or parallel content system.

Metadata, source notes and provenance are in `docs/pattern-packages/photography*.json` and the corresponding import/source-note documents. Native SVGs regenerate with `node scripts/build-photography-visuals.mjs`. Source license/capture limitations are recorded in captions and provenance; the original Xiph permission-text endpoint was unavailable, while its Commons record explicitly declares reviewed CC0 permission.

Discovery was performed at base commit `91a5b1dfda9ff5891c82f333e80e057510a2edac`. No AGENTS.md or matching photography articles were found. Actual schema/compiler support tags despite stale prose documentation. Rich recommendation fields remain in the established package sidecar, not unsupported frontmatter.

## Description and icon follow-up — 23 October 2026

Removed the A–G group overview and per-group counts from the parent collection's prose, plus the redundant count in its summary. Collection membership and navigation remain intact.

Added 30 explicitly authored, distinct concept graphics to the existing registry, following the saved 96-pixel abstract diagram specification. Each has an explanation tied to its pattern's mechanism. All 202 previously authored graphic records were preserved. Added photography coverage/uniqueness tests: 31 cases; together with the existing component and geometry/export checks, 38 focused icon tests pass. Artwork was inspected at 32, 48, and 96 pixels with no geometry extending outside the canvas. The production build and guard pass.

Verified all 30 graphic assignments through the seven group pages at desktop and mobile widths, with no overflow or browser errors. Desktop card icons are visible; the existing compact mobile list intentionally hides decorative marks. Refreshed the local preview after rebuilding so its asset manifest matches the new bundle. Review images/logs are in `/tmp/photography-transfer-import/` (`photography-icons.png`, `photo-icons-ui-1440.png`, and `icons-browser.log`).

## Example expansion — 25 October 2026

Completed all eight article examples and the three reference illustrations. The placements, complete captions, alt text and teaching reasons are recorded in `docs/pattern-packages/photography-example-expansion.json`.

| Article/reference          | Added example                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Find a Relationship        | Matching shop-window and carried umbrellas, followed by an exact tighter crop that loses the relationship       |
| Focus on What Matters      | Foreground fence versus the intended flower behind it                                                           |
| Expose for What Matters    | Window portrait prioritizing the face versus the outside view                                                   |
| Select the Strongest Frame | Enlarged real frames 11, 14 and 15 from the existing Ansel Adams contact sheet, with a stated selection purpose |
| Work the Scene             | Six ordinary cup views: wide, low, overhead, turned, detail and space                                           |
| Review One Thing at a Time | Annotated intended flower versus visibly sharp wire, then a clearer proposed next attempt                       |
| Use a Creative Constraint  | Brick, fruit, fabric and bicycle connected by one warm color family                                             |
| Choose Your Depth of Field | Gardener emphasized against a softer greenhouse versus more readable setting                                    |
| Foundations: focus         | Focus distance versus the surrounding range of acceptable sharpness                                             |
| Foundations: perspective   | Same-position zoom versus moving closer, using ideal projected shapes                                           |
| Foundations: white balance | The same cup pixels rendered warmer, unchanged and cooler                                                       |

The six new source illustrations were produced with the built-in image generation tool; exact prompts, source identities and rights are in the provenance file. Everyday focus, exposure and depth comparisons are explicitly labeled generated illustrations, alongside the retained real optical/exposure comparisons. They do not assert real matched captures, numerical settings or measured optical behavior. The enlarged archival candidates remain public-domain photographs. Review boxes are teaching annotations, not actual autofocus data. The white-balance comparison explicitly changes rendering, without claiming a calibrated neutral reference.

Seven native SVG examples have separate 360-pixel mobile layouts using the existing responsive renderer. Portrait candidates stack on phones, cup views reflow from three columns to two, and white-balance views stack. No renderer or general application layout changes were needed. `node scripts/build-photography-visuals.mjs` regenerates both the original layouts and new examples; `node scripts/build-photography-examples.mjs` regenerates the additions alone. Regeneration reproduced all 87 current manifest image assets byte-for-byte, including 28 unrelated statistics assets.

Verification: strict validation of 404 current entities passed; the production web build and public-build guard passed; Svelte reported zero errors and warnings; 44 focused content/renderer tests passed; changed code passed ESLint. Production-preview Chromium tests passed all 62 desktop/mobile cases. The review script checked all 30 articles and 11 reference/navigation routes at widths 1440, 390 and 320 (123 page checks), captured 94 figures at desktop/mobile widths, and served all 87 current manifest assets plus the required license text. There were no page errors, missing images or document overflow. Every added example was visually inspected at desktop and mobile widths. Figure-only review captures temporarily hide sticky navigation to expose the complete artwork; actual page checks retain it.

All previous photographic assets were preserved byte-for-byte, along with unrelated source work, the description cleanup and all photography graphics. The expansion remains uncommitted on `codex/photography-example-expansion`; nothing was pushed or published. There are no remaining blockers for this expansion. Physical-device and other-browser checks were outside this Chromium review. Earlier unrelated test failures above were not rerun and should not be presented as new failures. Logs, baseline hashes and browser captures are in `/tmp/photography-expansion-20261025/`.

## Light editorial illustration refresh — 31 October 2026

Updated all 29 photography SVG layouts (22 primary layouts and seven mobile companions) to the light editorial language shared with Architecture, Filmmaking and Machine Learning: fixed white backgrounds in either browser appearance, regular Helvetica Neue labels, fine charcoal and gray lines, muted surfaces and restrained green accents. Camera and lighting plans now use recognizable camera symbols, with a symbol-based lighting legend. The perspective diagram's closing labels have more separation.

Both photography generators import the same presentation helper, `scripts/photography-editorial-style.mjs`. Regeneration in an isolated copy reproduced every photography asset byte-for-byte. All 30 raster source files, embedded image elements, image filters, canvas dimensions and license text remain unchanged. All 59 provenance checksums match; the SVG provenance descriptions record the style treatment. Article prose, captions, placements, card graphics and photography manifest dimensions were preserved. Concurrent additions to the shared manifest were retained.

Verification: 48 focused photography/Markdown tests passed; changed scripts passed ESLint and Prettier. The full-profile production build and public-build guard passed. All 29 SVGs were rendered, captured and inspected across five contact sheets, including seven mobile companions. Browser measurements found no clipped or overlapping labels, regular Helvetica typography and white backgrounds in light and dark appearances. Another 26 representative article figures were captured in both appearances, with spot checks of the lighting, focus-range and phone photo layouts. A separate check with app scripts disabled passed all 117 page/viewport combinations (30 articles, foundations, verse and seven collections at 1440, 390 and 320 pixels), all 59 asset requests and the license check, with no missing images or document overflow.

The existing 62-case interactive photography suite failed: article pages report `Cannot read properties of undefined (reading 'data')` during app startup, and the navigation case cannot find its expected collection link. The startup error reproduces with the original pre-refresh SVGs as well as the new ones, through both the static test server and the standard Vite preview. This confirms that swapping the artwork does not resolve or introduce that error; this illustration task does not claim successful interactive regression coverage. The focused 48-test run is the relevant unit-test result; an accidentally broad test invocation was stopped and is not a completed suite result.

Dedicated GitButler branch: `codex/photography-light-editorial`. The refresh remains uncommitted; nothing was pushed or published. Baselines, reproduction copies, audit reports, screenshots and logs are in `/tmp/photography-light-editorial-20261031/`. Scope and verification are also recorded in `docs/pattern-packages/photography-illustration-style.json`.

## Startup fix follow-up — 31 October 2026

Production builds now use `.svelte-kit/production`, while development, type checks and Vitest retain `.svelte-kit`. The public build first seeds the normal TypeScript configuration so a clean checkout can build successfully. The preview command selects the same production cache as the build. This keeps server page options, route manifests and the browser startup identifier together when another SvelteKit command regenerates the development files.

The public-build guard now rejects HTML whose startup identifier does not match the browser bundle. A regression test covers mismatched identifiers, matching identifiers and missing client startup code. Nine build/guard/navigation tests and ESLint/Prettier checks passed. An isolated build starting without generated files passed while a second `svelte-kit sync` ran alongside it; the final HTML and client identifiers match, and the public-build guard passes.

All 62 photography browser checks now pass across desktop and phone. Article tests explicitly wait for an interactive control to become enabled, verifying successful hydration before checking responsive images. The navigation test now checks the current scoped-library destination and the phone collection accordion controls. The original startup failure and earlier failed browser runs above are historical results, not remaining blockers.

Changes are local and uncommitted on `codex/app-startup-data`; nothing was pushed or published. The isolated verified build and current logs are under `.local/app-startup-verification/`. The successful browser run is `browser-tests.log`; build and concurrent-sync output are `build.log` and `concurrent-sync.log`.
