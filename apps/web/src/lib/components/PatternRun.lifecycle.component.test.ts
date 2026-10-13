// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PatternRun as Run } from '$lib/pattern-runtime/types';
import type { PracticeRunPorts } from '$lib/pattern-run/controller';
import PatternRun from './PatternRun.svelte';

const adapters = vi.hoisted(() => ({
  start: vi.fn(),
  apply: vi.fn(),
  connection: vi.fn(),
  model: vi.fn(),
  workspace: vi.fn(),
  save: vi.fn(),
}));
vi.mock('$app/paths', () => ({ base: '', resolve: (path: string) => path }));
vi.mock('$lib/practice/worksheet-focus', () => ({ focusWorksheetStep: vi.fn() }));
vi.mock('$lib/client/workspace', () => ({ getLocalWorkspace: adapters.workspace }));
vi.mock('$lib/pattern-run/run-adapters', () => ({
  practiceRunPorts: {
    startSource: adapters.start,
    applySource: adapters.apply,
    connectionReady: adapters.connection,
    freeAvailable: async () => false,
    fulfillModel: adapters.model,
    failure: (cause: unknown, _desktop: boolean, fallback: string) => ({
      error: cause instanceof Error ? cause.message : fallback,
    }),
  } satisfies Partial<PracticeRunPorts>,
}));

const data = {
  pattern: { id: 'test', title: 'Test practice', summary: 'Synthetic practice.' },
  techniqueId: '',
  modality: '',
  languagePracticeSource: ':language 1',
  isTherapy: false,
  needsAi: false,
  aiReason: null,
  inputNames: [],
};
const current: Run = {
  saved: {},
  view: {
    root_id: 'root',
    technique_id: 'test',
    revision: 0,
    status: 'Waiting',
    pending: {
      effect_id: 'first',
      run_id: 'root',
      request: {
        kind: 'interaction.ask',
        payload: { prompt: 'A first question' },
      },
    },
    items: [],
    outputs: {},
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  adapters.start.mockResolvedValue(current);
  adapters.connection.mockResolvedValue(true);
  adapters.workspace.mockResolvedValue({ savePracticeRun: adapters.save });
});
afterEach(cleanup);

it('keeps bounded selection drafts across a rejected submission and credential refresh', async () => {
  const choice: Run = {
    ...current,
    view: {
      ...current.view,
      pending: {
        effect_id: 'choice',
        run_id: 'root',
        request: {
          kind: 'interaction.select',
          payload: {
            mode: 'multi',
            min: 1,
            max: 1,
            options: [
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Beta' },
            ],
          },
        },
      },
    },
  };
  adapters.start.mockResolvedValue(choice);
  adapters.apply.mockRejectedValue(new Error('Response rejected'));
  render(PatternRun, { data: { ...data, needsAi: true } });
  const alpha = await screen.findByRole('checkbox', { name: 'Alpha' });
  const button = screen.getByRole('button', { name: 'Continue ↓' });
  expect(button.hasAttribute('disabled')).toBe(true);
  await fireEvent.click(alpha);
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Beta' }));
  expect(button.hasAttribute('disabled')).toBe(true);
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Beta' }));
  await fireEvent.click(button);
  await screen.findByRole('alert');
  await fireEvent(window, new Event('focus'));
  await waitFor(() => expect(adapters.connection).toHaveBeenCalledTimes(2));
  expect((alpha as HTMLInputElement).checked).toBe(true);
  expect(adapters.apply.mock.calls[0][1].Fulfill.result).toEqual({
    kind: 'selected_many',
    value: ['a'],
  });
  expect(adapters.workspace).not.toHaveBeenCalled();
});

it('keeps rating bounds, empty-answer gating and numeric result values', async () => {
  adapters.start.mockResolvedValue({
    ...current,
    view: {
      ...current.view,
      pending: {
        effect_id: 'rating',
        run_id: 'root',
        request: {
          kind: 'interaction.rate',
          payload: { prompt: 'Rate this', rating: { min: 2, max: 7 } },
        },
      },
    },
  });
  adapters.apply.mockRejectedValue(new Error('Response rejected'));
  render(PatternRun, { data });
  const input = await screen.findByRole('spinbutton', { name: 'Your rating' });
  const button = screen.getByRole('button', { name: 'Continue ↓' });
  expect(input.getAttribute('min')).toBe('2');
  expect(input.getAttribute('max')).toBe('7');
  expect(button.hasAttribute('disabled')).toBe(true);
  await fireEvent.input(input, { target: { value: '4' } });
  await fireEvent.click(button);
  await screen.findByRole('alert');
  expect(adapters.apply.mock.calls[0][1].Fulfill.result).toEqual({ kind: 'rating', value: 4 });
  expect((input as HTMLInputElement).value).toBe('4');
  await fireEvent.input(input, { target: { value: '' } });
  expect(button.hasAttribute('disabled')).toBe(true);
});

it('keeps a typed answer across a failed submission and never saves by default', async () => {
  adapters.apply.mockRejectedValueOnce(new Error('Response rejected'));
  render(PatternRun, { data });
  const answer = await screen.findByRole('textbox', { name: 'Your response' });
  await fireEvent.input(answer, { target: { value: 'Keep my unfinished answer' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Continue ↓' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Response rejected');
  expect((answer as HTMLTextAreaElement).value).toBe('Keep my unfinished answer');
  expect(adapters.workspace).not.toHaveBeenCalled();
  expect(adapters.save).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Save to workspace' })).toBeTruthy();
});

it('keeps typed text when shared credentials are checked on window focus', async () => {
  render(PatternRun, { data: { ...data, needsAi: true } });
  const answer = await screen.findByRole('textbox', { name: 'Your response' });
  await fireEvent.input(answer, { target: { value: 'An unfinished private thought' } });
  await fireEvent(window, new Event('focus'));
  await waitFor(() => expect(adapters.connection).toHaveBeenCalledTimes(2));
  expect((answer as HTMLTextAreaElement).value).toBe('An unfinished private thought');
  expect(adapters.start).toHaveBeenCalledTimes(1);
  expect(adapters.model).not.toHaveBeenCalled();
  expect(adapters.workspace).not.toHaveBeenCalled();
});

it('disposes a pending source start and removes the connection-refresh listener', async () => {
  let complete!: (value: Run) => void;
  adapters.start.mockReturnValueOnce(
    new Promise<Run>((resolve) => {
      complete = resolve;
    }),
  );
  const view = render(PatternRun, { data: { ...data, needsAi: true } });
  await waitFor(() => expect(adapters.start).toHaveBeenCalledTimes(1));
  view.unmount();
  complete(current);
  await fireEvent(window, new Event('focus'));
  await Promise.resolve();
  expect(adapters.connection).toHaveBeenCalledTimes(1);
  expect(adapters.workspace).not.toHaveBeenCalled();
  expect(screen.queryByRole('textbox')).toBeNull();
});
