const scripts = new Map<string, Promise<void>>();

/** Share provider downloads; a failed load can be retried by a later mount. */
export function loadVideoSdk(source: string, ready: () => boolean): Promise<void> {
  if (ready()) return Promise.resolve();
  const existing = scripts.get(source);
  if (existing) return existing;
  const result = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source;
    script.async = true;
    const finish = (error?: Error) => {
      clearInterval(poll);
      clearTimeout(timeout);
      script.onerror = null;
      if (error) {
        script.remove();
        scripts.delete(source);
        reject(error);
      } else resolve();
    };
    const timeout = setTimeout(
      () => finish(new Error('The video provider did not respond.')),
      15000,
    );
    const poll = setInterval(() => {
      if (ready()) finish();
    }, 50);
    script.onerror = () => finish(new Error('Could not load the video player.'));
    document.head.append(script);
  });
  scripts.set(source, result);
  return result;
}
