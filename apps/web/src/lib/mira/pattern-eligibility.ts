import type { MiraPatternSummary } from './context';
import { THERAPY_LIBRARY } from './therapy-library';
import { MODALITIES } from './modalities';

/** Picker eligibility is explicit metadata, never a title/keyword guess. */
export function therapeuticPatternForMethod(pattern: MiraPatternSummary, method: string): boolean {
  if (pattern.type !== 'pattern') return false;
  const curated =
    pattern.sourceId === 'commons'
      ? THERAPY_LIBRARY.find((entry) => entry.slug === pattern.id)
      : undefined;
  if (curated) return curated.modality === method;
  if (!pattern.verses?.includes('therapy')) return false;
  const methods = (pattern.tags ?? []).flatMap((tag) => {
    const normalized = tag.toLowerCase();
    if (normalized.startsWith('method:')) return [normalized.slice('method:'.length)];
    return MODALITIES.some(({ id }) => id === normalized) ? [normalized] : [];
  });
  // Unassigned therapeutic patterns are method-neutral, not silently relabelled.
  return methods.length === 0 || methods.includes(method);
}
