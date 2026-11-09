// Local, noncommercial repertoire fixture. Audio and generated MIDI never enter static/.
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const require = createRequire(new URL('../package.json', import.meta.url));
const { Midi } = require('@tonejs/midi');
const root = new URL('../../../.local/music-song-studies/code-monkey/', import.meta.url);
execFileSync(
  'python3',
  [fileURLToPath(new URL('./transcribe-code-monkey-drums.py', import.meta.url))],
  { stdio: 'inherit' },
);
const source = await readFile(
  new URL('../src/internal/music-demo/code-monkey-study.ts', import.meta.url),
  'utf8',
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { codeMonkeyStudy } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
);
const drums = JSON.parse(await readFile(new URL('core-drums.json', root), 'utf8'));
const study = codeMonkeyStudy(drums);
await writeFile(new URL('study.json', root), JSON.stringify(study, null, 2) + '\n');
const midi = new Midi();
midi.header.setTempo(study.tempo);
midi.header.timeSignatures = [{ ticks: 0, timeSignature: [4, 4], measures: 0 }];
for (const [i, part] of study.tracks.entries()) {
  const track = midi.addTrack();
  track.name = part.label;
  track.channel = part.drum ? 9 : i;
  track.instrument.number = 0;
  for (const note of study.notes.filter((n) => n.part === part.id))
    track.addNote({
      midi: note.midi,
      time: (note.start * 60) / study.tempo,
      duration: (note.duration * 60) / study.tempo,
      velocity: note.velocity,
    });
}
await writeFile(new URL('study.mid', root), Buffer.from(midi.toArray()));
await writeFile(
  new URL('provenance.json', root),
  JSON.stringify(
    {
      artist: 'Jonathan Coulton',
      song: 'Code Monkey',
      recording:
        'https://www.jonathancoulton.com/wp-content/uploads/encodes/Thing_a_Week_Three/mp3/03_Code_Monkey_mp3_118604e.mp3',
      chordChart: 'https://www.jonathancoulton.com/chords/code-monkey/',
      permission: 'https://www.jonathancoulton.com/faq/',
      stems: 'https://www.jonathancoulton.com/source/',
      archive: 'https://archive.org/details/JonathanCoultonJoCoLooksBackSourceTracks',
      originalStemRelease: 'https://ccmixter.org/files/jcoulton/8021',
      timing: {
        bpm: 160,
        offsetSeconds: study.recording.offsetSeconds,
        checkedAgainst:
          'Bass, lead vocal and drum waveforms across seven positions; under 2 ms residual drift',
      },
      reduction:
        'Artist-chart harmony and a core kit reduction; passing guitar notes and drum fills omitted. Bridge connecting details remain simplified.',
      use: 'Private local noncommercial demo only; excluded from the public application build.',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Prepared ${study.sections.length} sections, ${study.harmony.length} harmonic events, ${drums.length} drum events and a MIDI file.`,
);
