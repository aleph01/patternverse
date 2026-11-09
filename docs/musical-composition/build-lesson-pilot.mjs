import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const web = join(repository, 'apps/web');
const require = createRequire(join(web, 'package.json'));
const viteRequire = createRequire(require.resolve('vite'));
const { build } = viteRequire('esbuild');
const folder = join(repository, '.local/music-lessons');
await mkdir(folder, { recursive: true });
const toolsFile = join(folder, 'lesson-tools.cjs');
// Bundle pure authoring helpers with the installed Vite toolchain. No server or port.
await build({
  stdin: {
    contents: [
      ['importMidi', 'src/lib/music/midi.ts'],
      ['repertoireExcerpt', 'src/internal/music-demo/excerpt.ts'],
      ['repertoireCatalog', 'src/internal/music-demo/catalog.ts'],
      [
        'createIntervalLesson, createBorrowingLesson, createSyncopationLesson',
        'src/lib/music/lesson-pilot.ts',
      ],
      ['compositionExamples', 'src/lib/music/composition-examples.ts'],
    ]
      .map(([names, path]) => `export { ${names} } from ${JSON.stringify(join(web, path))};`)
      .join('\n'),
    resolveDir: web,
    sourcefile: 'music-lesson-tools.ts',
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: toolsFile,
});
const { importMidi, repertoireExcerpt, repertoireCatalog, compositionExamples, ...pilot } = require(
  toolsFile,
);
const sources = [];
const read = async (id) => {
  const entry = repertoireCatalog.find((item) => item.id === id);
  if (!entry) throw new Error(`Missing catalog entry ${id}`);
  const path = join(repository, '.local/music-repertoire', entry.file);
  const bytes = await readFile(path);
  sources.push({
    id,
    source: entry.source,
    passage: entry.passage,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
  return repertoireExcerpt(importMidi(Uint8Array.from(bytes).buffer, entry.file), entry);
};
const lessons = [
  pilot.createIntervalLesson(await read('withers-lean-on-me-demo')),
  pilot.createBorrowingLesson(await read('radiohead-no-surprises')),
  pilot.createSyncopationLesson(
    await read('wonder-superstition-demo'),
    compositionExamples.find((item) => item.id === 'syncopation'),
  ),
];
for (const lesson of lessons) {
  await writeFile(join(folder, `${lesson.articleId}.json`), JSON.stringify(lesson, null, 2) + '\n');
  console.log(`${lesson.articleId}: ${lesson.steps.length} guided steps`);
}
await writeFile(
  join(folder, 'sources.json'),
  JSON.stringify(
    {
      date: '2026-10-29',
      sources,
      scope:
        'Local draft lesson reductions. Reference checks cover the taught relationships, not a certified note-for-note performance transcription.',
    },
    null,
    2,
  ) + '\n',
);
