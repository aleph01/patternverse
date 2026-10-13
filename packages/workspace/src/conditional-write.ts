/** Storage compare-and-swap, not a second sync merge algorithm. Only records whose
 * desired value differs from the reviewed value may be changed. Already-applied
 * values are idempotent; unrelated current edits are left alone.
 */
export class LocalSyncConflictError extends Error {
  constructor(message = 'Local data changed while syncing. Review it before retrying.') {
    super(message);
    this.name = 'LocalSyncConflictError';
  }
}

export function canonicalRecord(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry))
      return Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)));
    return entry;
  });
}

export function conditionalRecordWrites<T>(
  expected: readonly T[],
  desired: readonly T[],
  current: readonly T[],
  key: (row: T) => string,
): readonly { key: string; before: T | undefined; after: T | undefined }[] {
  const index = (rows: readonly T[]) => {
    const result = new Map(rows.map((row) => [key(row), row]));
    if (result.size !== rows.length) throw new Error('Duplicate sync record identities.');
    return result;
  };
  const old = index(expected),
    next = index(desired),
    live = index(current);
  const writes = [];
  for (const id of new Set([...old.keys(), ...next.keys()])) {
    const before = old.get(id),
      after = next.get(id),
      actual = live.get(id);
    if (
      canonicalRecord(before) === canonicalRecord(after) ||
      canonicalRecord(actual) === canonicalRecord(after)
    )
      continue;
    if (canonicalRecord(actual) !== canonicalRecord(before)) throw new LocalSyncConflictError();
    writes.push({ key: id, before: actual, after });
  }
  return writes;
}
