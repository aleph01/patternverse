import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { loadAndCompileCorpus, parseMarkdownEntity, serializeEntity } from '../src/index.js';
const article = (id: string, src: string, status = 'published') =>
  `---\nid: ${id}\ntype: concept\ntitle: Materials\nstatus: ${status}\nlibraries:\n  - id: materials\n    src: ${src}\n---\n\nReference data.`;
const resource = {
  record_type: { record: { id: 'text', name: 'text' } },
  records: [{ id: 'wood', name: 'Wood' }],
};
async function fixture(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'pattern-data-'));
  try {
    await mkdir(join(directory, 'content/concepts'), { recursive: true });
    await mkdir(join(directory, 'content/assets'), { recursive: true });
    await writeFile(
      join(directory, 'patternverse.yaml'),
      'id: commons\nname: Commons\nschema_version: 1\n',
    );
    await writeFile(join(directory, 'content/assets/materials.json'), JSON.stringify(resource));
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
const load = (directory: string) =>
  loadAndCompileCorpus(
    {
      manifestPath: join(directory, 'patternverse.yaml'),
      contentDirectory: join(directory, 'content'),
      readonly: true,
    },
    { includeDrafts: false },
  );
it('registers named data generically and preserves declarations through Markdown serialization', async () =>
  fixture(async (directory) => {
    const text = article('materials', '../assets/materials.json');
    await writeFile(join(directory, 'content/concepts/materials.md'), text);
    const corpus = await load(directory);
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(corpus.libraries).toEqual({ 'commons:materials': resource });
    const parsed = parseMarkdownEntity(text, {
      sourceId: 'commons',
      sourcePath: 'concepts/materials.md',
    });
    expect(parsed.diagnostics).toEqual([]);
    expect(serializeEntity(parsed.entity!)).toContain('libraries:');
  }));
it('does not publish resource data belonging to an excluded draft', async () =>
  fixture(async (directory) => {
    await writeFile(
      join(directory, 'content/concepts/materials.md'),
      article('materials', '../assets/materials.json', 'draft'),
    );
    const corpus = await load(directory);
    expect(corpus.libraries).toBeUndefined();
  }));
it('rejects duplicate record IDs and duplicate resource registrations', async () =>
  fixture(async (directory) => {
    await writeFile(
      join(directory, 'content/concepts/materials.md'),
      article('materials', '../assets/materials.json'),
    );
    await writeFile(
      join(directory, 'content/assets/materials.json'),
      JSON.stringify({ ...resource, records: [...resource.records, ...resource.records] }),
    );
    expect((await load(directory)).diagnostics.some((d) => d.code === 'invalid-data-library')).toBe(
      true,
    );
    await writeFile(join(directory, 'content/assets/materials.json'), JSON.stringify(resource));
    await writeFile(
      join(directory, 'content/concepts/another.md'),
      article('another', '../assets/materials.json'),
    );
    expect(
      (await load(directory)).diagnostics.some((d) => d.message.includes('Duplicate data library')),
    ).toBe(true);
  }));
it('rejects escapes through relative paths and symlinks', async () =>
  fixture(async (directory) => {
    await writeFile(join(directory, 'outside.json'), JSON.stringify(resource));
    await writeFile(
      join(directory, 'content/concepts/materials.md'),
      article('materials', '../../outside.json'),
    );
    expect((await load(directory)).diagnostics.some((d) => d.code === 'invalid-data-library')).toBe(
      true,
    );
    await symlink(join(directory, 'outside.json'), join(directory, 'content/assets/link.json'));
    await writeFile(
      join(directory, 'content/concepts/materials.md'),
      article('materials', '../assets/link.json'),
    );
    expect((await load(directory)).diagnostics.some((d) => d.code === 'invalid-data-library')).toBe(
      true,
    );
  }));
