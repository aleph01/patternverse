# Musical composition — fresh start

Working brief · 30 October 2026

The previous course is archived. This is the new working starting point. Its lesson count, sequence, collection map, recurring songs and article template are open decisions.

## Purpose

Help a beginner understand how musical patterns are constructed, transformed, combined and organized over time, and use that understanding to make musical choices.

## Preferences to preserve

- Explain the general idea in ordinary language before introducing a song example.
- Make the important relationship visible and audible.
- Keep the first interaction focused; reveal detail when it helps.
- Give concepts, reusable techniques, examples and optional practices distinct jobs.
- Choose examples for their musical and teaching value.
- Connect small patterns with phrases, sections and whole pieces.

## First design task

Design one convincing learning experience before expanding the outline. Establish what the learner should understand, choose a musical relationship worth hearing, and work out the explanation, visual and comparison together. Review the result for clarity and musical interest before turning it into a course-wide template.

The audience, first learning outcome and example-selection criteria need to be agreed. A new taxonomy should follow those decisions.

## Available infrastructure

The shared sampled-piano/drum player, playback engine, MIDI handling, chord view, notation and timeline components remain available. Existing musical assets can be evaluated individually; availability does not determine the new curriculum.

## Player MIDI studies

MIDI is the preferred playback for familiar-song studies, keeping listening, section seeking and looping free of external video advertising. The local demo at `http://127.0.0.1:5197/` provides:

- **Radiohead — No Surprises · MIDI study** (`?study=radiohead-no-surprises-study`): the complete 71-bar arrangement with 11 source-marked sections, authored chord identities, a vocal-melody piano guide and the original outro tempo map. Prepare with `node apps/web/scripts/prepare-no-surprises-study.mjs`. The silent count-in and duplicate parts are removed. Arpeggio windows read actual chord tones, and inversion analysis follows the bass part rather than the first upper-figure note. Basic drums retain sixteenth and triplet timing.
- **The White Stripes — Seven Nation Army · MIDI study** (`?study=white-stripes-seven-nation-army-study`): a complete 113-bar instrumental community arrangement, eight editorial sections and six reading parts. Prepare the fixture with `node apps/web/scripts/prepare-seven-nation-army-study.mjs` using the existing private MIDI. Click a section to reveal its harmony/tonal centre and basic drums; piano roll and notation remain optional.
- **Daft Punk — Get Lucky · opening study** (`?study=daft-get-lucky-opening-study`): an eight-bar provider-demo reduction. It now starts with MIDI and has no YouTube playback option.
- **Jonathan Coulton — Code Monkey** (`?study=coulton-code-monkey-study`): the earlier artist-published local-recording test, with its authored MIDI reduction, remains available separately.

The full MIDI study preserves source note pitch and timing, omits the low tom from its basic kit, and plays pitched parts on sampled piano. Riff passages use explicit tonal-centre annotations without invented chord voicings. Power-chord labels retain the missing third, and the ending's E major chord follows the actual MIDI notes. Section labels group builds and turnarounds for readability; they describe this community arrangement, not a verified timestamp map of the original recording. Private MIDI and generated study data remain outside the public build.

Earlier YouTube tests returned error 150 for both official Get Lucky uploads in the in-app browser. The shared YouTube adapter remains available for other contexts, but these MIDI studies do not load its SDK or video frames. These player tests do not establish a new course sequence or taxonomy.

## Previous version

[Archived course and source snapshot](../archive/musical-composition/2026-10-30-course-reset/README.md). The archive preserves the previous work for reference and recovery.
