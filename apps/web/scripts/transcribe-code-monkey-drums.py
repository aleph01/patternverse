"""Core eighth-note kit reduction from Coulton's isolated drum recording.

Preparation tool only (Python/NumPy + ffmpeg); no transcription dependency enters the app.
Quiet hits, fills and sixteenth-note subdivisions are deliberately left out. This is a
reading reduction, not an assertion of a complete drum transcription.
"""
from pathlib import Path
import json
import subprocess
import numpy as np

root = Path(__file__).resolve().parents[3] / '.local/music-song-studies/code-monkey'
raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(root / 'stem-Drums.mp3'),
                               '-f', 'f32le', '-ar', '8000', '-ac', '1', 'pipe:1'])
audio = np.frombuffer(raw, dtype='<f4')
size, hop, rate = 512, 64, 8000
frames = np.lib.stride_tricks.sliding_window_view(audio, size)[::hop]
spectrum = np.abs(np.fft.rfft(frames * np.hanning(size), axis=1)) ** 2
frequencies = np.fft.rfftfreq(size, 1 / rate)
times = (np.arange(len(frames)) * hop + size / 2) / rate
events = {}
for sound, low, high, threshold in [('kick', 35, 170, 5.5), ('snare', 500, 2000, 1.1), ('hat', 2500, 3900, .6)]:
    energy = np.sqrt(spectrum[:, (frequencies >= low) & (frequencies < high)].sum(axis=1))
    flux = np.r_[0, np.maximum(0, np.diff(energy))]
    peaks = np.where((flux[1:-1] >= flux[:-2]) & (flux[1:-1] > flux[2:]) & (flux[1:-1] > threshold))[0] + 1
    for index in peaks:
        beat = float(times[index] - .020) / .375
        start = round(beat * 2) / 2
        if abs(beat - start) > .16 or start < 0 or start >= 480:
            continue
        # Snare backbeats and the principal cymbal pulse; fills remain in the recording.
        if sound == 'snare' and start % 2 != 1:
            continue
        if sound == 'hat' and start % 1 != 0:
            continue
        midi, pitch = {'kick': (36, 'C2'), 'snare': (38, 'D2'), 'hat': (42, 'F#2')}[sound]
        event = {'midi': midi, 'pitch': pitch, 'start': start, 'duration': .08,
                 'part': sound, 'drum': sound, 'velocity': .35 if sound == 'hat' else .65}
        events[(sound, start)] = event
result = sorted(events.values(), key=lambda n: n['start'])
(root / 'core-drums.json').write_text(json.dumps(result, indent=2) + '\n')
print(f'Reduced the isolated drum recording to {len(result)} core kit events.')
