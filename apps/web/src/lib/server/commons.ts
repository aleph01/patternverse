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

const repositoryRoot = resolve(process.cwd(), '../..');

const shouldIncludeDrafts = (): boolean =>
  dev || process.env.PATTERNVERSE_INCLUDE_DRAFTS === 'true';

export const loadCommons = async (): Promise<CompiledCorpus> => {
  const corpus = await loadAndCompileCorpus(
    {
      manifestPath: resolve(repositoryRoot, 'patternverse.yaml'),
      contentDirectory: resolve(repositoryRoot, 'content'),
      readonly: true,
    },
    { includeDrafts: shouldIncludeDrafts() },
  );

  if (hasErrors(corpus.diagnostics)) {
    throw new Error(
      `Patternverse Commons could not be loaded:\n\n${corpus.diagnostics.map(formatDiagnostic).join('\n\n')}`,
    );
  }

  return corpus;
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
};

export const summarizeEntity = (entity: CompiledEntity): EntitySummary => ({
  id: entity.id,
  sourceId: entity.sourceId,
  type: entity.type,
  title: entity.title,
  summary: entity.summary ?? '',
  status: entity.status,
  url: `/${entity.type}/${entity.id}`,
});
