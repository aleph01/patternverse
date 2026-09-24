import { entityRefSchema } from '@patternverse/schema';

/** A library pattern selected for future use in a Mira conversation. */
export type MiraPatternContext = Readonly<{ sourceId: string; entityId: string }>;

/** Keep source identity in the URL; titles are resolved from the library, never trusted from it. */
export function miraPatternQuery(context: MiraPatternContext): string {
  const parsed = entityRefSchema.parse(context);
  return `?${new URLSearchParams({ source: parsed.sourceId, pattern: parsed.entityId })}`;
}

/** Reject incomplete or malformed deep links before looking up private or Commons content. */
export function parseMiraPatternQuery(query: URLSearchParams): MiraPatternContext | null {
  const result = entityRefSchema.safeParse({
    sourceId: query.get('source'),
    entityId: query.get('pattern'),
  });
  return result.success ? result.data : null;
}

export type MiraPatternSummary = Readonly<{
  sourceId: string;
  id: string;
  type: string;
  title: string;
  summary?: string;
  hasPractice?: boolean;
}>;

/** Only an exact source-qualified pattern match may populate the companion context. */
export function findMiraPattern(
  context: MiraPatternContext | null,
  entries: readonly MiraPatternSummary[],
): MiraPatternSummary | null {
  if (!context) return null;
  return (
    entries.find(
      (entry) =>
        entry.type === 'pattern' &&
        entry.sourceId === context.sourceId &&
        entry.id === context.entityId,
    ) ?? null
  );
}
