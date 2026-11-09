import { afterEach, expect, it, vi } from 'vitest';
import type { Situation } from '@patternverse/workspace';
import { createBearingsSession, initialBearingsSession } from './session';
const situation: Situation = {
  id: 'one',
  workspaceId: 'private',
  title: 'A conversation',
  context: '',
  revision: 0,
  position: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
afterEach(() => vi.useRealTimers());
it('serializes saves and includes edits made while a write is in progress', async () => {
  vi.useFakeTimers();
  let view = initialBearingsSession(),
    release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const save = vi.fn(async (id, content, revision) => {
    if (revision === 0) await gate;
    return { ...situation, ...content, revision: revision + 1 };
  });
  const session = createBearingsSession({
    save,
    changed: (value) => (view = value),
    saved: () => {},
  });
  session.open(situation);
  session.edit({ context: 'First' });
  const pending = session.flush();
  session.edit({ context: 'Latest' });
  release();
  expect(await pending).toBe(true);
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1]?.[1]).toMatchObject({ context: 'Latest' });
  expect(view).toMatchObject({ dirty: false, saving: false, selected: { revision: 2 } });
  await session.close();
  await session.dispose();
});
it('keeps the notebook open with its draft when storage or a concurrent revision rejects a write', async () => {
  let view = initialBearingsSession();
  const session = createBearingsSession({
    save: vi.fn().mockRejectedValue(new Error('Changed in another window')),
    changed: (value) => (view = value),
    saved: () => {},
  });
  session.open(situation);
  session.edit({ document: { ...view.document!, draft: 'Keep this' } });
  expect(await session.close()).toBe(false);
  expect(view).toMatchObject({
    dirty: true,
    error: 'Changed in another window',
    document: { draft: 'Keep this' },
    selected: { id: 'one' },
  });
  expect(session.open({ ...situation, id: 'two' })).toBe(false);
  await session.dispose();
});
