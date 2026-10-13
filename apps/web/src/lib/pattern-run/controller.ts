import type { PatternEffect, PatternRun } from '$lib/pattern-runtime/types';
import { createPracticeLifecycle } from './lifecycle';
import {
  executionStepKey,
  sameAnswer,
  saveRevisitedStep,
  supportsStepEditing,
  type AdvanceRun,
  type RetainedStep,
} from './revisit';
import { worksheetSteps } from './view';

export const modelKinds: ReadonlySet<string> = new Set([
  'language.realize',
  'agent.generate',
  'semantic.classify',
]);

export type PracticeRunDefinition = Readonly<{
  patternId: string;
  sourceId: string;
  patternType: 'pattern' | 'practice';
  techniqueId: string;
  modality: string;
  source: string | null;
  inputNames: readonly string[];
  needsAi: boolean;
  desktop: boolean;
}>;

export type PracticeRunState = Readonly<{
  run: PatternRun | null;
  savedRunId: string | undefined;
  working: boolean;
  error: string;
  unavailable: string;
  editing: { preview: PatternRun; effectId: string; initialResult: unknown } | null;
  reviewIds: readonly string[];
  retained: readonly RetainedStep[];
  aiBusy: boolean;
  connectionChecked: boolean;
  connectionReady: boolean;
  connectionBusy: boolean;
  connectionError: string;
  connectionIssue: 'connection' | 'credits' | 'free-limit' | null;
  freeAvailable: boolean;
  aiProvider: 'free' | 'openrouter' | null;
}>;

export function initialPracticeRunState(): PracticeRunState {
  return {
    run: null,
    savedRunId: undefined,
    working: false,
    error: '',
    unavailable: '',
    editing: null,
    reviewIds: [],
    retained: [],
    aiBusy: false,
    connectionChecked: false,
    connectionReady: false,
    connectionBusy: false,
    connectionError: '',
    connectionIssue: null,
    freeAvailable: false,
    aiProvider: null,
  };
}

/** Host adapters own storage, installed techniques and provider-specific errors.
 * All transitions, rewinds and checkpoint validation still go through Rust.
 */
export type PracticeRunPorts = Readonly<{
  startSource: (source: string) => Promise<PatternRun>;
  startTechnique: (id: string, inputs: Record<string, string>) => Promise<PatternRun>;
  techniqueInstalled: (modality: string, id: string) => Promise<boolean>;
  applySource: AdvanceRun;
  applyTechnique: AdvanceRun;
  rewindSource: (run: PatternRun, effect: PatternEffect) => Promise<PatternRun>;
  rewindTechnique: (run: PatternRun, effect: PatternEffect) => Promise<PatternRun>;
  restoreSource: (source: string, checkpoint: string) => Promise<PatternRun>;
  loadHistory: (id: string) => Promise<
    | {
        id: string;
        checkpoint?: string;
        patternRef: { entityId: string; sourceId: string };
        patternType: string;
      }
    | undefined
  >;
  freeAvailable: (patternId: string) => Promise<boolean>;
  connectionReady: () => Promise<boolean>;
  fulfillFree: (id: string, run: PatternRun, signal: AbortSignal) => Promise<unknown>;
  fulfillModel: (effect: PatternEffect, desktop: boolean, signal: AbortSignal) => Promise<unknown>;
  failure: (
    cause: unknown,
    desktop: boolean,
    fallback: string,
  ) => Pick<PracticeRunState, 'error'> &
    Partial<Pick<PracticeRunState, 'connectionIssue' | 'connectionReady'>>;
}>;

/** Standalone-run orchestration, not a second language runtime or persistence layer.
 * Only current requests may publish views; cancellation replaces work through the
 * shared lifecycle even when a runtime/storage adapter cannot abort its promise.
 */
export function createPracticeRunController(options: {
  definition: () => PracticeRunDefinition;
  ports: PracticeRunPorts;
  onstate: (state: PracticeRunState) => void;
  onrestart?: () => void;
  onleaveedit?: (effectId: string) => void;
}) {
  const { ports } = options;
  let state = initialPracticeRunState();
  let disposed = false;
  const drafts = new Map<string, unknown>();
  const update = (patch: Partial<PracticeRunState>) => {
    if (disposed) return;
    state = { ...state, ...patch };
    options.onstate(state);
  };
  const lifecycle = createPracticeLifecycle((request) => update(request));
  const connections = createPracticeLifecycle(({ working, error }) =>
    update({
      connectionBusy: working,
      connectionError: error,
      ...(!working ? { connectionChecked: true } : {}),
    }),
  );
  const advance = (definition: PracticeRunDefinition): AdvanceRun =>
    definition.source ? ports.applySource : ports.applyTechnique;
  const acceptRun = (signal: AbortSignal, run: PatternRun) => {
    signal.throwIfAborted();
    update({ run });
  };

  function request(
    operation: (signal: AbortSignal, definition: PracticeRunDefinition) => Promise<void>,
    fallback: string,
    replace = false,
  ) {
    const definition = options.definition();
    return lifecycle.execute(
      (signal) => operation(signal, definition),
      () => {},
      {
        replace,
        message: (cause) => {
          const failure = ports.failure(cause, definition.desktop, fallback);
          update(failure);
          return failure.error;
        },
      },
    );
  }

  async function continueAiSteps(signal: AbortSignal, definition: PracticeRunDefinition) {
    if (
      !definition.desktop &&
      !state.aiProvider &&
      !definition.needsAi &&
      modelKinds.has(state.run?.view.pending?.request.kind ?? '')
    ) {
      const freeAvailable =
        definition.sourceId === 'commons' ? await ports.freeAvailable(definition.patternId) : false;
      signal.throwIfAborted();
      update({ freeAvailable });
      if (freeAvailable) return;
    }
    for (
      let count = 0;
      count < 32 && modelKinds.has(state.run?.view.pending?.request.kind ?? '');
      count++
    ) {
      signal.throwIfAborted();
      const current = state.run;
      if (!current?.view.pending) return;
      const effect = current.view.pending;
      update({ aiBusy: true });
      try {
        const result =
          state.aiProvider === 'free' && !definition.desktop
            ? await ports.fulfillFree(definition.patternId, current, signal)
            : await ports.fulfillModel(effect, definition.desktop, signal);
        signal.throwIfAborted();
        acceptRun(
          signal,
          await advance(definition)(
            current,
            { Fulfill: { effect_id: effect.effect_id, result } },
            effect.run_id,
          ),
        );
      } finally {
        // An obsolete request must not clear the busy indicator of its replacement.
        if (!signal.aborted) update({ aiBusy: false });
      }
    }
    if (modelKinds.has(state.run?.view.pending?.request.kind ?? ''))
      throw new Error('The pattern generated too many steps in a row. Stop or try again.');
  }

  async function begin(inputs: Readonly<Record<string, string>> = {}) {
    if (disposed || state.working || !state.connectionReady) return false;
    const definition = options.definition();
    if (definition.inputNames.some((name) => !inputs[name]?.trim())) {
      update({ error: 'Add a short starting description before beginning.' });
      return false;
    }
    return request(async (signal, definition) => {
      drafts.clear();
      update({
        unavailable: '',
        editing: null,
        reviewIds: [],
        retained: [],
        savedRunId: undefined,
      });
      options.onrestart?.();
      if (definition.source) {
        acceptRun(signal, await ports.startSource(definition.source));
        return;
      }
      const installed = await ports.techniqueInstalled(definition.modality, definition.techniqueId);
      signal.throwIfAborted();
      if (!installed) {
        update({ unavailable: 'An executable revision is not installed for this pattern.' });
        return;
      }
      acceptRun(
        signal,
        await ports.startTechnique(
          definition.techniqueId,
          Object.fromEntries(definition.inputNames.map((name) => [name, inputs[name]!.trim()])),
        ),
      );
      await continueAiSteps(signal, definition);
    }, 'The pattern could not start.');
  }

  async function restoreHistory(id: string) {
    return request(async (signal, definition) => {
      const saved = await ports.loadHistory(id);
      signal.throwIfAborted();
      if (
        !saved?.checkpoint ||
        !definition.source ||
        saved.patternRef.entityId !== definition.patternId ||
        saved.patternRef.sourceId !== definition.sourceId ||
        saved.patternType !== definition.patternType
      )
        throw new Error(
          'This saved practice cannot be reopened here. Your responses are still available in Practice history.',
        );
      const run = await ports.restoreSource(definition.source, saved.checkpoint);
      signal.throwIfAborted();
      update({ run, savedRunId: saved.id });
    }, 'Could not reopen this practice.');
  }

  async function checkConnection(discoverFree = false, replace = false) {
    const definition = options.definition();
    const provider = state.aiProvider;
    const accepted = await connections.execute(
      async (signal) => {
        const freeAvailable =
          discoverFree && definition.sourceId === 'commons'
            ? await ports.freeAvailable(definition.patternId)
            : state.freeAvailable;
        signal.throwIfAborted();
        const ready =
          provider === 'free'
            ? true
            : freeAvailable && !provider
              ? false
              : await ports.connectionReady();
        return { freeAvailable, ready };
      },
      ({ freeAvailable, ready }) => {
        update({
          freeAvailable,
          connectionReady: ready,
          ...(ready && state.connectionIssue === 'connection' ? { connectionIssue: null } : {}),
        });
      },
      {
        replace,
        message: (cause) =>
          cause instanceof Error ? cause.message : 'Could not check the connection.',
      },
    );
    if (accepted && !state.run && state.connectionReady && definition.inputNames.length === 0)
      void begin();
  }

  function leaveEdit() {
    const effectId = state.editing?.effectId;
    update({ editing: null });
    if (effectId) options.onleaveedit?.(effectId);
  }

  return {
    drafts,
    begin,
    restoreHistory,
    checkConnection,
    async initialize(historyId: string | null) {
      const definition = options.definition();
      if (disposed) return;
      if (definition.desktop || !definition.needsAi) {
        update({ connectionChecked: true, connectionReady: true });
        if (historyId) await restoreHistory(historyId);
        else if (definition.inputNames.length === 0) await begin();
      } else await checkConnection(true);
    },
    async chooseAi(provider: 'free' | 'openrouter') {
      if (disposed || state.working) return;
      update({ aiProvider: provider, connectionIssue: null });
      await checkConnection(false, true);
    },
    async useOpenRouter() {
      if (disposed || state.working) return;
      // Connecting/selecting a provider does not fulfill an active paid AI step.
      update({ aiProvider: 'openrouter', connectionIssue: null, error: '' });
      await checkConnection(false, true);
      if (!disposed && !state.connectionReady) update({ connectionIssue: 'connection' });
    },
    async apply(event: unknown, runId: string) {
      const current = state.run;
      if (!current || state.working || state.editing) return false;
      return request(async (signal, definition) => {
        acceptRun(signal, await advance(definition)(current, event, runId));
        update({
          reviewIds: state.reviewIds.filter((id) => id !== current.view.pending?.effect_id),
        });
        await continueAiSteps(signal, definition);
      }, 'The pattern could not continue.');
    },
    async editStep(effectId: string) {
      const current = state.run;
      if (!current || state.working || state.editing?.effectId === effectId) return false;
      const item = current.view.items.find(({ effect }) => effect.effect_id === effectId);
      if (!item || item.result === null || !supportsStepEditing(item.effect)) return false;
      return request(async (signal, definition) => {
        const preview = await (definition.source ? ports.rewindSource : ports.rewindTechnique)(
          current,
          item.effect,
        );
        signal.throwIfAborted();
        update({
          editing: {
            preview,
            effectId,
            initialResult: drafts.get(executionStepKey(item.effect)) ?? item.result,
          },
        });
      }, 'This step could not be reopened.');
    },
    cancelEdit() {
      if (disposed || state.working || !state.editing) return;
      if (state.editing.preview.view.pending)
        drafts.delete(executionStepKey(state.editing.preview.view.pending));
      leaveEdit();
    },
    async saveEdit(result: unknown) {
      const current = state.run,
        editing = state.editing;
      if (!current || !editing || state.working || disposed) return false;
      const original = current.view.items.find(
        ({ effect }) => effect.effect_id === editing.effectId,
      );
      if (sameAnswer(original?.result, result)) {
        update({ reviewIds: state.reviewIds.filter((id) => id !== editing.effectId) });
        if (editing.preview.view.pending)
          drafts.delete(executionStepKey(editing.preview.view.pending));
        leaveEdit();
        return true;
      }
      return request(async (signal, definition) => {
        const saved = await saveRevisitedStep(current, editing.preview, result, async (...args) => {
          signal.throwIfAborted();
          const run = await advance(definition)(...args);
          signal.throwIfAborted();
          return run;
        });
        signal.throwIfAborted();
        for (const step of saved.retained) drafts.set(executionStepKey(step.effect), step.result);
        const accepted = new Set(
          worksheetSteps(saved.run.view).map(({ effect }) => executionStepKey(effect)),
        );
        update({
          run: saved.run,
          retained: [
            ...new Map(
              [...state.retained, ...saved.retained]
                .filter((step) => !accepted.has(executionStepKey(step.effect)))
                .map((step) => [executionStepKey(step.effect), step]),
            ).values(),
          ],
          reviewIds: [...new Set([...state.reviewIds, ...saved.reviewIds])].filter(
            (id) => id !== editing.effectId,
          ),
        });
        if (editing.preview.view.pending)
          drafts.delete(executionStepKey(editing.preview.view.pending));
        leaveEdit();
      }, 'These changes could not be saved. Your earlier answers are still here.');
    },
    keepResponse(effectId: string) {
      update({ reviewIds: state.reviewIds.filter((id) => id !== effectId) });
    },
    async retryAi() {
      if (state.working || !state.run || state.editing || disposed) return false;
      update({ connectionIssue: null });
      return request(continueAiSteps, 'The AI step could not finish.');
    },
    stopRun() {
      const current = state.run;
      if (!current || state.editing || (state.working && !state.aiBusy)) return false;
      return request(
        async (signal, definition) => {
          update({ aiBusy: false });
          acceptRun(signal, await advance(definition)(current, 'Cancel', current.view.root_id));
        },
        'The pattern could not continue.',
        true,
      );
    },
    stopLoop() {
      const current = state.run,
        effect = current?.view.pending;
      if (!current || !effect?.loop_context || state.editing || (state.working && !state.aiBusy))
        return false;
      return request(
        async (signal, definition) => {
          update({ aiBusy: false });
          acceptRun(
            signal,
            await advance(definition)(
              current,
              { StopLoop: { effect_id: effect.effect_id } },
              effect.run_id,
            ),
          );
          await continueAiSteps(signal, definition);
        },
        'The pattern could not continue.',
        true,
      );
    },
    dispose() {
      disposed = true;
      lifecycle.dispose();
      connections.dispose();
      drafts.clear();
    },
  };
}
