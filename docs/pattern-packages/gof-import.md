# GoF article integration

Imported from `GoF-Patternverse-Articles.zip`, using **patterns.json only**. The individual JSON files are duplicate representations, and the HTML reading edition is not embedded. Inspection found no existing matching GoF titles or slugs. Existing content remains intact.

## Mapping

| Portable field                                      | Patternverse representation                                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| title, slug                                         | Canonical `title`, kebab-case `id`, existing `/pattern/<id>` route                                                    |
| short_description                                   | `summary`                                                                                                             |
| domain                                              | `verses: [software-engineering]` and new Software Engineering verse                                                   |
| collection                                          | GoF Design Patterns collection, in supplied order                                                                     |
| category                                            | Category tag and Creational, Structural, or Behavioral collection                                                     |
| tags                                                | Supplied tags, plus `gof-design-patterns`                                                                             |
| use_when, not_ideal_when, prerequisites, difficulty | Reading sections under “Pattern details”; also retained in metadata JSON                                              |
| related_patterns                                    | Canonical labels on resolved wiki links; title and ID lists retained in metadata                                      |
| article_markdown                                    | Full, unchanged prose through the existing Markdown renderer; diagram inserted before the first conceptual subsection |
| graphic                                             | Local SVG Markdown image with accessible description and caption; original and public paths retained in metadata      |
| example_user_queries                                | All 184 queries retained in `gof.json` for future recommendation integration                                          |
| source_reference                                    | Attribution and reference link in articles, full source metadata in `gof.json`                                        |
| practices                                           | Absent: no practice fences, records, or run actions                                                                   |

No schema extension or new dependency. `gof.json` is an authoring metadata sidecar, not a second content loader. Its article SHA-256 hashes were captured from the supplied export before the import; tests remove only the inserted diagram and added details, then check every original article byte-for-byte.

The existing full-text library indexes titles, summaries, tags, prose, collection names and verse names. There is no dedicated recommendation engine, so example queries are preserved separately rather than mixed into article text or misrepresented as AI recommendations.

## Diagrams

All 23 supplied diagrams retain their geometry, labels, explanatory descriptions and captions. Fonts and light colors match the application’s Inter/system stack and ink/white/mint/green palette. Self-contained dark-preference styles keep labels and arrows legible; the application currently has no separate site-wide dark-mode toggle.

The Markdown renderer presents local diagrams as safe figures. Images are separate SVG documents, so even repeated diagrams have isolated IDs; original per-pattern ID prefixes remain. On small screens, the diagram alone scrolls horizontally at its native 720px width, avoiding tiny labels and page-level overflow. The scroll region is named, keyboard-focusable, and accompanied by an instruction. Ordinary Markdown and HTML sanitization remain in use; no raw SVG or HTML from the package is injected into the page.

## Validation

`packages/compiler/test/gof-content.test.ts` checks 23 records, the 5/7/11 split, full article hashes, metadata, absent practices, category/verse membership, serialization, diagram assets and references. `apps/web/src/lib/server/gof-content.test.ts` checks all article renderings, accessible figures, resolved routes and existing search discovery. The Markdown renderer also tests repeated diagrams alongside its existing unsafe-HTML tests.

Validation completed:

- Content validation and compilation: 89 total entities, no diagnostics or unresolved references.
- All workspace package tests: 333 tests pass (including all 23 article hashes and renderings).
- Workspace type checks: pass; Svelte reports zero errors and zero warnings.
- Production web build and existing public-build credential/file checks: pass.
- All 23 built article pages, 23 SVG assets, related routes, four collection pages and Software Engineering page: verified in the static build.
- Changed TypeScript files: ESLint passes. Changed code and metadata documentation: formatting checks pass.
- Browser review: Factory Method, Adapter and Observer inspected at 1280px desktop and 390px mobile widths; images load, mobile page width remains 390px, and keyboard arrows scroll the diagram region. Library search, Software Engineering's 23-article group, category browsing and related navigation work. No preview console errors observed.

Repository-wide ESLint remains blocked by four pre-existing, unrelated errors: unused `busy` in `apps/web/src/lib/mira/native-voice-listener.ts`, unused `resolve` in `apps/web/src/routes/my/+page.svelte`, and undeclared worklet globals `AudioWorkletProcessor` / `registerProcessor` in `apps/web/static/voice-capture.js`. These files were not changed by this integration.

Local implementation only: not committed, pushed or published. Recommendation queries are preserved for future use; there is no recommendation engine to connect them to today.
