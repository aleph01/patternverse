// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PatternRun as Run } from '$lib/pattern-runtime/types';
import type { PracticeRunPorts } from '$lib/pattern-run/controller';
import PatternRun from './PatternRun.svelte';
import { focusWorksheetStep } from '$lib/practice/worksheet-focus';

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
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function withHistory(count: number): Run {
  return {
    ...current,
    view: {
      ...current.view,
      items: Array.from({ length: count }, (_, index) => ({
        effect: {
          effect_id: `accepted-${index + 1}`,
          run_id: 'root',
          request: {
            kind: 'interaction.ask',
            payload: { prompt: `Earlier question ${index + 1}` },
          },
        },
        result: { kind: 'text', value: `Earlier answer ${index + 1}` },
      })),
    },
  };
}

it('opens a collapsed step from the map without editing, submitting, saving, or resetting a draft', async () => {
  adapters.start.mockResolvedValue(withHistory(2));
  render(PatternRun, { data });
  const answer = await screen.findByRole('textbox', { name: 'Your response' });
  await fireEvent.input(answer, { target: { value: 'Keep this unfinished response' } });
  expect(screen.queryByRole('complementary', { name: 'Step map' })).toBeNull();
  await fireEvent.click(
    screen.getByRole('button', { name: 'Collapse step 1: Earlier question 1' }),
  );
  const first = screen.getByRole('region', { name: 'Earlier question 1' });
  expect(first.querySelector('.worksheet-step-content')?.hasAttribute('hidden')).toBe(true);
  await fireEvent.click(screen.getByRole('button', { name: 'Show step map' }));
  const map = screen.getByRole('complementary', { name: 'Step map' });
  expect(within(map).getAllByRole('button', { name: /^Go to step/ })).toHaveLength(3);
  await fireEvent.click(
    within(map).getByRole('button', { name: 'Go to step 1: Earlier question 1' }),
  );
  await waitFor(() =>
    expect(first.querySelector('.worksheet-step-content')?.hasAttribute('hidden')).toBe(false),
  );
  expect(focusWorksheetStep).toHaveBeenLastCalledWith(first);
  expect((answer as HTMLTextAreaElement).value).toBe('Keep this unfinished response');
  expect(screen.getByRole('textbox', { name: 'Your response' })).toBe(answer);
  expect(adapters.apply).not.toHaveBeenCalled();
  expect(adapters.workspace).not.toHaveBeenCalled();
});

it('suggests the map for a long desktop run and respects closing it as the run grows', async () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  adapters.start.mockResolvedValue(withHistory(6));
  adapters.apply.mockResolvedValue(withHistory(7));
  render(PatternRun, { data });
  const map = await screen.findByRole('complementary', { name: 'Step map' });
  expect(within(map).getAllByRole('button', { name: /^Go to step/ })).toHaveLength(7);
  await fireEvent.click(screen.getByRole('button', { name: 'Close step map' }));
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Show step map' }));
  const answer = screen.getByRole('textbox', { name: 'Your response' });
  await fireEvent.input(answer, { target: { value: 'One more response' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Next step ↓' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('7 steps complete'));
  expect(screen.queryByRole('complementary', { name: 'Step map' })).toBeNull();
  await fireEvent.click(screen.getByRole('button', { name: 'Show step map' }));
  expect(
    screen
      .getByRole('button', { name: 'Go to step 8: A first question' })
      .getAttribute('aria-current'),
  ).toBe('step');
});

it('keeps the map optional for a long phone run', async () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  adapters.start.mockResolvedValue(withHistory(6));
  render(PatternRun, { data });
  await screen.findByRole('textbox', { name: 'Your response' });
  expect(screen.queryByRole('complementary', { name: 'Step map' })).toBeNull();
  await fireEvent.click(screen.getByRole('button', { name: 'Show step map' }));
  expect(screen.getByRole('button', { name: 'Go to step 7: A first question' })).toBeTruthy();
});

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
  const button = screen.getByRole('button', { name: /^(?:Next step|Continue) ↓$/ });
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
  const button = screen.getByRole('button', { name: /^(?:Next step|Continue) ↓$/ });
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
  await fireEvent.click(screen.getByRole('button', { name: /^(?:Next step|Continue) ↓$/ }));
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

it('shows the upfront AI notice without blocking a disconnected non-AI path or claiming AI was used', async () => {
  adapters.connection.mockResolvedValue(false);
  adapters.apply.mockResolvedValue({
    ...current,
    view: { ...current.view, status: 'Completed', pending: null, items: [] },
  });
  render(PatternRun, {
    data: { ...data, needsAi: true, aiReason: 'AI is used only on another branch.' },
  });
  const answer = await screen.findByRole('textbox', { name: 'Your response' });
  await screen.findByText('OpenRouter not connected');
  const notice = screen.getByRole('complementary', { name: 'AI-assisted practice' });
  expect(within(notice).getByRole('button', { name: 'About AI' })).toBeTruthy();
  expect(within(notice).getByRole('link', { name: 'Connect with OpenRouter ↗' })).toBeTruthy();
  expect(
    screen.queryByRole('heading', { name: 'Connect with OpenRouter to continue this step' }),
  ).toBeNull();
  await fireEvent.input(answer, { target: { value: 'Take the ordinary non-AI path.' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Next step ↓' }));
  await screen.findByRole('heading', { name: 'A moment to review.' });
  expect(adapters.model).not.toHaveBeenCalled();
  expect(screen.queryByText(/This run included AI-assisted steps/)).toBeNull();
});

it('waits at the actual AI step while keeping the confirmed practice view intact', async () => {
  adapters.connection.mockResolvedValue(false);
  const aiStep = {
    ...current,
    view: {
      ...current.view,
      pending: {
        effect_id: 'model',
        run_id: 'root',
        request: {
          kind: 'agent.generate',
          payload: { prompt: 'A tailored response', contract: { returns: 'text' } },
        },
      },
    },
  };
  adapters.apply.mockResolvedValue(aiStep);
  render(PatternRun, { data: { ...data, needsAi: true } });
  const answer = await screen.findByRole('textbox', { name: 'Your response' });
  await fireEvent.input(answer, { target: { value: 'A confirmed response before the AI step.' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Next step ↓' }));
  await screen.findByRole('heading', { name: 'Connect with OpenRouter to continue this step' });
  expect(adapters.model).not.toHaveBeenCalled();
  expect(adapters.start).toHaveBeenCalledOnce();
  adapters.connection.mockResolvedValue(true);
  await fireEvent(window, new Event('focus'));
  await screen.findByText('OpenRouter connected');
  expect(adapters.model).not.toHaveBeenCalled();
  expect(adapters.start).toHaveBeenCalledOnce();
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
  expect(adapters.connection).not.toHaveBeenCalled();
  expect(adapters.workspace).not.toHaveBeenCalled();
  expect(screen.queryByRole('textbox')).toBeNull();
});
