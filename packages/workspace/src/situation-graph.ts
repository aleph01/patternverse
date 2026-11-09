import type { Situation } from './situations.js';

export type SituationMapPosition = Readonly<{ x: number; y: number }>;
export type SituationLink = Readonly<{ targetId: string; kind: 'part-of' | 'related' }>;
/** Part-of points from a subproblem to a containing situation. Related links are undirected. */
export type SituationConnection = Readonly<{
  sourceId: string;
  targetId: string;
  kind: SituationLink['kind'];
}>;
export type SituationConnectionChange = Readonly<{
  previous: SituationConnection | null;
  next: SituationConnection | null;
  expected: readonly Readonly<{ id: string; revision: number }>[];
}>;

export function parseMapPosition(value: unknown): SituationMapPosition {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid map position.');
  const p = value as Record<string, unknown>;
  if (
    typeof p.x !== 'number' ||
    typeof p.y !== 'number' ||
    !Number.isFinite(p.x) ||
    !Number.isFinite(p.y) ||
    p.x < 0 ||
    p.y < 0 ||
    p.x > 100000 ||
    p.y > 100000
  )
    throw new Error('Invalid map position.');
  return { x: p.x, y: p.y };
}
export function parseSituationLinks(value: unknown, sourceId: string): readonly SituationLink[] {
  if (!Array.isArray(value) || value.length > 200)
    throw new Error('A situation supports up to 200 connections.');
  const seen = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new Error('Invalid situation connection.');
    const link = item as Record<string, unknown>;
    if (
      typeof link.targetId !== 'string' ||
      !link.targetId.trim() ||
      link.targetId.length > 120 ||
      link.targetId === sourceId ||
      (link.kind !== 'part-of' && link.kind !== 'related')
    )
      throw new Error('Invalid or duplicate situation connection.');
    if (seen.has(link.targetId)) throw new Error('These situations already have a connection.');
    seen.add(link.targetId);
    return { targetId: link.targetId, kind: link.kind as SituationLink['kind'] };
  });
}
export function connectionKey(connection: SituationConnection): string {
  return JSON.stringify([connection.kind, connection.sourceId, connection.targetId]);
}
export function situationConnections(
  situations: readonly Situation[],
): readonly SituationConnection[] {
  return situations.flatMap((s) =>
    (s.connections ?? []).map((link) => ({ sourceId: s.id, ...link })),
  );
}
export function canonicalConnection(value: SituationConnection): SituationConnection {
  const links = parseSituationLinks([value], value.sourceId);
  if (
    !links[0] ||
    typeof value.sourceId !== 'string' ||
    !value.sourceId.trim() ||
    value.sourceId.length > 120
  )
    throw new Error('Invalid situation connection.');
  if (value.kind === 'related' && value.sourceId > value.targetId)
    return { sourceId: value.targetId, targetId: value.sourceId, kind: 'related' };
  return { sourceId: value.sourceId, ...links[0] };
}
/** Used after local edits and backup/sync projection; never repairs a damaged graph silently. */
export function validateSituationGraph(situations: readonly Situation[]): void {
  const ids = new Set(situations.map((s) => s.id)),
    pairs = new Set<string>();
  const parents = new Map<string, string[]>();
  for (const edge of situationConnections(situations)) {
    canonicalConnection(edge);
    if (!ids.has(edge.targetId)) throw new Error('A connection points to a missing situation.');
    const pair = JSON.stringify([edge.sourceId, edge.targetId].sort());
    if (pairs.has(pair)) throw new Error('These situations already have a connection.');
    pairs.add(pair);
    if (edge.kind === 'part-of')
      parents.set(edge.sourceId, [...(parents.get(edge.sourceId) ?? []), edge.targetId]);
  }
  // Iterative traversal also handles large imported graphs without exhausting the call stack.
  const done = new Set<string>();
  for (const id of ids) {
    if (done.has(id)) continue;
    const active = new Set<string>(),
      stack: { id: string; exit: boolean }[] = [{ id, exit: false }];
    while (stack.length) {
      const item = stack.pop()!;
      if (item.exit) {
        active.delete(item.id);
        done.add(item.id);
        continue;
      }
      if (active.has(item.id))
        throw new Error(
          'A situation cannot be part of its own subproblem. Use “related to” for a circular connection.',
        );
      if (done.has(item.id)) continue;
      active.add(item.id);
      stack.push({ id: item.id, exit: true });
      for (const parent of parents.get(item.id) ?? []) stack.push({ id: parent, exit: false });
    }
  }
}
