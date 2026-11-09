# Shared music player implementation

Local draft implementation · 29 October 2026

## Available now

The existing `MusicPlayer.svelte` is extended in place, including its use by the chord editor. It supports a shared piano roll and musical notation, plus an editable drum grid for authored percussion examples. Changing views keeps playback running at the same position. Named comparison versions preserve position, and an edited drum version can be restored. Existing loop/restart, bar paging, and pitched-part instrument/isolating controls remain available. Redundant percussion on/off switches are removed from the reader. The original tempo is retained; no general playback sliders were added.

The selector includes four new original teaching examples: syncopation, swing, 3:2 polyrhythm and melodic sequence. Syncopation, swing and motif-development articles open the relevant new example. Existing foundation and chord-editor bindings remain intact.

## Recorded piano and reader controls

Piano now plays real Salamander Grand Piano recordings by Alexander Holm (Yamaha C5), self-hosted under CC BY 3.0. The compact Tone.js MP3 distribution supplies 30 sampled pitches across A0–C8, totaling about 2 MB. Files are copied unchanged from a pinned upstream revision; attribution, license, upstream notes and per-file hashes live beside them in `apps/web/static/audio/piano/salamander/`.

The player loads only required piano pitches after Play, reuses downloads, and decodes per audio context. Nearby notes use small playback-rate changes. The bank has one recording per sampled pitch, not the full multi-velocity SFZ instrument. A short release preserves the recorded decay at note-off. Guitar, bass and percussion retain their existing synthesized sounds. Sample errors offer retry rather than falling back to a synthetic piano, and pending loads cannot start playback after disposal.

The reader has no Open MIDI upload/control and no Kick/Snare/Hi-hat on/off row. Drum examples retain A/B comparison, step editing, Play, Loop and the three musical views. Pitched-part controls remain useful for melody/harmony examples. The small piano credit links to the bundled attribution/license details.

## MIDI authoring

`importMidi` remains an authoring conversion function through `@tonejs/midi`; it is not exposed as a reader-facing file picker. Track/channel identity, note timing, duration and velocity, tempo changes, meter changes and sustain are retained in the normalized example. Common percussion maps to authored sounds; unsupported controllers and rendering approximations are recorded as notices.

The adapter limits files to 1 MB, 20,000 notes, 32 parts/percussion lanes and 4,096 quarter-note beats, with bounded tempo/meter values. Invalid files, format-2 sequences and SMPTE timing are rejected. No popular-song MIDI files have been distributed with the library; curated repertoire still needs its musical/source review.

## Views and time

The example model uses quarter-note positions independently of time signature. The transport integrates tempo maps, including across loops, and measure navigation follows the numerator/denominator and meter changes. The piano roll preserves the imported timing. Notation uses VexFlow, loaded only when requested, with a separate quantized rhythmic guide, explicit accidentals, rests, ties, tuplets and staff/voice separation. Parts share tick contexts so simultaneous notes align vertically. A shared cursor follows their union of event positions.

Notation for imported MIDI is labeled as an unreviewed guide. MIDI does not establish enharmonic spelling, intentional articulation or voice assignment. Up to eight enabled parts and four written voices per part are supported; unusually complex notation reports its limit and leaves the exact piano roll available. Author-reviewed score annotation remains a future improvement.

Timbre, space, vocal-performance and recorded-loop comparisons remain future audio-source work from the example map. This implementation plays note/percussion data; it does not claim those mechanisms can be demonstrated by MIDI alone.

## Authoring interface

```svelte
<MusicPlayer examples={articleExamples} initial="my-example" />
```

An article can provide a focused set of `MusicExample` records rather than the full example selector. The legacy `initial` and reactive `customExample` interface used by the chord editor remains supported. Replace example objects when updating their data.

`model.ts` defines the format. In addition to the existing note/harmony fields, an example can declare:

- `tracks`: stable IDs, reader-facing labels, pitched instruments or percussion sounds.
- `variants`: named versions with their notes, listening cue and optional aligned harmony. Versions share the example's duration and tempo/meter map.
- `tempos` and `meters`: changes at quarter-note positions.
- `defaultView`: beat grid, piano roll or notation.
- `source` and `notices`: a clear source label and relevant rendering limitations.

`importMidi` is also a reusable conversion function for a later curated import pipeline. It accepts bytes and a filename and returns a `MusicExample`; adding a file to a public collection still requires its separate musical and source review.

The four authored comparisons live in `composition-examples.ts`. Pitched course examples remain in `examples.ts`. The sound transport reuses the existing Web Audio scheduling and instrument code, with percussion supplied by `percussion.ts`.

## Review and validation

The isolated draft preview supports `SONGWRITING_PREVIEW_PORT`; its default remains 5181. The review started for this work uses port 5196 and does not change publication state.

Validation includes 100 focused music/content unit tests and 28 applicable desktop/phone player and chord-editor browser cases. Sampled piano tests cover pitch mapping, download/decode caching, real decoded recording buffers, no sample fetch before Play, failed-load retry without a synthetic fallback, and a clean reader without upload/drum mixer controls. Four browser cases are intentionally skipped for platform-specific duplication. Real audio and percussion rendering are checked; all 15 built-in examples render notation without browser errors. The 320-pixel layout fits without document overflow. Scoped lint and formatting pass. The production build and public-content exclusion checks pass.

The workspace-wide type check has a pre-existing unsupported `exact` option in `VerseSelector.component.test.ts:79`. No music-source diagnostic remains. Run checks sequentially with the production build because both regenerate SvelteKit types.

Work remains local and uncommitted. No push, publication or pull request.
