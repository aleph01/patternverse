# Chord player review

Open the local music demo at http://127.0.0.1:5197/ and select **Chord studies**. The five original piano studies cover unequal I–V–vi–IV durations; G versus G/B and C/G; C versus Cmaj7 versus Cmaj9; Cadd9 versus Cmaj9 and C7; and half-beat changes. Song excerpts and pattern comparisons remain separate libraries.

Examples with harmony annotations open in **Chords** view. Piano roll and notation remain available, and switching views does not restart playback. Open a chord with a click, tap, Enter or Space to inspect its notes. Chord function uses a colored top border; note structure uses green for base notes, blue for sevenths and coral for ninths. Labels accompany every color.

The existing **Build a chord progression** editor is also available below the studies. Its cards now use proportional durations, and its saved sketches, undo and keyboard reordering remain supported.

## Timing and chord data

`Harmony.start` and `duration` use quarter-note beats, like MIDI note events and the existing transport. Missing durations extend to the next harmony onset, or the passage end. The same resolved chord records drive the chord ribbon and the piano-roll lane. Minimum readability stretches the entire time axis; it never gives an individual short chord a false duration. Expandable note layers change height only. On narrow screens, the timeline scrolls inside the player and follows new chords during playback.

The authored chord symbol supplies root identity. Notes sounding at its onset supply the voicing, lowest note, inversion and extension layers. Root identity stays V when the bass of G moves to B. `Harmony.parts` optionally identifies source MIDI track IDs; the legacy default scope is `chords`, `accompaniment`, and `bass`. `Harmony.root` optionally supplies an explicit root spelling. Both fields are optional, so existing scores and saved chord sketches still work.

When sounding chord notes are unavailable, common triad, seventh, ninth and add9 symbols provide a fallback stack, labeled “from chord symbol.” Unsupported symbols retain their label without an invented stack. Cadd9 never creates a seventh layer. Major and minor sevenths retain their actual B or B-flat spelling in the supplied studies.

## Limits and verification

This is a display for authored harmony, not automatic chord recognition. MIDI excerpts without harmony annotations retain their existing views. Arpeggios, delayed entrances, changing bass lines, omitted chord tones and unusual chord qualities may need more detailed authored annotations; the analysis reads the voicing at each harmony onset. Ninth-chord inversion is shown by its slash name and bass section rather than a special figured-bass scheme.

Unit coverage lives in `chord-display.test.ts`; desktop/phone checks in `music-chord-display.spec.ts` cover proportional widths, keyboard and touch disclosure, bass and figures, extension differences, MIDI/playhead alignment, view changes during playback, a 320-pixel layout, and theme colors. The existing music and repertoire tests exercise playback, looping, tempo/meter maps and legacy MIDI examples. The isolated music demo build checks the same production player components without packaging private MIDI files.
