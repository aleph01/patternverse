// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PracticeHistorySave from './PracticeHistorySave.svelte';
import type { PatternRun } from '$lib/pattern-runtime/types';
import type { PracticeRunInput } from '@patternverse/workspace';
const save = vi.fn<(run: PracticeRunInput) => Promise<object>>(async () => ({}));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => ({ savePracticeRun: save }),
}));
const identity = {
  patternRef: { sourceId: 'commons', entityId: 'test' },
  patternTitle: 'Test',
  patternType: 'pattern' as const,
  verseIds: [],
};
const run: PatternRun = {
  saved: {},
  view: {
    root_id: 'run',
    technique_id: 'test',
    revision: 0,
    status: 'Waiting',
    pending: null,
    items: [],
    outputs: {},
  },
};
afterEach(() => {
  cleanup();
  save.mockReset();
});
it('does not persist without consent, then autosaves confirmed revisions and exposes failures', async () => {
  const view = render(PracticeHistorySave, { run, identity });
  expect(save).not.toHaveBeenCalled();
  await fireEvent.click(screen.getByRole('button', { name: 'Save to workspace' }));
  await screen.findByText('Saved on this device');
  expect(save).toHaveBeenCalledTimes(1);
  await view.rerender({
    run: { ...run, view: { ...run.view, revision: 1, status: 'Completed' } },
    identity,
  });
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[1]?.[0]).toMatchObject({ id: 'run', revision: 1, status: 'completed' });
  save.mockRejectedValueOnce(new Error('disk error'));
  await view.rerender({
    run: { ...run, view: { ...run.view, revision: 2, status: 'Completed' } },
    identity,
  });
  await screen.findByRole('alert');
  await fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
  await screen.findByText('Saved on this device');
});
