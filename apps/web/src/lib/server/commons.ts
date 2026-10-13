import { dev } from '$app/environment';
import {
  entityRefKey,
  formatDiagnostic,
  hasErrors,
  loadAndCompileCorpus,
  type CompiledCorpus,
  type CompiledEntity,
} from '@patternverse/compiler';
import { resolve } from 'node:path';
import type { EntityRef } from '@patternverse/schema';

const repositoryRoot = resolve(process.cwd(), '../..');

// Server-module lifetime only: each build starts fresh. Draft and public snapshots
// must never share an entry; private workspace content is not loaded here.
const snapshots = new Map<boolean, Promise<CompiledCorpus>>();

const shouldIncludeDrafts = (): boolean =>
  dev || process.env.PATTERNVERSE_INCLUDE_DRAFTS === 'true';

const compileCommons = async (includeDrafts: boolean): Promise<CompiledCorpus> => {
  const corpus = await loadAndCompileCorpus(
    {
      manifestPath: resolve(repositoryRoot, 'patternverse.yaml'),
      contentDirectory: resolve(repositoryRoot, 'content'),
      readonly: true,
    },
    { includeDrafts },
  );

  if (hasErrors(corpus.diagnostics)) {
    throw new Error(
      `Patternverse commons could not be loaded:\n\n${corpus.diagnostics.map(formatDiagnostic).join('\n\n')}`,
    );
  }

  return corpus;
};

export const loadCommons = (): Promise<CompiledCorpus> => {
  const includeDrafts = shouldIncludeDrafts();
  // Content/manifest edits trigger a browser reload in Vite. Re-read on every
  // development request rather than retaining a stale snapshot across reloads.
  if (dev) return compileCommons(includeDrafts);

  const existing = snapshots.get(includeDrafts);
  if (existing) return existing;

  // Cache the in-flight promise too, so concurrent route loads compile once.
  const snapshot = compileCommons(includeDrafts).catch((error: unknown) => {
    snapshots.delete(includeDrafts);
    throw error;
  });
  snapshots.set(includeDrafts, snapshot);
  return snapshot;
};

export const compiledEntityIndex = (corpus: CompiledCorpus): ReadonlyMap<string, CompiledEntity> =>
  new Map(corpus.entities.map((entity) => [entityRefKey(entity.ref), entity] as const));

export type EntitySummary = {
  readonly id: string;
  readonly sourceId: string;
  readonly type: CompiledEntity['type'];
  readonly title: string;
  readonly summary: string;
  readonly status: CompiledEntity['status'];
  readonly url: string;
  readonly collectionNames?: readonly string[];
  readonly collectionItems?: readonly EntityRef[];
};

export const summarizeEntity = (entity: CompiledEntity): EntitySummary => ({
  id: entity.id,
  sourceId: entity.sourceId,
  type: entity.type,
  title: entity.title,
  summary: entity.summary ?? '',
  status: entity.status,
  url: `/${entity.type}/${entity.id}`,
  ...(entity.type === 'collection' ? { collectionItems: entity.collectionItems } : {}),
});
