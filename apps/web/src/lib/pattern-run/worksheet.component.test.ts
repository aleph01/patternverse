// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuidedEffect, StandaloneRun } from '$lib/mira/guided';
import Runner from '../../routes/pattern/[id]/run/+page.svelte';
import type { PageData } from '../../routes/pattern/[id]/run/$types';

const engine = vi.hoisted(() => ({
  start: vi.fn(),
  apply: vi.fn(),
  rewind: vi.fn(),
  catalog: vi.fn(),
}));
vi.mock('$lib/mira/guided', () => ({
  startStandaloneRun: engine.start,
  applyStandaloneAction: engine.apply,
  rewindStandaloneRun: engine.rewind,
  listTechniques: engine.catalog,
}));

const first: GuidedEffect = {
  effect_id: 'first',
  run_id: 'run',
  request: {
    kind: 'interaction.ask',
    payload: { prompt: 'Name the situation\n\nDescribe what feels stuck.' },
  },
};
const second: GuidedEffect = {
  effect_id: 'second',
  run_id: 'run',
  request: {
    kind: 'interaction.ask',
    payload: { prompt: 'Try another frame\n\nWhat else could this mean?' },
  },
};
const data: PageData = {
  languagePracticeSource: null,
  pattern: {
    id: 'example',
    title: 'Creative reframing',
    summary: 'A fresh perspective, one step at a time.',
    sourceId: 'commons',
    type: 'pattern',
    verseIds: [],
  },
  techniqueId: 'cbt.thought-record',
  modality: 'cbt',
  isTherapy: false,
  needsAi: false,
  aiReason: null,
  inputNames: [],
};
const makeRun = (
  pending: GuidedEffect | null,
  items: StandaloneRun['view']['items'] = [],
): StandaloneRun => ({
  saved: {},
  view: {
    technique_id: 'example',
    root_id: 'run',
    revision: items.length,
    status: pending ? 'Waiting' : 'Completed',
    pending,
    items,
    outputs: {},
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  engine.catalog.mockResolvedValue([{ id: 'cbt.thought-record', title: 'Creative reframing' }]);
  engine.start.mockResolvedValue(makeRun(first));
});
afterEach(cleanup);

describe('continuous executable pattern worksheet', () => {
  it('renders a structured show between answers without making it a numbered interaction', async () => {
    const show: GuidedEffect = {
      run_id: 'run',
      effect_id: 'show',
      request: {
        kind: 'content.show',
        payload: {
          markdown: 'Show observations',
          view: {
            spec: {
              source: 'observations',
              map: [],
              group: null,
              order: null,
              link: null,
              split: null,
            },
            axes: [],
            warnings: [],
            panels: [
              {
                label: null,
                representation: 'collection',
                cyclic: false,
                edges: [],
                items: [
                  {
                    id: 'one',
                    label: 'A useful observation',
                    fields: { value: 'Worth trying' },
                    coordinates: [],
                    group: null,
                  },
                ],
              },
            ],
          },
        },
      },
    };
    engine.start.mockResolvedValue(
      makeRun(second, [
        { effect: first, result: { kind: 'text', value: 'My accepted answer' } },
        { effect: show, result: null },
      ]),
    );
    render(Runner, { data });
    await screen.findByText('A useful observation');
    expect(screen.getByText('Worth trying')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('1 step complete · step 2');
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    const copy = document.body.textContent!;
    expect(copy.indexOf('My accepted answer')).toBeLessThan(copy.indexOf('A useful observation'));
    expect(copy.indexOf('A useful observation')).toBeLessThan(copy.indexOf('Try another frame'));
  });
  it('keeps completed prompts and answers visible while revealing a single new editor', async () => {
    engine.apply.mockResolvedValue(
      makeRun(second, [
        {
          effect: first,
          result: { kind: 'text', value: 'I want the first version to be perfect.' },
        },
      ]),
    );
    render(Runner, { data });
    const field = await screen.findByRole('textbox', { name: 'Your response' });
    await fireEvent.input(field, { target: { value: 'I want the first version to be perfect.' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Continue ↓' }));
    const current = await screen.findByRole('heading', { name: 'Try another frame' });
    expect(screen.getByRole('heading', { name: 'Name the situation' })).toBeTruthy();
    expect(screen.getByText('Describe what feels stuck.')).toBeTruthy();
    expect(screen.getByText('I want the first version to be perfect.')).toBeTruthy();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(current));
    expect(screen.getByRole('status').textContent).toContain('1 step complete · step 2');
    expect(engine.apply.mock.calls[0]?.[1]).toEqual({
      Fulfill: {
        effect_id: 'first',
        result: { kind: 'text', value: 'I want the first version to be perfect.' },
      },
    });
  });

  it('retains every answer on completion without duplicating a summary', async () => {
    engine.apply.mockResolvedValue(
      makeRun(null, [{ effect: first, result: { kind: 'text', value: 'My previous response' } }]),
    );
    render(Runner, { data });
    await fireEvent.input(await screen.findByRole('textbox', { name: 'Your response' }), {
      target: { value: 'My previous response' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Continue ↓' }));
    await screen.findByRole('heading', { name: 'A moment to review.' });
    expect(screen.getAllByText('My previous response')).toHaveLength(1);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('This reflection was not saved to Mira.')).toBeTruthy();
  });

  it('edits in place by clicking an answer while leaving the current step open', async () => {
    engine.start.mockResolvedValue(
      makeRun(second, [{ effect: first, result: { kind: 'text', value: 'Original answer' } }]),
    );
    engine.rewind.mockResolvedValue(makeRun(first));
    engine.apply.mockImplementation(async (_run, event) =>
      makeRun(second, [{ effect: first, result: event.Fulfill.result }]),
    );
    render(Runner, { data });
    const next = await screen.findByRole('textbox', { name: 'Your response' });
    await fireEvent.input(next, { target: { value: 'Draft for step two' } });
    await fireEvent.click(screen.getByText('Original answer'));
    await waitFor(() =>
      expect(
        (screen.getByRole('textbox', { name: 'Edit your response' }) as HTMLTextAreaElement).value,
      ).toBe('Original answer'),
    );
    expect(engine.rewind).toHaveBeenCalledWith(expect.anything(), first);
    expect(screen.getByRole('heading', { name: 'Try another frame' })).toBeTruthy();
    expect(
      (screen.getByRole('textbox', { name: 'Your response' }) as HTMLTextAreaElement).value,
    ).toBe('Draft for step two');
    await fireEvent.input(screen.getByRole('textbox', { name: 'Edit your response' }), {
      target: { value: 'Revised answer' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('heading', { name: 'Try another frame' });
    expect(screen.getByText('Revised answer')).toBeTruthy();
    expect(
      (screen.getByRole('textbox', { name: 'Your response' }) as HTMLTextAreaElement).value,
    ).toBe('Draft for step two');
  });

  it('restores grouped form fields and retains an unfinished later form draft', async () => {
    const form: GuidedEffect = {
      ...first,
      request: {
        kind: 'interaction.form',
        payload: {
          title: 'Name the judgment',
          blocks: [
            {
              type: 'ask',
              id: 'situation',
              prompt: 'Situation',
              required: false,
              multiline: true,
              placeholder: null,
            },
            {
              type: 'ask',
              id: 'thought',
              prompt: 'Thought',
              required: false,
              multiline: true,
              placeholder: null,
            },
          ],
        },
      },
    };
    const later: GuidedEffect = {
      ...second,
      request: {
        kind: 'interaction.form',
        payload: {
          title: 'Talk to a friend',
          blocks: [
            {
              type: 'ask',
              id: 'response',
              prompt: 'Friend response',
              required: false,
              multiline: true,
              placeholder: null,
            },
          ],
        },
      },
    };
    const previous = {
      kind: 'form',
      value: {
        situation: { type: 'text', value: 'Original situation' },
        thought: { type: 'text', value: 'Original thought' },
      },
    };
    engine.start.mockResolvedValue(makeRun(later, [{ effect: form, result: previous }]));
    engine.rewind.mockResolvedValue(makeRun(form));
    engine.apply.mockImplementation(async (_run, event) =>
      makeRun(later, [{ effect: form, result: event.Fulfill.result }]),
    );
    render(Runner, { data });
    const friend = await screen.findByRole('textbox', { name: /Friend response/ });
    await fireEvent.input(friend, { target: { value: 'Unfinished friend response' } });
    await fireEvent.click(screen.getByText('Original situation'));
    const situation = await screen.findByRole('textbox', { name: /Situation/ });
    await waitFor(() =>
      expect((situation as HTMLTextAreaElement).value).toBe('Original situation'),
    );
    expect((screen.getByRole('textbox', { name: /Thought/ }) as HTMLTextAreaElement).value).toBe(
      'Original thought',
    );
    await fireEvent.input(situation, { target: { value: 'Updated situation' } });
    expect(screen.getByRole('heading', { name: 'Talk to a friend' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(
        (screen.getByRole('textbox', { name: /Friend response/ }) as HTMLTextAreaElement).value,
      ).toBe('Unfinished friend response'),
    );
    expect(screen.getByText('Updated situation')).toBeTruthy();
  });

  it('makes completed steps keyboard accessible even after completion', async () => {
    engine.start.mockResolvedValue(
      makeRun(null, [{ effect: first, result: { kind: 'text', value: 'Original answer' } }]),
    );
    engine.rewind.mockResolvedValue(makeRun(first));
    render(Runner, { data });
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Edit step 1: Name the situation' }),
    );
    await waitFor(() =>
      expect(
        (screen.getByRole('textbox', { name: 'Edit your response' }) as HTMLTextAreaElement).value,
      ).toBe('Original answer'),
    );
    expect(screen.queryByRole('heading', { name: 'A moment to review.' })).toBeNull();
  });

  it('saves a completed edit without closing later steps or discarding their answers', async () => {
    const originalFirst = { effect: first, result: { kind: 'text', value: 'Original answer' } };
    const originalSecond = { effect: second, result: { kind: 'text', value: 'My later response' } };
    engine.start.mockResolvedValue(makeRun(null, [originalFirst, originalSecond]));
    engine.rewind.mockResolvedValue(makeRun(first));
    let revisedFirst = originalFirst;
    engine.apply.mockImplementation(async (_run, event) => {
      if (event.Fulfill.effect_id === first.effect_id) {
        revisedFirst = { effect: first, result: event.Fulfill.result };
        return makeRun(second, [revisedFirst]);
      }
      return makeRun(null, [revisedFirst, { effect: second, result: event.Fulfill.result }]);
    });
    render(Runner, { data });
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Edit step 1: Name the situation' }),
    );
    expect(screen.getByText('My later response')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Try another frame' })).toBeTruthy();
    expect(engine.apply).not.toHaveBeenCalled();
    await fireEvent.input(screen.getByRole('textbox', { name: 'Edit your response' }), {
      target: { value: 'Revised answer' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('heading', { name: 'A moment to review.' });
    expect(screen.getByText('Revised answer')).toBeTruthy();
    expect(screen.getByText('My later response')).toBeTruthy();
    expect(document.body.textContent).toContain('review suggested');
    await fireEvent.click(screen.getByRole('button', { name: 'Keep this response ✓' }));
    expect(screen.queryByText('An earlier response changed.')).toBeNull();
    expect(engine.apply).toHaveBeenCalledTimes(2);
    const saving = screen.getByRole('button', { name: 'Save to workspace' });
    expect(
      saving.compareDocumentPosition(document.querySelector('.pattern-run-steps')!) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });

  it('keeps an earlier branch answer visible without prefilling a different question with the same effect id', async () => {
    const oldQuestion = { ...second, node_id: 3 };
    const newQuestion = {
      ...second,
      node_id: 7,
      request: { ...second.request, payload: { prompt: 'A different question' } },
    };
    engine.start.mockResolvedValue(
      makeRun(null, [
        { effect: first, result: { kind: 'text', value: 'Original answer' } },
        { effect: oldQuestion, result: { kind: 'text', value: 'Answer from the earlier path' } },
      ]),
    );
    engine.rewind.mockResolvedValue(makeRun(first));
    engine.apply.mockImplementation(async (_run, event) =>
      makeRun(newQuestion, [{ effect: first, result: event.Fulfill.result }]),
    );
    render(Runner, { data });
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Edit step 1: Name the situation' }),
    );
    await fireEvent.input(screen.getByRole('textbox', { name: 'Edit your response' }), {
      target: { value: 'New answer' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('heading', { name: 'A different question' });
    expect(
      (screen.getByRole('textbox', { name: 'Your response' }) as HTMLTextAreaElement).value,
    ).toBe('');
    expect(screen.getByText('Answer from the earlier path')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Try another frame' })).toBeTruthy();
    expect(engine.apply).toHaveBeenCalledTimes(1);
  });

  it('cancels an edit without changing earlier answers or an unfinished later draft', async () => {
    engine.start.mockResolvedValue(
      makeRun(second, [{ effect: first, result: { kind: 'text', value: 'Original answer' } }]),
    );
    engine.rewind.mockResolvedValue(makeRun(first));
    render(Runner, { data });
    await fireEvent.input(await screen.findByRole('textbox', { name: 'Your response' }), {
      target: { value: 'Keep my draft' },
    });
    await fireEvent.click(screen.getByText('Original answer'));
    await fireEvent.input(await screen.findByRole('textbox', { name: 'Edit your response' }), {
      target: { value: 'Discard this change' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Original answer')).toBeTruthy();
    expect(
      (screen.getByRole('textbox', { name: 'Your response' }) as HTMLTextAreaElement).value,
    ).toBe('Keep my draft');
    expect(engine.apply).not.toHaveBeenCalled();
  });

  it('does not advance an empty answer', async () => {
    render(Runner, { data });
    await screen.findByRole('textbox', { name: 'Your response' });
    expect((screen.getByRole('button', { name: 'Continue ↓' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(engine.apply).not.toHaveBeenCalled();
  });

  it('moves a non-blocking timer into history without resetting or fulfilling it twice', async () => {
    const timer: GuidedEffect = {
      effect_id: 'background-timer',
      run_id: 'run',
      request: {
        kind: 'interaction.timer',
        payload: {
          prompt: 'Make some space for reflection.',
          timer: {
            duration_seconds: 60,
            adjustable: false,
            min_seconds: 60,
            max_seconds: 60,
            blocking: false,
          },
        },
      },
    };
    engine.start.mockResolvedValue(makeRun(timer));
    engine.apply.mockImplementation(async (_current, event) =>
      makeRun(second, [{ effect: timer, result: event.Fulfill.result }]),
    );
    render(Runner, { data });
    await fireEvent.click(await screen.findByRole('button', { name: 'Start timer' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Continue ↓' }));
    await screen.findByRole('heading', { name: 'Try another frame' });
    expect(screen.getByRole('button', { name: 'Pause timer' })).toBeTruthy();
    const dock = screen.getByRole('complementary', { name: 'Practice timers' });
    expect(dock.querySelectorAll('.timer-widget')).toHaveLength(1);
    expect(document.querySelectorAll('.timer-widget')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Start timer' })).toBeNull();
    expect(screen.getByText(/Continued with timer/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Continue ↓' })).toHaveLength(1);
    expect(engine.apply).toHaveBeenCalledTimes(1);
    expect(engine.apply.mock.calls[0]?.[1].Fulfill.result).toMatchObject({
      kind: 'timer',
      value: { duration_seconds: 60, completed: false },
    });
    const answer = screen.getByRole('textbox', { name: 'Your response' }) as HTMLTextAreaElement;
    await fireEvent.input(answer, { target: { value: 'Keep this draft while pausing.' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Pause timer' }));
    expect(answer.value).toBe('Keep this draft while pausing.');
    await fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));
    expect(dock.contains(screen.getByRole('button', { name: 'Start timer' }))).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
    expect(answer.value).toBe('Keep this draft while pausing.');
    expect(engine.apply).toHaveBeenCalledTimes(1);
  });
});

it('keeps a step-local timer beneath its instructions through start, pause, and reset', async () => {
  const timer: GuidedEffect = {
    effect_id: 'local-timer',
    run_id: 'run',
    request: {
      kind: 'interaction.timer',
      payload: {
        prompt: 'Rehearse your revised dream',
        timer: {
          duration_seconds: 600,
          adjustable: false,
          min_seconds: 600,
          max_seconds: 600,
          blocking: true,
          sticky: false,
        },
      },
    },
  };
  engine.start.mockResolvedValue(makeRun(timer));
  render(Runner, { data });
  await fireEvent.click(await screen.findByRole('button', { name: 'Start timer' }));
  expect(screen.queryByRole('complementary', { name: 'Practice timers' })).toBeNull();
  expect(document.querySelectorAll('.timer-widget')).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Pause timer' })).toBeTruthy();
  await fireEvent.click(screen.getByRole('button', { name: 'Pause timer' }));
  expect(screen.getByRole('button', { name: 'Resume timer' })).toBeTruthy();
  await fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));
  expect(screen.getByRole('button', { name: 'Start timer' })).toBeTruthy();
  expect(screen.queryByRole('complementary', { name: 'Practice timers' })).toBeNull();
  expect(engine.apply).not.toHaveBeenCalled();
});
