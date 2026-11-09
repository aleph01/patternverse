# Recording pilot: Smells Like Teen Spirit

The local songbook now links Nirvana's official Nevermind album recording:
[YouTube / Nirvana – Topic](https://www.youtube.com/watch?v=7TDeBi34OtE).
YouTube's watch-page metadata reports a 302-second recording, playable in embeds;
the oEmbed endpoint identifies Nirvana – Topic as its publisher (checked 2026-10-31).
This is the official album-audio upload with album artwork, rather than the shorter music video.

The existing community MIDI has 572 beats at approximately 114 BPM. Its notes,
tempo map, section boundaries and MIDI default remain unchanged. The recording
has separate absolute-second anchors in `songbook.json`, one for each section
boundary plus the end. Playback interpolates between anchors while respecting
the MIDI tempo map within each interval. Switching source preserves the musical
position and section loop; only one source plays at a time.

The initial whole-second anchors are based on the original-song form table in
[John Dorhauer's own arranging analysis](https://johndorhauer.com/2014/08/27/new-smell/).
The source's two short tags correspond to the MIDI's Bridge 1 and Bridge 2;
its coda corresponds to Outro. End time comes from the selected upload's metadata.
These are **draft section anchors**, not a listening-verified or beat-accurate
transcription of this particular upload. The map flags approximate timing in the
recording view. The MIDI's note content can differ from the released song,
particularly within the outro; interpolation cannot repair arrangement differences.

The YouTube API adapter uses the provider's media clock, native controls and
state events, with no second MIDI soundtrack during recording playback.
Embedding errors retain an actionable MIDI fallback. The video stays visible
between the structure map and the detailed MIDI modules. Muting instruments
affects MIDI only. No recording is downloaded or redistributed.

Verification uses timing/transport unit tests and local browser tests with a
controlled YouTube API fixture, including native seeking, buffering, section
loops, source switching and embed errors. Live playback in the user's in-app
browser still needs a manual check: browser control is disabled in Work settings.
Metadata availability does not guarantee playback in every browser or region.
