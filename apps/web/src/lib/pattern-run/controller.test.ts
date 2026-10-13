import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import {
  applySourceAction,
  restoreSourceRun,
  rewindSourceRun,
  serializeSourceRun,
  startSourceRun,
} from '$lib/pattern-runtime/source';
import type { PatternEffect, PatternRun } from '$lib/pattern-runtime/types';
import {
  createPracticeRunController,
  initialPracticeRunState,
  type PracticeRunDefinition,
  type PracticeRunPorts,
} from './controller';
import { executionStepKey } from './revisit';

function effect(kind = 'interaction.ask', id = 'first'): PatternEffect {
  return { effect_id: id, run_id: 'root', node_id: 1, request: { kind, payload: { prompt: id } } };
}
function run(
  pending: PatternEffect | null = effect(),
  status: PatternRun['view']['status'] = 'Waiting',
): PatternRun {
  return {
    saved: { checkpoint: 'synthetic' },
    view: {
      root_id: 'root',
      technique_id: 'test',
      revision: 1,
      status,
      pending,
      items: pending ? [{ effect: pending, result: null }] : [],
      outputs: {},
    },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const saved = {
  id: 'history-id',
  checkpoint: 'saved-checkpoint',
  patternRef: { sourceId: 'commons', entityId: 'test' },
  patternType: 'pattern',
};

function fixture(
  definition: Partial<PracticeRunDefinition> = {},
  adapters: Partial<PracticeRunPorts> = {},
) {
  const host = {
    definition: {
      patternId: 'test',
      sourceId: 'commons',
      patternType: 'pattern',
      techniqueId: 'installed',
      modality: 'cbt',
      source: ':language 1',
      inputNames: [],
      needsAi: false,
      desktop: false,
      ...definition,
    } as PracticeRunDefinition,
  };
  const ports = {
    startSource: vi.fn<PracticeRunPorts['startSource']>().mockResolvedValue(run()),
    startTechnique: vi.fn<PracticeRunPorts['startTechnique']>().mockResolvedValue(run()),
    techniqueInstalled: vi.fn<PracticeRunPorts['techniqueInstalled']>().mockResolvedValue(true),
    applySource: vi.fn<PracticeRunPorts['applySource']>().mockResolvedValue(run(null, 'Completed')),
    applyTechnique: vi
      .fn<PracticeRunPorts['applyTechnique']>()
      .mockResolvedValue(run(null, 'Completed')),
    rewindSource: vi.fn<PracticeRunPorts['rewindSource']>().mockResolvedValue(run()),
    rewindTechnique: vi.fn<PracticeRunPorts['rewindTechnique']>().mockResolvedValue(run()),
    restoreSource: vi.fn<PracticeRunPorts['restoreSource']>().mockResolvedValue(run()),
    loadHistory: vi.fn<PracticeRunPorts['loadHistory']>().mockResolvedValue(saved),
    freeAvailable: vi.fn<PracticeRunPorts['freeAvailable']>().mockResolvedValue(false),
    connectionReady: vi.fn<PracticeRunPorts['connectionReady']>().mockResolvedValue(true),
    fulfillFree: vi
      .fn<PracticeRunPorts['fulfillFree']>()
      .mockResolvedValue({ kind: 'generated', value: 'free' }),
    fulfillModel: vi
      .fn<PracticeRunPorts['fulfillModel']>()
      .mockResolvedValue({ kind: 'generated', value: 'model' }),
    failure: vi
      .fn<PracticeRunPorts['failure']>()
      .mockImplementation((cause, _desktop, fallback) => ({
        error: cause instanceof Error ? cause.message : fallback,
      })),
  };
  let state = initialPracticeRunState();
  const onstate = vi.fn((next: typeof state) => {
    state = next;
  });
  const onrestart = vi.fn(),
    onleaveedit = vi.fn();
  const controller = createPracticeRunController({
    definition: () => host.definition,
    ports: { ...ports, ...adapters },
    onstate,
    onrestart,
    onleaveedit,
  });
  return {
    controller,
    ports,
    host,
    onstate,
    onrestart,
    onleaveedit,
    get state() {
      return state;
    },
  };
}

describe('standalone practice orchestration', () => {
  it('starts source practices without storage, provider or legacy-technique work', async () => {
    const f = fixture();
    await f.controller.initialize(null);
    expect(f.state.run).toEqual(run());
    expect(f.ports.startSource).toHaveBeenCalledExactlyOnceWith(':language 1');
    expect(f.ports.startTechnique).not.toHaveBeenCalled();
    expect(f.ports.connectionReady).not.toHaveBeenCalled();
    expect(f.ports.loadHistory).not.toHaveBeenCalled();
    expect(f.ports.fulfillFree).not.toHaveBeenCalled();
    expect(f.ports.fulfillModel).not.toHaveBeenCalled();
    expect(f.state.savedRunId).toBeUndefined();
    expect(f.state.working).toBe(false);
  });

  it('validates starting descriptions and dispatches trimmed inputs only to installed techniques', async () => {
    const f = fixture({ source: null, inputNames: ['problem', 'observations'] });
    await f.controller.initialize(null);
    expect(await f.controller.begin({ problem: '  ' })).toBe(false);
    expect(f.state.error).toContain('starting description');
    expect(f.ports.startTechnique).not.toHaveBeenCalled();
    await f.controller.begin({ problem: ' One problem ', observations: ' One clue ' });
    expect(f.ports.techniqueInstalled).toHaveBeenCalledWith('cbt', 'installed');
    expect(f.ports.startTechnique).toHaveBeenCalledExactlyOnceWith('installed', {
      problem: 'One problem',
      observations: 'One clue',
    });
  });

  it('reports an unavailable installed revision without starting it', async () => {
    const f = fixture({ source: null });
    f.ports.techniqueInstalled.mockResolvedValue(false);
    await f.controller.initialize(null);
    expect(f.state.unavailable).toContain('revision is not installed');
    expect(f.state.run).toBeNull();
    expect(f.ports.startTechnique).not.toHaveBeenCalled();
  });

  it('serializes submissions and keeps the accepted run when a command fails', async () => {
    const f = fixture();
    await f.controller.initialize(null);
    const original = f.state.run;
    const pending = deferred<PatternRun>();
    f.ports.applySource.mockReturnValueOnce(pending.promise);
    const first = f.controller.apply({ Fulfill: {} }, 'root');
    expect(await f.controller.apply('Cancel', 'root')).toBe(false);
    pending.reject(new Error('PATTERN_COMMAND_REJECTED'));
    await first;
    expect(f.state.run).toBe(original);
    expect(f.state.error).toBe('PATTERN_COMMAND_REJECTED');
    expect(f.state.working).toBe(false);
    expect(await f.controller.apply({ Fulfill: {} }, 'root')).toBe(true);
    expect(f.state.run?.view.status).toBe('Completed');
  });

  it('restores a matching source checkpoint without starting or redispatching AI', async () => {
    const f = fixture();
    await f.controller.initialize('history-id');
    expect(f.ports.restoreSource).toHaveBeenCalledExactlyOnceWith(
      ':language 1',
      'saved-checkpoint',
    );
    expect(f.state.savedRunId).toBe('history-id');
    expect(f.ports.startSource).not.toHaveBeenCalled();
    expect(f.ports.fulfillModel).not.toHaveBeenCalled();
    await f.controller.begin();
    expect(f.state.savedRunId).toBeUndefined();
    expect(f.onrestart).toHaveBeenCalledTimes(1);
  });

  it.each(['missing', 'checkpoint', 'entity', 'source', 'type', 'definition'])(
    'rejects a mismatched %s history record before restoring',
    async (mismatch) => {
      const f = fixture(mismatch === 'definition' ? { source: null } : {});
      f.ports.loadHistory.mockResolvedValue(
        mismatch === 'missing'
          ? undefined
          : {
              ...saved,
              ...(mismatch === 'checkpoint' ? { checkpoint: undefined } : {}),
              patternRef: {
                sourceId: mismatch === 'source' ? 'personal' : 'commons',
                entityId: mismatch === 'entity' ? 'other' : 'test',
              },
              patternType: mismatch === 'type' ? 'practice' : 'pattern',
            },
      );
      await f.controller.initialize('history-id');
      expect(f.state.error).toContain('cannot be reopened');
      expect(f.ports.restoreSource).not.toHaveBeenCalled();
      expect(f.ports.startSource).not.toHaveBeenCalled();
    },
  );

  it('keeps paid requests explicit after a connection refresh in an active practice', async () => {
    const f = fixture({ needsAi: true, inputNames: ['problem'], source: null });
    f.ports.connectionReady.mockResolvedValue(false);
    await f.controller.initialize(null);
    expect(await f.controller.begin({ problem: 'context' })).toBe(false);
    expect(f.state.connectionChecked).toBe(true);
    f.ports.connectionReady.mockResolvedValue(true);
    await f.controller.checkConnection();
    await f.controller.begin({ problem: 'context' });
    const model = run(effect('language.realize'));
    f.ports.applyTechnique.mockResolvedValueOnce(model);
    f.ports.fulfillModel.mockRejectedValueOnce(new Error('No credits'));
    await f.controller.apply({ Fulfill: {} }, 'root');
    expect(f.state.run).toBe(model);
    await f.controller.checkConnection();
    await f.controller.useOpenRouter();
    expect(f.ports.fulfillModel).toHaveBeenCalledTimes(1);
    await f.controller.retryAi();
    expect(f.ports.fulfillModel).toHaveBeenCalledTimes(2);
    expect(f.state.run?.view.status).toBe('Completed');
  });

  it('waits for free-AI consent, with no automatic paid fallback on failure', async () => {
    const f = fixture(
      { needsAi: true, inputNames: ['problem'], source: null },
      {
        failure: () => ({ error: '', connectionIssue: 'free-limit' }),
      },
    );
    f.ports.freeAvailable.mockResolvedValue(true);
    f.ports.startTechnique.mockResolvedValue(run(effect('agent.generate')));
    f.ports.fulfillFree.mockRejectedValueOnce(new Error('Free quota exhausted'));
    await f.controller.initialize(null);
    expect(f.state.freeAvailable).toBe(true);
    expect(f.state.connectionReady).toBe(false);
    expect(f.ports.connectionReady).not.toHaveBeenCalled();
    await f.controller.chooseAi('free');
    expect(f.ports.fulfillFree).not.toHaveBeenCalled();
    await f.controller.begin({ problem: 'context' });
    expect(f.state.connectionIssue).toBe('free-limit');
    expect(f.state.run?.view.pending?.request.kind).toBe('agent.generate');
    expect(f.ports.fulfillModel).not.toHaveBeenCalled();
    await f.controller.useOpenRouter();
    expect(f.ports.fulfillModel).not.toHaveBeenCalled();
    await f.controller.retryAi();
    expect(f.ports.fulfillModel).toHaveBeenCalledTimes(1);
  });

  it('discovers optional AI without sending answers until a provider is chosen', async () => {
    const f = fixture();
    f.ports.freeAvailable.mockResolvedValue(true);
    await f.controller.initialize(null);
    f.ports.applySource.mockResolvedValueOnce(run(effect('semantic.classify')));
    await f.controller.apply({ Fulfill: {} }, 'root');
    expect(f.state.freeAvailable).toBe(true);
    expect(f.ports.fulfillModel).not.toHaveBeenCalled();
    expect(f.ports.fulfillFree).not.toHaveBeenCalled();
    await f.controller.chooseAi('free');
    expect(f.ports.fulfillFree).not.toHaveBeenCalled();
    await f.controller.retryAi();
    expect(f.ports.fulfillFree).toHaveBeenCalledTimes(1);
  });

  it.each([{ desktop: true }, { sourceId: 'personal', needsAi: true }])(
    'does not offer public free AI for %j',
    async (definition) => {
      const f = fixture({ inputNames: ['problem'], ...definition });
      await f.controller.initialize(null);
      expect(f.ports.freeAvailable).not.toHaveBeenCalled();
    },
  );

  it('fulfills consecutive declared model effects but leaves participant interactions pending', async () => {
    const f = fixture({ source: null });
    f.ports.startTechnique.mockResolvedValue(run(effect('language.realize', 'model-1')));
    f.ports.applyTechnique
      .mockResolvedValueOnce(run(effect('semantic.classify', 'model-2')))
      .mockResolvedValueOnce(run(effect('interaction.ask', 'participant')));
    await f.controller.initialize(null);
    expect(f.ports.fulfillModel).toHaveBeenCalledTimes(2);
    expect(f.ports.applyTechnique.mock.calls.map(([, event]) => event)).toEqual([
      { Fulfill: { effect_id: 'model-1', result: { kind: 'generated', value: 'model' } } },
      { Fulfill: { effect_id: 'model-2', result: { kind: 'generated', value: 'model' } } },
    ]);
    expect(f.state.run?.view.pending?.effect_id).toBe('participant');
    expect(f.state.aiBusy).toBe(false);
  });

  it('keeps the existing bounded AI-chain protection', async () => {
    const f = fixture({ source: null });
    f.ports.startTechnique.mockResolvedValue(run(effect('agent.generate')));
    f.ports.applyTechnique.mockResolvedValue(run(effect('agent.generate')));
    await f.controller.initialize(null);
    expect(f.ports.fulfillModel).toHaveBeenCalledTimes(32);
    expect(f.state.error).toContain('too many steps');
    expect(f.state.working).toBe(false);
  });

  it.each(['success', 'failure'])('ignores a late AI %s after Stop pattern', async (outcome) => {
    const f = fixture({ source: null });
    const pending = deferred<unknown>();
    f.ports.startTechnique.mockResolvedValue(run(effect('agent.generate')));
    f.ports.fulfillModel.mockReturnValueOnce(pending.promise);
    const initializing = f.controller.initialize(null);
    await vi.waitFor(() => expect(f.state.aiBusy).toBe(true));
    const signal = f.ports.fulfillModel.mock.calls[0]![2];
    f.ports.applyTechnique.mockResolvedValueOnce(run(null, 'Cancelled'));
    await f.controller.stopRun();
    expect(signal.aborted).toBe(true);
    if (outcome === 'success') pending.resolve({ kind: 'generated', value: 'late' });
    else pending.reject(new Error('Late provider failure'));
    await initializing;
    expect(f.state.run?.view.status).toBe('Cancelled');
    expect(f.state.error).toBe('');
    expect(f.state.aiBusy).toBe(false);
    expect(f.ports.applyTechnique).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      'Cancel',
      'root',
    );
  });

  it('replaces in-flight AI with StopLoop through the same runtime adapter', async () => {
    const f = fixture({ source: null });
    const pending = deferred<unknown>();
    const looping = {
      ...effect('agent.generate'),
      loop_context: { node_id: 8, iteration: 1, max: 3 },
    };
    f.ports.startTechnique.mockResolvedValue(run(looping));
    f.ports.fulfillModel.mockReturnValueOnce(pending.promise);
    const initializing = f.controller.initialize(null);
    await vi.waitFor(() => expect(f.state.aiBusy).toBe(true));
    await f.controller.stopLoop();
    pending.resolve('late');
    await initializing;
    expect(f.ports.applyTechnique).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      { StopLoop: { effect_id: 'first' } },
      'root',
    );
    expect(f.state.run?.view.status).toBe('Completed');
  });

  it('ignores a runtime fulfillment that finishes after cancellation', async () => {
    const f = fixture({ source: null });
    const fulfillment = deferred<PatternRun>();
    f.ports.startTechnique.mockResolvedValue(run(effect('agent.generate')));
    f.ports.applyTechnique
      .mockReturnValueOnce(fulfillment.promise)
      .mockResolvedValueOnce(run(null, 'Cancelled'));
    const initializing = f.controller.initialize(null);
    await vi.waitFor(() => expect(f.ports.applyTechnique).toHaveBeenCalledTimes(1));
    await f.controller.stopRun();
    fulfillment.resolve(run(null, 'Completed'));
    await initializing;
    expect(f.state.run?.view.status).toBe('Cancelled');
    expect(f.state.working).toBe(false);
  });

  it.each(['start', 'restore', 'connection', 'rewind', 'ai'])(
    'disposal suppresses late %s completions and further callbacks',
    async (kind) => {
      const f = fixture(
        kind === 'connection' ? { needsAi: true } : kind === 'ai' ? { source: null } : {},
      );
      const pending = deferred<PatternRun>();
      const connection = deferred<boolean>();
      let operation: Promise<unknown>;
      if (kind === 'restore') {
        f.ports.restoreSource.mockReturnValueOnce(pending.promise);
        operation = f.controller.initialize('history-id');
        await vi.waitFor(() => expect(f.ports.restoreSource).toHaveBeenCalledTimes(1));
      } else if (kind === 'connection') {
        f.ports.connectionReady.mockReturnValueOnce(connection.promise);
        operation = f.controller.initialize(null);
        await vi.waitFor(() => expect(f.ports.connectionReady).toHaveBeenCalledTimes(1));
      } else if (kind === 'rewind') {
        const first = effect();
        f.ports.startSource.mockResolvedValueOnce({
          ...run(),
          view: {
            ...run().view,
            items: [{ effect: first, result: { kind: 'text', value: 'old' } }],
          },
        });
        await f.controller.initialize(null);
        f.ports.rewindSource.mockReturnValueOnce(pending.promise);
        operation = f.controller.editStep('first');
      } else if (kind === 'ai') {
        f.ports.startTechnique.mockResolvedValue(run(effect('agent.generate')));
        f.ports.fulfillModel.mockReturnValueOnce(pending.promise);
        operation = f.controller.initialize(null);
        await vi.waitFor(() => expect(f.state.aiBusy).toBe(true));
      } else {
        f.ports.startSource.mockReturnValueOnce(pending.promise);
        operation = f.controller.initialize(null);
      }
      f.controller.drafts.set('private', 'draft');
      f.controller.dispose();
      const calls = f.onstate.mock.calls.length;
      pending.resolve(run(null, 'Completed'));
      connection.resolve(true);
      await operation;
      await f.controller.begin();
      await f.controller.checkConnection();
      expect(f.onstate).toHaveBeenCalledTimes(calls);
      expect(f.controller.drafts.size).toBe(0);
    },
  );

  it('suppresses obsolete connection results when a provider is selected', async () => {
    const f = fixture({ needsAi: true, inputNames: ['problem'] });
    const pending = deferred<boolean>();
    f.ports.connectionReady.mockReturnValueOnce(pending.promise);
    const initializing = f.controller.initialize(null);
    await vi.waitFor(() => expect(f.ports.connectionReady).toHaveBeenCalledTimes(1));
    await f.controller.chooseAi('free');
    pending.resolve(false);
    await initializing;
    expect(f.state.aiProvider).toBe('free');
    expect(f.state.connectionReady).toBe(true);
    expect(f.state.connectionBusy).toBe(false);
  });

  it('uses the real runtime for revision replay, retained answers and resumable checkpoints', async () => {
    initSync({
      module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
    });
    const source =
      ':language 1\n!ask first {\nFirst\n}\n!timer pause {\n:duration 60\n:blocking true\nPause\n}\n!ask last {\nLast\n}\n-> end';
    const f = fixture(
      { source },
      {
        startSource: startSourceRun,
        applySource: applySourceAction,
        rewindSource: rewindSourceRun,
        restoreSource: restoreSourceRun,
      },
    );
    await f.controller.initialize(null);
    const first = f.state.run!.view.pending!;
    const submit = (result: unknown) => {
      const effect = f.state.run!.view.pending!;
      return f.controller.apply(
        { Fulfill: { effect_id: effect.effect_id, result } },
        effect.run_id,
      );
    };
    await submit({ kind: 'text', value: 'Before' });
    await submit({
      kind: 'timer',
      value: { duration_seconds: 60, elapsed_seconds: 60, completed: true },
    });
    await submit({ kind: 'text', value: 'Later answer kept' });
    const original = f.state.run;
    await f.controller.editStep(first.effect_id);
    expect(f.state.editing?.initialResult).toEqual({ kind: 'text', value: 'Before' });
    expect(await f.controller.apply('Cancel', 'root')).toBe(false);
    await f.controller.saveEdit({ kind: 'text', value: 'Before' });
    expect(f.state.run).toBe(original);
    expect(f.state.editing).toBeNull();
    await f.controller.editStep(first.effect_id);
    await f.controller.saveEdit({ kind: 'text', value: 'After' });
    expect(f.state.run!.view.pending?.request.kind).toBe('interaction.timer');
    expect(f.state.retained).toHaveLength(2);
    expect(f.state.retained[1]!.answer).toBe('Later answer kept');
    expect(f.controller.drafts.get(executionStepKey(f.state.retained[1]!.effect))).toEqual({
      kind: 'text',
      value: 'Later answer kept',
    });
    expect(f.state.reviewIds).toHaveLength(2);
    f.controller.keepResponse(f.state.reviewIds[0]!);
    expect(f.state.reviewIds).toHaveLength(1);
    expect(await restoreSourceRun(source, serializeSourceRun(f.state.run!))).toEqual(f.state.run);
    expect(f.ports.fulfillModel).not.toHaveBeenCalled();
    expect(f.ports.loadHistory).not.toHaveBeenCalled();
    await f.controller.editStep(first.effect_id);
    f.controller.cancelEdit();
    expect(f.state.editing).toBeNull();
    expect(f.controller.drafts.has(executionStepKey(first))).toBe(false);
    expect(f.onleaveedit).toHaveBeenCalledTimes(3);
  });
});
