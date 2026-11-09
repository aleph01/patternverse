# Musical example player

Design started 2026-10-26. User selected a piano roll: horizontal note blocks.

## Listening recordings: YouTube passage player

Updated 2026-10-26 after the user chose YouTube instead of the multi-service design. The three listening studies now use one YouTube player, a passage selector, a whole-recording option, and a play/replay button. Radiohead's 2001 live and 2016 studio recordings remain separate choices. There is no provider switch or remembered-service checkbox; the previous preference is no longer read or written. Bandcamp/Spotify identifiers remain in the editorial manifest only as source research.

Each recording owns its passage windows and listening questions. The initial windows are broad comparisons, explicitly labeled by time rather than asserted phrase/section boundaries: the first 45 seconds of each Radiohead recording and Withers' recording, plus Four Tet's 0:00–0:30 and 1:30–2:00 windows. They need further listening review before finer phrase-level annotation. A window belongs to its exact video ID; switching version selects that recording's first window.

Loading is explicit and does not autoplay. Once the player is ready, Play / replay passage seeks to the window's beginning and starts playback. The existing host video runtime handles the selected endpoint, pauses, and resets for replay. Whole recording removes the endpoint. Choosing another window remounts the selected range without autoplay; switching recording closes the previous player. Loading another listening card, hiding/leaving the article, and disposal stop playback and remove the frame. The synthesized teaching player retains the same shared playback coordinator.

The course reuses `createVideoPlayback`, `connectVideoProvider`, the shared SDK loader, and their existing excerpt enforcement. A small course adapter exposes readiness and errors to the card. It adds no independent polling/SDK implementation and does not change the shared provider runtime. Errors provide a Retry button and a timestamped external YouTube link. That external link starts at the window's beginning but does not impose the embedded endpoint. Playback timing is approximate; YouTube can seek before a requested point. Ads, account/region limits, embedding restrictions, and unsupported playback remain YouTube-controlled. No universal ad-free promise is made.

The three-study pilot appears in the listening guide and the relevant patterns. Metadata, recording IDs, window bounds and written comparisons live in `listening-pilot.json`; detailed checks and remaining playback limitations are in `listening-pilot-review.md`. The original multi-service design in the chat's `flexible-listening-card.html` is now a historical prototype, not the current app design. Unused provider preference code and local service icons have been removed, along with the two extra frame-policy hosts they required.

Primary implementation references: [YouTube player parameters](https://developers.google.com/youtube/player_parameters) and [IFrame API](https://developers.google.com/youtube/iframe_api_reference). The course remains an unpublished local draft.

## Basic instrumentation

Added on 2026-10-26 at the user's request. Each audible part has a labeled instrument selector: Piano, Guitar, or Bass guitar. Defaults are piano for melody, guitar for chords, and bass guitar for the bass line. Instruments can be reassigned independently in the original examples and the chord editor. The part switches still mute the same score layers.

These are original, lightweight synthesized approximations, identified as “synthesized instruments” in the player. They use distinct harmonic spectra, attacks, amplitude decays, and brightness decays. They are not recordings of acoustic instruments, guitar-specific fretboard voicings, or strummed performances. There are no sample downloads, third-party sound assets, or new dependencies.

Switching an instrument during playback silences the previous voice and resumes at the same musical beat; pitch, note duration, score, and chord spelling remain unchanged. Choices persist between clips and score edits while that player remains mounted, but are not saved across page reloads. A weakly held, per-audio-context waveform bank avoids rebuilding a timbre for every note; pause, mute, edit, and disposal also disconnect each voice's filter. The position, tempo, and volume sliders stay removed.

Web Audio API references: [custom waveforms](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createPeriodicWave), [filter nodes](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode), and [positive exponential parameter ramps](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/exponentialRampToValueAtTime). The synthesis profiles and UI are original.

## Roman-numeral chord editor

Added on 2026-10-26 after the user requested the relative chord notation used by Hooktheory, then chose to focus the editor on chord progressions first. Hookpad's official guide describes Roman numerals as primary labels with chord names underneath: <https://www.hooktheory.com/support/hookpad>. This editor uses standard Roman-numeral analysis and Patternverse's own layout and playback.

The editor appears on the course overview and songbook as an expandable section, and opens directly in pattern 16, Think in Chord Numbers. A seven-chord palette adds diatonic triads. Selecting a progression cell exposes its numeral, actual chord, constituent notes, and duration (1, 2, 4, or 8 quarter-note beats in 4/4). Undo/redo retains up to 50 revisions. A sketch contains 1–16 chords; four starting points include the two existing Porch Light progressions, checked against the canonical course data.

The card controls were simplified at the user's request. On desktop, drag the card body to reorder; a line indicates insertion before or after the target, including across grid rows. A drop commits one edit, preserving the order of intervening chords, and one Undo reverses it. Copy and trash icons appear in that card's corner on hover or keyboard focus and act on that specific card. They are sibling buttons rather than controls nested inside the selection button. The duplicate action selects the new copy; removing a card preserves the current selection where possible and cannot remove the final remaining chord. The old four-button action strip is removed.

With keyboard focus on a chord, Left/Right arrows move it one position and focus follows the moved card. An announcement reports its new position. On touch-capable devices the selected card shows 44-pixel copy/trash controls, and the inspector provides a Position selector. Desktop-only dragging does not intercept touch scrolling. Edits continue to use the existing undo/redo, playback cleanup, and local persistence paths.

Choosing a key transposes the whole progression while retaining scale degrees. Major and natural-minor palettes cover all 12 tonic pitch classes and spell chords by the appropriate scale letters, including E-sharp in F-sharp major and C-flat in E-flat minor. Natural minor explicitly uses the major-referenced convention i–ii°–♭III–iv–v–♭VI–♭VII, with a minor v. This is stated in the editor and chapter rather than silently mixing minor conventions. Playback uses sustained root-position triads; this first editor does not add inversions, extensions, borrowed chords, or a raised minor-key dominant.

One versioned sketch is saved automatically on the current device after an edit. Only validated, bounded score data loads from storage. Saving failure leaves editing and playback available and displays the actual failure. Loading or editing the sketch leaves the canonical course examples unchanged. This version does not have cloud sync, multiple project files, or import/export.

The editor feeds the existing piano-roll player. A separate harmony lane displays a prominent Roman numeral with its chord name underneath, at the correct onset and duration. Existing verse, chorus, and bridge examples now use that lane too. The time grid supports partial final bars and chords crossing a bar or page boundary. Changing a score stops playback; closing the editor disposes its player and audio. The player retains Play/Pause, Restart, Loop, bar paging, and part switches. The position slider, tempo, and volume controls were removed at the user’s request. Playback uses each example’s original tempo and the existing default sound level. A cancelled audio unlock cannot surface as an error on a newly edited score.

The theory and validation functions live in `harmony.ts`, with tests across 24 major/minor key contexts. Desktop/phone tests exercise transposition and actual scheduled pitches, duration alignment, editing and undo/redo, saved sketch restoration, storage failure, unchanged course examples, and stopping audio on collapse. Melody editing remains a later design choice.

## First version

The player connects the course's counted examples to sound. Height represents pitch, width represents duration, and a moving playhead and highlighted blocks follow playback. Bar numbers and chord symbols stay above the grid. Melody and accompaniment use distinct colors and labeled controls. Four bars are visible at a time for longer examples; playback changes pages automatically, and previous/next controls also seek to the selected group of bars. Narrow screens can scroll the roll without widening the article.

Five selectable clips use the existing canonical data in `examples.json`: Porch Light's three-note seed, eight-bar verse, eight-bar chorus, four-bar bridge, and Platform Three's one-bar bass groove including its rests. The chord pitches are a deliberately simple sustained-triad arrangement; they do not claim to be a canonical full-song production. The player labels the sound as synthesized instruments with no sung vocal.

Controls: Play/Pause, Restart, whole-clip loop, bar paging, and independent part switches. A readout shows the current bar and beat. Resume restarts a held note for its remaining duration. Choosing another example stops playback and uses that clip's original tempo, retaining loop and part preferences. Only one player can sound at once. Leaving a chapter, hiding the tab, or unmounting the component stops audio. Audio starts only after a user gesture; it needs no external sound library, samples, login, or MIDI hardware.

The course overview, songbook, and eight relevant chapters show the same reusable player, with a contextually selected initial clip. Other articles remain unchanged. The full written examples remain usable without JavaScript or audio support. The player does not use an executable article widget or add a new content syntax.

## Implementation boundaries

- Runtime and piano-roll components live in `apps/web/src/lib/music/`.
- The runtime imports the existing `docs/songwriting-course/examples.json`; there is no second copy of the score to drift.
- The audio clock schedules short look-ahead windows. UI refreshes do not determine note timing. Pausing cancels active and scheduled voices; a generation guard prevents a delayed audio unlock from restarting a disposed player.
- The course preview copies the score and content-asset manifest into its isolated snapshot. Restart it after edits with `node docs/songwriting-course/preview.mjs`.
- Draft status and public-content filtering are unchanged. Nothing is deployed or published by this work.

## Review together

Listen to the seed, then compare the chorus with chords on and off. Listen to the bass groove in a loop: the empty time should remain empty. Useful next design questions are whether sampled instruments are useful, whether selecting a note should audition it, and whether a loop should cover a chosen phrase rather than the whole clip. Those are possible later additions, not controls promised in this version. Staff notation, note editing, MIDI import/export, full arrangement playback, hardware MIDI, and sung audio are outside this first version.
