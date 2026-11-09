# Musical Composition curriculum integration

Review and incremental implementation · 30 October 2026

The handoff is integrated into the current unpublished course, using its existing articles, collection links and shared music player. No alternative lesson system, entity migration, published content, new dependencies or artist MIDI has been introduced. The separate 18-lesson/eight-collection draft was not attached; its exact contents were not inferred.

## What was present

| Area                    | Existing implementation                                                                                                                                                  | Assessment before this integration                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Content and navigation  | 49 draft chapter sources, eight sequential parts, five reference collections, Music verse; a separate 15-collection/60-candidate editorial taxonomy                      | Substantial working course; topic collections and learning order already distinguished                                                                             |
| Learning map            | All 49 sources mapped to teaching responsibilities, foundation outcomes, prerequisites before examples and optional branches                                             | Reviewed proposal, with three concept-first guided lesson pilots implemented                                                                                       |
| Entity schema           | Pattern, concept, practice, collection and verse; lessons/examples represented through editorial metadata and embedded music data                                        | Five educational roles fit without adding five competing storage systems. Existing foundation sources retain their stable pattern routes                           |
| Foundations and harmony | Intervals, scales, tonal home, chord numbers, circle of fifths, bass/voice leading, extensions, borrowing, tonal change                                                  | Covered in articles; selected original players and three repertoire-guided lessons. Relative/parallel keys and other bridges still need the larger course-map work |
| Melody and rhythm       | Motifs, contour, development, phrasing, hooks, pulse, meter, rests, syncopation and swing                                                                                | Developed articles. Polyrhythm has an original A/B player, without a dedicated complete lesson. Arpeggiation and independent-line techniques remain uneven         |
| Texture and energy      | Part-role map, instrumental development in Platform Three, energy-arc diagram, entrances/exits, subtraction, fatigue and contrast                                        | Useful material; a whole-piece interactive comparison was missing                                                                                                  |
| Form                    | Part 7, section jobs, AABA, verse–chorus, refrain, strophic/through-composed discussion; Porch Light's proportional static form diagram and an instrumental additive arc | Already an appropriate home. Binary/ternary and theme-and-variations distinctions needed clearer introductory treatment; no three-perspective framework            |
| Playback                | Sampled piano, arbitrary parts, percussion, variants, quarter-note timing, tempo/meter maps, section metadata, piano roll, score, chord layers and local repertoire      | Sections already existed as data; the player had only four-bar visual windows, without a persistent whole-piece section/layer view                                 |
| Practices               | Transfer prompts and listening comparisons; general app practice schema available                                                                                        | No executable musical practices in this draft; integration preserves that boundary                                                                                 |

The baseline remains in [coverage-review.md](coverage-review.md), [collection-map.json](collection-map.json), and the [course learning map](../songwriting-course/map/course-map.md). Its candidate coverage counts measure dedicated/embedded/gap pattern coverage, not whether a formal label now has a short definition.

## Incorporated ideas and their homes

The course overview now defines concept, pattern, lesson, example and practice as educational roles. Six topic entry points link into the existing eight-part sequence: foundations; harmony; melody; rhythm; texture; form. The lyric branch and creative-process route remain visible. This is orientation within the current course, not a second inventory of lessons.

Part 7 and **Choose a Form That Serves the Song** introduce sectional, developmental and process-driven listening as overlapping perspectives. The article covers verse–pre-chorus–chorus, binary versus ternary versus AABA, theme and variations, through-composed development, episodes, and several possible process trajectories. Letters alone do not establish a detailed classical formal analysis; a return within a two-part form can still be rounded binary. The glossary supplies a short formal-model bridge.

**Shape Energy over Time** develops **Build by layered entry** as a named technique in its existing canonical home. **Give Each Part a Job** links roles with entrances; **Develop Without Losing the Idea** connects motif operations with theme-and-variations form. Existing section-purpose, bridge, harmonic-arrival, repetition and pacing articles supply the other reusable moves:

| Proposed technique name    | Existing canonical material / decision                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build by Layered Entry     | Shape Energy over Time, using roles from Give Each Part a Job; original playable A/B added                                                                       |
| Contrast Adjacent Sections | Give Each Section a Purpose and Make the Chorus Arrive; retain their specific situations                                                                         |
| Contrast and Return        | Choose a Form That Serves the Song, Earn the Bridge, Repeat with a Reason; do not create an additional generic contrast article now                              |
| Delay and Resolve          | Decide Where the Harmony Arrives for harmonic expectation; Shape the Approach and the Ending for timing. A textural release is not automatically a tonal cadence |
| Transition by Subtraction  | Shape the Approach and the Ending, supported by Shape Energy over Time; preserve its existing developed subtraction examples                                     |
| Shape a Dynamic Arc        | Shape Energy over Time; perceived intensity has several dimensions and can have multiple peaks                                                                   |
| Recall an Earlier Detail   | Develop Without Losing the Idea and Repeat with a Reason; connect selective return with the chosen form                                                          |

The structured learning map now records the updated form foundation and teaching responsibilities for chapters 42 and 46. The earlier taxonomy has integration annotations for Layered Entry, Ternary Form / ABA, Theme and Variations, layer timelines and section maps. It retains its baseline inventory for traceability.

## Shared-player implementation

The new **Structure** view reuses `MusicExample.sections`, existing tracks/notes, and the existing audio transport. Its blocks are proportional to quarter-note duration across the entire passage. Selecting a span seeks the transport and updates the four-bar window used by piano roll/notation. Playback, A/B changes, looping and the current position use the same audio clock. Existing examples keep their chosen default view; the form study explicitly starts in Structure.

The initial view contains only the timeline. **Show layers and activity** reveals per-part sounding spans and note onsets per bar. This is measured activity, not an inferred emotional-intensity or loudness curve. The details use native disclosures; section navigation uses keyboard/touch buttons, and narrow timelines scroll within the player. No automatic sectional analysis or new special-purpose audio player is involved.

The new eight-bar original study holds D–F–A–F fixed. Version A starts full; version B adds bass at bar 3, sustained D–A tones at bar 5 and pulse at bar 7. The source is generated from one original event list: the B version removes events before each layer's entrance, retaining every subsequent pitch, onset, duration, velocity and sound. Four equal windows aid comparison; unchanged windows in A are not falsely presented as newly composed sections. This is an original miniature in the course's instrumental direction, not a new canonical version of Platform Three or an artist-style transcription.

Optional comparison metadata supplies changed / invariant / effect / use-when explanations. The same player appears in the existing form and energy articles with parts preselected and selectors hidden. In the local demo, choose **Pattern comparisons (5)** → **Form · build by layered entry**.

## Listening references and verification boundaries

The existing listening guide now carries three provisional long-form questions: GY!BE's “Storm,” SWANS' “Screen Shot,” and “Bring the Sun / Toussaint L'Ouverture.” The official [GY!BE/Kranky album page](https://godspeedyoublackemperor.bandcamp.com/album/lift-your-skinny-fists-like-antennas-to-heaven), [Constellation release page](https://cstrecords.com/en-gb/products/godspeed-you-black-emperor-lift-your-skinny-fists-like-antennas-to-heaven), [SWANS album page](https://swans.bandcamp.com/album/to-be-kind), and [Young God release page](https://younggodrecords.com/collections/frontpage/products/to-be-kind) were checked on 30 October 2026 for recording/release identity. Those checks do not verify track-level structural claims. No timestamps, completed formal analyses, copyrighted MIDI, generated imitations or new playback assets are supplied for these references. Public-domain classical examples remain separate.

The binary/rounded-binary qualification was checked against [Brian Jarvis's Binary Form chapter in Open Music Theory](https://viva.pressbooks.pub/openmusictheory/chapter/binary-form/). [Ableton's Dramatic Arc](https://makingmusic.ableton.com/dramatic-arc) supports discussing several musical dimensions and acknowledges forms that do not follow a single climax arc. The three-perspective grouping is an editorial teaching aid, not a claim that music theory divides all works into these three exclusive categories.

## Adapted, deferred and declined

No separate pattern article is created merely for verse–chorus, ABA or theme and variations. Model-specific lessons or reference entries can be developed later if they have a clear learning responsibility. No global conversion of foundations into concept entities is undertaken: that would affect stable routes and the existing unpublished-course checks without improving this bounded lesson.

The proposed six modules become entry points rather than replacing eight current parts, nine proposed learning blocks, or fifteen broader candidate collections. The unprovided eighteen-lesson draft does not become an assumed acceptance criterion. The original study demonstrates accumulation only; it does not claim to teach a complete climax–release–rebuild arc in eight bars.

Useful later work: original A–B–A versus A–B–C comparisons; a theme/variation comparison with stated invariants; a subtraction/rebuild variant; optional authored intensity annotations clearly separated from measured activity; verified whole-recording listening maps for the three candidates; independent-line and sound-design branches already identified in the course map. A new interactive practice system or curriculum-route migration should be reviewed separately before implementation.

## Validation scope

Results: 162 focused music/content tests and 26 desktop/phone browser checks pass. The music-demo production build, scoped ESLint and formatting checks pass. Corpus compilation validates draft/public references and keeps the course out of the public corpus. The full type check reports only the existing unsupported `exact` option in `VerseSelector.component.test.ts:79`.

The form unit tests verify source invariants, entrances, full-passage coordinates, proportional section durations, merged sounding spans, activity counts, variant sections and legacy fallback. Browser checks cover concept-before-example text, default disclosure, keyboard seeking, paging alignment, A/B changes during playback, the persistent whole-piece playhead, looping, mobile layout and theme colors. Existing music, repertoire, chord and songwriting-content checks validate regressions, reference resolution and draft publication boundaries. The isolated music-demo build compiles the same player components; the full workspace type check retains the existing unrelated `VerseSelector.component.test.ts` error.
