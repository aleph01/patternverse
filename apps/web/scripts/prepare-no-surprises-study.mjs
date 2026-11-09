// Prepare a private local study from the already-held MIDI; no media download is needed.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const require = createRequire(new URL('../package.json', import.meta.url));
const { Midi } = require('@tonejs/midi');
const bytes = await readFile(
  new URL('../../../.local/music-repertoire/radiohead-no-surprises.mid', import.meta.url),
);
const midi = new Midi(bytes),
  ppq = midi.header.ppq;
const source = await readFile(
  new URL('../src/internal/music-demo/no-surprises-study.ts', import.meta.url),
  'utf8',
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { noSurprisesStudy } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
);
const study = noSurprisesStudy({
  notes: midi.tracks.flatMap((t, i) =>
    t.notes.map((n) => ({
      pitch: n.name,
      midi: n.midi,
      start: n.ticks / ppq,
      duration: n.durationTicks / ppq,
      velocity: n.velocity,
      part: `source-${i}`,
    })),
  ),
  tempos: midi.header.tempos.map((t) => ({ beat: t.ticks / ppq, bpm: t.bpm })),
  markers: midi.header.meta
    .filter((m) => m.type === 'marker')
    .map((m) => ({ beat: m.ticks / ppq, label: m.text })),
});
const root = new URL('../../../.local/music-song-studies/no-surprises/', import.meta.url);
await mkdir(root, { recursive: true });
await writeFile(new URL('study.json', root), JSON.stringify(study, null, 2) + '\n');
await writeFile(
  new URL('provenance.json', root),
  JSON.stringify(
    {
      source: study.source.url,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      credits: midi.header.meta.filter((m) => m.type === 'text').map((m) => m.text.trim()),
      sourceMarkers: midi.header.meta.filter((m) => m.type === 'marker'),
      sourcePPQ: ppq,
      sourceNotes: midi.tracks.reduce((sum, t) => sum + t.notes.length, 0),
      retainedNotes: study.notes.length,
      trimmedCountInBeats: 4,
      finalSourceBeat: 288,
      transformations: [
        'Source section markers retained and numbered',
        'Pitch and note timing preserved after count-in removal',
        'Source tempo changes retained',
        'Duplicate parts and tom fills omitted',
        'Authored harmonic roots with onset or arpeggio-window voicing',
      ],
      use: 'Private local review; public redistribution permission not established.',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Prepared ${study.beats / 4} bars, ${study.sections.length} sections, ${study.harmony.length} harmony labels and ${study.notes.length} MIDI notes.`,
);
