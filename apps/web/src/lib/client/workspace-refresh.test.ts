import { expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { createWorkspaceRefresh } from './workspace-refresh';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

it('only applies the newest read across randomized completion orders', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.shuffledSubarray([0, 1, 2, 3, 4], { minLength: 5, maxLength: 5 }),
      async (order) => {
        const requests = Array.from({ length: 5 }, () => deferred<number>());
        let next = 0;
        const apply = vi.fn(),
          failed = vi.fn(),
          settled = vi.fn();
        const reader = createWorkspaceRefresh({
          read: () => requests[next++].promise,
          apply,
          failed,
          settled,
        });
        const pending = requests.map(() => reader.refresh());
        for (const index of order) {
          requests[index].resolve(index);
          await pending[index];
        }
        expect(apply.mock.calls).toEqual([[4]]);
        expect(settled).toHaveBeenCalledOnce();
        expect(failed).not.toHaveBeenCalled();
        reader.dispose();
      },
    ),
    { numRuns: 100 },
  );
});

it('ignores stale failures and disposed reads', async () => {
  const old = deferred<number>(),
    latest = deferred<number>();
  const read = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
  const apply = vi.fn(),
    failed = vi.fn(),
    settled = vi.fn();
  const reader = createWorkspaceRefresh({ read, apply, failed, settled });
  const first = reader.refresh(),
    second = reader.refresh();
  old.reject(new Error('old failure'));
  await first;
  reader.dispose();
  latest.resolve(2);
  await second;
  await reader.refresh(true);
  expect(apply).not.toHaveBeenCalled();
  expect(failed).not.toHaveBeenCalled();
  expect(settled).not.toHaveBeenCalled();
});

it('a deferred invalidation also supersedes an older in-flight read', async () => {
  let editing = false;
  const old = deferred<number>();
  const read = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValue(9);
  const apply = vi.fn(),
    failed = vi.fn();
  const reader = createWorkspaceRefresh({ read, apply, failed, canRefresh: () => !editing });
  const pending = reader.refresh();
  editing = true;
  await reader.refresh();
  editing = false;
  old.resolve(1);
  await pending;
  expect(apply).not.toHaveBeenCalled();
  await reader.resume();
  expect(apply).toHaveBeenCalledExactlyOnceWith(9);
});

it('protects active edits at both ends of a read, but allows explicit post-save refresh', async () => {
  let editing = false;
  const pending = deferred<number>();
  const apply = vi.fn(),
    failed = vi.fn();
  const read = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(2);
  const reader = createWorkspaceRefresh({ read, apply, failed, canRefresh: () => !editing });
  const first = reader.refresh();
  editing = true;
  pending.resolve(1);
  await first;
  await reader.refresh();
  expect(apply).not.toHaveBeenCalled();
  expect(read).toHaveBeenCalledOnce();
  await reader.refresh(true);
  expect(apply).toHaveBeenCalledExactlyOnceWith(2);
});

it('coalesces deferred invalidations and refreshes once when an edit finishes', async () => {
  let editing = true;
  const apply = vi.fn(),
    failed = vi.fn(),
    read = vi.fn().mockResolvedValue(7);
  const reader = createWorkspaceRefresh({ read, apply, failed, canRefresh: () => !editing });
  await reader.refresh();
  await reader.refresh();
  await reader.resume();
  expect(read).not.toHaveBeenCalled();
  editing = false;
  await reader.resume();
  expect(apply).toHaveBeenCalledExactlyOnceWith(7);
  await reader.resume();
  expect(read).toHaveBeenCalledOnce();
});
