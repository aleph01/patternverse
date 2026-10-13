/** Host results are routing data, not executable definitions or restored answers. */
export function matchesPracticeResult(result: unknown, id: string, revision: string): boolean {
  if (!result || typeof result !== 'object') return false;
  const value = result as { isError?: unknown; structuredContent?: unknown };
  if (value.isError || !value.structuredContent || typeof value.structuredContent !== 'object')
    return false;
  const data = value.structuredContent as Record<string, unknown>;
  return (
    data.schemaVersion === 1 &&
    data.id === id &&
    data.revision === revision &&
    data.execution === 'widget-local'
  );
}
