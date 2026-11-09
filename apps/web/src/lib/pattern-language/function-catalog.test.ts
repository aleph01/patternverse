import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, expect, it, vi } from 'vitest';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import { inspectSource } from '$lib/pattern-editor/bridge';
import { pureFunctionSuggestions } from '$lib/pattern-editor/completion/catalog';
import { startSourceRun } from '$lib/pattern-runtime/source';
import { functionCatalog, findFunctions } from './function-catalog';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

const expected: Record<string, unknown> = {
  'trim-text': 'Take   a pause',
  'lowercase-text': 'take a pause',
  'normalize-text': 'Take a pause',
  'concat-text': 'Take a pause',
  'concat-lists': ['Pause', 'Ask for help', 'Try again'],
  'clamp-number': 10,
  'count-list': 3,
  'join-notes': 'Take a pause; Ask for help',
  'split-notes': ['Pause', 'Ask for help', '', ''],
  'contains-text': true,
  'contains-record': true,
  'starts_with-text': true,
  'ends_with-text': true,
  'sum-scores': 12,
  'sum-empty': 0,
  'min-scores': 2,
  'min-empty': 0,
  'max-scores': 8,
  'max-empty': 0,
  'first-note': 'Pause',
  'first-empty': 'No notes yet.',
  'last-note': 'Ask for help',
  'last-empty': 'No notes yet.',
  'find-score': 8,
  'find-missing': 0,
  'any-scores': true,
  'any-empty': false,
  'all-scores': false,
  'all-empty': true,
  'distinct-notes': ['Pause', 'Ask for help'],
  'shuffle-seeded': [6, 2, 3, 1, 4, 5],
  'map-list': ['Take a pause', 'Ask for help'],
  'map-pipe': ['Take a pause', 'Ask for help'],
  'map-placeholders': ['Take a pause', 'Ask for help'],
  'map-named': [4, 64, 81],
  'map-fields': ['Pause', 'Ask for help'],
  'map-nested': [[8], [7, 9]],
  'filter-placeholders': [8, 9],
  'filter-named': [4, 8],
  'fold-placeholders': 14,
  'fold-named': 14,
  'find-placeholders': 8,
  'find-named': 8,
  'any-placeholders': true,
  'any-named': true,
  'all-placeholders': true,
  'all-named': true,
  'filter-list': [8, 9],
  'flatten-lists': ['Pause', 'Ask for help', 'Try again'],
  'fold-sum': 12,
  'reduce-helper': 14,
  'reduce-placeholders': 14,
  'reduce-named': 14,
  'reduce-empty': 0,
  'reduce-singleton': 7,
  'fold-empty': 10,
  'library-records': [
    { id: 'wood', name: 'Wood', density: 600 },
    { id: 'steel', name: 'Steel', density: 7850 },
  ],
  'lookup-present': 'Wood',
  'lookup-absent': 'No material found.',
};

function untag(value: unknown): unknown {
  const tagged = value as { type: string; value: unknown };
  if (tagged.type === 'list') return (tagged.value as { items: unknown[] }).items.map(untag);
  if (tagged.type === 'record')
    return Object.fromEntries(
      Object.entries(tagged.value as Record<string, unknown>).map(([key, item]) => [
        key,
        untag(item),
      ]),
    );
  return tagged.value;
}

it.each(functionCatalog.flatMap((entry) => entry.variants))(
  'runs $id through the real compiler and runtime',
  async (variant) => {
    const options = { isolated: true, data: variant.options?.data };
    const inspection = await inspectSource(variant.source, options);
    expect(inspection.diagnostics.filter((item) => item.severity === 'Error')).toEqual([]);
    const run = await startSourceRun(variant.source, {}, variant.id, options);
    expect(run.view.status).toBe('Completed');
    if (variant.id === 'shuffle-run') {
      expect((untag(run.view.outputs.result) as number[]).slice().sort()).toEqual([
        1, 2, 3, 4, 5, 6,
      ]);
      return;
    }
    expect(Object.hasOwn(expected, variant.id)).toBe(true);
    expect(untag(run.view.outputs.result)).toEqual(expected[variant.id]);
  },
);

it('covers every runtime built-in and editor function suggestion', () => {
  const source = readFileSync(
    resolve(process.cwd(), '../../crates/pattern-core/src/expression/functional.rs'),
    'utf8',
  );
  const reserved = source.split('pub const BUILTIN_FUNCTIONS: &[&str] = &[')[1].split('];')[0];
  const names = [...reserved.matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);
  expect(functionCatalog.map((entry) => entry.id).sort()).toEqual(names.sort());
  for (const suggestion of pureFunctionSuggestions(false))
    expect(names).toContain(suggestion.label);
});

it('finds functions by parameters, return types, and category', () => {
  expect(findFunctions('seed').map((entry) => entry.id)).toEqual(['fold', 'reduce', 'shuffle']);
  expect(findFunctions('Optional', 'Reference data').map((entry) => entry.id)).toEqual(['lookup']);
  expect(findFunctions('', 'Numbers').map((entry) => entry.id)).toEqual([
    'clamp',
    'max',
    'min',
    'sum',
  ]);
  expect(findFunctions('missing function')).toEqual([]);
});

it('keeps reference-data examples self-contained', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new Error('Examples must not fetch resources.'));
  try {
    for (const entry of functionCatalog.filter((item) => item.category === 'Reference data')) {
      for (const variant of entry.variants) {
        const run = await startSourceRun(variant.source, {}, variant.id, {
          isolated: true,
          data: variant.options?.data,
        });
        expect(run.view.status).toBe('Completed');
      }
    }
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    fetcher.mockRestore();
  }
});
