import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import { createSession } from '@patternverse/companion-core';
import { initSync } from './engine/pattern_wasm.js';
import {
  applyGuidedAction,
  applyStandaloneAction,
  listTechniques,
  loadGuidedRun,
  startGuidedRun,
  startStandaloneRun,
} from './guided';
import { createPrivateMiraStore } from './private-store';
import { THERAPY_LIBRARY } from './therapy-library';
import { REFRAMING_LIBRARY } from '$lib/pattern-run/reframing-library';

beforeAll(() => {
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  });
});

describe('browser Rust-guided exercises', () => {
  it('installs every reframing operator and exposes its typed first step', async () => {
    const installed = new Set((await listTechniques('reframing')).map((item) => item.id));
    expect(REFRAMING_LIBRARY).toHaveLength(23);
    expect(REFRAMING_LIBRARY.every((item) => installed.has(item.id))).toBe(true);
    expect((await startStandaloneRun('reframing.rapid-reframe')).view.pending?.request.kind).toBe(
      'interaction.ask',
    );
    expect(
      (
        await startStandaloneRun('reframing.break-tradeoff', {
          frame: 'Speed or quality?',
        })
      ).view.pending?.request.kind,
    ).toBe('agent.generate');
    expect(
      (
        await startStandaloneRun('reframing.identify-problem-form', {
          frame: 'We need to build a mobile app.',
        })
      ).view.pending?.request.kind,
    ).toBe('semantic.classify');
  });

  it('has an installed executable for every advertised standalone pattern', async () => {
    for (const modality of new Set(THERAPY_LIBRARY.map((item) => item.modality))) {
      const installed = new Set((await listTechniques(modality)).map((item) => item.id));
      expect(
        THERAPY_LIBRARY.filter((item) => item.modality === modality)
          .map((item) => item.id)
          .every((id) => installed.has(id)),
      ).toBe(true);
    }
  });

  it('runs a bundled Pattern Markdown exercise without a Mira session', async () => {
    const started = await startStandaloneRun('cbt.thought-record');
    expect(started.view.pending?.request.kind).toBe('interaction.ask');
    const effect = started.view.pending!;
    const advanced = await applyStandaloneAction(
      started,
      {
        Fulfill: {
          effect_id: effect.effect_id,
          result: { kind: 'text', value: 'A recent conversation.' },
        },
      },
      effect.run_id,
    );
    expect(advanced.view.revision).toBe(1);
    expect(advanced.view.pending?.request.kind).toBe('interaction.ask');
    expect(started.view.revision).toBe(0);
    await expect(
      applyStandaloneAction(
        { ...started, saved: advanced.saved },
        {
          Fulfill: {
            effect_id: effect.effect_id,
            result: { kind: 'text', value: 'A different answer.' },
          },
        },
        effect.run_id,
      ),
    ).rejects.toThrow();
  });

  it('runs worry time with an adjustable timer and one writing step', async () => {
    const started = await startStandaloneRun('cbt.worry-time');
    const timer = started.view.pending!;
    expect(timer.request.kind).toBe('interaction.timer');
    expect(timer.request.payload.timer).toMatchObject({
      duration_seconds: 600,
      adjustable: true,
      blocking: false,
      min_seconds: 60,
      max_seconds: 1800,
    });
    const writing = await applyStandaloneAction(
      started,
      {
        Fulfill: {
          effect_id: timer.effect_id,
          result: {
            kind: 'timer',
            value: { duration_seconds: 300, elapsed_seconds: 0, completed: false },
          },
        },
      },
      timer.run_id,
    );
    const question = writing.view.pending!;
    expect(question.request.kind).toBe('interaction.ask');
    const completed = await applyStandaloneAction(
      writing,
      {
        Fulfill: {
          effect_id: question.effect_id,
          result: {
            kind: 'text',
            value: 'What if I miss the deadline? What if the team loses confidence in me?',
          },
        },
      },
      question.run_id,
    );
    expect(completed.view.status).toBe('Completed');
    expect(completed.view.pending).toBeNull();
  });

  it('filters techniques by modality and commits exact progress before display', async () => {
    const options = {
      indexedDB,
      crypto: webcrypto as Crypto,
      databaseName: `guided-${crypto.randomUUID()}`,
    };
    const store = createPrivateMiraStore(options);
    await store.save(createSession('one', 'cbt', '2026-09-25T10:00:00Z'));
    expect((await listTechniques('cbt')).map((item) => item.id)).toEqual(
      THERAPY_LIBRARY.map((item) => item.id),
    );
    expect(await listTechniques('act')).toEqual([]);
    await expect(startStandaloneRun('act.values')).rejects.toThrow();
    await expect(startStandaloneRun('cbt.abc')).rejects.toThrow();
    expect(await listTechniques('narm')).toEqual([]);
    const started = await startGuidedRun(store, 'one', 'cbt.thought-record');
    expect(started.view.pending?.request.kind).toBe('interaction.ask');
    expect((await store.loadRun('one'))?.token).toBe(started.token);
    const effect = started.view.pending!;
    const advanced = await applyGuidedAction(
      store,
      'one',
      started,
      {
        Fulfill: {
          effect_id: effect.effect_id,
          result: { kind: 'text', value: 'A recent conversation.' },
        },
      },
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
