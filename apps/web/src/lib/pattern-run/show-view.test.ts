import { readFile } from 'node:fs/promises';
import { describe, expect, it, beforeAll } from 'vitest';
import init, { preview } from '$lib/mira/engine/pattern_wasm.js';
import { groupsFor, isShowView, layoutPanel, position, type ShowView } from './show-view';

beforeAll(async () => {
  await init({
    module_or_path: await readFile(new URL('../mira/engine/pattern_wasm_bg.wasm', import.meta.url)),
  });
});

/** Exercise the shipped browser engine, not a second parser or a mocked inference layer. */
export function shown(source: string): ShowView[] {
  return JSON.parse(
    preview(source.startsWith(':language') ? source : `:language 1\n${source}`),
  ).effects.flatMap((effect: { request: { payload: { view?: ShowView } } }) =>
    effect.request.payload.view ? [effect.request.payload.view] : [],
  );
}

describe('compositional show browser model', () => {
  it('runs both development fixtures through the actual WASM core', async () => {
    for (const file of ['show-initiatives', 'show-relationships']) {
      const source = await readFile(
        new URL(
          `../../../../../docs/pattern-markdown/examples/${file}.pattern.md`,
          import.meta.url,
        ),
        'utf8',
      );
      const views = shown(source);
      expect(views.length).toBeGreaterThan(3);
      expect(views.every(isShowView)).toBe(true);
      for (const view of views)
        for (const panel of view.panels) {
          expect(
            layoutPanel(panel, view.axes).every(
              ({ x, y }) => Number.isFinite(x) && Number.isFinite(y),
            ),
          ).toBe(true);
        }
    }
  });

  it('preserves comparable split domains, mapped coordinates and ranked groups', () => {
    const view = shown(
      ':language 1\nitems = [{name: "A", x: 1, y: 5, category: "One", scenario: "Expected"}, {name: "B", x: 5, y: 1, category: "Two", scenario: "Optimistic"}]\n!show {{items}} {\n:map x, y\n:group category\n:order y desc\n:split scenario\n}\n-> end',
    )[0];
    expect(isShowView(view)).toBe(true);
    expect(layoutPanel(view.panels[0], view.axes)[0]).toMatchObject({ x: 60, y: 55 });
    expect(layoutPanel(view.panels[1], view.axes)[0]).toMatchObject({ x: 540, y: 285 });
    expect(groupsFor(view.panels[0])[0].label).toBe('One');
  });

  it('lays out trees by depth and retains cyclic networks', () => {
    const tree = shown(
      'items = [{id: "root", parent: ""}, {id: "child", parent: "root"}]\n!show {{items}} {\n:link parent\n}\n-> end',
    )[0];
    const nodes = layoutPanel(tree.panels[0], []);
    expect(nodes[0].y).toBeLessThan(nodes[1].y);
    const cycle = shown(
      'items = [{id: "a", affects: "b"}, {id: "b", affects: "a"}]\n!show {{items}} {\n:link affects\n}\n-> end',
    )[0];
    expect(cycle.panels[0].cyclic).toBe(true);
    expect(cycle.panels[0].edges.every((edge) => edge.cyclic)).toBe(true);
  });

  it('centres equal values and avoids overflowing finite numeric domains', () => {
    const axis = {
      attribute: 'value',
      kind: 'numeric' as const,
      min: 1,
      max: 1,
      levels: [],
      low: '1',
      high: '1',
    };
    expect(position(1, axis)).toBe(0.5);
    expect(position(0, { ...axis, min: -Number.MAX_VALUE, max: Number.MAX_VALUE })).toBe(0.5);
    expect(
      position(Number.MAX_VALUE, { ...axis, min: -Number.MAX_VALUE, max: Number.MAX_VALUE }),
    ).toBe(1);
  });

  it('rejects invalid wire coordinates and unresolved edges without trusting host payloads', () => {
    const view = shown('items = [1, 2]\n!show {{items}} {\n:map value\n}\n-> end')[0];
    expect(isShowView(view)).toBe(true);
    const invalid = structuredClone(view);
    invalid.panels[0].items[0].coordinates[0] = NaN;
    expect(isShowView(invalid)).toBe(false);
    invalid.panels[0].items[0].coordinates[0] = 1;
    invalid.panels[0].edges.push({ from: 'missing', to: 'missing', cyclic: false });
    expect(isShowView(invalid)).toBe(false);
    expect(isShowView({ spec: {} })).toBe(false);
  });
});
