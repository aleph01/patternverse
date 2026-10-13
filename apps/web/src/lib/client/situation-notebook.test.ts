import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import type { LocalWorkspace, Situation } from '@patternverse/workspace';
import {
  createSituationNotebook,
  initialSituationNotebook,
  type SituationNotebookState,
} from './situation-notebook';

const entry: Situation = {
  id: 'one',
  workspaceId: 'private',
  title: 'Creative work',
  context: '',
  position: 0,
  revision: 3,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function fixture() {
  let state: SituationNotebookState = initialSituationNotebook();
  const changed = vi.fn((next: SituationNotebookState) => {
    state = next;
  });
  const saved = vi.fn();
  const save = vi.fn<LocalWorkspace['updateSituation']>(async (id, content, revision) => ({
    ...entry,
    id,
    ...content,
    revision: revision + 1,
  }));
  const notebook = createSituationNotebook({ save, saved, changed });
  return {
    notebook,
    save,
    saved,
    changed,
    get state() {
      return state;
    },
  };
}
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

it('does no work on construction or a clean close and opens only one draft', async () => {
  const f = fixture();
  expect(f.changed).not.toHaveBeenCalled();
  expect(f.notebook.open(entry)).toBe(true);
  expect(f.notebook.open({ ...entry, id: 'two' })).toBe(false);
  expect(f.state).toMatchObject({ selected: entry, dirty: false, saving: false });
  expect(await f.notebook.close()).toBe(true);
  expect(f.state.selected).toBeNull();
  expect(f.save).not.toHaveBeenCalled();
  expect(f.notebook.open({ ...entry, id: 'two' })).toBe(true);
  await f.notebook.dispose();
});
it('debounces edits by 450ms, snapshots content, and forwards the stored revision', async () => {
  const f = fixture();
  f.notebook.open(entry);
  f.notebook.edit({ context: 'First' });
  await vi.advanceTimersByTimeAsync(400);
  f.notebook.edit({ title: '  New title  ', context: 'Second' });
  await vi.advanceTimersByTimeAsync(449);
  expect(f.save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(f.save).toHaveBeenCalledExactlyOnceWith(
    'one',
    { title: 'New title', context: 'Second' },
    3,
  );
  expect(f.state).toMatchObject({
    dirty: false,
    saving: false,
    selected: { revision: 4 },
    title: '  New title  ',
  });
  expect(f.saved).toHaveBeenCalledOnce();
});
it('does not write whitespace-only title changes or edits reverted during the debounce', async () => {
  const f = fixture();
  f.notebook.open(entry);
  f.notebook.edit({ title: ' Creative work ', context: 'Draft' });
  f.notebook.edit({ context: '' });
  await vi.advanceTimersByTimeAsync(500);
  expect(f.save).not.toHaveBeenCalled();
  expect(f.state.dirty).toBe(false);
});
it('shares a flush while writing, preserves newer edits and serially advances revisions', async () => {
  const f = fixture();
  const first = deferred<Situation>();
  f.save.mockReturnValueOnce(first.promise);
  f.notebook.open(entry);
  f.notebook.edit({ context: 'First' });
  const pending = f.notebook.flush();
  f.notebook.edit({ title: 'New title', context: 'Latest' });
  expect(f.notebook.flush()).toBe(pending);
  const close = f.notebook.close();
  first.resolve({ ...entry, context: 'First', revision: 4 });
  expect(await pending).toBe(true);
  expect(await close).toBe(true);
  expect(f.save.mock.calls).toEqual([
    ['one', { title: 'Creative work', context: 'First' }, 3],
    ['one', { title: 'New title', context: 'Latest' }, 4],
  ]);
  expect(f.state.selected).toBeNull();
  await vi.advanceTimersByTimeAsync(1000);
  expect(f.save).toHaveBeenCalledTimes(2);
});
it('waits for edits made during every write without closing early', async () => {
  const f = fixture();
  const first = deferred<Situation>(),
    second = deferred<Situation>();
  f.save.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  f.notebook.open(entry);
  f.notebook.edit({ context: 'One' });
  const closing = f.notebook.close();
  f.notebook.edit({ context: 'Two' });
  first.resolve({ ...entry, context: 'One', revision: 4 });
  await Promise.resolve();
  expect(f.state.selected).not.toBeNull();
  f.notebook.edit({ context: 'Three' });
  second.resolve({ ...entry, context: 'Two', revision: 5 });
  expect(await closing).toBe(true);
  expect(f.save.mock.calls.at(-1)).toEqual(['one', { title: entry.title, context: 'Three' }, 5]);
});
it('saves a reversal typed during an in-flight write rather than treating it as clean', async () => {
  const f = fixture(),
    first = deferred<Situation>();
  f.save.mockReturnValueOnce(first.promise);
  f.notebook.open(entry);
  f.notebook.edit({ context: 'Temporary' });
  const pending = f.notebook.flush();
  f.notebook.edit({ context: '' });
  first.resolve({ ...entry, context: 'Temporary', revision: 4 });
  await pending;
  expect(f.save.mock.calls.at(-1)).toEqual(['one', { title: entry.title, context: '' }, 4]);
  expect(f.state.dirty).toBe(false);
});
it.each([new Error('This notebook changed in another window.'), 'unknown'])(
  'retains drafts and revisions on failure (%s) without retrying or overwriting',
  async (cause) => {
    const f = fixture();
    f.save.mockRejectedValueOnce(cause);
    f.notebook.open(entry);
    f.notebook.edit({ context: 'Keep this' });
    expect(await f.notebook.close()).toBe(false);
    expect(f.state).toMatchObject({
      selected: entry,
      context: 'Keep this',
      dirty: true,
      saving: false,
    });
    expect(f.state.saveError).toBe(
      cause instanceof Error
        ? cause.message
        : 'Your context could not be saved. Your text is still here.',
    );
    expect(f.saved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.save).toHaveBeenCalledOnce();
    expect(await f.notebook.flush()).toBe(true);
    expect(f.save.mock.calls[1]).toEqual(f.save.mock.calls[0]);
  },
);
it('keeps the last accepted revision when a subsequent save fails', async () => {
  const f = fixture(),
    first = deferred<Situation>();
  f.save.mockReturnValueOnce(first.promise).mockRejectedValueOnce(new Error('Storage unavailable'));
  f.notebook.open(entry);
  f.notebook.edit({ context: 'One' });
  const pending = f.notebook.flush();
  f.notebook.edit({ context: 'Two' });
  first.resolve({ ...entry, context: 'One', revision: 4 });
  expect(await pending).toBe(false);
  expect(f.state).toMatchObject({
    selected: { context: 'One', revision: 4 },
    context: 'Two',
    dirty: true,
  });
  await f.notebook.flush();
  expect(f.save.mock.calls.at(-1)?.[2]).toBe(4);
});
it('lets persistence validate empty titles and keeps the draft visible', async () => {
  const f = fixture();
  f.save.mockRejectedValue(new Error('Give your situation a title between 1 and 180 characters.'));
  f.notebook.open(entry);
  f.notebook.edit({ title: '   ', context: 'Notes' });
  expect(await f.notebook.close()).toBe(false);
  expect(f.save).toHaveBeenCalledWith(entry.id, { title: '', context: 'Notes' }, 3);
  expect(f.state.title).toBe('   ');
});
it('edits clear the displayed error and a clean later notebook does not inherit it', async () => {
  const f = fixture();
  f.save.mockRejectedValueOnce(new Error('Failure'));
  f.notebook.open(entry);
  f.notebook.edit({ context: 'Notes' });
  await f.notebook.flush();
  f.notebook.edit({ context: 'Better notes' });
  expect(f.state.saveError).toBe('');
  await f.notebook.close();
  f.notebook.open({ ...entry, id: 'two' });
  expect(f.state).toMatchObject({ context: '', dirty: false, saveError: '' });
});
it('navigation flushes dirty notes once and ignores all late view callbacks', async () => {
  const f = fixture(),
    pending = deferred<Situation>();
  f.save.mockReturnValueOnce(pending.promise);
  f.notebook.open(entry);
  f.notebook.edit({ context: 'Notes' });
  const finishing = f.notebook.dispose();
  f.changed.mockClear();
  expect(f.notebook.dispose()).toBe(finishing);
  expect(f.notebook.open(entry)).toBe(false);
  f.notebook.edit({ context: 'After navigation' });
  pending.resolve({ ...entry, context: 'Notes', revision: 4 });
  expect(await finishing).toBe(true);
  expect(await f.notebook.close()).toBe(false);
  await vi.advanceTimersByTimeAsync(1000);
  expect(f.save).toHaveBeenCalledOnce();
  expect(f.saved).not.toHaveBeenCalled();
  expect(f.changed).not.toHaveBeenCalled();
});
it.each([false, true])(
  'finishes a newer draft after navigation without UI updates (failure=%s)',
  async (fails) => {
    const f = fixture(),
      pending = deferred<Situation>();
    f.save.mockReturnValueOnce(pending.promise);
    f.notebook.open(entry);
    f.notebook.edit({ context: 'One' });
    void f.notebook.flush();
    f.notebook.edit({ context: 'Two' });
    const finishing = f.notebook.dispose();
    f.changed.mockClear();
    if (fails) pending.reject(new Error('Failure'));
    else pending.resolve({ ...entry, context: 'One', revision: 4 });
    expect(await finishing).toBe(!fails);
    expect(f.save).toHaveBeenCalledTimes(fails ? 1 : 2);
    expect(await f.notebook.dispose()).toBe(!fails);
    expect(f.saved).not.toHaveBeenCalled();
    expect(f.changed).not.toHaveBeenCalled();
  },
);
it('preserves the latest edits with one writer across 100 generated edit/flush sequences', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.string({ minLength: 1, maxLength: 80 }), { minLength: 1, maxLength: 25 }),
      async (drafts) => {
        const f = fixture(),
          first = deferred<Situation>();
        f.save.mockReturnValueOnce(first.promise);
        f.notebook.open(entry);
        f.notebook.edit({ context: 'Initial' });
        const pending = f.notebook.flush();
        for (const context of drafts) {
          f.notebook.edit({ context });
          expect(f.notebook.flush()).toBe(pending);
        }
        expect(f.save).toHaveBeenCalledOnce();
        first.resolve({ ...entry, context: 'Initial', revision: 4 });
        await pending;
        expect(f.state.selected?.context).toBe(drafts.at(-1));
        expect(f.state.dirty).toBe(false);
        expect(f.save.mock.calls.map((call) => call[2])).toEqual(
          f.save.mock.calls.length === 1 ? [3] : [3, 4],
        );
        await f.notebook.dispose();
      },
    ),
    { numRuns: 100 },
  );
});
