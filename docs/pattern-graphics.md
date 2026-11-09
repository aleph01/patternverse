# Pattern concept graphics

The library uses authored abstract concept diagrams in the approved first-pass style. The current collection covers all 179 patterns. Cards, lists, collection previews, daily selections, and article headers use the same renderer and lookup. Existing mobile visibility rules remain in place.

## Design specification

Use a transparent 96 × 96 canvas, crisp flat geometry, generous negative space, and consistent visual weight. Dark ink (`#181814`) leads, gray (`#898983`) supports, and one accent hue—green (`#05ce78`) or purple (`#7259b8`)—identifies the focal relationship. Supporting connectors are usually 5–6 units wide. Review at 32, 48, and 96 px.

Read the article and identify its central mechanism. Express that mechanism through spatial relationships: branching, connection, separation, containment, repetition, hierarchy, comparison, perspective, and other concept-specific arrangements. Explain the mapping in one sentence. General patterns should remain general; do not restrict them to a particular article example.

The six approved first-pass studies anchor the collection: Find Alternative Paths, Second-order Thinking, Separate Observation/Meaning/Action, Connection Circles, Drill the Bottleneck, and Look Outside the Frame. Their geometry and accents are retained. Literal objects, characters, and scenes from the expressive second pass are excluded. Do not add decorative detail, embedded text, gradients, shadows, texture, backgrounds, or stock metaphors.

## Authoring and future revisions

The reusable AI authoring prompt is `apps/web/src/lib/illustrations/pattern-graphic-specification.ts`. Supply that prompt, the pattern article, its summary, and the six reference graphics. Have the AI propose a composition and explain what each part—including the accent—means. Review the finished result alongside the collection before saving it.

`apps/web/src/lib/illustrations/pattern-graphics.json` holds every explicit authoring decision: pattern ID, title, central mechanism, visual relationship, explanation, and vector paths. Output paths with `d`, `fill`, and optional `stroke`, `strokeWidth`, `linecap`, and `linejoin`. Paints use the four palette tokens, plus `none` for transparent fills. Convert circles and rectangles into paths. The renderer never injects SVG markup, executes generated code, infers a design from a title, or chooses seeded variations. Direction and accent placement are meaningful; do not rotate, reflect, or recolor randomly.

For a new pattern, add a deliberate graphic and its brief. Coverage tests identify missing records and summaries that have changed since their visual brief was written. Unknown/private IDs share an unassigned neutral mark until artwork is authored. Renaming or moving a pattern does not alter its saved geometry.

## Review and export

Run `pnpm studio`; the default **Pattern graphics** tab shows the full authored catalog. Search titles and meanings, filter by visual relationship, preview light/dark surfaces at different sizes, and export a selected SVG, its authoring brief, or the entire collection. Exports use the same paths as the application. The studio is local and remains excluded from public builds.

To export the complete set of portable transparent SVGs, registry, specification, and a standalone review gallery:

```sh
node --experimental-strip-types scripts/export-pattern-graphics.mjs
```

The default destination is `.local/pattern-graphics`; an optional first argument selects another directory. SVG exports bake the palette values for use in other tools. The application uses CSS color tokens for dark surfaces.

## Compatibility

Earlier nine-cell models, saved projects, browser storage, and override registries are preserved for recovery in the **Archived grid tool**. These recipes no longer choose public graphics. `defaultPatternMark` remains a legacy recipe API; `patternIconForPattern` resolves the authored concept collection. Explicit legacy models still render at their original 72-unit view box. The Patternverse and Mira logos and large article illustrations are unchanged.
