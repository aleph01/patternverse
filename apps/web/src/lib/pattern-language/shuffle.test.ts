import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, expect, it } from 'vitest';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import { applyCompletion, completions } from '$lib/pattern-editor/completion';
import {
  applySourceAction,
  restoreSourceRun,
  serializeSourceRun,
  startSourceRun,
} from '$lib/pattern-runtime/source';
import { functionCatalog } from './function-catalog';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

it('runs the seeded example with the same golden order as native Rust', async () => {
  const entry = functionCatalog.find((entry) => entry.id === 'shuffle')!;
  const variant = entry.variants.find((variant) => variant.id === 'shuffle-seeded')!;
  const run = await startSourceRun(variant.source, {}, 'seeded', { isolated: true });
  expect(run.view.status).toBe('Completed');
  expect(run.view.outputs.result).toEqual({
    type: 'list',
    value: {
      element_type: 'number',
      items: [6, 2, 3, 1, 4, 5].map((value) => ({ type: 'number', value })),
    },
  });
});

it('restores an unseeded order without changing the pending question or its result', async () => {
  const source = `:language 1
:output order
order = [1, 2, 3, 4, 5, 6] |> shuffle
answer = !ask {
  Continue with {{order}}?
}
-> end`;
  const run = await startSourceRun(source, {}, 'browser-shuffle', { isolated: true });
  const restored = await restoreSourceRun(source, serializeSourceRun(run));
  expect(restored.view.pending).toEqual(run.view.pending);
  const pending = restored.view.pending!;
  const done = await applySourceAction(
    restored,
    { Fulfill: { effect_id: pending.effect_id, result: { kind: 'text', value: 'yes' } } },
    pending.run_id,
  );
  expect(done.view.status).toBe('Completed');
  const again = await restoreSourceRun(source, serializeSourceRun(done));
  expect(again.view.outputs.order).toEqual(done.view.outputs.order);
});

it.each(['order = sh', 'order = items |> sh'])(
  'offers a usable shuffle completion for %s',
  (source) => {
    const set = completions(source, source.length);
    const suggestion = set.items.find((item) => item.label === 'shuffle')!;
    expect(suggestion).toBeDefined();
    expect(applyCompletion(source, set, suggestion).source).toContain('shuffle');
  },
);
