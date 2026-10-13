# Personal pattern-icon studio

Double-click `launchers/Open Pattern Mark Studio.command` to open http://127.0.0.1:4202. Alternatively, run `pnpm studio` and open http://127.0.0.1:4201. Restart an older studio server to load the new grammar. This is a separate loopback-only development application, never a public route. Large editorial illustrations remain in the second tab; they are not small pattern icons.

## Review and author

The six-state primitive legend, ten annotated family examples, 100 sample slugs and all real library patterns are visible in the studio. Inspect 16, 24, 32, 48, 64 and 96 px sizes, filter the gallery by family, and test a dark surface. Choose a pattern and keep its automatic slug-derived family, or deliberately select a family hint, variation and right-angle orientation.

**Keep this icon** stores a portable recipe locally; export a JSON project for backup. Imports merge new IDs and preserve matching saved entries. **Export SVG** uses the same exact geometry as the application, with escaped accessible text and a transparent default background. **Apply to local library** updates only kept recipes for existing public patterns in `apps/web/src/lib/illustrations/pattern-icon-overrides.json`, preserving unrelated entries. It never publishes. Custom identities can be exported, but cannot be applied to nonexistent public records.

Older `pattern-mark-overrides.json` and `patternverse.personal-marks.v1` browser storage remain untouched. Importing an old version-1 project explicitly converts identity, variation and orientation into new version-2 recipes; old freeform shapes and semantic relationships are not reproduced. New storage is `patternverse.personal-icons.v1`. Recipe project version 2 and geometry generator version 1 are separate.

## Architecture and exact grammar

- `pattern-icons.ts`: pure seeded generation, serializable nine-cell model, composition families, scoring, dihedral transforms, similarity and bounded memoization.
- `pattern-icon-svg.ts`: SVG geometry/export, separate from generation.
- `PatternIcon.svelte`: reusable accessible renderer, explicit slug or pre-generated model; no IDs, injected markup or labels inside the icon.
- `pattern-icons.css`: primary/secondary/green/purple tokens using existing ink, green and verse-purple; override locally for dark surfaces. Standalone SVG exports bake their fallback values for portability.
- `pattern-marks.ts`: strictly validated studio recipes and explicit legacy import.
- `pattern-mark-presets.ts`: slug-only application defaults and approved recipe overrides.

Each icon occupies an invisible seamless 3×3 grid on a 72-unit canvas. Each 24-unit cell is empty, a square, or an exact quarter disk centered at TL/TR/BR/BL with radius 24. The primitive path is `M0 0 H24 A24 24 0 0 1 0 24 Z`. The renderer computes its exact corner orientations and absolute coordinates, combining same-colored contours into one fill to avoid internal antialias hairlines; no shapes are enlarged or approximated. Larger curves emerge only from adjacent quarter cells. No standalone circles, semicircles, lines, triangles, diamonds, arbitrary freeform paths, gaps, background tiles, gradients or shadows.

Occupancy is 3–7 cells, squares 0–2. Primary is black, supporting gray occupies 0–2 cells. Green is the usual accent; roughly one fifth of identities use the existing verse-purple (`#7259b8`) instead. The shared accent budget is usually one cell, occasionally zero, occasionally two same-colored cells touching through a full shared edge. Purple replaces the accent rather than adding visual noise. At least one primary cell remains. Connectivity counts full shared edges, not corner contact; the selected icon has at least 60% in its largest connected component.

The ten families are Flow, Converge, Diverge, Enclose, Bridge, Rhythm, Anchor, Contrast, Balance and FigureGround. A small extensible table supplies starting layouts; seeded bounded edits, rotations, reflections and color assignments produce 48 candidates. Weighted scoring favors connectivity (4), family gesture (2), coherence (1.5), simplicity (1), negative space (1), color hierarchy (1) and controlled asymmetry (0.5). Hard density/color constraints are separate from scoring.

Identity is NFC-normalized, hashed and combined with generator version, optional family hint and variation. Generation never uses title meaning, AI, runtime randomness, catalog order or previous selections. Version 1 is frozen as the initial grid grammar; intentional future output changes require a new version.

## Integration, privacy and limitations

Library cards, lists, collection/verse browsing and pattern article headers share the renderer. Icons are hidden on mobile (feed at 800 px, article header at 768 px) and feed items have no Save/Preview actions. Editorial diagrams and the Patternverse/Mira logos are intentionally unchanged.

Similarity returns 0–1, comparing geometry (65%), occupied overlap (25%) and semantic color (10%), maximized across rotations/reflections. Saved-icon warnings use 0.86. This is a review aid: the small grammar can repeat, and there is no expensive catalog-wide collision resolution or universal uniqueness guarantee. The exported candidate and similarity APIs provide the extension point for future collision-aware selection.

Private studio assets, gallery, browser storage and catalog/write endpoints are excluded from public output. The local apply endpoint checks loopback host, same origin, per-server token, bounded whitelisted JSON and known public IDs, serializes updates and writes only the fixed registry. The build checker rejects private studio signatures.

Validation covers deterministic/versioned output, exact arcs and transforms, all family constraints, several hundred slugs' diversity, rotation/reflection/color similarity, accessibility, portable import/export, legacy recovery, private registry merges and desktop/mobile integration.
