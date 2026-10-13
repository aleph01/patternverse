import { describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { createPracticeLifecycle } from './lifecycle';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const message = (cause: unknown) => (cause instanceof Error ? cause.message : 'Host fallback');

describe('practice request coordination', () => {
  it('serializes commands and only passes accepted runtime results to the host', async () => {
    const state = vi.fn(),
      accept = vi.fn(),
      duplicate = vi.fn();
    const lifecycle = createPracticeLifecycle(state);
    const pending = deferred<string>();
    const first = lifecycle.execute(() => pending.promise, accept, { message });
    expect(state).toHaveBeenLastCalledWith({ working: true, error: '' });
    expect(await lifecycle.execute(duplicate, accept, { message })).toBe(false);
    expect(duplicate).not.toHaveBeenCalled();
    pending.resolve('checkpoint');
    expect(await first).toBe(true);
    expect(accept).toHaveBeenCalledExactlyOnceWith('checkpoint');
    expect(state).toHaveBeenLastCalledWith({ working: false, error: '' });
  });

  it('reports host-specific failures and permits retry without losing the earlier view', async () => {
    const state = vi.fn(),
      accept = vi.fn();
    const lifecycle = createPracticeLifecycle(state);
    expect(
      await lifecycle.execute(
        async () => {
          throw new Error('Invalid response');
        },
        accept,
        { message },
      ),
    ).toBe(false);
    expect(accept).not.toHaveBeenCalled();
    expect(state).toHaveBeenLastCalledWith({ working: false, error: 'Invalid response' });
    expect(await lifecycle.execute(async () => 'recovered', accept, { message })).toBe(true);
    expect(state).toHaveBeenLastCalledWith({ working: false, error: '' });
    expect(accept).toHaveBeenCalledWith('recovered');
  });

  it('ignores late successes and failures after replacement, even if the bridge cannot abort', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.shuffledSubarray([0, 1, 2, 3], { minLength: 4, maxLength: 4 }),
        fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }),
        async (order, failures) => {
          const state = vi.fn(),
            accept = vi.fn();
          const lifecycle = createPracticeLifecycle(state);
          const requests = Array.from({ length: 4 }, () => deferred<number>());
          const signals: AbortSignal[] = [];
          const results = requests.map((request) =>
            lifecycle.execute(
              (signal) => {
                signals.push(signal);
                return request.promise;
              },
              accept,
              { message, replace: true },
            ),
          );
          for (const index of order) {
            if (failures[index]) requests[index]!.reject(new Error(`Failure ${index}`));
            else requests[index]!.resolve(index);
            await results[index];
          }
          expect(signals.map((signal) => signal.aborted)).toEqual([true, true, true, false]);
          expect(accept.mock.calls).toEqual(failures[3] ? [] : [[3]]);
          expect(state.mock.calls.filter(([value]) => !value.working)).toEqual([
            [{ working: false, error: failures[3] ? 'Failure 3' : '' }],
          ]);
        },
      ),
      { numRuns: 100, seed: 42 },
    );
  });

  it('disposal aborts pending work and suppresses callbacks and further requests', async () => {
    for (const fail of [false, true]) {
      const state = vi.fn(),
        accept = vi.fn(),
        later = vi.fn();
      const lifecycle = createPracticeLifecycle(state);
      const pending = deferred<string>();
      let signal!: AbortSignal;
      const request = lifecycle.execute(
        (value) => {
          signal = value;
          return pending.promise;
        },
        accept,
        { message },
      );
      lifecycle.dispose();
      const count = state.mock.calls.length;
      if (fail) pending.reject(new Error('Too late'));
      else pending.resolve('Too late');
      expect(await request).toBe(false);
      expect(signal.aborted).toBe(true);
      expect(accept).not.toHaveBeenCalled();
      lifecycle.reset();
      expect(await lifecycle.execute(later, accept, { message, replace: true })).toBe(false);
      expect(later).not.toHaveBeenCalled();
      expect(state).toHaveBeenCalledTimes(count);
    }
  });

  it('reset invalidates pending requests without inventing a runtime cancellation', async () => {
    const state = vi.fn(),
      accept = vi.fn();
    const lifecycle = createPracticeLifecycle(state);
    const pending = deferred<string>();
    const first = lifecycle.execute(() => pending.promise, accept, { message });
    lifecycle.reset();
    expect(await lifecycle.execute(async () => 'new view', accept, { message })).toBe(true);
    pending.resolve('old view');
    expect(await first).toBe(false);
    expect(accept).toHaveBeenCalledExactlyOnceWith('new view');
  });

  it('keeps host callback failures visible rather than dispatching another operation', async () => {
    const state = vi.fn();
    const lifecycle = createPracticeLifecycle(state);
    expect(
      await lifecycle.execute(
        async () => 'checkpoint',
        () => {
          throw new Error('Host export failed');
        },
        { message },
      ),
    ).toBe(false);
    expect(state).toHaveBeenLastCalledWith({ working: false, error: 'Host export failed' });
  });
});
