/** Scheduling only. Merge, validation, conflict and recovery semantics belong to
 * the existing coordinator. Both manual and automatic attempts share this gate.
 */
export type AutomaticSyncOutcome = {
  type: string;
  retryable?: boolean;
  retryAfterMs?: number;
};

export function createAutomaticSync<T extends AutomaticSyncOutcome, A>(options: {
  eligible: () => boolean;
  enabled: () => boolean;
  run: (args: A | undefined, manual: boolean) => Promise<T>;
  completed: (result: T) => void;
  failed: (error: unknown) => void;
  busy: (value: boolean) => void;
}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<T> | undefined;
  let pending = false;
  let paused = false;
  let stopped = false;
  let failures = 0;
  let notBefore = 0;
  let firstChange: number | undefined;

  const clear = () => {
    clearTimeout(timer);
    timer = undefined;
    firstChange = undefined;
  };
  const schedule = (delay: number) => {
    if (stopped || paused || !options.enabled() || !options.eligible()) return;
    clearTimeout(timer);
    timer = setTimeout(
      () => {
        timer = undefined;
        firstChange = undefined;
        void execute(false).catch(() => {});
      },
      Math.max(delay, notBefore - Date.now()),
    );
  };
  const execute = (manual: boolean, args?: A): Promise<T> => {
    if (inFlight) return inFlight;
    if (stopped || !options.eligible() || (!manual && (!options.enabled() || paused)))
      return Promise.reject(new Error('Connect Dropbox and go online before syncing.'));
    clear();
    if (manual) paused = false;
    options.busy(true);
    inFlight = (async () => {
      try {
        const result = await options.run(args, manual);
        if (result.type === 'complete') {
          paused = false;
          failures = 0;
          notBefore = 0;
        } else if (result.type === 'cancelled') {
          // No provider work started. A disabled queued attempt is not a
          // conflict/failure pause; explicitly enabling sync can start afresh.
          clear();
        } else if (result.type === 'error' && result.retryable) {
          failures += 1;
          // Honor provider Retry-After; exponential backoff avoids hot retries.
          notBefore =
            Date.now() +
            Math.max(
              result.retryAfterMs ?? 0,
              Math.min(300_000, 15_000 * 2 ** Math.min(failures - 1, 5)),
            );
          schedule(notBefore - Date.now());
        } else {
          paused = true;
          clear();
        }
        options.completed(result);
        return result;
      } catch (error) {
        paused = true;
        clear();
        options.failed(error);
        throw error;
      } finally {
        inFlight = undefined;
        options.busy(false);
        if (pending) {
          pending = false;
          schedule(1500);
        }
      }
    })();
    return inFlight;
  };
  return {
    /** Coalesce saves without postponing indefinitely during frequent edits. */
    changed() {
      if (inFlight) {
        pending = true;
        return;
      }
      firstChange ??= Date.now();
      schedule(Math.max(0, Math.min(1500, firstChange + 10_000 - Date.now())));
    },
    refresh() {
      if (!options.enabled() || !options.eligible()) {
        clear();
        pending = false;
        return;
      }
      if (!inFlight && !timer) schedule(1500);
    },
    sync: (args?: A) => execute(true, args),
    reconnected() {
      // Re-authentication may retry a paused attempt, but never supplies choices.
      // The coordinator must still return any unresolved conflict/recovery review.
      paused = false;
      if (!inFlight) schedule(1500);
    },
    stop() {
      stopped = true;
      pending = false;
      clear();
    },
  };
}
