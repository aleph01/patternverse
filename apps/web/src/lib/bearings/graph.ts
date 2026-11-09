import {
  situationConnections,
  type Situation,
  type SituationConnection,
  type SituationMapPosition,
} from '@patternverse/workspace';

export const MAP_NODE_WIDTH = 208;
export const MAP_NODE_HEIGHT = 104;
export type MapNode = Readonly<{ situation: Situation; position: SituationMapPosition }>;

export function isMapSpaceFree(position: SituationMapPosition, nodes: readonly MapNode[]) {
  return !nodes.some(
    ({ position: other }) =>
      position.x < other.x + MAP_NODE_WIDTH + 12 &&
      position.x + MAP_NODE_WIDTH + 12 > other.x &&
      position.y < other.y + MAP_NODE_HEIGHT + 12 &&
      position.y + MAP_NODE_HEIGHT + 12 > other.y,
  );
}

export function nearbySubproblemPosition(parent: SituationMapPosition, nodes: readonly MapNode[]) {
  for (let row = 0; row <= nodes.length; row++) {
    const position = { x: parent.x, y: parent.y + MAP_NODE_HEIGHT + 64 + row * 170 };
    if (position.y <= 100000 && isMapSpaceFree(position, nodes)) return position;
  }
  // Near the map boundary, look back toward its origin instead.
  for (let row = 0; row <= nodes.length; row++) {
    const position = { x: parent.x, y: parent.y - MAP_NODE_HEIGHT - 64 - row * 170 };
    if (position.y >= 0 && isMapSpaceFree(position, nodes)) return position;
  }
  return null;
}

/** Deterministic initial layout; saved user positions always take precedence. */
export function layoutSituations(situations: readonly Situation[]): readonly MapNode[] {
  const ids = new Set(situations.map((s) => s.id)),
    depth = new Map<string, number>();
  const children = new Map<string, string[]>(),
    remaining = new Map<string, number>();
  for (const s of situations) {
    const parents = (s.connections ?? []).filter(
      (link) => link.kind === 'part-of' && ids.has(link.targetId),
    );
    remaining.set(s.id, parents.length);
    for (const parent of parents)
      children.set(parent.targetId, [...(children.get(parent.targetId) ?? []), s.id]);
  }
  const queue = situations.filter((s) => remaining.get(s.id) === 0).map((s) => s.id);
  for (let at = 0; at < queue.length; at++) {
    const id = queue[at]!;
    if (!depth.has(id)) depth.set(id, 0);
    for (const child of children.get(id) ?? []) {
      depth.set(child, Math.max(depth.get(child) ?? 0, (depth.get(id) ?? 0) + 1));
      remaining.set(child, (remaining.get(child) ?? 1) - 1);
      if (remaining.get(child) === 0) queue.push(child);
    }
  }
  const levels = new Map<number, Situation[]>();
  for (const s of situations) {
    const level = depth.get(s.id) ?? 0;
    levels.set(level, [...(levels.get(level) ?? []), s]);
  }
  const widest = Math.max(1, ...[...levels.values()].map((row) => Math.min(5, row.length)));
  let y = 70;
  const defaults = new Map<string, SituationMapPosition>();
  for (const [, row] of [...levels].sort(([a], [b]) => a - b)) {
    const columns = Math.min(5, row.length),
      offset = (widest - columns) * 125;
    row.forEach((s, index) =>
      defaults.set(s.id, {
        x: 70 + offset + (index % columns) * 250,
        y: y + Math.floor(index / columns) * 185,
      }),
    );
    y += Math.ceil(row.length / 5) * 185;
  }
  return situations.map((situation) => ({
    situation,
    position: situation.mapPosition ?? defaults.get(situation.id)!,
  }));
}
export const linkedSituations = (situations: readonly Situation[], id: string) =>
  situationConnections(situations).filter((edge) => edge.sourceId === id || edge.targetId === id);
export function relationFor(
  edge: SituationConnection,
  id: string,
): 'part-of' | 'contains' | 'related' {
  return edge.kind === 'related' ? 'related' : edge.sourceId === id ? 'part-of' : 'contains';
}
export const otherSituationId = (edge: SituationConnection, id: string) =>
  edge.sourceId === id ? edge.targetId : edge.sourceId;
export function editedConnection(
  id: string,
  targetId: string,
  relation: 'part-of' | 'contains' | 'related',
): SituationConnection {
  return relation === 'contains'
    ? { sourceId: targetId, targetId: id, kind: 'part-of' }
    : { sourceId: id, targetId, kind: relation };
}
export function mapBounds(nodes: readonly MapNode[]) {
  if (!nodes.length) return { x: 0, y: 0, width: 400, height: 300 };
  const x = Math.min(...nodes.map((n) => n.position.x)),
    y = Math.min(...nodes.map((n) => n.position.y));
  return {
    x,
    y,
    width: Math.max(...nodes.map((n) => n.position.x)) + MAP_NODE_WIDTH - x,
    height: Math.max(...nodes.map((n) => n.position.y)) + MAP_NODE_HEIGHT - y,
  };
}
export function connectionPath(from: SituationMapPosition, to: SituationMapPosition) {
  const down = to.y >= from.y + MAP_NODE_HEIGHT;
  const up = from.y >= to.y + MAP_NODE_HEIGHT;
  if (down || up) {
    const x1 = from.x + MAP_NODE_WIDTH / 2,
      x2 = to.x + MAP_NODE_WIDTH / 2,
      y1 = from.y + (down ? MAP_NODE_HEIGHT : 0),
      y2 = to.y + (down ? 0 : MAP_NODE_HEIGHT),
      middle = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${middle}, ${x2} ${middle}, ${x2} ${y2}`;
  }
  const right = to.x >= from.x,
    x1 = from.x + (right ? MAP_NODE_WIDTH : 0),
    x2 = to.x + (right ? 0 : MAP_NODE_WIDTH),
    y1 = from.y + MAP_NODE_HEIGHT / 2,
    y2 = to.y + MAP_NODE_HEIGHT / 2,
    middle = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}`;
}
