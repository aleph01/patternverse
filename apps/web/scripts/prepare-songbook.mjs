// Run from the repository root: node apps/web/scripts/prepare-songbook.mjs
// Uses only already-acquired private MIDI; never downloads or publishes music.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(new URL('../package.json', import.meta.url));
const { Midi } = require('@tonejs/midi');
const { build } = createRequire(require.resolve('vite'))('esbuild');
const compiled = await build({
  stdin: {
    contents: `export { importMidi } from './apps/web/src/lib/music/midi.ts'; export { songbookStudy } from './apps/web/src/internal/music-demo/songbook-study.ts';`,
    resolveDir: repository,
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  logLevel: 'error',
});
const compiledModule = { exports: {} };
new Function('module', 'exports', 'require', compiled.outputFiles[0].text)(
  compiledModule,
  compiledModule.exports,
  require,
);
const { importMidi, songbookStudy } = compiledModule.exports;
const catalog = JSON.parse(
  await readFile(resolve(repository, 'docs/music-course/songbook.json'), 'utf8'),
);
const output = resolve(repository, '.local/music-song-studies/songbook');
await mkdir(output, { recursive: true });
const entries = [];
const failures = [];
for (const plan of catalog.songs.filter((entry) => entry.state === 'prepared-draft')) {
  try {
    const path = resolve(
      repository,
      '.local',
      plan.directory ?? 'music-repertoire',
      plan.localFile,
    );
    const bytes = await readFile(path);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== plan.sha256)
      throw new Error('Source hash changed; review the replacement MIDI first.');
    const midi = new Midi(bytes);
    const sourceBeats = midi.durationTicks / midi.header.ppq;
    const sourceSeconds = midi.duration;
    const sourceNotes = midi.tracks.reduce((sum, track) => sum + track.notes.length, 0);
    const tracks = midi.tracks.map((track, index) => ({
      index,
      label:
        plan.trackLabels?.[String(index)] ??
        (track.name.trim() || track.instrument.name || `Part ${index + 1}`),
    }));
    let droppedZeroLengthNotes = 0;
    for (const [index, track] of midi.tracks.entries()) {
      if (plan.omitTracks?.includes(index)) track.notes = [];
      if (plan.dropZeroLengthNotes) {
        const valid = track.notes.filter((note) => note.durationTicks !== 0);
        droppedZeroLengthNotes += track.notes.length - valid.length;
        track.notes = valid;
      }
    }
    // Remove reviewed duplicates before the importer's lane limit, keeping source track indices.
    const prepared = plan.omitTracks?.length || plan.dropZeroLengthNotes ? midi.toArray() : bytes;
    const source = importMidi(
      prepared.buffer.slice(prepared.byteOffset, prepared.byteOffset + prepared.byteLength),
      plan.localFile,
    );
    // MIDI re-encoding can round microseconds per quarter note. Keep the original tempo events.
    source.tempos = midi.header.tempos.map((event) => ({
      beat: event.ticks / midi.header.ppq,
      bpm: event.bpm,
    }));
    source.tempo = source.tempos.findLast((event) => event.beat === 0)?.bpm ?? 120;
    source.beats = Math.max(source.beats, sourceBeats);
    const study = songbookStudy(source, plan, tracks);
    await writeFile(resolve(output, `${plan.id}.json`), JSON.stringify(study) + '\n');
    await writeFile(
      resolve(output, `${plan.id}.provenance.json`),
      JSON.stringify(
        {
          source: plan.source,
          download: plan.download,
          sha256,
          sourceSeconds,
          sourcePPQ: midi.header.ppq,
          sourceNotes,
          retainedNotes: study.notes.length,
          mapStatus: plan.mapStatus,
          review: plan.review,
          omittedSourceTracks: plan.omitTracks ?? [],
          droppedZeroLengthNotes,
          credits: midi.header.meta
            .filter((m) => m.type === 'text' && m.ticks === 0)
            .map((m) => m.text.trim())
            .filter((text) => !/^[@/\\]/.test(text)),
          tracks,
        },
        null,
        2,
      ) + '\n',
    );
    entries.push({
      id: study.id,
      title: study.title,
      mapStatus: plan.mapStatus,
      url: `/song-studies/songbook/${plan.id}.json`,
    });
    console.log(`${plan.title}: ${study.sections.length} sections, ${study.notes.length} notes`);
  } catch (error) {
    failures.push({ id: plan.id, error: error.message });
    console.error(`${plan.title}: ${error.message}`);
  }
}
await writeFile(
  resolve(output, 'index.json'),
  JSON.stringify({ entries, failures }, null, 2) + '\n',
);
console.log(`Prepared ${entries.length} additional song studies; ${failures.length} failures.`);
if (failures.length) process.exitCode = 1;
