import { loadAndCompileCorpus, hasErrors } from '@patternverse/compiler';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const corpus = await loadAndCompileCorpus(
  {
    manifestPath: resolve('../../patternverse.yaml'),
    contentDirectory: resolve('../../content'),
    readonly: true,
  },
  { includeDrafts: false },
);
if (hasErrors(corpus.diagnostics))
  throw new Error('Cannot build contributions manifest from invalid content.');
const manifest = Object.fromEntries(
  corpus.entities
    .filter((e) => e.status === 'published' && e.type !== 'verse')
    .map((e) => [
      `/${e.type}/${e.id}`,
      {
        sourceId: e.sourceId,
        id: e.id,
        type: e.type,
        title: e.title,
        path: `/${e.type}/${e.id}`,
        revision: createHash('sha256').update(e.body).digest('hex'),
      },
    ]),
);
await writeFile('dist/articles.json', JSON.stringify(manifest));

const index = new Map(corpus.entities.map((entity) => [`${entity.sourceId}:${entity.id}`, entity]));
const scope = (refs: readonly { sourceId: string; entityId: string }[]) =>
  refs.flatMap((ref) => {
    const entity = index.get(`${ref.sourceId}:${ref.entityId}`);
    return entity?.status === 'published'
      ? [{ id: `${entity.sourceId}:${entity.id}`, title: entity.title }]
      : [];
  });
const taxonomy = Object.fromEntries(
  corpus.entities
    .filter((entity) => entity.status === 'published' && entity.type !== 'verse')
    .map((entity) => [
      `/${entity.type}/${entity.id}`,
      { verses: scope(entity.verseMemberships), collections: scope(entity.collectionMemberships) },
    ]),
);
await writeFile('dist/review-catalog.json', JSON.stringify(taxonomy));
