/** Cache requests ignore fragments, so deduplicate their fetch URLs, not raw links. */
export function precacheUrls(assets: readonly string[], origin: string): string[] {
  return [
    ...new Set(
      assets.map((asset) => {
        const url = new URL(asset, origin);
        url.hash = '';
        return url.href;
      }),
    ),
  ];
}
