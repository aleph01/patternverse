export type PracticeRequestState = Readonly<{ working: boolean; error: string }>;

/**
 * Coordinate asynchronous bridge requests, not Pattern Language execution.
 * The caller supplies runtime operations, accepted-view handling, and error copy.
 * No storage, AI provider, browser API, or Svelte state belongs here.
 */
export function createPracticeLifecycle(onstate: (state: PracticeRequestState) => void) {
  let disposed = false;
  let generation = 0;
  let pending: AbortController | null = null;

  function invalidate() {
    generation++;
    pending?.abort();
    pending = null;
  }

  return {
    /** Commands serialize by default. An explicit replacement invalidates an older request. */
    async execute<T>(
      operation: (signal: AbortSignal) => Promise<T>,
      accept: (result: T) => void,
      options: Readonly<{
        replace?: boolean;
        message: (cause: unknown) => string;
      }>,
    ): Promise<boolean> {
      if (disposed || (pending && !options.replace)) return false;
      invalidate();
      const token = generation;
      const controller = new AbortController();
      pending = controller;
      const current = () => !disposed && token === generation && !controller.signal.aborted;
      onstate({ working: true, error: '' });
      let error = '';
      try {
        const result = await operation(controller.signal);
        if (!current()) return false;
        // Only accepted results reach a host's checkpoint/persistence callbacks.
        accept(result);
        return true;
      } catch (cause) {
        if (current()) error = options.message(cause);
        return false;
      } finally {
        if (current()) {
          pending = null;
          onstate({ working: false, error });
        }
      }
    },
    /** Invalidating requests does not dispatch a runtime Cancel or undo host writes. */
    reset() {
      if (disposed) return;
      invalidate();
      onstate({ working: false, error: '' });
    },
    dispose() {
      disposed = true;
      invalidate();
    },
  };
}
