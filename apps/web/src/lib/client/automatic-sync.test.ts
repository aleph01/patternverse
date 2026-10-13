import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { createAutomaticSync, type AutomaticSyncOutcome } from './automatic-sync';

function fixture() {
  let enabled = true,
    eligible = true;
  const run = vi
    .fn<(args: { choices: string } | undefined, manual: boolean) => Promise<AutomaticSyncOutcome>>()
    .mockResolvedValue({ type: 'complete' });
  const completed = vi.fn(),
    failed = vi.fn(),
    busy = vi.fn();
  const scheduler = createAutomaticSync({
    enabled: () => enabled,
    eligible: () => eligible,
    run,
    completed,
    failed,
    busy,
  });
  return {
    run,
    completed,
    failed,
    busy,
    scheduler,
    enable: (value: boolean) => {
      enabled = value;
    },
    available: (value: boolean) => {
      eligible = value;
    },
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  vi.useRealTimers();
});

it('debounces completed saves and limits continuous-save postponement to ten seconds', async () => {
  const f = fixture();
  for (let i = 0; i < 10; i++) {
    f.scheduler.changed();
    await vi.advanceTimersByTimeAsync(1000);
  }
  expect(f.run).toHaveBeenCalledOnce();
  expect(f.busy.mock.calls).toEqual([[true], [false]]);
  f.scheduler.stop();
});

it.each(['disabled', 'offline/hidden/disconnected'] as const)(
  'never starts automatic work when %s',
  async (condition) => {
    const f = fixture();
    f.scheduler.changed();
    if (condition === 'disabled') f.enable(false);
    else f.available(false);
    await vi.advanceTimersByTimeAsync(5000);
    f.scheduler.refresh();
    f.scheduler.changed();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(f.run).not.toHaveBeenCalled();
    f.scheduler.stop();
  },
);

it('manual sync remains available when automatic sync is off', async () => {
  const f = fixture();
  f.enable(false);
  await f.scheduler.sync({ choices: 'local' });
  expect(f.run).toHaveBeenCalledWith({ choices: 'local' }, true);
  f.scheduler.stop();
});

it('serializes manual/automatic calls and follows changes made during the attempt once', async () => {
  const f = fixture();
  let finish!: (result: AutomaticSyncOutcome) => void;
  f.run.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = f.scheduler.sync();
  f.scheduler.changed();
  f.scheduler.changed();
  f.scheduler.refresh();
  const second = f.scheduler.sync();
  expect(first).toBe(second);
  expect(f.run).toHaveBeenCalledOnce();
  finish({ type: 'complete' });
  await first;
  await vi.advanceTimersByTimeAsync(1500);
  expect(f.run).toHaveBeenCalledTimes(2);
  f.scheduler.stop();
});

it('turning off during a running attempt lets it finish but cancels follow-up work', async () => {
  const f = fixture();
  let finish!: (result: AutomaticSyncOutcome) => void;
  f.run.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const attempt = f.scheduler.sync();
  f.scheduler.changed();
  f.enable(false);
  f.scheduler.refresh();
  finish({ type: 'complete' });
  await attempt;
  await vi.advanceTimersByTimeAsync(300_000);
  expect(f.run).toHaveBeenCalledOnce();
  f.scheduler.stop();
});

it.each(['review', 'blocked', 'error', 'upgrade'])(
  'pauses %s across changes, polling and re-enabling, until manual review/retry',
  async (type) => {
    const f = fixture();
    f.run.mockResolvedValueOnce({ type });
    f.scheduler.refresh();
    await vi.advanceTimersByTimeAsync(1500);
    for (let i = 0; i < 4; i++) {
      f.scheduler.changed();
      f.scheduler.refresh();
      await vi.advanceTimersByTimeAsync(60_000);
    }
    f.enable(false);
    f.scheduler.refresh();
    f.enable(true);
    f.scheduler.refresh();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(f.run).toHaveBeenCalledOnce();
    await f.scheduler.sync({ choices: 'local' });
    f.scheduler.changed();
    await vi.advanceTimersByTimeAsync(1500);
    expect(f.run).toHaveBeenCalledTimes(3);
    f.scheduler.stop();
  },
);

it('honors Retry-After and exponential backoff even after focus/change events', async () => {
  const f = fixture();
  f.run.mockResolvedValue({ type: 'error', retryable: true, retryAfterMs: 60_000 });
  f.scheduler.refresh();
  await vi.advanceTimersByTimeAsync(1500);
  for (let i = 0; i < 5; i++) {
    f.scheduler.changed();
    f.scheduler.refresh();
    await vi.advanceTimersByTimeAsync(10_000);
  }
  expect(f.run).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(10_000);
  expect(f.run).toHaveBeenCalledTimes(2);
  f.scheduler.stop();
});

it('unexpected failures pause rather than becoming unhandled retry loops', async () => {
  const f = fixture();
  f.run.mockRejectedValueOnce(new Error('Synthetic failure'));
  f.scheduler.refresh();
  await vi.advanceTimersByTimeAsync(1500);
  expect(f.failed).toHaveBeenCalledOnce();
  f.scheduler.refresh();
  await vi.advanceTimersByTimeAsync(300_000);
  expect(f.run).toHaveBeenCalledOnce();
  f.scheduler.stop();
});

it('resuming eligibility schedules a check; stopping disposes pending work', async () => {
  const f = fixture();
  f.available(false);
  f.scheduler.refresh();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(f.run).not.toHaveBeenCalled();
  f.available(true);
  f.scheduler.refresh();
  await vi.advanceTimersByTimeAsync(1500);
  expect(f.run).toHaveBeenCalledOnce();
  f.scheduler.changed();
  f.scheduler.stop();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(f.run).toHaveBeenCalledOnce();
});

it('generated event sequences never start automatic work while disabled/unavailable', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.constantFrom('disable', 'enable', 'offline', 'online', 'change', 'refresh'), {
        maxLength: 60,
      }),
      async (events) => {
        const f = fixture();
        let enabled = true,
          available = true;
        for (const event of events) {
          if (event === 'disable') {
            enabled = false;
            f.enable(false);
            f.scheduler.refresh();
          }
          if (event === 'enable') {
            enabled = true;
            f.enable(true);
            f.scheduler.refresh();
          }
          if (event === 'offline') {
            available = false;
            f.available(false);
            f.scheduler.refresh();
          }
          if (event === 'online') {
            available = true;
            f.available(true);
            f.scheduler.refresh();
          }
          if (event === 'change') f.scheduler.changed();
          if (event === 'refresh') f.scheduler.refresh();
          const before = f.run.mock.calls.length;
          await vi.advanceTimersByTimeAsync(2000);
          if (!enabled || !available) expect(f.run.mock.calls.length).toBe(before);
        }
        f.scheduler.stop();
      },
    ),
    { numRuns: 100, seed: 20261010 },
  );
});
