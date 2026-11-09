import type { MiraPatternSummary } from './context';

export type MiraArticleReference = Readonly<{
  sourceId: string;
  id: string;
  title: string;
  summary: string;
  body: string;
  html: string;
  standaloneHref: string | null;
  practiceSource?: string;
}>;
export const articleReferenceKey = (pattern: { sourceId: string; id: string }) =>
  `${pattern.sourceId}:${pattern.id}`;

/** Per-host memory cache. Personal sources never fall back to a public record with the same ID. */
export function createArticleReferenceLoader(ports: {
  publicReference: (id: string) => Promise<unknown>;
  personalReference: (id: string) => Promise<MiraArticleReference | undefined>;
  practiceWorksheet?: (source: string) => Promise<{ body: string; html: string }>;
}) {
  const cache = new Map<string, Promise<MiraArticleReference>>();
  return (pattern: MiraPatternSummary): Promise<MiraArticleReference> => {
    const key = articleReferenceKey(pattern);
    const existing = cache.get(key);
    if (existing) return existing;
    const pending = (async () => {
      const value =
        pattern.sourceId === 'personal'
          ? await ports.personalReference(pattern.id)
          : pattern.sourceId === 'commons'
            ? await ports.publicReference(pattern.id)
            : undefined;
      if (!value || typeof value !== 'object')
        throw new Error('The selected pattern article is unavailable.');
      const record = value as Partial<MiraArticleReference>;
      if (
        record.sourceId !== pattern.sourceId ||
        record.id !== pattern.id ||
        typeof record.title !== 'string' ||
        typeof record.summary !== 'string' ||
        typeof record.body !== 'string' ||
        typeof record.html !== 'string' ||
        !(
          record.standaloneHref === null ||
          record.standaloneHref === `/pattern/${pattern.id}/run` ||
          record.standaloneHref === `/pattern/${pattern.id}/practice` ||
          (pattern.type === 'practice' && record.standaloneHref === `/practice/${pattern.id}/run`)
        ) ||
        (record.practiceSource !== undefined && typeof record.practiceSource !== 'string')
      )
        throw new Error('The selected pattern article could not be verified.');
      if (pattern.type === 'practice' && record.practiceSource && ports.practiceWorksheet) {
        const worksheet = await ports.practiceWorksheet(record.practiceSource);
        return {
          ...record,
          body: `${record.body}\n\n${worksheet.body}`.trim(),
          html: `${record.html}\n${worksheet.html}`,
        } as MiraArticleReference;
      }
      return record as MiraArticleReference;
    })();
    cache.set(key, pending);
    void pending.catch(() => cache.delete(key));
    return pending;
  };
}
