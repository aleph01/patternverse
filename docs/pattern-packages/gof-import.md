# GoF illustrated field guide

The GoF collection contains all 23 canonical patterns in alphabetical order. Each article follows the approved software pattern outline: Purpose and problem, Core idea, How it works, Worked example, When to use it, Tradeoffs and common mistakes, Related patterns, and Sources.

The 28 October 2026 editorial revision reorganizes the existing educational explanations, preserves their developed examples and qualifications, and adds a complete Python teaching example to each article. Strategy follows the reviewed pilot. Articles are reading references; no guided practices are attached.

## Collection and relationships

`content/collections/gof-design-patterns.md` is the only GoF collection. The former Creational, Structural, and Behavioral collections and their article category labels and tags have been removed. Individual pattern IDs and routes remain stable. The existing entity route redirects all three retired collection URLs to the consolidated collection, including in static prerendering.

`gof.json` retains each pattern's recommendation queries, applicability metadata, difficulty, prerequisites, resolved neighbors, and source attribution. Current article hashes cover the complete revised Markdown body. Historical import hashes and graphic metadata live under `original_import`; the source snapshot in `gof-original-articles.json` preserves the original text for provenance and reproducibility. Neither file is a second public content loader.

## Illustrations

The collection has 24 explanatory figures: one per pattern, with two for Strategy. Each has a separately composed phone version, giving 48 SVG assets under `content/assets/software-engineering/gof/`. They use the approved light editorial direction: a fixed white surface, regular Helvetica Neue, restrained green mechanism accents, gray context, square boundaries, and explicit relationship labels. Accessible descriptions and captions explain the collaboration rather than decorate the article.

The existing article asset manifest supplies intrinsic dimensions and responsive phone sources. The former `/diagrams/gof/<id>.svg` URLs retain current drawings for compatibility with older article revisions. Small card and header concept marks use the existing graphics registry.

`gof-editorial-visuals.mjs` contains the authored visual compositions. `gof-examples.mjs` contains the original executable examples and behavior checks. `build-gof-editorial.mjs` rebuilds the articles, figures, metadata, and collection from the retained original source and the approved Strategy pilot. It preserves other entries in the shared image manifest.

Run `node scripts/validate-gof-examples.mjs` to execute every published article example with its behavior assertions using Python's standard library.

## Code presentation

The normal safe Markdown renderer highlights declared code languages using the directly declared `@speed-highlight/core` dependency. Highlighting adds generated token spans after sanitization; source text remains literal and copyable. Unknown languages remain plain code. Highlighted blocks use the same light colors as the pilot and support keyboard-accessible horizontal scrolling.

## Validation

The compiler checks the 23 canonical records, alphabetical collection, eight-section outline, revised body hashes, retained recommendation queries, resolved neighbors, absent practices, and both SVG variants. Web tests check article outlines, highlighted code text preservation, responsive accessible figures, search, navigation, and retired collection redirects. Markdown tests cover literal markup inside code and unknown languages.

Browser review checks all articles at desktop and phone widths, rendered code, responsive image selection, collection membership, and legacy routes. Illustration review measures text bounds and overlaps and inspects contact sheets for every variant. Python examples run independently with behavior assertions.

## Original import

The original import used `patterns.json` from `GoF-Patternverse-Articles.zip`; individual JSON files were duplicate representations, and the HTML reading edition was not embedded. The 2026 editorial revision supersedes the old import's byte-for-byte public article preservation requirement while retaining its provenance.
