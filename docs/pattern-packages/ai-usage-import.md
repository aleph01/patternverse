# AI Usage import

The six supplied articles form **Thinking with Language Models** in the new **AI Usage** verse. Five are new records. “Expose the Decisive Unknown” is reconciled with `look-for-the-decisive-unknown`: its canonical title, URL, Decision Making membership, original prose, and six-step practice remain intact. The supplied AI-focused article becomes a section within that record, with its original subsection headings moved down one level. The supplied title is retained as an alias.

## Mapping and preservation

- Titles, kebab-case IDs, summaries, tags, and verse membership use existing frontmatter fields.
- The collection uses the existing `items` model; no new schema or loader is introduced.
- Full supplied prose, examples, prompts, and limitations are preserved. Source article headings become the application’s existing page titles, rather than duplicate headings in the body.
- Editorial “Visual decision” notes become six captioned, accessible local SVG diagrams, inserted near the opening conceptual explanation. The notes are retained in the metadata package, not displayed as public editorial instructions.
- Related patterns use existing wiki links with actual canonical IDs and short relationship explanations.
- `ai-usage.json` preserves the supplied article bodies and source titles, hashes, authoring metadata, diagram descriptions, and 48 newly authored recommendation queries. It is a metadata sidecar, not a second content import.
- The existing full-text library indexes the articles, verse, collection, and title alias. There is no dedicated recommendation engine; the queries are preserved for future use, not presented as connected recommendations.
- No practices are added. The existing Decisive Unknown practice is preserved rather than removed or duplicated.

## Visuals

The diagrams use restrained white/ink/mint/green colors and the application’s Inter/system font stack. Straight connectors and simple surfaces express the source’s six visual decisions. They reuse the established safe Markdown figure presentation: captions, descriptive alternative text, readable 720px native sizing, keyboard-focusable horizontal scrolling on small screens, and self-contained dark-preference styles. SVGs remain isolated image documents, with per-pattern IDs, so repeated diagrams cannot collide.

The five new feed marks use meaningful families from the existing minimal grammar. Existing mobile feed rules continue to hide decorative marks to preserve reading space. The private illustration studio stays private and automatically includes the new records in its catalogue.

## Validation

Compiler tests verify collection/verse membership, unique records, complete article hashes, real related links, eight queries per article, and diagram accessibility. Reconciliation tests compare the original Decisive Unknown body and practice against hashes captured before editing. Web tests cover existing article rendering, diagrams, resolved routes, title-alias search, domain/collection discovery, and icon families.

Completed checks:

- Content validation: 96 entities, no diagnostics or unresolved references.
- All workspace tests: 369 pass; three additional public-build guard tests pass.
- Workspace type checks: pass; Svelte reports zero errors and zero warnings.
- Production build and public-build credential/file checks: pass.
- Changed code: lint and formatting checks pass.
- Browser review: the verse contains six patterns; collection filtering and the reconciled title alias work in the library. All six diagrams load. Desktop feed marks are visible; mobile marks are hidden. Article and collection pages stay within 390px and 320px widths, and diagrams remain separately scrollable. The original Decisive Unknown practice action still points to its existing route. No browser console errors were observed.

Repository-wide lint still reports four pre-existing, unrelated errors: unused `busy` in `apps/web/src/lib/mira/native-voice-listener.ts`, unused `resolve` in `apps/web/src/routes/my/+page.svelte`, and undeclared `AudioWorkletProcessor` / `registerProcessor` globals in `apps/web/static/voice-capture.js`. Those files were not changed here.

This is a local content integration, not a publication or deployment.
