# Data Visualization collection

The collection contains 38 articles, beginning with the `dataviz-sort-to-reveal-order` prototype. Keep articles visual-led, with approximately 150–250 words excluding widget configuration and source references. This concise format takes precedence over the longer field-guide structure used by other collections.

Use one opening sentence for the core idea, then the main visual, followed by these shared sections:

1. What to notice
2. Useful when
3. Watch out for
4. Related patterns
5. Sources

Each example should teach one main idea. Controlled comparisons retain their observations, scale, and visual identity while changing the relevant design choice. Include an equivalent text account, keyboard-operable controls, and inspectable data. Do not add a guided practice automatically.

## Collection organization

The main collection contains seven subject collections, with every pattern assigned to exactly one primary home:

- Comparison & Scale (8)
- Distributions & Relationships (6)
- Time & Change (8)
- Composition & Structure (4)
- Visual Explanation & Accessibility (5)
- Evidence & Uncertainty (3)
- Interactive Exploration (4)

Definitions and ordered memberships are recorded in `data-visualization.json` under `collections`. Collection descriptions contain short orientation prose without repeating item links; the existing collection cards supply navigation. Article cross-links remain available for neighboring ideas across groups.

## Observable Plot example

Editable inputs live in `apps/web/src/lib/article-widgets/dataviz/`. The original example uses `sort-order-data.ts`, `sort-order.ts`, and `sort-order.html`. The remaining 17 use `lesson-manifest.ts` for the available controls, `lesson-data.ts` for recorded fixtures and calculations, `lesson-plots.ts` for the Plot views, and `lesson-explorer.ts` / `lesson.html` for the shared accessible frame. Rebuild all self-contained local widgets with:

```sh
pnpm --filter @patternverse/web build:dataviz-widgets
```

The builder uses Vite to bundle the pinned Observable Plot dependency, includes dependency license notices, and rejects output above the 512,000-character widget limit. The loader and isolated host use the same bound, increased from 256,000 to accommodate the locally bundled library. The generated HTML belongs in `content/assets/widgets/`; do not edit its bundled JavaScript directly.

The existing article-widget host isolates the example and blocks network and application access. Bundled `dataviz-` examples load automatically and use the existing content-size handshake; statistics and filmmaking examples retain their current launch behavior. The same HTML includes a text description and table, and works without external scripts, data requests, or fonts. Inline MCP articles retain the normal readable fallback.

The example uses eight fictional category counts totaling 525 tickets. Alphabetical and descending orders use the same zero-to-140 horizontal domain. Equal counts are ordered alphabetically. No animation or new data is introduced by a mode change.

Recommendation metadata is recorded in `data-visualization.json`, outside the article schema.

## Initial collection examples

The 17 additional lessons cover shared axes, operational references, paired changes, distributions, individual cases, quantitative associations, elapsed time, counts and shares, small multiples, color roles, highlighting, direct labels, uncertainty, missingness, sample coverage, redundant coding, and equivalent text accounts. Each lesson uses the agreed five sections, links to neighboring patterns, 8–10 natural-language recommendation queries, primary sources, and a locally bundled Plot example.

All recorded fixtures are fictional and deterministic. Display modes preserve the recorded tables; Color Roles explicitly changes which kind of variable is being illustrated. The uncertainty example computes Wilson 95% intervals for independent binomial counts using z = 1.959963984540054. It does not measure coverage, correct sampling bias, or treat interval overlap as a test. The missing-data lesson preserves a null in the recorded table even when demonstrating the deliberately incorrect zero-fill view. Vertical dot offsets separate duplicate observations; they are not measurements. Grayscale is a reproduction check rather than a general color-vision simulation.

The common bundle is built once and embedded into each inert HTML asset with its dependency notices. Each article loads only its referenced widget. Fixtures and controls use no external data, fonts, or scripts. All datasets are available as tables, controls are keyboard operable, and the same numeric-only sizing handshake handles expanded details and multiple panels.

## Next twenty examples

The expansion adds exposure rates, indexed growth, overlap resolution, group conditioning, raw observations with smoothing, reconciled changes, logarithmic scales, cumulative distributions, event and cohort alignment, repeating cycles, duration, geography, intersections, hierarchies, state transitions, overview/detail, filtering, details, and linked selection.

The expansion uses `expansion-manifest.ts`, `expansion-data.ts`, `expansion-plots.ts`, and `expansion-explorer.ts`. It reuses the accessible HTML frame and builder, with a separate shared bundle to keep the initial examples stable and every asset below the size bound. Articles retain the same five sections and 150–250-word format; recommendation queries and sources live with the original metadata.

All observations are deterministic and fictional. Normalization exposes the denominator; indexing retains original values. Display jitter uses fixed offsets. Moving averages use complete centered windows. Cumulative thresholds include equality and ties. The island is a clearly labeled planar schematic, with rates and equal-area fictional districts. Intersection columns are exact exclusive memberships; transition cells preserve matched people at two snapshots.

Filters retain the recorded table, fixed domains, active criteria, sample size, and explicit empty results. Details provide persistent case selection alongside Plot tooltips. Linked brushing is implemented around Plot with pointer events and equivalent hour sliders; it replaces the selection and highlights the same case IDs in both views. Drag cancellation leaves the previous selection intact. Controls and text accounts work without hovering. The overview uses a six-month window slider and shares its value domain with detail.

## Verification

Focused tests cover the arithmetic, actual generated bundles and controls, static article structure, references, metadata, table invariance, threshold ties, empty filters, persistent details, and linked identities. Browser checks exercise all 38 lessons on desktop and phone, label bounds, controls, tables, reset, isolation, offline reload, and actual pointer brushing. Build and validation results are reported with each change rather than retained as a timeless pass count here.
