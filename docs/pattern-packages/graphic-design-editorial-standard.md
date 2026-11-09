# Graphic Design editorial standard

## Scope and current state

The working inventory contains 58 candidates in eight families, retaining Test in Grayscale
under Color & Tone and Use Silhouettes under Imagery & Visual Form. The ordered inventory and
draft metadata live in `graphic-design.json`. A planned entry is an article boundary, not a
claim that an article has been written or validated.

The first authored draft is `graphic-design-use-scale-to-establish-importance`. Its three
original photographic comparisons are embedded directly in the canonical article. The verse,
parent collection, first family collection, and article all use `status: draft`; they are
excluded from the production corpus. Other family collections will be added when they contain
authored articles, rather than creating empty navigation destinations.

## Article standard

Write a substantial illustrated field-guide article, normally about 800–1,500 words, allowing
more space when examples earn it. Follow the material's natural structure rather than enforcing
the same headings everywhere. Each article must provide:

1. A recognizable design problem, audience, and intended communication outcome.
2. The core principle and a clear account of why the intervention could help.
3. At least three developed examples, normally across different media or tasks when relevant.
4. At least two explicit anti-pattern transformations, preferably three when they teach
   different failure modes, each following before → diagnosis → changes → after → explanation.
5. A visible comparison wherever the relevant difference is visual, with meaningful alternative
   text and a caption naming what changed and what stayed constant.
6. Tradeoffs, overapplication, and at least one circumstance where the apparent anti-pattern
   could be appropriate; avoid turning a contextual choice into a universal prohibition.
7. Neighboring concepts and source notes that distinguish sourced guidance from original
   examples, interpretation, and untested predictions.

Examples should contain actual material: readable poster copy, plausible report values,
specific photographs or shapes, or complete typographic passages. Explain the visible result,
not merely a designer deciding to apply the pattern. Repeated examples should reveal different
decisions rather than swap only the subject names.

An anti-pattern means a choice that works against the stated purpose, not a style the author
dislikes. Diagnose an observable consequence, such as difficulty locating a date or confusing
group membership. Name the intervention precisely and explain why it addresses that consequence.
Do not claim improvements were measured unless they actually were.

## Visual standard

Use finished, photo-led designs as the default visual direction, following the selected option 3:
plausible commissioned posters, promotions, reports, and other artifacts with photographic imagery
and realistic print presentation. Keep the photographic images and precise typography in separate
layers so comparisons can change the intended design variable without regenerating the scene.
Accessible native SVG can contain the shared photographic artwork and editable type; diagrams
remain useful when their abstraction teaches the mechanism better. Keep sources and rights explicit.

For scale comparisons, reuse identical photographic image bytes, crop, paper, lighting, copy,
colors, typefaces, weights, alignment, and anchors across both variants. Change only the specified
font sizes or graphic scaling around fixed centers. Check the saved files, rather than relying
on an image-generation prompt to preserve these invariants. Clearly disclose generated imagery.

Store local assets under `content/assets/graphic-design/`, use relative Markdown image paths,
and include a title caption so the existing article renderer provides a full-size link and
scrollable diagram treatment. Register intrinsic dimensions in the existing asset manifest.
Inspect desktop and narrow displays; provide a compact or stacked version when the normal
comparison becomes difficult to read.

Teaching comparisons may use a fixed paper-and-ink treatment when their colors are part of
the example. Concept marks use the existing application's tokenized graphic system.

## Metadata and navigation

Use only supported canonical frontmatter fields. Rich recommendation metadata and roughly
8–15 natural-language queries per completed article belong in `graphic-design.json`, following
the existing authoring-package convention; do not invent frontmatter fields or a new service.

Use `graphic-design-` IDs to avoid collisions with existing photography or writing patterns.
Link only to entities that actually exist. Candidate names may appear as plain text until
their articles have been authored. Keep articles separate from optional guided practices.

## Review before a draft is ready

- The central intervention is distinct from its neighboring inventory entries.
- The examples are concrete, internally consistent, and visually inspectable.
- Each transformation connects a specific failure to specific changes and reasoning.
- Supporting details remain readable; color alone does not carry required annotations.
- Sources support the claims attached to them; fictional material is identified as such.
- Content validation resolves the article, verse, collection, and assets.
- Production compilation excludes the draft. Publication is a separate release decision.

Do not fill the verse with article stubs to satisfy the candidate count. Expand families in
coherent batches and preserve this example depth throughout.
