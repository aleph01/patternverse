import { readFile, writeFile } from 'node:fs/promises';
import {
  library,
  records,
  originalRecords,
  subfamilies,
} from '../src/lib/article-widgets/self-acceptability/library.mjs';

const ids = records.map((record) => record.id);
if (new Set(ids).size !== ids.length) throw new Error('Recognition entry IDs must be unique.');
const judgments = new Set(library.judgments.map((judgment) => judgment.id));
const statements = new Set();
for (const record of records) {
  if (!judgments.has(record.judgment) || !record.subjects.length || !record.statement.trim())
    throw new Error(`Incomplete recognition entry: ${record.id}`);
  const normalized = record.statement
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  if (statements.has(normalized)) throw new Error(`Duplicate example: ${record.id}`);
  statements.add(normalized);
  if (
    !subfamilies.some(
      (family) => family.id === record.subfamily_id && family.domain === record.domain,
    )
  )
    throw new Error(`Invalid example grouping: ${record.id}`);
}
for (const family of subfamilies) {
  const count = records.filter((record) => record.subfamily_id === family.id).length;
  if (count < 4 || count > 6)
    throw new Error(`Expected 4–6 examples in ${family.id}, found ${count}`);
}
for (const original of originalRecords) {
  const current = records.find((record) => record.id === original.id);
  for (const [key, value] of Object.entries(original)) {
    if (JSON.stringify(current[key]) !== JSON.stringify(value))
      throw new Error(`Changed original field ${original.id}.${key}`);
  }
}

const template = await readFile(
  new URL('../src/lib/article-widgets/self-acceptability/browser.html', import.meta.url),
  'utf8',
);
const html = template.replace('<!-- SELF_ACCEPTABILITY_LIBRARY -->', () =>
  JSON.stringify(library).replaceAll('<', '\\u003c'),
);
if (Buffer.byteLength(html) > 512_000) throw new Error('Recognition browser exceeds widget limit.');
await writeFile(
  new URL('../../../content/assets/widgets/explore-what-feels-wrong.html', import.meta.url),
  html,
);
const fields = {
  id: 'text',
  statement: 'text',
  domain: 'text',
  domain_name: 'text',
  family_name: 'text',
  subfamily_id: 'text',
  scope: 'text',
  subjects: { list: 'text' },
  judgment: 'text',
  judgment_name: 'text',
  recognition_cues: { list: 'text' },
  clarification: 'text',
  meaning_boundary: 'text',
};
const resource = JSON.stringify({ record_type: { record: fields }, records }) + '\n';
if (Buffer.byteLength(resource) > 1024 * 1024)
  throw new Error('Example catalogue exceeds the resource limit.');
await writeFile(
  new URL('../../../content/assets/libraries/self-acceptability.json', import.meta.url),
  resource,
);
console.log(
  `${library.domains.length} domains, ${subfamilies.length} subfamilies, ${records.length} examples; widget ${Buffer.byteLength(html)} bytes; resource ${Buffer.byteLength(resource)} bytes.`,
);
