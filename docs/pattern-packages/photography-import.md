# Photography collection integration

Thirty substantial beginner articles, a compact foundations Concept, a Photography Verse,
seven ordered topic Collections, a parent Collection, and an eight-pattern reading path use
the existing Commons content and navigation systems. No matching photography records existed
at the inspected base commit, so no established identities were replaced. No guided practices
were added.

Canonical articles remain under `content/patterns/`. Frontmatter uses only the actual V1 schema:
ID, type, title, summary, published status, Verse membership and tags. Related patterns use
resolved wiki links. Collection `items` preserve the requested group and reading order.

`photography.json` follows the repository's existing authoring-package convention. It records
use cases, goals, mechanisms, beginner difficulty, prerequisites, related IDs, eight natural
language recommendation queries per article, visual references, and hashes of the compiler's
trimmed article bodies. Rich fields are not added to strict frontmatter. The existing lexical
search indexes canonical articles, titles, summaries, tags, and relationship names. The 240
queries are authoring/recommendation metadata; no new recommendation service is implied.

## Assets and reading

All delivered visuals live in `content/assets/photography/`, following CONTRIBUTING. An image
dimension manifest reserves their intrinsic proportions. A narrowly scoped prerendered asset
route serves these files and the complete GFDL 1.2 license. It accepts intended lowercase local
paths and known extensions; JSON manifests and arbitrary filesystem paths are not exposed.

The existing sanitized Markdown renderer now recognizes relative canonical asset images.
Photographs keep natural colors, descriptive alternatives, selectable captions, lazy loading,
intrinsic dimensions, and full-size links. SVG comparisons and setup diagrams reuse the
existing keyboard-accessible horizontal scrolling treatment on narrow screens. No raw article
HTML, new dependency, parallel content loader, or new theme is introduced.

`photography-provenance.json` records every delivered visual's creator, rights, source or
generation prompt, teaching purpose, modifications and checksum. `photography-derived-visuals.json`
records native SVG dependencies. Generate those SVGs with:

```sh
node scripts/build-photography-visuals.mjs
```

The script embeds each reused photograph once per SVG, preserves editable labels/crops/filters,
includes source attribution and rights inside downloadable SVG metadata, and updates asset
checksums. Source photographs retain their own licenses; generated examples are identified
as illustrations rather than records of measured settings or real events.

## Evidence and limitations

- Real source photographs demonstrate focus distance, aperture, shutter appearance and exposure.
  Only source-reported settings are used. The waterfall series changes other settings too,
  and that limitation appears in its caption; the native source resolution is modest.
- The held-frame example extracts real video frames at 4, 5 and 6 seconds, explicitly credited
  as video frames. The action-selection example uses Tony Alter's genuine skateboard sequence.
- Archival contact sheets support iteration, gesture, selection and storytelling. Their captions
  do not claim knowledge of posing instructions, comfort, a photographer's intention, or exact
  exposure timestamps. The portrait activity comparison is observational, not a controlled
  experiment establishing that a suggestion caused a smile.
- The return series is genuine, but viewpoint/framing vary as well as season and illumination.
- Wikimedia file pages and saved source wikitext supplied explicit license declarations and
  original-source/creator descriptions. The pedestrian clip's Commons record explicitly declares
  CC0 and external-source license review, with an original Xiph permission-text URL. That original
  text endpoint could not be retrieved during this session; no claim of having read it is made.

See [source notes](photography-source-notes.md) for technical verification and
[progress](../photography-progress.md) for the current checks and any unfinished verification.
