import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { gofExamples } from './gof-examples.mjs';
import { gofVisuals, visualDimensions } from './gof-editorial-visuals.mjs';

const root = resolve(import.meta.dirname, '..');
const file = (path) => resolve(root, path);
await mkdir(file('.local/gof-editorial-rollout'), { recursive: true });
const metadataPath = file('docs/pattern-packages/gof.json');
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
const backup = JSON.parse(
  await readFile(file('docs/pattern-packages/gof-original-articles.json'), 'utf8'),
);
const assets = file('content/assets/software-engineering/gof');
await mkdir(assets, { recursive: true });
const manifestPath = file('content/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const attribution =
  'Pattern names and original designs: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original Patternverse educational explanations, code, and illustrations.';
const source =
  'Strategy is one of the 23 patterns in Gamma, Helm, Johnson, and Vlissides, [*Design Patterns: Elements of Reusable Object-Oriented Software*](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-9780201633610). The examples, code, and illustrations here are original educational explanations.';
const checklist = [];

for (const pattern of metadata.patterns) {
  const id = pattern.id;
  const original = backup[`content/patterns/${id}.md`];
  let frontmatter = original.split('\n---\n')[0];
  frontmatter = frontmatter.replace(/^ {2}- "(?:creational|structural|behavioral)"\n/gm, '');
  frontmatter = frontmatter.replace(
    /^attribution: .*$/m,
    `attribution: ${JSON.stringify(attribution)}`,
  );
  const previousBody = original.split('\n---\n').slice(1).join('\n---\n').trim();
  const visuals = [];
  if (id === 'strategy') {
    for (const [name, caption, alt] of [
      [
        'strategy-boundary',
        'The pricing rules move behind one contract. The workflow still owns checkout; the selected strategy owns the calculation.',
        'Before, checkout contains both pricing rules. After, checkout calls a selected pricing strategy and keeps its surrounding responsibilities.',
      ],
      [
        'strategy-collaboration',
        'Selection happens at the application boundary. The workflow calls the selected strategy; the pricing contract does not choose an implementation.',
        'A customer choice selects express pricing before checkout runs. During checkout, the workflow calls express pricing; standard pricing is an unused alternative.',
      ],
    ]) {
      for (const suffix of ['', '-mobile']) {
        const content = await readFile(
          file(`docs/pattern-packages/gof-rework-pilot/${name}${suffix}.svg`),
          'utf8',
        );
        await writeFile(resolve(assets, `${name}${suffix}.svg`), content);
        manifest[`software-engineering/gof/${name}${suffix}.svg`] = visualDimensions(content);
      }
      visuals.push({
        type: 'diagram',
        public_path: `/assets/software-engineering/gof/${name}.svg`,
        caption,
        alt_text: alt,
      });
    }
  } else {
    const visual = gofVisuals[id];
    if (!visual) throw new Error(`Missing visual for ${id}`);
    for (const compact of [false, true]) {
      const name = `${id}${compact ? '-mobile' : ''}.svg`;
      const content = visual.draw(compact);
      await writeFile(resolve(assets, name), content);
      manifest[`software-engineering/gof/${name}`] = visualDimensions(content);
      if (!compact) await writeFile(file(`apps/web/static/diagrams/gof/${id}.svg`), content);
    }
    visuals.push({
      type: 'diagram',
      public_path: `/assets/software-engineering/gof/${id}.svg`,
      caption: visual.caption,
      alt_text: visual.description,
    });
  }

  let body;
  if (id === 'strategy') {
    const pilot = await readFile(
      file('docs/pattern-packages/gof-rework-pilot/strategy.md'),
      'utf8',
    );
    body = pilot.split('\n---\n').slice(1).join('\n---\n').trim();
    body = body.replace(
      /\]\(strategy-(boundary|collaboration)\.svg /g,
      '](../assets/software-engineering/gof/strategy-$1.svg ',
    );
    // Keep the formerly public diagram URL useful for cached article revisions.
    await writeFile(
      file('apps/web/static/diagrams/gof/strategy.svg'),
      await readFile(resolve(assets, 'strategy-collaboration.svg'), 'utf8'),
    );
  } else {
    const article = previousBody
      .split('\n## Pattern details')[0]
      .replace(/!\[[\s\S]*?\]\([^\n]+\)\n?/, '')
      .trim();
    const [opening, ...sections] = article.split('\n### ');
    const openingParagraphs = opening.trim().split('\n\n');
    if (sections.length !== 5 || openingParagraphs.length !== 2)
      throw new Error(`Unexpected original structure: ${id}`);
    const split = sections.map((part) => ({
      title: part.slice(0, part.indexOf('\n')).trim(),
      body: part.slice(part.indexOf('\n')).trim(),
    }));
    const example = gofExamples[id];
    if (!example) throw new Error(`Missing code for ${id}`);
    let related = split[4].body;
    const relatedParagraphs = related.split('\n\n');
    if (!pattern.related_patterns.some((title) => relatedParagraphs.at(-1).includes(title)))
      relatedParagraphs.pop();
    related = relatedParagraphs.join('\n\n');
    pattern.related_patterns.forEach((title, index) => {
      if (!related.includes(title)) throw new Error(`Missing related explanation ${id}: ${title}`);
      related = related.replace(title, `[[${pattern.related_pattern_ids[index]}|${title}]]`);
    });
    const graphic = visuals[0];
    const image = `![${graphic.alt_text}](../assets/software-engineering/gof/${id}.svg "${graphic.caption}")`;
    body = `## Purpose and problem\n\n${openingParagraphs[0]}\n\n## Core idea\n\n${openingParagraphs[1]}\n\n${image}\n\n## How it works\n\n${split[0].body}\n\n## Worked example\n\n### ${split[1].title}\n\n${split[1].body}\n\n### A small implementation\n\n${example.introduction}\n\n\`\`\`python\n${example.code}\n\`\`\`\n\n${example.explanation}\n\n### ${split[2].title}\n\n${split[2].body}\n\n## When to use it\n\n${pattern.use_when.map((line) => `- ${line}.`).join('\n')}\n\nConsider a simpler design when ${pattern.not_ideal_when.map((line) => line[0].toLowerCase() + line.slice(1)).join(', or when ')}.\n\n## Tradeoffs and common mistakes\n\n${split[3].body}\n\n## Related patterns\n\n${related}\n\n## Sources\n\n${source.replace(/^Strategy /, `${pattern.title} `)}`;
  }

  await writeFile(file(`content/patterns/${id}.md`), `${frontmatter}\n---\n\n${body.trim()}\n`);
  pattern.original_import ??= {
    category: pattern.category,
    article_sha256: pattern.article_sha256,
    article_word_count: pattern.article_word_count,
    graphic: pattern.graphic,
  };
  delete pattern.category;
  pattern.tags = pattern.tags.filter(
    (tag) => !['creational', 'structural', 'behavioral'].includes(tag),
  );
  pattern.collection = 'GoF Design Patterns';
  const neighbors = [...body.matchAll(/\[\[([a-z-]+)\|([^\]]+)\]\]/g)];
  pattern.related_pattern_ids = neighbors.map((match) => match[1]);
  pattern.related_patterns = neighbors.map((match) => match[2]);
  pattern.graphic = visuals[0];
  pattern.graphics = visuals;
  pattern.article_sha256 = createHash('sha256').update(body.trim()).digest('hex');
  pattern.article_word_count = body.trim().split(/\s+/).length;
  pattern.article_outline = [
    'Purpose and problem',
    'Core idea',
    'How it works',
    'Worked example',
    'When to use it',
    'Tradeoffs and common mistakes',
    'Related patterns',
    'Sources',
  ];
  checklist.push({ id, words: pattern.article_word_count, figures: visuals.length });
}
metadata.patterns.sort((a, b) => a.title.localeCompare(b.title, 'en'));
metadata.editorial_revision = {
  date: '2026-10-28',
  outline: 'gof-rework-pilot/outline.md',
  style: 'light-editorial',
  collection: 'One alphabetical collection; category-based navigation retired',
};
metadata.source_reference.role =
  'Canonical names and original designs; prose, code examples, and diagrams are original educational explanations.';
await writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const collection = `---\nid: "gof-design-patterns"\ntype: "collection"\ntitle: "GoF Design Patterns"\nsummary: "All 23 Gang of Four patterns, with worked examples, illustrated collaborations, code, and deliberate tradeoffs."\nstatus: "published"\nverses:\n  - "software-engineering"\ntags:\n  - "gof-design-patterns"\n  - "object-oriented-design"\nitems:\n${metadata.patterns.map((p) => `  - "${p.id}"`).join('\n')}\nattribution: ${JSON.stringify(attribution)}\n---\n\nThese 23 patterns explore recurring designs for objects and their collaborations. Each article starts with a recognizable problem, explains the core mechanism, and develops concrete examples with syntax-highlighted code and explanatory illustrations. Applicability, costs, and neighboring designs help you decide whether the extra structure is worthwhile.\n\nBrowse the patterns alphabetically. The collection is a reference, so begin with the problem you are facing and follow comparisons between related designs.\n`;
await writeFile(file('content/collections/gof-design-patterns.md'), collection);
for (const name of ['creational', 'structural', 'behavioral']) {
  try {
    await unlink(file(`content/collections/gof-${name}.md`));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
await writeFile(
  file('.local/gof-editorial-rollout/inventory.json'),
  JSON.stringify(checklist, null, 2) + '\n',
);
console.log(
  `Reworked ${checklist.length} articles with ${checklist.reduce((n, p) => n + p.figures, 0)} figures and one alphabetical collection.`,
);
