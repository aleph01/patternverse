# Filmmaking collection

The Filmmaking verse contains **How Did They Do That? — Patterns of Screen Illusion**:
49 articles in six collections, with 110 captioned image placements. The original
illustrated collection was imported on 26 October 2026. The import preserved its article wording,
examples, captions, credits, and source links; page titles moved into
frontmatter, section labels became native headings, and cross-article links use
the website's article routes.

- Verse: `filmmaking`
- Main collection: `patterns-of-screen-illusion`
- Article IDs: `film-` followed by the original article slug
- Group collections: `filmmaking-` followed by the category slug

The six groups cover scale and sets; lenses and optical effects; time, movement,
and editing; stunts and physical effects; light and atmosphere; and digital crowds
and character transformation. Negative Fill belongs to light and atmosphere.

Images remain on their original publishers' HTTPS servers. Each caption retains
its source link and credit; no remote images were downloaded or repackaged. Text
can be read offline after downloading the library, while these images require
access to their original hosts.

The imported source and image inventory are recorded in
`.local/releases/business-film-navigation-2026-10-26/film-inventory.json`.
The original collection is retained in the film chat's visualization directory.

## Light editorial illustrations

The collection’s 51 conceptual drawings are connected to all 49 canonical articles.
They use the approved light editorial style: a white background, Helvetica Neue
regular throughout, fine outlines, quiet gray context, restrained mint fields and
green emphasis. Cutaways explain construction and concealed mechanisms; overhead
plans explain camera positions, optical paths and lighting. Sections, frame
comparisons, editing sequences and process diagrams remain where they explain the
relationship more clearly. Human figures use filled silhouettes or overhead symbols.

The original references were Site Repair, Arcades, Window Place and Shearing
Layers. The approved film-specific direction was refined through Mirror Gags,
Wild Walls, Forced Perspective and Negative Fill. Illustrations deliberately retain
their white background in every browser appearance. Each has a compact companion
selected by the existing responsive article renderer; fuller explanations belong
in the figure caption.

- Editable compositions: `scripts/film-editorial-visuals.mjs`
- Approved spatial compositions: `scripts/film-spatial-visuals.mjs`
- Additional cutaways and precision plans: `scripts/film-precision-visuals.mjs`
- Build and article integration: `node scripts/build-film-visuals.mjs`
- Captions, alternative text, section anchors and inventory:
  `docs/pattern-packages/film-illustrations.json`
- Assets: `content/assets/filmmaking/` (51 originals and 51 compact companions)
- Reading-pipeline coverage: `apps/web/src/lib/server/filmmaking-content.test.ts`
- Review evidence: `docs/pattern-packages/film-illustration-review.json`

These are explanatory scenarios, not reconstructed production plans. The added
figures explicitly say so. The illustration pass retained the original prose, headings, frontmatter,
relationships, photographs, film stills, source links and attribution. The later
readability edits are described below.
No guided practices were added. The earlier standalone companion collection is
retained as an archive; the repository articles are the local-preview source.

## Readability pass — 27 October 2026

The readability audit led to targeted edits across all 49 articles. Strong core
explanations remain; image groups now accompany the relevant film example,
necessary terms receive local explanations, and actual subsections appear in
Contents. All 253 pre-existing section targets, canonical IDs, frontmatter,
external references and credit lines are preserved. Named neighboring articles
now link to the canonical article routes.

All 110 publisher-hosted image placements have content-specific alternative text.
The film-only Markdown image/caption pairs render as semantic figures, with a
smaller caption and a separate credit line. URLs and attributions remain with the
images. Availability still depends on the publisher: some fxguide images did not
load during the local browser review, and were not downloaded or replaced.

All 51 explanatory captions now explain the causal relationship instead of
repeating the alternative text. Motion Control, Bullet Time, Matchmoving,
Slit-scan and HDR Capture have revised drawings that separate camera count,
viewpoint, exposure timing and recorded frames. Additional labels clarify camera
mapping, dolly zoom, negative fill and probe lenses. The white editorial style and
responsive companions remain in use.

Twelve user-controlled studies make movement visible: Dolly Zoom, Reverse Motion,
Slit-scan, Hidden Cuts, Bullet Time, Rotating Sets, Body-mounted Cameras, Gimbals,
Procedural Crowds, Cheated Contact, Creative Geography and Bleach Bypass. The last
is a contrast/color comparison, not a chemical simulation. These are explicitly
invented explanations, not film footage, stunt instructions or guided practices.
They start paused, provide a keyboard-operable slider and reset, and stop when
hidden. Existing publisher/creator footage links have concrete viewing cues where
useful; no film excerpts were downloaded or republished.

- Readability drawing revisions: `scripts/film-readable-visuals.mjs`
- Motion-study generator: `node scripts/build-film-motion-studies.mjs`
- Study sources: `content/assets/widgets/film-*.html`
- Existing sandbox and loading controls: `apps/web/src/lib/article-widgets/`
- Scope and verification: `docs/pattern-packages/film-readability-review.json`

### Editorial standard

Open with a visible puzzle and the problem it solves. Reveal the reusable trick
early, then explain its steps in the order a newcomer needs them. Introduce a
necessary technical term immediately after its plain explanation. Give each film
example a navigable heading and distinguish documented methods from invented
scenarios. Place each image beside the claim it supports; describe its relevant
content in alt text and explain what to notice in the caption. Use optional,
user-controlled motion when stills cannot explain timing. Link neighboring
techniques and state the difference that matters. Preserve uncertainty and the
limits of what a photograph can prove.
