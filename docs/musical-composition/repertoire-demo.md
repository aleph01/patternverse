# Repertoire playback demo

Local working demo · 29 October 2026

Open **http://127.0.0.1:5197/**. The demo now includes **31 repertoire excerpts** and **4 original A/B comparisons**. See the [first repertoire library](repertoire-library.md) for its listening cues, source records, edits and lesson coverage, or [the JSON audit](repertoire-library.json) for exact file hashes and part selections.

Start from the repository root:

```sh
pnpm --filter @patternverse/web exec vite --config music-demo.vite.config.ts
```

Choose **Song excerpts** to select a work, play/loop its preselected passage, and switch between piano roll and the automatically generated notation guide. Drum reductions also offer a read-only beat grid. Choose **Pattern comparisons** for the existing original A/B demonstrations of syncopation, swing, 3:2 polyrhythm and melodic sequence; their editable grid remains available. Switching libraries stops the old player.

The source-bar range appears in each listening cue; the player renumbers the excerpt from bar 1. Playback uses the shared music player and self-hosted Salamander piano recordings, plus local bass/guitar/percussion synthesis where selected. The full pitch range fits a 320-pixel roll so both hands stay visible. There is no upload control or drum on/off row.

The **Which lessons do these examples cover?** table connects the available repertoire to current lesson titles. The library covers 31 of 49 current lessons and 24 of 60 proposed composition patterns. It does not claim complete course coverage. Source notes distinguish provider arrangements, community reductions and open editions, including the repaired Avril 14th export. Videotape at Bonnaroo 2006 remains explicitly pending.

Six open-edition files are read from [midi-research](midi-research/README.md). Thirteen modern arrangement files are read from ignored `.local/music-repertoire/`. Use `MUSIC_DEMO_MIDI_DIR` for another local folder; `MUSIC_DEMO_SUPERSTITION_MIDI` remains a single-file override. The [second batch review](repertoire-batch-2.md) records the four additions, actual musical checks and the swing notation fallback. The independent Vite entry and read-only source allowlist are not part of SvelteKit routes or the public application build. No article has been published or had its recording reference replaced.

## Checks

The full local library requires its private source copies. This flag makes the browser checks require all thirty-one repertoire choices rather than validating only the available open files:

```sh
pnpm --filter @patternverse/web exec vitest run src/lib/music src/internal/music-demo/excerpt.test.ts
MUSIC_DEMO_FULL_LIBRARY=1 pnpm --filter @patternverse/web exec playwright test --config playwright.music-demo.config.ts
```

Checks cover source hashes (including distinct server responses for each file), all selected parts and bounds, meter/tempo retention, the stated riff/modal/borrowed-chord/polyrhythm relationships, sampled playback, part isolation, notation, percussion, original A/B switching, error retry and desktop/phone layout. Automatic notation remains a reading guide. Complete score/recording fidelity and article publication review remain editorial work.

MIDI note-off lengths are retained separately from pedal-extended sounding lengths. Notation uses the note-off lengths; playback and the roll retain the sustain. This allows the Chopin passage to show one written left-hand triplet line while its piano sound continues under the pedal.

Validation of the original 15-example batch: 62 music/excerpt unit checks and 10 desktop/phone browser cases passed, including starting and pausing every repertoire excerpt. Scoped lint passes. The workspace type check still reports the existing unsupported `exact` option in `VerseSelector.component.test.ts:79`; it reports no demo/music error. No push or publication was performed.

## Remaining-track acquisition

The third batch adds **Isn't She Lovely**, **Around the World**, and **Bohemian Rhapsody** to the selector. Source copies are unchanged and private. See [the acquisition audit](repertoire-batch-3.json) and [library notes](repertoire-library.md#third-batch) for exact passages and limitations. **Videotape at Bonnaroo 2006** remains uncounted because the exact piano-plus-beat source is not yet accessible and verified.

The current expanded library passes **74 music/excerpt tests** and **14 desktop/phone browser checks**, including new chord-color, layer-entry and tempo-change checks. All three new scores render in the browser; the earlier Fly Me to the Moon notation limitation remains documented.

Scoped lint passes. The wider app type check still reports the existing `VerseSelector.component.test.ts:79` error about the unsupported `exact` option; no new diagnostics were reported. Browser review images: [desktop](batch-3-preview/around-the-world-desktop.png) and [phone](batch-3-preview/around-the-world-phone.png).

## Fourth acquisition group

The library now includes seven more source files and nine selections, with partial and different-version arrangements labeled explicitly. See the [fourth-group review](repertoire-library.md#fourth-acquisition-group) and [source audit](repertoire-batch-4.json). The latest validation passes 83 music/excerpt tests and 14 desktop/phone browser checks. Landslide and the studio True Love Waits reduction retain piano-roll playback with a clear notice when dense overlaps exceed the notation voice limit.
