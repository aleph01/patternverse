# Three guided music lessons

Local draft implementation · 29 October 2026

The articles now start with a plain-language concept and an interactive, original sketch. **Explore a song example** then opens the guided **Listen → Isolate → Notice → Try** experience using the shared sampled-piano player. The 15-example demo links to all three lessons. The prose has been updated to explain the same relationships; the course and its articles retain draft status.

| Article                            | Local lesson                                                                           | Teaching comparison                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Intervals and Melodic Shape | [Lean on Me](http://127.0.0.1:5198/pattern/songwriting-pitch-and-intervals)            | Source melody; all notes two semitones higher; each F raised to F♯ while keeping the C start and rhythm                                 |
| Borrow a Chord                     | [No Surprises](http://127.0.0.1:5198/pattern/songwriting-borrow-a-chord)               | An original F–B♭–F / F–B♭m–F frame isolates D versus D♭, followed by that change within the local source phrase                         |
| Pull an Entrance Across the Beat   | [Superstition](http://127.0.0.1:5198/pattern/songwriting-syncopation-and-anticipation) | Provider groove, drums alone, keyboard against drums, then an original beat that moves only the kick from beat 3 to its following “and” |

The general sketches use pitch-distance, chord-tone and beat-placement diagrams with short playback. Song players are initially closed. Each guided step preselects its audible parts and instruments; no part toggles, instrument selectors or repertoire dropdown appear. Original-recording context is also collapsed. Steps stop the previous audio; A/B changes within a step retain the player’s existing comparison behavior. The Try step ends with a small transfer prompt. No file upload or percussion on/off row is introduced. Other course articles keep their existing player.

## Reference checks and scope

**Lean on Me.** The [licensed Musicnotes MN0072685 preview](https://www.musicnotes.com/sheetmusic/bill-withers/lean-on-me/MN0072685) was inspected. It supports C major, 4/4 and the stepwise material in the song’s opening. The selected provider melody begins C–C–D–E–F; its two–two–one ascending distances are checked in the MIDI. The public preview is not treated as a complete note-for-note check of the selected later phrase. Timing and accompaniment come from the provider arrangement. The D transposition and F♯ alternative are our teaching transformations; no additional artist performance is claimed.

**No Surprises.** The opening of [Faber’s Josh Cohen piano sample](https://www.fabermusic.com/shop/no-surprises-d38661) was inspected in its public viewer. It supports the F-major setting and altered D♭ pitch. Cohen’s piano version uses its own rhythmic/rubato treatment, so it does not certify the community guitar MIDI’s meter, tempo or voicing. The MIDI’s B♭ bass and B♭–D♭–F figure establish the local borrowed-third example. The authored D alternative changes only that pitch; the original chord frame also changes only D to D♭, with roots, other tones and durations fixed.

**Superstition.** [Victoria Theodore’s Pianote lesson](https://www.pianote.com/blog/stevie-wonder-superstition/) and [Southern Cross University’s analysis](https://www.scu.edu.au/news/2022/dissecting-stevie-wonders-superstition-50-years-after-we-first-heard-its-infectious-grooves.php) support the syncopated-keyboard/reference-beat mechanism and the instrumental roles. The selected provider MIDI has displaced attacks, an E♭-centred pitch palette and finer/uneven timing. Its keyboard part is raised two octaves as an explicit piano-rendering choice, while entrance times stay fixed. That register choice is not described as a verified correction to the record. The result is a provider groove reduction, not a reconstruction of all original clavinet layers. The final two-bar A/B beat is original course music.

These checks establish the relationships the lessons teach. They do not approve the arrangements as literal reproductions of the original recordings. Source and comparison notes in each lesson identify the boundaries. Published score preview images were inspected for research and are not bundled into the application.

## Authoring and preview

The original concept sketches and explanations live in `apps/web/src/lib/music/concepts.ts`; `MusicConcept.svelte` presents their diagrams and sound. The interval chapter is now **Intervals and Melodic Shape**, presented as a musical foundation: interval vocabulary supports compositional choices, while transposition has its own neighboring lesson. Its stable article ID and storage type remain intact; this is an editorial distinction within the draft course, not a migration of the entity schema.

The pure lesson transformations and teaching instructions live in `apps/web/src/lib/music/lesson-pilot.ts`. `GuidedMusicLesson.svelte` presents the four steps. The guided song steps reuse `MusicPlayer`, with both `showSelector` and `showPartControls` disabled. Standalone players retain their default controls.

Prepare the local payloads from the existing private MIDI copies:

```sh
node docs/musical-composition/build-lesson-pilot.mjs
SONGWRITING_PREVIEW_PORT=5198 node docs/songwriting-course/preview.mjs
```

The builder uses the installed esbuild toolchain without opening a server. It writes the three normalized lesson JSON files and source hashes under ignored `.local/music-lessons/`. The preview passes that folder to its isolated draft server. The application reads only the three allowlisted lesson IDs, only in development, and only for Commons draft articles. A missing local file falls back to the existing player. Production loads do not read the private files, and those assets are not copied into application static assets. No publication or push was performed.

## Validation

106 focused music, source-transformation, private-loader and songwriting-content checks pass. Eight desktop/phone browser cases pass: all three lessons begin with the concept, play the original sketch, change its diagram, open the song on request, isolate, show notation, compare variations and stop audio on step changes or closing the song; the non-pilot article fallback remains available. The three source transformations have explicit invariants for preserved intervals, unchanged non-target chord tones, retained groove timing and fixed reference-drum parts. Scoped lint passes. The complete workspace type check still reports the pre-existing unsupported `exact` option at `VerseSelector.component.test.ts:79`.

```sh
pnpm --filter @patternverse/web exec vitest run src/lib/music src/lib/server/guided-music-lessons.test.ts src/lib/server/songwriting-content.test.ts
pnpm --filter @patternverse/web exec playwright test --config playwright.music-lessons.config.ts
```
