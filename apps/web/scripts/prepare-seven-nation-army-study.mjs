// Uses the existing privately held MIDI; no recording or network download is needed.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const require = createRequire(new URL('../package.json', import.meta.url));
const { Midi } = require('@tonejs/midi');
const original = new URL(
  '../../../.local/music-repertoire/white-stripes-seven-nation-army.mid',
  import.meta.url,
);
const root = new URL('../../../.local/music-song-studies/seven-nation-army/', import.meta.url);
const bytes = await readFile(original),
  midi = new Midi(bytes);
const source = await readFile(
  new URL('../src/internal/music-demo/seven-nation-army-study.ts', import.meta.url),
  'utf8',
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { sevenNationArmyStudy } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
);
const study = sevenNationArmyStudy(
  midi.tracks.flatMap((track, i) =>
    track.notes.map((n) => ({
      pitch: n.name,
      midi: n.midi,
      start: n.ticks / midi.header.ppq,
      duration: n.durationTicks / midi.header.ppq,
      part: `source-${i}`,
      velocity: n.velocity,
    })),
  ),
);
await mkdir(root, { recursive: true });
await writeFile(new URL('study.json', root), JSON.stringify(study, null, 2) + '\n');
await writeFile(
  new URL('provenance.json', root),
  JSON.stringify(
    {
      source: study.source.url,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      sourceNotes: midi.tracks.reduce((n, t) => n + t.notes.length, 0),
      retainedNotes: study.notes.length,
      musicalBeats: study.beats,
      sourceTempo: 120,
      transformations: [
        'Pitch and note timing preserved',
        'Six reading parts; pitched parts played on piano',
        'Low tom omitted',
        'Editorial sections and harmonic labels',
      ],
      use: 'Private local review; no public redistribution permission established.',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Prepared ${study.beats / 4} bars, ${study.sections.length} sections, ${study.harmony.length} harmony labels and ${study.notes.length} MIDI notes.`,
);
