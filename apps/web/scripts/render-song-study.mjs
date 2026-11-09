// Rebuild the original recording from the exact same event list used by the player.
// Requires the existing Salamander samples and ffmpeg; no network or additional packages.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const source = new URL('../src/lib/music/song-study.ts', import.meta.url);
const code = ts.transpileModule(await readFile(source, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { songStudy } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);
const rate = 22050,
  secondsPerBeat = 60 / songStudy.tempo;
const length = Math.ceil(songStudy.beats * secondsPerBeat * rate);
const mix = new Float32Array(length),
  samples = {};
for (const [midi, name] of [
  [48, 'C3'],
  [60, 'C4'],
]) {
  const file = fileURLToPath(
    new URL(`../static/audio/piano/salamander/${name}.mp3`, import.meta.url),
  );
  const data = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-f', 'f32le', '-ar', String(rate), '-ac', '1', 'pipe:1'],
    { maxBuffer: 16e6 },
  );
  samples[midi] = new Float32Array(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  );
}
let noiseSeed = 7;
function noise() {
  noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0;
  return noiseSeed / 2147483648 - 1;
}
for (const note of songStudy.notes) {
  const start = Math.round(note.start * secondsPerBeat * rate);
  const duration = note.drum ? 0.16 : note.duration * secondsPerBeat + 0.12;
  const count = Math.min(length - start, Math.ceil(duration * rate));
  const sample = note.midi < 54 ? 48 : 60,
    buffer = samples[sample],
    speed = 2 ** ((note.midi - sample) / 12);
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    let value;
    if (note.drum === 'kick')
      value =
        Math.sin(2 * Math.PI * (42 * t + 73 * 0.025 * (1 - Math.exp(-t / 0.025)))) *
        Math.exp(-t * 28) *
        0.4;
    else if (note.drum)
      value =
        noise() *
        Math.exp(-t * (note.drum === 'hat' ? 100 : 32)) *
        (note.drum === 'hat' ? 0.045 : 0.18);
    else {
      const p = i * speed,
        index = Math.floor(p),
        fraction = p - index;
      const amplitude = (buffer[index] ?? 0) * (1 - fraction) + (buffer[index + 1] ?? 0) * fraction;
      const envelope = Math.min(1, t / 0.012) * Math.max(0, Math.min(1, (duration - t) / 0.12));
      value = amplitude * envelope * (note.part === 'bass' ? 0.55 : 0.5);
    }
    mix[start + i] += value * (note.velocity ?? 0.6);
  }
}
let peak = 0;
for (const sample of mix) peak = Math.max(peak, Math.abs(sample));
const wav = Buffer.alloc(44 + length * 2);
wav.write('RIFF');
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(length * 2, 40);
for (let i = 0; i < length; i++)
  wav.writeInt16LE(Math.round((mix[i] / Math.max(peak, 1)) * 0.85 * 32767), 44 + i * 2);
const target = new URL('../static/audio/music/', import.meta.url);
await mkdir(target, { recursive: true });
execFileSync(
  'ffmpeg',
  [
    '-v',
    'error',
    '-y',
    '-i',
    'pipe:0',
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '64k',
    '-metadata',
    'title=Patternverse original song structure study',
    '-metadata',
    'artist=Patternverse; piano samples by Alexander Holm',
    '-metadata',
    'copyright=Contains Salamander Grand Piano samples, CC BY 3.0',
    fileURLToPath(new URL('song-study.mp3', target)),
  ],
  { input: wav },
);
await writeFile(
  new URL('ATTRIBUTION.txt', target),
  `Patternverse original song-structure study\n\nComposition, arrangement and percussion: original Patternverse demonstration.\nRendered from apps/web/src/lib/music/song-study.ts by apps/web/scripts/render-song-study.mjs.\n64 bars, 4/4, 96 bpm; 160 seconds. No third-party song or commercial recording is included.\n\nPiano samples: Salamander Grand Piano by Alexander Holm, CC BY 3.0.\nhttps://creativecommons.org/licenses/by/3.0/\nhttps://archive.org/details/SalamanderGrandPianoV3\n\nAdaptation: C3/C4 MP3 samples resampled to the authored pitches, enveloped, mixed with original\npercussion, and encoded as a mono MP3 recording. See ../piano/salamander/ATTRIBUTION.txt for\nthe sample distribution and full source attribution. No endorsement is implied.\n`,
);
console.log(
  `Rendered ${songStudy.notes.length} authored events into ${length / rate} seconds of original audio.`,
);
