import { writeFile } from 'node:fs/promises';
import { loadPublicCorpus } from './corpus.js';
import { loadDefinitionInspector } from './definition.js';
import { compilePublicSnapshot } from './snapshot.js';

const { corpus, dependencySources } = await loadPublicCorpus();
const snapshot = compilePublicSnapshot(corpus, dependencySources, await loadDefinitionInspector());
await writeFile(new URL('./public-snapshot.json', import.meta.url), JSON.stringify(snapshot));
console.log(
  `Public MCP snapshot: ${snapshot.corpus.entities.length} entries, ${Object.keys(snapshot.definitions).length} validated practices.`,
);
