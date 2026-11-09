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

/** Only public, generated resources are eligible for offline downloads. */
export function offlineUrls(assets: readonly string[], origin: string, base: string): string[] {
  return precacheUrls(assets, origin).filter((asset) => {
    const url = new URL(asset);
    return (
      url.origin === origin &&
      !url.search &&
      url.pathname.startsWith(`${base}/`) &&
      !url.pathname.startsWith(`${base}/auth/`) &&
      !url.pathname.endsWith('/_headers') &&
      !url.pathname.endsWith('/_redirects')
    );
  });
}

/** A standalone document needs no application chunks or page data to work offline. */
export function installationUrls(origin: string, base: string): string[] {
  return [new URL(`${base}/offline.html`, origin).href];
}

/** Finite, resumable work. Cancellation prevents scheduling another request. */
export async function downloadOfflineUrls(
  urls: readonly string[],
  download: (url: string, signal: AbortSignal) => Promise<void>,
  signal: AbortSignal,
  progress: (completed: number, failed: number) => void,
): Promise<{ completed: number; failed: number }> {
  let next = 0;
  let completed = 0;
  let failed = 0;
  const runner = async () => {
    while (!signal.aborted && next < urls.length) {
      const url = urls[next++];
      try {
        await download(url, signal);
        completed++;
      } catch {
        if (!signal.aborted) failed++;
      }
      progress(completed, failed);
      // A failed connection or full storage pauses the job, rather than trying the entire library.
      if (failed) break;
    }
  };
  await Promise.all([runner(), runner()]);
  return { completed, failed };
}
