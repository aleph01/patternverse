/** Presentation policy only: preview content is still shipped in the public build. */
export type ReleaseVisibility = 'public' | 'preview';

export function isReleaseVisible(
  visibility: ReleaseVisibility = 'public',
  previewEnabled = false,
): boolean {
  return visibility === 'public' || (visibility === 'preview' && previewEnabled);
}

/** Use the same policy for lists, menus, search results, or other content summaries. */
export function filterReleaseItems<T>(
  items: readonly T[],
  visibility: (item: T) => ReleaseVisibility | undefined,
  previewEnabled = false,
): T[] {
  return items.filter((item) => isReleaseVisible(visibility(item), previewEnabled));
}
