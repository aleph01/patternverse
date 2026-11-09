import { resolve } from '$app/paths';
import type { LocalWorkspace } from '@patternverse/workspace';
import {
  createArticleReferenceLoader,
  type MiraArticleReference,
} from '$lib/mira/article-reference';
import { readableArticleSource } from '$lib/mira/article-source';
import { renderMarkdownPreview } from '$lib/client/markdown-preview';

export type BearingsReadingPattern = Readonly<{
  sourceId: string;
  id: string;
  title: string;
  summary: string;
}>;
export type BearingsArticle = MiraArticleReference;

/** Read full articles on demand; private sources are resolved only in local storage. */
export function loadBearingsArticle(
  pattern: BearingsReadingPattern,
  workspace: Pick<LocalWorkspace, 'getEntity'>,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<BearingsArticle> {
  const load = createArticleReferenceLoader({
    publicReference: async (id) => {
      const response = await fetcher(resolve('/mira/reference/[id]', { id }), { signal });
      if (!response.ok)
        throw new Error('This article could not be loaded. Check your connection and try again.');
      return response.json();
    },
    personalReference: async (id) => {
      signal.throwIfAborted();
      const entity = await workspace.getEntity(id);
      signal.throwIfAborted();
      if (!entity || entity.sourceId !== 'personal' || entity.type !== 'pattern') return undefined;
      const body = readableArticleSource(entity.body);
      const html = await renderMarkdownPreview(body);
      signal.throwIfAborted();
      return {
        sourceId: entity.sourceId,
        id: entity.id,
        title: entity.title,
        summary: entity.summary ?? '',
        body,
        html,
        standaloneHref: null,
      };
    },
  });
  return load({ ...pattern, type: 'pattern' });
}
