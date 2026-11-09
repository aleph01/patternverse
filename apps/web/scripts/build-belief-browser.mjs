import { readFile, writeFile } from 'node:fs/promises';

const source = new URL('../src/lib/article-widgets/beliefs/', import.meta.url);
const library = JSON.parse(await readFile(new URL('library-v0.8.json', source), 'utf8'));
const recognitionCues = JSON.parse(
  await readFile(new URL('recognition-cues.json', source), 'utf8'),
);
const ids = new Set(library.beliefs.map(({ id }) => id));
if (
  Object.keys(recognitionCues).length !== ids.size ||
  Object.entries(recognitionCues).some(
    ([id, cues]) =>
      !ids.has(id) ||
      !Array.isArray(cues) ||
      cues.length < 2 ||
      new Set(cues).size !== cues.length ||
      cues.some((cue) => typeof cue !== 'string' || !cue.trim() || cue.length > 180),
  )
)
  throw new Error(
    'Recognition cues must cover every canonical belief with distinct bounded phrases.',
  );
const template = await readFile(new URL('browser.html', source), 'utf8');
// Keep catalogue text inert even if a future statement contains an HTML end tag.
const json = JSON.stringify(library).replaceAll('<', '\\u003c');
const html = template.replace('<!-- BELIEF_LIBRARY -->', () => json);
if (html.length > 512_000) throw new Error('Belief browser exceeds the article widget limit.');
await writeFile(
  new URL('../../../content/assets/widgets/identify-limiting-beliefs.html', import.meta.url),
  html,
);

// Both browsing and AI lookup derive from the same canonical records.
const fields = {
  id: 'text',
  statement: 'text',
  meaning: 'text',
  variants: { list: 'text' },
  questions: { list: 'text' },
  forms: { list: 'text' },
  domain: 'text',
  family: 'text',
  subfamily: 'text',
  readings: { list: { record: { label: 'text', content: 'text', confirmation: 'boolean' } } },
  open: { list: 'text' },
  notEntailed: { list: 'text' },
  context: 'text',
  recognition_cues: { list: 'text' },
  theme_name: 'text',
  family_name: 'text',
  subfamily_name: 'text',
};
const records = library.beliefs.map((belief) => {
  const domain = library.domains.find((domain) => domain.id === belief.domain);
  const family = domain.families.find((family) => family.id === belief.family);
  const subfamily = family.subfamilies.find((subfamily) => subfamily.id === belief.subfamily);
  return {
    ...belief,
    recognition_cues: recognitionCues[belief.id],
    theme_name: domain.title,
    family_name: family.title,
    subfamily_name: subfamily.title,
  };
});
await writeFile(
  new URL('../../../content/assets/libraries/limiting-beliefs.json', import.meta.url),
  JSON.stringify({ record_type: { record: fields }, records }) + '\n',
);
