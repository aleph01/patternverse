import { getLocalWorkspace } from '$lib/client/workspace';
import { createPrivateMiraStore } from '$lib/mira/private-store';
import { OpenRouterConnectionError } from '$lib/mira/openrouter';
import {
  applyStandaloneAction,
  listTechniques,
  rewindStandaloneRun,
  startStandaloneRun,
} from '$lib/mira/guided';
import {
  applySourceAction,
  restoreSourceRun,
  rewindSourceRun,
  startSourceRun,
} from '$lib/pattern-runtime/source';
import { FreeGuidedAiError, freeGuidedAiAvailable, fulfillFreeGuidedStep } from './free-ai';
import { fulfillPatternModelEffect } from './local-model';
import type { PracticeRunPorts } from './controller';

/** Website/desktop adapters; importing these never opens storage or calls a provider. */
export const practiceRunPorts: PracticeRunPorts = {
  startSource: startSourceRun,
  startTechnique: startStandaloneRun,
  techniqueInstalled: async (modality, id) =>
    (await listTechniques(modality)).some((technique) => technique.id === id),
  applySource: applySourceAction,
  applyTechnique: applyStandaloneAction,
  rewindSource: rewindSourceRun,
  rewindTechnique: rewindStandaloneRun,
  restoreSource: restoreSourceRun,
  loadHistory: async (id) => (await getLocalWorkspace()).getPracticeRun(id),
  freeAvailable: freeGuidedAiAvailable,
  connectionReady: async () =>
    Boolean((await createPrivateMiraStore().loadSettings()).openRouterKey.trim()),
  fulfillFree: fulfillFreeGuidedStep,
  fulfillModel: fulfillPatternModelEffect,
  failure: (cause, desktop, fallback) => {
    if (cause instanceof DOMException && cause.name === 'AbortError') return { error: '' };
    if (cause instanceof FreeGuidedAiError && !desktop)
      return cause.code === 'FREE_LIMIT'
        ? { error: '', connectionIssue: 'free-limit' }
        : { error: cause.message };
    if (cause instanceof OpenRouterConnectionError && !desktop)
      return {
        error: '',
        connectionIssue: cause.reason,
        ...(cause.reason === 'connection' ? { connectionReady: false } : {}),
      };
    return { error: cause instanceof Error ? cause.message : fallback };
  },
};
