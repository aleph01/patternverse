# Player requirements derived from the musical examples

Working proposal · 29 October 2026

[Example map](example-map.md) · [Structured example records](example-map.json) · [Taxonomy review](coverage-review.md)

## Product direction

The main experience is a **local, playable musical excerpt**, preferably recognizable repertoire represented by an accurate, usable MIDI transcription where that representation teaches the pattern. The reader can follow the relevant notes, hear parts separately, replay a passage and compare a clearly labeled transformation. A piano-roll/notation switch shows the same musical passage at the same playback position. External recording playback supplies optional performance or production context.

This replaces a video-first assumption in the earlier listening work. Existing YouTube studies can remain as references. Their availability does not determine whether the core teaching example works.

The current example map has 60 core candidate briefs and 16 supplementary briefs covering current articles outside that shortlist. The 49-article index overlaps the candidate map. These are editorial briefs, not finished assets, and their capability counts are not estimates of implementation effort.

## What the existing application actually provides

The current `apps/web/src/lib/music/examples.ts` model stores pitched note events with a start, duration and one of three fixed part roles: Melody, Chords and Bass. It includes a tempo and beats-per-bar field. `MusicPlayer.svelte` currently lays out bars and labels the setting in 4/4. The transport schedules fractional beat positions against Web Audio time, loops and isolates parts. Fixed synthesized piano/guitar/bass timbres already exist. A separate chord editor supports diatonic progression sketches.

The conversation prototype demonstrates a possible beat-grid/roll/notation interface, simple drums, A/B versions and part switches. It is not the production component, does not import MIDI and does not establish a complete notation pipeline.

No general tempo, volume or position slider is restored by this proposal. If a verified example needs a slower listening version, make that a small named comparison or a later focused playback option rather than a permanent control panel.

## Examples before a large player rewrite

Review one small corpus spanning different requirements. The modern popular-song selections below are deliberately retained alongside the straightforward score-based candidates; unavailable permission or an inaccurate transcription is a source-selection task, not evidence that every example should become classical repertoire.

| Pilot                      | Candidate material                                                          | Teaching question                                             | What it tests                                                                                   | Source / asset status                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Syncopation                | Joplin, _The Entertainer_, plus the original Platform Three kick-shift pair | Which attacks pull against the beat?                          | MIDI import, separate hands/voices, drum comparison, ties and beat reference                    | [Mutopia edition 263](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=263) lists MIDI and a Public Domain label. File accuracy, passage and applicable use still to review. No download yet. |
| Recognizable melodic shape | Bill Withers, _Lean on Me_, from the existing article study                 | What repeats, and what changes in pitch distance?             | A modern-song melodic excerpt, clear source/version, pitched roll and readable notation         | Existing written study; an accurate MIDI transcription with usable terms remains to select.                                                                                                          |
| Harmonic color             | David Bowie, _Space Oddity_, plus the original matched F–C / F–Fm–C endings | Which changed pitch produces the borrowed-chord color?        | Chord/melody alignment, accidentals, harmony annotations and an explicitly original alternative | Existing study is a lead. Exact harmonic passage, transcription and permission are unverified.                                                                                                       |
| Independent lines          | Bach, Invention No. 1, BWV 772, plus Two Voices                             | Can I follow both lines and hear a delayed entry?             | Voice separation, solo/mute, staff assignment and notation                                      | [All of Bach](https://www.bachvereniging.nl/en/bwv/bwv-772-786) identifies its performance and the inventions' imitative design. Select a separate usable score/MIDI edition.                        |
| Rhythm without pitch       | Original Shared Pulse 3:2 example                                           | Where do two and three meet?                                  | Neutral percussion, exact subdivisions, tuplets and a shared cycle marker                       | Prototype sketch exists; review/author production example data.                                                                                                                                      |
| Whole-piece relationships  | An original 24-bar A–B–A miniature; Mozart K. 15mm as a reference           | What makes the returning A recognizable?                      | Phrase/section context, range selection and a section map                                       | Original arrangement is a brief; [university teaching reference](https://musictheory.pugetsound.edu/mt21c/TernaryForm.html) supports the repertoire lead.                                            |
| MIDI boundary              | Original Air / Room Study                                                   | Does a changing sound or acoustic setting supply the pattern? | Local audio alongside a shared timeline, without requiring a live synthesizer or external video | Needs original renders. It prevents assuming a note sequence covers sound-design patterns.                                                                                                           |

Select and verify the passages before finalizing development estimates. The pilot should contain at least one modern popular-song excerpt once an appropriate source is available; do not silently substitute a generic exercise and call it the song.

## Minimum experience derived from the map

| Need                              | Examples that require it                                 | Smallest useful implementation                                                                                     | Optional later expansion                                            |
| --------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Curated MIDI ingest               | Recognizable melodic, harmonic and contrapuntal excerpts | An authoring-time import/conversion step; validate files and retain provenance                                     | Reader file upload and downloadable MIDI exports                    |
| One musical timeline              | All playable examples                                    | Shared transport for event playback and authored audio; consistent loop/restart/part behavior                      | More elaborate editing or recording                                 |
| Clear comparison versions         | Syncopation, borrowing, contour, silence, articulation   | Named versions; highlight the declared change; synchronize equivalent ranges or restart when the structures differ | Continuous morphing or unrestricted editing                         |
| Appropriate sound roles           | Drums, two voices, layered arrangement                   | Arbitrary labeled tracks with a small set of suitable pitched/percussion sounds                                    | Large instrument libraries or acoustic realism                      |
| Beat grid, roll and notation      | Rhythm and pitched examples                              | Select the sensible default per example; keep time and selection when switching                                    | Additional analytical overlays                                      |
| Correct timing and grouping       | Swing, 3:2, meter and phrase examples                    | Preserve performed timing plus authored structural rhythm; display the correct grouping                            | User swing/phase controls                                           |
| Correct musical annotation        | Scales, chord families, borrowing and voice leading      | Authored pitch spelling, scale-degree/chord labels, keys and target-note emphasis                                  | Full harmony editing or automatic analysis                          |
| Musical context at several scales | Accumulation, form, transitions and endings              | Named figure/phrase/section ranges with enough preparation and arrival; a persistent playhead                      | Free zooming and an arrangement editor                              |
| Local audio                       | Timbre, space, resampling and voice                      | Original/cleared pre-rendered clips and aligned named stages; level-aware comparison                               | Real-time filters, envelopes, spatial processing or live resampling |
| Text where meaning matters        | Prosody, lyric development and speaker                   | Original/cleared text aligned to phrase or syllable; performed voice when needed                                   | Lyrics editor or synthesized singing                                |

The map's `minimum_capabilities` fields trace each need back to its examples. `optional_interactions` are separate: an example needing two filter states does not automatically require an unrestricted synthesizer, and a loop transformation can first be taught with two authored clips.

## MIDI is an input, not the whole teaching model

Use a curated musical-example model between imported files and playback/views. Preserve the original source and derived-file hash. Keep the work identity and recording/score version separate from the teaching transformations.

The import and review step should retain or explicitly account for:

- Note pitch, start, duration, velocity and track/channel identity; drum channels and program changes require reviewed sound-role mapping.
- Tempo and meter changes, pickups and structural bar boundaries. The current 4/4 view must not silently relabel other meters.
- Sustain and other performance controls that materially change what is heard. Unsupported events must be surfaced during curation rather than silently discarded.
- Original performed timing alongside any quantized display rhythm. Swing cannot be reduced to a universal ratio, and a machine-quantized transcription cannot stand in for a particular performance's timing.
- Staff/voice assignments, enharmonic spellings, ties, rests, tuplets, articulations and chord labels as reviewed annotation. MIDI alone does not reliably supply these score decisions.
- Named passages, section structure, listening cues and comparison mappings. Bar numbers need a stated source edition or arrangement.

For notation-heavy examples, editable score material such as MusicXML or an openly reusable score source may be the better annotation source even when MIDI is the playback input. Do not make direct MIDI-to-engraving conversion a prerequisite for every lesson.

A faithful excerpt, a simplified reduction, a transposition and an original counterexample should be visibly distinguished. Only call a rendering the song excerpt when its data and scope have been checked; changing a few notes for teaching creates an alternative, not a second claim about the recording.

## Development sequence, after example selection

1. **Curate the pilot assets.** Select exact passages and sources, check their musical fit and usable terms, and write expected listening outcomes. Retain the modern-song source leads.
2. **Build the import and example model.** Convert a few curated MIDI files into the current scheduler's needs, adding general track roles, expressive event data and meter-aware position. Keep note/audio/annotation identities separate.
3. **Integrate the small shared player.** Production A/B, basic percussion, part isolation, loop/restart and the beat-grid/roll/notation views. Use authored score annotation for the pilot. Retain a visible listening cue.
4. **Add musical context.** Figure/phrase/section navigation and boundary-aware ranges. Use one example identity so a smaller passage can be heard within its larger form.
5. **Add local audio cases.** Sound/space/voice comparisons and staged source transformations. Prefer authored clips before live synthesis or effects controls.
6. **Expand from observed needs.** Add narrow editing controls or better timbres only when the reviewed example makes their value clear.

### Library choices to evaluate at the import pilot

- [`@tonejs/midi`](https://github.com/Tonejs/Midi): a candidate for reading MIDI into JavaScript note/track structures. Verify its actual handling of the pilot files, controllers and metadata; do not assume lossless round-tripping or that it supplies score notation.
- [VexFlow](https://github.com/0xfe/vexflow): already used in the conversation prototype; a candidate for rendering authored score semantics. It is an engraving layer, not a complete automatic MIDI transcription system.
- Keep the existing Web Audio scheduling and instrument code as the baseline while testing those adapters. The example map does not establish a need to migrate the playback engine to Tone.js.

## Acceptance checks for the pilot

- Every excerpt has the named source/version and inspected permission/provenance record; popular-song files are not marked usable merely because they can be downloaded or purchased.
- The exact passage makes the article's pattern audible. A general song association is insufficient.
- Required parts remain identifiable when soloed and when combined; drums are mapped deliberately.
- Playback and notation agree on notes, rests, ties, subdivisions, meter and the declared excerpt boundaries. Supported expressive controls are preserved; limitations are explicit.
- View changes preserve the passage and musical position. Version changes preserve corresponding position where sensible; otherwise restart at a labeled boundary.
- Endings include release tails; transition examples include both preparation and arrival. A whole-piece pattern is not demonstrated only by an isolated two-bar loop.
- The example works without loading external video. The original recording remains available as context where appropriate.
- Keyboard and narrow-screen use remain clear, and playback stops on leaving the example. No autoplay.

## Source and scope notes

The example map records the checked source links and limits. [Mutopia](https://www.mutopiaproject.org/) provides per-item score/MIDI/source material; its catalog does not guarantee musical accuracy. [Hookpad's format-1 MIDI export](https://www.hooktheory.com/support/hookpad) is a possible authorized authoring route. [MIDIFILES.COM's standard terms](https://midifiles.com/en/help) describe personal use, so a standard purchase is not treated as permission to build a public MIDI library. The [US Copyright Office's distinction between composition and recording](https://www.copyright.gov/engage/musicians/) explains why avoiding a commercial audio recording does not by itself settle the composition's use.

This document is a proposal derived from examples, not an implementation report or a final library decision. No new MIDI files, source recordings or production player code have been added.
