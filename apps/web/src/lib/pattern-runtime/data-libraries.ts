/** Resolve latest public resource pointers only when creating/inspecting a run.
 * Running checkpoints carry their own copies and never consult this index. */
export async function resolveDataLibraries(
  ids: readonly string[],
  fetcher: typeof fetch = fetch,
  base = '',
): Promise<Record<string, unknown>> {
  if (!ids.length) return {};
  const response = await fetcher(`${base}/library/data/index.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Reference data could not be loaded.');
  const index: unknown = await response.json();
  if (!index || typeof index !== 'object' || Array.isArray(index))
    throw new Error('Invalid reference data index.');
  const entries = index as Record<string, { revision?: unknown; path?: unknown }>;
  const result: Record<string, unknown> = {};
  for (const id of new Set(ids)) {
    const entry = entries[id];
    if (
      !entry ||
      typeof entry.revision !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.revision) ||
      entry.path !== `${base}/library/data/${entry.revision}.json`
    )
      throw new Error(`Reference library ${id} is unavailable.`);
    const data = await fetcher(entry.path, { cache: 'force-cache' });
    if (!data.ok) throw new Error(`Reference library ${id} could not be loaded.`);
    const source = await data.text();
    if (new TextEncoder().encode(source).byteLength > 1_048_576)
      throw new Error('Reference library exceeds 1 MiB.');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
    const revision = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    if (revision !== entry.revision)
      throw new Error(`Reference library ${id} failed its content check.`);
    result[id] = JSON.parse(source);
  }
  return result;
}
