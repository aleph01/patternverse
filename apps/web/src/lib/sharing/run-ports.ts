import { practiceRunPorts } from '$lib/pattern-run/run-adapters';
import type { PracticeRunPorts } from '$lib/pattern-run/controller';

const unavailable = async (): Promise<never> => {
  throw new Error('This embed supports self-guided practices only.');
};

/** Embed hosts never inherit workspace, saved-history or AI access from the website. */
export const embedRunPorts: PracticeRunPorts = {
  ...practiceRunPorts,
  loadHistory: unavailable,
  startTechnique: unavailable,
  freeAvailable: async () => false,
  connectionReady: async () => false,
  fulfillFree: unavailable,
  fulfillModel: unavailable,
};
