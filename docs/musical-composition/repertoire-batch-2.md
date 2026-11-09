# Four additional repertoire examples

Local review batch · 29 October 2026

The first four acquisition targets now have playable excerpts in the [local demo](http://127.0.0.1:5197/). The library contains 19 repertoire excerpts and four original comparisons. Every selected MIDI is kept unchanged in the ignored private source folder; no file was purchased or added to public application assets.

| Selection              | Passage and teaching relationship                                                                                                                                                                           | Source and limits                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fly Me to the Moon** | Community source bars 7–10. The familiar melody uses unequal offbeat placement against a walking bass with one attack per beat. Melody and chord reference are separate parts.                              | [BitMidi source](https://bitmidi.com/fly-me-to-the-moon-mid). Full community arrangement obtained, transcriber unidentified. Its relation to the Sinatra/Count Basie recording has not been certified. Playback and piano roll preserve timing; automatic notation needs reviewed rhythm annotation for this passage. |
| **Man in the Mirror**  | Source bars 66–81, a 16-bar passage crossing into the later A-flat setting near excerpt bar 9. Both actual source melody-guide tracks, keyboard harmony, bass, kick and hat are retained.                   | [BitMidi source](https://bitmidi.com/man-in-the-mirror-2-mid). A roughly five-minute sequence was obtained. The key change is in the file; it is not an authored transposition of earlier notes. Complete score/performance alignment remains under review.                                                           |
| **God Only Knows**     | Provider source bars 7–10. The bass descends A–G-sharp–F-sharp–E. E-major upper chord tones over G-sharp in the second bar make the root-versus-bass distinction explicit.                                  | [MIDI DB demo](https://www.mididb.com/the-beach-boys/god-only-knows-midi/). Only a roughly 35-second provider demo was obtained. The fourth bar uses an E bass in this arrangement; do not claim it duplicates every inversion of the original recording.                                                             |
| **Dancing Queen**      | Community source bars 28–43. The melody moves into a higher range, and a sustained string line returns near excerpt bar 13. A 16-bar reduction retains melody, keyboard, string line, bass and basic drums. | [BitMidi source](https://bitmidi.com/dancing-queen-1-mid). A complete roughly four-minute arrangement was obtained. The string line plays on piano; this represents its notes and entrance, not its original timbre. Exact verse/chorus boundary annotations still need recording or score alignment.                 |

The demo opens on the new swing example. All instrument and part choices are preselected; the instrument/mute rows are hidden. The two longer passages use the existing four-bar navigation, which also seeks playback to that part of the passage. The song dropdown contains all 19 excerpts.

## Source selection and rejected candidates

Nine candidate files were inspected. All four selected sources have their original bytes, note pitches, velocities, entrances and durations intact. No drum durations were invented, no swing was quantized and no complete key-change example was manufactured from a short demo.

- The **Fly Me to the Moon provider demo** contains walking bass and sparse flute fills but lacks the main melody-guide part needed for this example. The full community arrangement has that melody and measurable unequal placements.
- Two **Man in the Mirror** alternatives exceed the importer's limit of 32 playable parts or percussion lanes. The selected complete alternative works within the existing limit; the limit was not relaxed.
- The **Dancing Queen provider demo** is only about 44 seconds and contains 644 zero-duration percussion events rejected by the importer. A complete valid community source was selected instead of silently repairing those events. A second valid but shorter community version was not selected.

Source URLs, download URLs, hashes, byte sizes, part identities and rejected-candidate reasons are recorded in [repertoire-batch-2.json](repertoire-batch-2.json). The current [library audit](repertoire-library.json) includes all 19 selections.

## Musical checks and remaining scope

The swing check confirms consecutive bass beat starts and melody attacks two-thirds into beats. It establishes the represented uneven timing, not a universal swing ratio or an exact performance transcription. This passage exposes a limit in the current automatic rhythm notation; its explicit fallback leaves playback and the piano roll available. The other new passages have notation views, including the page after the key change. The two longer arrangements show pitched parts in notation while their detailed drums remain audible and visible in the beat grid.

In the key-change passage, source beat 292 changes the G-centred reference to A-flat: the keyboard pitch classes move from G/B/D/A to A-flat/C/E-flat/B-flat, while the first bass note moves from G to A-flat. Register, rhythm and melody ornamentation are whatever the arrangement provides. The later section is retained rather than generated by transposition.

The inversion check confirms E/G-sharp/B in the upper part at source beat 28 while G-sharp is the bass. The note labels describe this provider arrangement. The two selected parts are not a transcription of every original instrumental voice.

The Dancing Queen check confirms a higher mean melody pitch in the later selected span and the chosen string lane entering at source beat 155.958333, just ahead of excerpt bar 13. This is a concrete register-and-entrance example while the stronger verse/chorus annotation remains pending. Its four-minute source makes later whole-form preparation possible, but this review does not claim the complete song is already mapped.

Publisher listings provide bounded references for the [G-major setting of Man in the Mirror](https://www.musicnotes.com/sheetmusic/michael-jackson/man-in-the-mirror/MN0037340) and the [A-major setting of Dancing Queen](https://www.musicnotes.com/sheetmusic/abba/dancing-queen/MN0073819). They do not certify the community files' exact note choices, tempo or section boundaries.

## Public use

Public-app reuse remains unconfirmed for all four selections. MIDI DB's permission to download a demo is not an app-redistribution grant. The community pages likewise do not establish the required publication basis. The [provider terms](https://www.midi.com.au/terms-and-conditions/) remain relevant when comparing a purchased backing track with the intended hosted excerpt, notation and transformation use. No rights holder was contacted and no purchase or license agreement was entered.

The next acquisition group has now supplied usable sources for Isn't She Lovely, Around the World and Bohemian Rhapsody; see the [third-batch audit](repertoire-batch-3.json). The exact Bonnaroo Videotape arrangement still needs an accessible, verified combined piano-and-beat transcription.

## Verification

70 focused music/source checks and 12 desktop/phone browser cases pass. Scoped lint passes. The workspace type check still reports the existing unsupported `exact` option in `VerseSelector.component.test.ts:79`, with no new music diagnostics.

Checks cover hashes, note preservation, selected parts, passage bounds, the four musical relationships, sampled playback, switching, longer-passage navigation and desktop/phone layout. The swing notation limitation is checked as an explicit recoverable fallback rather than reported as a successfully engraved score.
