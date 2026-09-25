import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { createSession } from '@patternverse/companion-core';
import { initSync } from './engine/pattern_wasm.js';
import { applyGuidedAction, listTechniques, loadGuidedRun, startGuidedRun } from './guided';
import { createPrivateMiraStore } from './private-store';

beforeAll(() => {
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  });
});

describe('browser Rust-guided exercises', () => {
  it('filters techniques by modality and commits exact progress before display', async () => {
    const options = {
      indexedDB,
      crypto: webcrypto as Crypto,
      databaseName: `guided-${crypto.randomUUID()}`,
    };
    const store = createPrivateMiraStore(options);
    await store.save(createSession('one', 'cbt', '2026-09-25T10:00:00Z'));
    expect((await listTechniques('cbt')).map((item) => item.id)).toContain('cbt.moment');
    expect(await listTechniques('narm')).toEqual([]);
    const started = await startGuidedRun(store, 'one', 'cbt.moment');
    expect(started.view.pending?.request.kind).toBe('interaction.choose');
    expect((await store.loadRun('one'))?.token).toBe(started.token);
    const effect = started.view.pending!;
    const advanced = await applyGuidedAction(
      store,
      'one',
      started,
      { Fulfill: { effect_id: effect.effect_id, result: { kind: 'selected', value: 'begin' } } },
      effect.run_id,
    );
    expect(advanced.view.revision).toBe(1);
    expect(advanced.view.pending?.request.kind).toBe('interaction.ask');
    const reopened = createPrivateMiraStore(options);
    expect((await loadGuidedRun(reopened, 'one'))?.view.pending?.effect_id).toBe(
      advanced.view.pending?.effect_id,
    );
    await expect(
      applyGuidedAction(store, 'one', started, 'Cancel', started.view.root_id),
    ).rejects.toThrow('Exercise changed elsewhere');
  });
});
