// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PatternRun } from '$lib/pattern-runtime/types';
import PracticeEmbed from './PracticeEmbed.svelte';

const runtime = vi.hoisted(() => ({ start: vi.fn(), restore: vi.fn(), serialize: vi.fn() }));
vi.mock('$lib/pattern-runtime/source', () => ({
  startSourceRun: runtime.start,
  restoreSourceRun: runtime.restore,
  serializeSourceRun: runtime.serialize,
  applySourceAction: vi.fn(),
}));
const run: PatternRun = {
  saved: {},
  view: {
    technique_id: 'test',
    root_id: 'test',
    revision: 0,
    status: 'Completed',
    pending: null,
    items: [],
    outputs: {},
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  runtime.serialize.mockReturnValue('checkpoint');
});
afterEach(cleanup);

it('does not export or save an initialization result after the view has closed', async () => {
  let resolve!: (value: PatternRun) => void;
  runtime.start.mockReturnValue(
    new Promise<PatternRun>((yes) => {
      resolve = yes;
    }),
  );
  const onchange = vi.fn(),
    oncheckpoint = vi.fn();
  const view = render(PracticeEmbed, { source: 'source', title: 'Test', onchange, oncheckpoint });
  await waitFor(() => expect(runtime.start).toHaveBeenCalledTimes(1));
  view.unmount();
  resolve(run);
  await Promise.resolve();
  await Promise.resolve();
  expect(onchange).not.toHaveBeenCalled();
  expect(oncheckpoint).not.toHaveBeenCalled();
  expect(runtime.serialize).not.toHaveBeenCalled();
});

it('uses host error wording, rejects an invalid handoff, and restarts only on explicit request', async () => {
  runtime.restore.mockRejectedValue(new Error('Invalid checkpoint'));
  runtime.start.mockResolvedValue(run);
  const onchange = vi.fn(),
    oncheckpoint = vi.fn();
  render(PracticeEmbed, {
    source: 'source',
    title: 'Test',
    checkpoint: 'bad',
    failureMessage: 'Host-specific failure',
    onchange,
    oncheckpoint,
  });
  expect((await screen.findByRole('alert')).textContent).toBe('Host-specific failure');
  expect(runtime.start).not.toHaveBeenCalled();
  expect(onchange).not.toHaveBeenCalled();
  await fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
  await screen.findByText(/^Practice complete\./);
  expect(runtime.start).toHaveBeenCalledTimes(1);
  expect(onchange).toHaveBeenCalledExactlyOnceWith(run);
  expect(oncheckpoint).toHaveBeenCalledExactlyOnceWith('checkpoint');
  expect(screen.queryByRole('alert')).toBeNull();
});
