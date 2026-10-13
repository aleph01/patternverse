/** Wire model resolved by Rust. This module handles layout only, never Pattern Markdown parsing. */
export type ShowAxis = {
  attribute: string;
  kind: 'numeric' | 'temporal' | 'ordinal' | 'categorical';
  min: number;
  max: number;
  levels: string[];
  low: string;
  high: string;
};
export type ShowItem = {
  id: string;
  label: string;
  fields: Record<string, string>;
  coordinates: number[];
  group: string | null;
};
export type ShowEdge = { from: string; to: string; cyclic: boolean };
export type ShowPanel = {
  label: string | null;
  representation: 'collection' | 'ordered' | 'grouped' | 'axis' | 'cartesian' | 'tree' | 'network';
  items: ShowItem[];
  edges: ShowEdge[];
  cyclic: boolean;
};
export type ShowView = {
  spec: {
    source: string;
    map: string[];
    group: string | null;
    order: { attribute: string; descending: boolean } | null;
    link: string | null;
    split: string | null;
  };
  axes: ShowAxis[];
  panels: ShowPanel[];
  warnings: string[];
};
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string');
const nullableText = (value: unknown) => value === null || typeof value === 'string';
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Reject malformed wire data before it reaches SVG coordinates; the host's text fallback remains usable. */
export function isShowView(value: unknown): value is ShowView {
  if (
    !record(value) ||
    !record(value.spec) ||
    typeof value.spec.source !== 'string' ||
    !strings(value.spec.map) ||
    value.spec.map.length > 2 ||
    !nullableText(value.spec.group) ||
    !nullableText(value.spec.link) ||
    !nullableText(value.spec.split) ||
    !(
      value.spec.order === null ||
      (record(value.spec.order) &&
        typeof value.spec.order.attribute === 'string' &&
        typeof value.spec.order.descending === 'boolean')
    ) ||
    !strings(value.warnings) ||
    !Array.isArray(value.axes) ||
    value.axes.length > 2 ||
    !Array.isArray(value.panels)
  )
    return false;
  const axisCount = value.axes.length;
  return (
    value.axes.every(
      (axis) =>
        record(axis) &&
        typeof axis.attribute === 'string' &&
        ['numeric', 'temporal', 'ordinal', 'categorical'].includes(String(axis.kind)) &&
        finite(axis.min) &&
        finite(axis.max) &&
        axis.max >= axis.min &&
        strings(axis.levels) &&
        typeof axis.low === 'string' &&
        typeof axis.high === 'string',
    ) &&
    value.panels.every(
      (panel) =>
        record(panel) &&
        nullableText(panel.label) &&
        ['collection', 'ordered', 'grouped', 'axis', 'cartesian', 'tree', 'network'].includes(
          String(panel.representation),
        ) &&
        typeof panel.cyclic === 'boolean' &&
        Array.isArray(panel.items) &&
        panel.items.every(
          (item) =>
            record(item) &&
            typeof item.id === 'string' &&
            typeof item.label === 'string' &&
            nullableText(item.group) &&
            record(item.fields) &&
            Object.values(item.fields).every((v) => typeof v === 'string') &&
            Array.isArray(item.coordinates) &&
            item.coordinates.every(finite) &&
            item.coordinates.length === axisCount,
        ) &&
        Array.isArray(panel.edges) &&
        panel.edges.every(
          (edge) =>
            record(edge) &&
            typeof edge.from === 'string' &&
            typeof edge.to === 'string' &&
            typeof edge.cyclic === 'boolean' &&
            (panel.items as ShowItem[]).some((item) => item.id === edge.from) &&
            (panel.items as ShowItem[]).some((item) => item.id === edge.to),
        ),
    )
  );
}
/** Shared domains keep repeated scenario maps directly comparable, with equal values centred. */
export function position(value: number, axis: ShowAxis): number {
  const range = axis.max - axis.min;
  if (range === 0) return 0.5;
  // Scaling first avoids overflow when finite endpoints span the full f64 range.
  const scale = Math.max(Math.abs(axis.min), Math.abs(axis.max), 1);
  const ratio = Number.isFinite(range)
    ? (value - axis.min) / range
    : (value / scale - axis.min / scale) / (axis.max / scale - axis.min / scale);
  return Math.max(0, Math.min(1, ratio));
}
export type PositionedItem = ShowItem & { x: number; y: number; number: number };
/** Deterministic bounded layout: mapped coordinates first, tree levels second, circular networks last. */
export function layoutPanel(panel: ShowPanel, axes: ShowAxis[]): PositionedItem[] {
  const depth = new Map<string, number>();
  if (panel.representation === 'tree') {
    const roots = panel.items.filter((item) => !panel.edges.some((edge) => edge.to === item.id));
    const queue = roots.map((item) => ({ id: item.id, depth: 0 }));
    for (let cursor = 0; cursor < queue.length && cursor < panel.items.length; cursor++) {
      const node = queue[cursor];
      if (depth.has(node.id)) continue;
      depth.set(node.id, node.depth);
      queue.push(
        ...panel.edges
          .filter((edge) => edge.from === node.id)
          .map((edge) => ({ id: edge.to, depth: node.depth + 1 })),
      );
    }
  }
  const maxDepth = Math.max(0, ...depth.values());
  return panel.items.map((item, index) => {
    let x: number;
    let y: number;
    if (axes.length && item.coordinates.length === axes.length) {
      x = 60 + position(item.coordinates[0], axes[0]) * 480;
      y =
        axes.length === 2
          ? 285 - position(item.coordinates[1], axes[1]) * 230
          : 100 + (index % 4) * 48;
    } else if (panel.representation === 'tree') {
      const level = depth.get(item.id) ?? 0;
      const peers = panel.items.filter((peer) => depth.get(peer.id) === level);
      x = 60 + ((peers.indexOf(item) + 1) / (peers.length + 1)) * 480;
      y = 45 + (maxDepth ? level / maxDepth : 0.5) * 250;
    } else {
      const angle = (index / Math.max(panel.items.length, 1)) * Math.PI * 2 - Math.PI / 2;
      x = 300 + Math.cos(angle) * 220;
      y = 175 + Math.sin(angle) * 120;
    }
    return { ...item, x, y, number: index + 1 };
  });
}
/** Grouping changes sections for collections, never overrides spatial positions in a mapped view. */
export function groupsFor(panel: ShowPanel): { label: string | null; items: ShowItem[] }[] {
  const groups: { label: string | null; items: ShowItem[] }[] = [];
  for (const item of panel.items) {
    let group = groups.find((group) => group.label === item.group);
    if (!group) {
      group = { label: item.group, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
