import { writeFile } from 'node:fs/promises';
import { loadPublicCorpus } from '../../mcp/src/corpus.js';
import { loadDefinitionInspector } from '../../mcp/src/definition.js';
import { THERAPY_LIBRARY, REFRAMING_LIBRARY } from '@patternverse/workspace/public-practices';
import type { PracticeManifest, PublicPractice } from './manifest.js';

const { corpus, dependencySources } = await loadPublicCorpus();
const inspect = await loadDefinitionInspector();
const practices: Record<string, PublicPractice> = {};
for (const entry of corpus.entities) {
  if (
    entry.sourceId !== 'commons' ||
    entry.status !== 'published' ||
    (entry.type !== 'pattern' && entry.type !== 'practice')
  )
    continue;
  if (entry.languagePracticeSource) {
    const sources = { 'editor.preview': entry.languagePracticeSource };
    inspect({ root: 'editor.preview', patterns: sources });
    practices[entry.id] = { transport: 'source', root: 'editor.preview', sources };
  } else {
    const technique = [...THERAPY_LIBRARY, ...REFRAMING_LIBRARY].find(
      (item) => item.slug === entry.id,
    );
    if (!technique || !dependencySources[technique.id]) continue;
    const definition = inspect({ root: technique.id, patterns: dependencySources });
    practices[entry.id] = { transport: 'catalog', root: technique.id, sources: definition.sources };
  }
}
await writeFile(
  new URL('./practices.json', import.meta.url),
  JSON.stringify(practices satisfies PracticeManifest),
);
console.log(
  `Validated ${Object.keys(practices).length} published practice definitions for guided AI.`,
);
