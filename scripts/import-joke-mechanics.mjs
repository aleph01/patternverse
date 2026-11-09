import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'packages/compiler/package.json'));
const { stringify } = require('yaml');
const sourcePath = resolve(root, 'docs/joke-mechanics/guide.json');
const source = await readFile(sourcePath, 'utf8');
const guide = JSON.parse(source);
const structures = guide.groups.flatMap((group) => group.structures);
const slug = (name) =>
  name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const patternIds = new Map(structures.map((s) => [s.name, `joke-${slug(s.name)}`]));
const collectionIds = guide.groups.map((g) => `joke-mechanics-${slug(g.name)}`);
const escape = (s) => s.replace(/[\\`*_[\]<>]/g, '\\$&');
const link = (label, url) => `[${escape(label)}](<${url}>)`;
const sources = guide.sources;
const generated = [];
const counts = {
  articles: structures.length,
  examples: 0,
  quotations: 0,
  descriptions: 0,
  videos: 0,
};

async function entity(directory, metadata, body) {
  const path = resolve(root, `content/${directory}/${metadata.id}.md`);
  if (metadata.id !== 'standup-comedy') {
    try {
      await access(path);
      const existing = await readFile(path, 'utf8');
      if (!existing.includes('joke-mechanics-import'))
        throw new Error(`Refusing to overwrite existing content: ${path}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `---\n${stringify(metadata).trimEnd()}\n---\n\n${body.trim()}\n\n<!-- joke-mechanics-import -->\n`,
  );
  generated.push(`content/${directory}/${metadata.id}.md`);
}

function video(linked) {
  try {
    const u = new URL(linked.url);
    const host = u.hostname;
    const id =
      host === 'youtu.be'
        ? u.pathname.slice(1)
        : ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)
          ? u.searchParams.get('v')
          : null;
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    const time = u.searchParams.get('t') ?? u.searchParams.get('start') ?? '0';
    const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(time);
    const seconds = /^\d+$/.test(time)
      ? Number(time)
      : match
        ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
        : 0;
    return { url: linked.url, title: linked.label, start_seconds: seconds };
  } catch {
    return null;
  }
}

for (const group of guide.groups) {
  for (const structure of group.structures) {
    const id = patternIds.get(structure.name);
    const title = structure.name.replace(/\s*†$/, '');
    const parts = [`*${escape(structure.move)}*`, structure.article.opening];
    if (structure.name.includes('†'))
      parts.push('This is a descriptive working label for the comic mechanism.');
    const usedSources = new Set();
    for (const [index, example] of structure.examples.entries()) {
      counts.examples++;
      usedSources.add(example.source);
      parts.push(`## Example ${index + 1} · ${example.credit}`, escape(example.context));
      if (example.presentation === 'quotation') {
        const text = guide.canonical_quotes[example.quote_id].text;
        parts.push(
          text
            .split('\n')
            .map((line) => (line ? `> ${escape(line)}  ` : '>'))
            .join('\n'),
        );
        parts.push(`— ${example.credit}`);
        counts.quotations++;
      } else {
        parts.push(example.description, `— ${example.credit}`);
        counts.descriptions++;
      }
      let candidates = (example.links ?? []).filter((l) => video(l));
      if (!candidates.length)
        candidates = [{ url: sources[example.source][1], label: 'Performance' }].filter((l) =>
          video(l),
        );
      const seen = new Set();
      for (const candidate of candidates) {
        const config = video(candidate);
        const identity = `${config.url}:${config.start_seconds}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        config.title = `${example.credit}: ${config.title}`.slice(0, 160);
        parts.push('```patternverse-video\n' + JSON.stringify(config) + '\n```');
        if (candidate.locator) parts.push(`*${escape(candidate.locator)}*`);
        counts.videos++;
      }
      parts.push(`**The turn:** ${example.why}`);
      const [, url] = sources[example.source];
      const citations = [
        link('Source', url),
        ...(example.links ?? []).filter((l) => l.url !== url).map((l) => link(l.label, l.url)),
      ];
      parts.push(citations.join(' · '));
    }
    parts.push('## What makes the structure work', structure.article.craft_note);
    const related = structure.article.related.map((name) => {
      if (!patternIds.has(name)) throw new Error(`Unresolved neighboring structure: ${name}`);
      return `[[${patternIds.get(name)}|${name.replace(/\s*†$/, '')}]]`;
    });
    parts.push('## Nearby structures', related.join(' · '));
    parts.push(
      '## Source notes',
      ...[...usedSources].map((key) => {
        const [title, url, note] = sources[key];
        return `${link(title, url)}. ${note}`;
      }),
    );
    await entity(
      'patterns',
      {
        id,
        type: 'pattern',
        title,
        summary: structure.move,
        status: 'published',
        verses: ['standup-comedy'],
        tags: ['joke-mechanics', slug(group.name)],
      },
      parts.join('\n\n'),
    );
  }
}

for (const [index, group] of guide.groups.entries()) {
  const examples = group.structures.reduce((n, s) => n + s.examples.length, 0);
  await entity(
    'collections',
    {
      id: collectionIds[index],
      type: 'collection',
      title: group.name,
      summary: group.description,
      status: 'published',
      verses: ['standup-comedy'],
      items: group.structures.map((s) => patternIds.get(s.name)),
    },
    `${group.description}\n\n${group.structures.length} structures, with ${examples} examples.\n\n` +
      group.structures
        .map((s) => `- [[${patternIds.get(s.name)}|${s.name.replace(/\s*†$/, '')}]] — ${s.move}`)
        .join('\n'),
  );
}

const method =
  'Quotations retain the guide’s complete supplied passages and published wording. Longer routines use descriptive accounts alongside recordings. Sources distinguish supplied quotations, published attributions, transcriptions and performance descriptions; a printed attribution is not a newly verified performance. Existing checked passage times are retained. Examples may illustrate several structures, and the same routine can appear in more than one article. Musical comedy and adjacent television or written material are identified in context. Descriptive working labels are marked within their articles.';
await entity(
  'collections',
  {
    id: 'joke-mechanics',
    type: 'collection',
    title: 'Joke Structures',
    summary: '42 joke structures in seven families, with 128 examples from comedians’ material.',
    status: 'published',
    verses: ['standup-comedy'],
    items: collectionIds,
  },
  `${guide.subtitle}\n\nThese concise articles explain each structure, show it in comedians’ material and identify the turn. Browse by the mechanism you want to understand; the families organize the repertoire rather than prescribing a writing sequence.\n\n` +
    guide.groups
      .map((g, i) => `- [[${collectionIds[i]}|${g.name}]] — ${g.description}`)
      .join('\n') +
    `\n\n## About the examples\n\n${method}`,
);

await entity(
  'verses',
  {
    id: 'standup-comedy',
    type: 'verse',
    title: guide.title,
    summary: guide.subtitle,
    status: 'published',
    aliases: ['Stand-up Comedy'],
  },
  `*${guide.subtitle}*\n\nExplore how jokes change an audience’s understanding through language, perspective, comparison, development and performance. Each article names a reusable comic move, shows it in comedians’ material and explains what makes the turn work.\n\nStart with [[joke-mechanics|Joke Structures]]: **42 articles and 128 examples in seven families.**\n\n` +
    guide.groups.map((g, i) => `- [[${collectionIds[i]}|${g.name}]]`).join('\n') +
    `\n\n${method}`,
);

if (
  JSON.stringify(counts) !==
  JSON.stringify({ articles: 42, examples: 128, quotations: 85, descriptions: 43, videos: 36 })
)
  throw new Error(JSON.stringify(counts));
const manifest = {
  title: guide.title,
  subtitle: guide.subtitle,
  verse_id: 'standup-comedy',
  area: 'Arts & Design',
  area_id: 'arts',
  counts,
  source_sha256: createHash('sha256').update(source).digest('hex'),
  patterns: structures.map((s) => ({
    source_article: s.article_id,
    id: patternIds.get(s.name),
    title: s.name,
  })),
  collections: collectionIds,
  files: generated,
};
await writeFile(
  resolve(root, 'docs/joke-mechanics/import-manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      counts,
      files: generated.length,
      verse: '/verse/standup-comedy',
      collection: '/collection/joke-mechanics',
    },
    null,
    2,
  ),
);
