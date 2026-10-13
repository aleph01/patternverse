import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hasErrors, loadAndCompileCorpus } from '@patternverse/compiler';
import { z } from 'zod';
import { createPublicLibrary } from './library.js';
import type { InspectDefinition } from './definition.js';

// Both src and dist entrypoints sit three levels below the repository root.
const repository = new URL('../../../', import.meta.url);
const patternName = z.string().regex(/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/);

/** Fixed repository-owned sources only; tool arguments can never select a path. */
export async function loadPublicCorpus() {
  const corpus = await loadAndCompileCorpus(
    {
      manifestPath: fileURLToPath(new URL('patternverse.yaml', repository)),
      contentDirectory: fileURLToPath(new URL('content/', repository)),
      readonly: true,
    },
    { includeDrafts: false },
  );
  if (hasErrors(corpus.diagnostics) || corpus.sources.some((source) => source.id !== 'commons'))
    throw new Error('Published Commons could not be loaded. Run content validation.');
  const dependencySources: Record<string, string> = {};
  const therapy = z
    .array(z.object({ name: patternName }))
    .parse(
      JSON.parse(
        await readFile(new URL('packages/therapy-patterns/catalog.json', repository), 'utf8'),
      ),
    );
  const reframing = z
    .object({ patterns: z.array(z.object({ id: patternName })) })
    .parse(
      JSON.parse(
        await readFile(new URL('packages/reframing-patterns/catalog.json', repository), 'utf8'),
      ),
    );
  for (const name of ['therapy.ready', ...therapy.map((item) => item.name)])
    dependencySources[name] = await readFile(
      new URL(`packages/therapy-patterns/patterns/${name}.pattern.md`, repository),
      'utf8',
    );
  for (const { id } of reframing.patterns)
    dependencySources[id] = await readFile(
      new URL(`packages/reframing-patterns/patterns/${id}.pattern.md`, repository),
      'utf8',
    );
  return { corpus, dependencySources };
}

export async function loadPublicLibrary(inspect: InspectDefinition) {
  const { corpus, dependencySources } = await loadPublicCorpus();
  return createPublicLibrary(corpus, dependencySources, inspect);
}
