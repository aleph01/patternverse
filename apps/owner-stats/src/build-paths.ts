import { loadAndCompileCorpus, hasErrors } from '@patternverse/compiler';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { publicUsagePaths } from '../../web/src/lib/public-usage.js';

const corpus = await loadAndCompileCorpus(
  {
    manifestPath: resolve('../../patternverse.yaml'),
    contentDirectory: resolve('../../content'),
    readonly: true,
  },
  { includeDrafts: false },
);
if (hasErrors(corpus.diagnostics))
  throw new Error('Cannot build analytics paths from invalid content.');
const paths = [
  ...publicUsagePaths,
  ...corpus.entities
    .filter((entity) => entity.status === 'published' && entity.type !== 'verse')
    .map((entity) => `/${entity.type}/${entity.id}`),
];
await writeFile('dist/public-paths.json', JSON.stringify([...new Set(paths)].sort()));
