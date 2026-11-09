import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import { inspectSource } from '$lib/pattern-editor/bridge';
import { attributeSuggestions, parameterSuggestions } from '$lib/pattern-editor/completion/catalog';
import { startSourceRun, applySourceAction } from '$lib/pattern-runtime/source';
import { componentCatalog, findComponents } from './component-catalog';
import { visualizationExamples } from './display-examples';
import { isShowView } from '$lib/pattern-run/show-view';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

const variants = componentCatalog.flatMap((component) =>
  component.variants.map((variant) => ({ component: component.id, ...variant })),
);

describe('component reference contracts', () => {
  it.each(variants)(
    'compiles $component/$id with its explicit example resources',
    async (variant) => {
      const inspection = await inspectSource(variant.source, {
        isolated: true,
        widgets: variant.options?.widgets,
      });
      expect(inspection.diagnostics.filter((item) => item.severity === 'Error')).toEqual([]);
      expect(inspection.structure).toBeTruthy();
      const run = await startSourceRun(
        variant.source,
        {},
        `catalog-${variant.component}-${variant.id}`,
        { isolated: true, widgets: variant.options?.widgets },
      );
      expect(['Waiting', 'Completed']).toContain(run.view.status);
    },
  );

  it.each([
    'ask',
    'form',
    'timer',
    'rate',
    'image',
    'video',
    'collect',
    'refine',
    'agent',
    'choose',
    'rank',
  ])('documents the editor’s offered %s attributes and parameters', (kind) => {
    const component = componentCatalog.find((item) => item.id === kind)!;
    const documented = new Set(
      component.parameters.map((parameter) =>
        parameter.name.replace(/^:/, '').replace(/^\[|\]$/g, ''),
      ),
    );
    const aliases: Record<string, string> = { option: 'options' };
    const offered = [
      ...attributeSuggestions(kind, true).map((suggestion) => suggestion.label.slice(1)),
      ...(['ask', 'choose', 'rank', 'refine'].includes(kind)
        ? parameterSuggestions(kind, []).map((suggestion) => suggestion.label.split('=')[0])
        : []),
    ];
    for (const name of offered)
      expect(documented.has(aliases[name] ?? name), `${kind}: ${name}`).toBe(true);
  });

  it('derives extension input and output types/defaults from the actual packaged definitions', () => {
    const widget = componentCatalog.find((item) => item.id === 'widget')!;
    for (const variant of widget.variants) {
      const pkg = Object.values(variant.options!.widgets!)[0];
      const exportName = variant.id === 'reflection' ? 'reflection' : 'needs';
      const definition = JSON.parse(pkg.files[pkg.manifest.exports[exportName].path]);
      for (const [name, field] of Object.entries(definition.inputs) as [
        string,
        { type: string; default?: unknown },
      ][]) {
        const row = variant.parameters!.find((parameter) => parameter.name === `:with ${name}`)!;
        expect(row.type).toBe(field.type);
        if (Object.hasOwn(field, 'default'))
          expect(row.defaultValue).toBe(JSON.stringify(field.default));
      }
      expect(variant.result!.fields!.map((field) => field.name).sort()).toEqual(
        Object.keys(definition.outputs).sort(),
      );
    }
  });

  it.each(variants.filter((variant) => variant.options?.mockResults?.length))(
    'validates the $component/$id sample model reply',
    async (variant) => {
      let run = await startSourceRun(
        variant.source,
        {},
        `mock-${variant.component}-${variant.id}`,
        { isolated: true },
      );
      for (let step = 0; step < 10 && run.view.pending; step++) {
        const pending = run.view.pending;
        const sample = variant.options?.mockResults?.find(
          (item) => item.kind === pending.request.kind,
        );
        const result =
          sample?.result ??
          (pending.request.kind === 'interaction.ask'
            ? { kind: 'text', value: 'A manageable next step' }
            : undefined);
        expect(result, pending.request.kind).toBeDefined();
        run = await applySourceAction(
          run,
          { Fulfill: { effect_id: pending.effect_id, result } },
          pending.run_id,
        );
      }
      expect(run.view.status).toBe('Completed');
    },
  );
});

it.each(visualizationExamples)(
  'renders the $id example as a structured visualization without warnings',
  async (example) => {
    const run = await startSourceRun(example.source, {}, `show-${example.id}`, { isolated: true });
    const view = run.view.items.map(({ effect }) => effect.request.payload.view).find(isShowView)!;
    expect(view).toBeDefined();
    expect(view.warnings).toEqual([]);
    if (example.id === 'map') {
      expect(view.panels[0].representation).toBe('cartesian');
      expect(view.axes.map((axis) => axis.attribute)).toEqual(['effort', 'impact']);
      expect(view.spec.group).toBeNull();
      expect(view.spec.order).toBeNull();
    } else if (example.id === 'group') {
      expect(view.panels[0].representation).toBe('grouped');
      expect(view.panels[0].items.filter((item) => item.group === 'Rest')).toHaveLength(2);
      expect(view.panels[0].items.filter((item) => item.group === 'Support')).toHaveLength(1);
    } else if (example.id === 'order') {
      expect(view.panels[0].representation).toBe('ordered');
      expect(view.panels[0].items.map((item) => item.label)).toEqual([
        'Ask for help',
        'Take a walk',
        'Take a pause',
      ]);
    } else if (example.id === 'relationships') {
      expect(view.panels[0].representation).toBe('tree');
      expect(view.panels[0].edges.map(({ from, to }) => [from, to])).toEqual([
        ['notice', 'pause'],
        ['notice', 'explore'],
        ['explore', 'try'],
      ]);
    } else {
      expect(view.panels.map((panel) => panel.label)).toEqual(['Expected', 'Optimistic']);
      expect(
        view.panels.every(
          (panel) => panel.items.length === 3 && panel.representation === 'cartesian',
        ),
      ).toBe(true);
      expect(view.axes.map(({ attribute, min, max }) => [attribute, min, max])).toEqual([
        ['effort', 1, 3],
        ['impact', 3, 6],
      ]);
    }
  },
);

it('searches commands and parameter names and respects category filters', () => {
  expect(findComponents('duration').map((item) => item.id)).toContain('timer');
  expect(findComponents('!ask').map((item) => item.id)).toContain('ask');
  expect(findComponents('initial_view', 'Extension widgets').map((item) => item.id)).toEqual([
    'widget',
  ]);
  expect(findComponents('not-a-component')).toEqual([]);
  expect(new Set(componentCatalog.map((item) => item.id)).size).toBe(componentCatalog.length);
  for (const component of componentCatalog) {
    expect(new Set(component.variants.map((item) => item.id)).size).toBe(component.variants.length);
    expect(component.result.description.length).toBeGreaterThan(0);
  }
});
