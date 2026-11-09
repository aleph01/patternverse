/** Only public reading pages participate. Never send query strings, fragments or form data. */
export const publicUsagePaths = [
  '/',
  '/library',
  '/about',
  '/about/mira',
  '/about/pattern-language',
  '/apps',
  '/apps/mira',
  '/privacy',
  '/legal',
  '/impressum',
] as const;

export function isPublicUsagePage(
  path: string,
  entity?: { type?: string; id?: string; status?: string },
): boolean {
  return (
    publicUsagePaths.some((candidate) => candidate === path) ||
    (entity?.status === 'published' &&
      ['pattern', 'concept', 'practice', 'collection'].includes(entity.type ?? '') &&
      path === `/${entity.type}/${entity.id}`)
  );
}

/** Fixed categories keep full referrer URLs and arbitrary identifiers out of storage. */
export function usageSource(referrer: string): string {
  if (!referrer) return 'Direct or unknown';
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (['patternverse.org', 'www.patternverse.org'].includes(host)) return 'Direct or unknown';
    if (
      /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|ecosia\.org|search\.yahoo\.com)$/.test(host)
    )
      return 'Search engine';
    if (
      /(^|\.)(reddit\.com|linkedin\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|t\.co|news\.ycombinator\.com)$/.test(
        host,
      )
    )
      return 'Social or community';
    return 'Other website';
  } catch {
    return 'Direct or unknown';
  }
}

export const usageSources = [
  'Direct or unknown',
  'Search engine',
  'Social or community',
  'Other website',
] as const;
