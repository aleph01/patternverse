// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import WorksheetButton from '$lib/components/WorksheetButton.svelte';
import PatternArticleActions from '$lib/components/PatternArticleActions.svelte';
import type { WorksheetAvailability } from './export';
import { inspectWorksheet } from './export';

vi.mock('./export', async (original) => ({
  ...(await original<typeof import('./export')>()),
  inspectWorksheet: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.mocked(inspectWorksheet).mockReset();
});

it('hides export until eligible and ignores stale results after the source changes', async () => {
  let resolveOld!: (value: WorksheetAvailability) => void;
  vi.mocked(inspectWorksheet).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  const view = render(WorksheetButton, { definition: { source: 'old' }, explainUnavailable: true });
  expect(screen.queryByRole('button', { name: 'Open worksheet' })).toBeNull();
  await waitFor(() => expect(resolveOld).toBeDefined());
  vi.mocked(inspectWorksheet).mockResolvedValueOnce({
    available: false,
    reason: 'Workbook unavailable: AI-dependent steps.',
  });
  await view.rerender({ definition: { source: 'AI' }, explainUnavailable: true });
  await screen.findByText('Workbook unavailable: AI-dependent steps.');
  resolveOld({ available: true });
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Open worksheet' })).toBeNull());
  vi.mocked(inspectWorksheet).mockResolvedValueOnce({ available: true });
  await view.rerender({ definition: { source: 'manual' }, explainUnavailable: true });
  await screen.findByRole('button', { name: 'Open worksheet' });
  expect(screen.queryByText('Workbook unavailable: AI-dependent steps.')).toBeNull();
});

it('hides the entire unavailable article card while retaining browser and Mira actions', async () => {
  vi.mocked(inspectWorksheet).mockResolvedValue({ available: false });
  render(PatternArticleActions, {
    title: 'Pattern',
    description: 'Practice it',
    tryHref: '/try',
    miraHref: '/mira',
    worksheetDefinition: { source: 'AI' },
  });
  await waitFor(() => expect(inspectWorksheet).toHaveBeenCalled());
  expect(screen.queryByText('In your own editor')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Open worksheet' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Try this pattern' }).getAttribute('href')).toBe('/try');
  expect(screen.getByRole('link', { name: 'Open in mira' }).getAttribute('href')).toBe('/mira');
});

it('shows eligible article export and removes it again when the definition changes', async () => {
  vi.mocked(inspectWorksheet).mockResolvedValue({ available: true });
  const props = { title: 'Pattern', description: '', worksheetDefinition: { source: 'manual' } };
  const view = render(PatternArticleActions, props);
  await screen.findByRole('button', { name: 'Open worksheet' });
  expect(screen.getByText('In your own editor')).not.toBeNull();
  vi.mocked(inspectWorksheet).mockResolvedValue({ available: false });
  await view.rerender({ ...props, worksheetDefinition: { source: 'AI' } });
  await waitFor(() => expect(screen.queryByText('In your own editor')).toBeNull());
});
