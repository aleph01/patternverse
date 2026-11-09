// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fulfillModelEffect } from '@patternverse/guided-ai';
import { parseMarkdownEntity } from '@patternverse/compiler';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import type { PatternRun as Run } from '$lib/pattern-runtime/types';
import PatternRun from './PatternRun.svelte';

const model = vi.hoisted(() => ({ fulfill: vi.fn() }));
vi.mock('$app/paths', () => ({ base: '', resolve: (path: string) => path }));
vi.mock('$lib/practice/worksheet-focus', () => ({ focusWorksheetStep: vi.fn() }));
vi.mock('$lib/pattern-run/run-adapters', () => ({
  practiceRunPorts: {
    startSource: async (source: string) =>
      JSON.parse(
        editor(
          JSON.stringify({
            operation: 'start',
            source,
            data: resourceData,
            root_id: 'component-belief',
            inputs: {},
          }),
        ),
      ),
    applySource: async (run: Run, event: unknown, run_id: string) =>
      JSON.parse(
        editor(
          JSON.stringify({
            operation: 'apply',
            saved: run.saved,
            expected_revision: run.view.revision,
            command: { run_id, event },
          }),
        ),
      ),
    rewindSource: async (run: Run, effect: { run_id: string; effect_id: string }) =>
      JSON.parse(
        editor(
          JSON.stringify({
            operation: 'rewind',
            saved: run.saved,
            expected_revision: run.view.revision,
            run_id: effect.run_id,
            effect_id: effect.effect_id,
          }),
        ),
      ),
    connectionReady: async () => true,
    freeAvailable: async () => false,
    fulfillModel: model.fulfill,
    failure: (cause: unknown) => ({
      error: cause instanceof Error ? cause.message : 'Could not explore.',
    }),
  },
}));
const resourceData = {
  'commons:self-acceptability': JSON.parse(
    readFileSync(
      resolve(process.cwd(), '../../content/assets/libraries/self-acceptability.json'),
      'utf8',
    ),
  ),
  'commons:limiting-beliefs': JSON.parse(
    readFileSync(
      resolve(process.cwd(), '../../content/assets/libraries/limiting-beliefs.json'),
      'utf8',
    ),
  ),
};
const source = parseMarkdownEntity(
  readFileSync(
    resolve(process.cwd(), '../../content/patterns/identify-limiting-beliefs.md'),
    'utf8',
  ),
  { sourceId: 'commons', sourcePath: 'beliefs.md' },
).entity!.languagePracticeSource!;
const acceptabilitySource = parseMarkdownEntity(
  readFileSync(
    resolve(process.cwd(), '../../content/patterns/explore-what-feels-wrong.md'),
    'utf8',
  ),
  { sourceId: 'commons', sourcePath: 'patterns/explore-what-feels-wrong.md' },
).entity!.languagePracticeSource!;

beforeEach(() => {
  vi.stubEnv('VITE_FEATURE_GUIDED_EXERCISES', 'true');
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  });
  model.fulfill.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

it('shows a tentative P0065 connection with the missing assumption in readable fields', async () => {
  const assumption = 'One exception is expected to weaken other standards too.';
  model.fulfill.mockImplementationOnce((effect) =>
    fulfillModelEffect(effect, async () =>
      JSON.stringify([
        {
          belief: 'P0065',
          basis: 'hypothesis',
          evidence: 'letting my guard down',
          connection: 'Allowing an exception could feel like the start of losing wider control.',
          unconfirmed_assumptions: [assumption],
        },
      ]),
    ),
  );
  renderExploration();
  const input = await screen.findByRole('textbox', { name: 'Your description' });
  await fireEvent.input(input, {
    target: { value: 'I feel guilty about this exception and like I am letting my guard down.' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Explore possible beliefs →' }));
  const statement = await screen.findByText(
    'If I relax one standard, all my standards will collapse.',
  );
  const details = statement.closest('details')!;
  expect(details.open).toBe(false);
  await fireEvent.click(statement.closest('summary')!);
  expect(details.open).toBe(true);
  expect(screen.getByText('hypothesis')).toBeTruthy();
  expect(screen.getByText('unconfirmed assumptions')).toBeTruthy();
  expect(screen.getByText(assumption)).toBeTruthy();
  expect(
    screen.getByText('Allowing an exception could feel like the start of losing wider control.'),
  ).toBeTruthy();
  expect(model.fulfill).toHaveBeenCalledTimes(1);
});

function renderExploration(patternId = 'identify-limiting-beliefs') {
  render(PatternRun, {
    data: {
      pattern: {
        id: patternId,
        title:
          patternId === 'identify-limiting-beliefs'
            ? 'Identify Limiting Beliefs'
            : 'Explore What Feels Wrong',
        summary: 'Describe a situation for possible beliefs.',
      },
      techniqueId: '',
      modality: '',
      languagePracticeSource:
        patternId === 'identify-limiting-beliefs' ? source : acceptabilitySource,
      isTherapy: true,
      needsAi: true,
      aiReason: 'AI suggests possible meanings.',
      inputNames: [],
    },
  });
}

it('uses the companion catalogue with compact cards, its own labels and editable context', async () => {
  model.fulfill.mockImplementation((effect) =>
    fulfillModelEffect(effect, async () =>
      JSON.stringify([
        {
          entry: 'S0032',
          basis: 'hypothesis',
          evidence: 'saying no',
          connection: 'You may be treating your own limit as selfish.',
          unconfirmed_assumptions: ['Whether selfish is your own judgment remains open.'],
        },
      ]),
    ),
  );
  renderExploration('explore-what-feels-wrong');
  const input = await screen.findByRole('textbox', { name: 'Your description' });
  expect(screen.getByText('AI-assisted practice')).toBeTruthy();
  await fireEvent.input(input, { target: { value: 'I feel bad for saying no.' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Explore possible meanings →' }));
  await screen.findByRole('heading', { name: 'Possible aspects and self-judgments' });
  const statement = screen.getByText('Saying no makes me selfish.');
  expect(statement.closest('details')!.open).toBe(false);
  await fireEvent.click(statement.closest('summary')!);
  expect(statement.closest('details')!.open).toBe(true);
  expect(screen.getByText('Whether selfish is your own judgment remains open.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Show step map' })).toBeNull();
  await fireEvent.click(screen.getByRole('button', { name: 'Add more context →' }));
  const revised = await screen.findByRole('textbox', { name: 'Your description' });
  expect((revised as HTMLTextAreaElement).value).toBe('I feel bad for saying no.');
  expect(screen.getByRole('button', { name: 'Explore possible meanings →' })).toBeTruthy();
});

it('shows one description and one action, then allows context editing without fit ratings or a required follow-up', async () => {
  model.fulfill
    .mockImplementationOnce((effect) =>
      fulfillModelEffect(effect, async () =>
        JSON.stringify([
          {
            belief: 'P0001',
            basis: 'expressed',
            unconfirmed_assumptions: [],
            evidence: 'worth by usefulness',
            connection: 'Your words connect personal worth to usefulness.',
          },
        ]),
      ),
    )
    .mockImplementationOnce((effect) =>
      fulfillModelEffect(effect, async () =>
        JSON.stringify([
          {
            belief: 'P0001',
            basis: 'expressed',
            unconfirmed_assumptions: [],
            evidence: 'worth only counts when useful at work',
            connection: 'Your revised words connect worth to usefulness at work.',
          },
        ]),
      ),
    );
  renderExploration();
  const input = await screen.findByRole('textbox', { name: 'Your description' });
  expect(screen.getAllByRole('textbox')).toHaveLength(1);
  expect(model.fulfill).not.toHaveBeenCalled();
  await fireEvent.input(input, {
    target: { value: 'I judge my worth by usefulness.' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Explore possible beliefs →' }));
  await screen.findByRole('heading', { name: 'Possible underlying beliefs' });
  expect(screen.getByText('My worth depends on how useful I am.')).toBeTruthy();
  expect(screen.getAllByRole('list').length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: /Doesn.t fit|Partly fits|Fits/ })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Show step map' })).toBeNull();
  expect(model.fulfill).toHaveBeenCalledTimes(1);
  await fireEvent.click(screen.getByRole('button', { name: 'Add more context →' }));
  const revised = await screen.findByRole('textbox', { name: 'Your description' });
  expect((revised as HTMLTextAreaElement).value).toContain('worth by usefulness');
  await fireEvent.input(revised, {
    target: { value: 'I feel my worth only counts when useful at work.' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Explore possible beliefs →' }));
  await waitFor(() => expect(model.fulfill).toHaveBeenCalledTimes(2));
  await screen.findByRole('heading', { name: 'Possible underlying beliefs' });
  expect(screen.queryByText('One detail to clarify')).toBeNull();
  expect(JSON.stringify(model.fulfill.mock.calls[1][0])).toContain(
    'worth only counts when useful at work',
  );
  expect(JSON.stringify(model.fulfill.mock.calls[1][0])).not.toContain('worth by usefulness');
});

it.each([
  { answer: 'My worth depends on usefulness.', found: true },
  { answer: '', found: false },
])(
  'asks one optional focused question after no match, then finishes: %j',
  async ({ answer, found }) => {
    const question = 'What were you telling yourself about eating the chocolate?';
    model.fulfill
      .mockImplementationOnce((effect) => fulfillModelEffect(effect, async () => '[]'))
      .mockImplementationOnce((effect) => fulfillModelEffect(effect, async () => question))
      .mockImplementationOnce((effect) =>
        fulfillModelEffect(effect, async () =>
          JSON.stringify(
            found
              ? [
                  {
                    belief: 'P0001',
                    basis: 'expressed',
                    unconfirmed_assumptions: [],
                    evidence: answer,
                    connection: 'Your clarification connects worth to usefulness.',
                  },
                ]
              : [],
          ),
        ),
      );
    renderExploration();
    const initial = await screen.findByRole('textbox', { name: 'Your description' });
    await fireEvent.input(initial, {
      target: { value: 'I was eating chocolate and feeling bad about myself.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Explore possible beliefs →' }));
    await screen.findByRole('heading', { name: 'One detail to clarify' });
    const clarification = await screen.findByRole('textbox', {
      name: new RegExp('What were you telling yourself'),
    });
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(model.fulfill).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/No useful library connection emerged/)).toBeNull();
    if (answer) await fireEvent.input(clarification, { target: { value: answer } });
    const retry = screen.getByRole('button', { name: 'Explore possible beliefs →' });
    expect((retry as HTMLButtonElement).disabled).toBe(false);
    await fireEvent.click(retry);
    await screen.findByRole('heading', { name: 'Possible underlying beliefs' });
    await waitFor(() => expect(model.fulfill).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole('textbox')).toBeNull();
    if (found) expect(screen.getByText('My worth depends on how useful I am.')).toBeTruthy();
    else
      await screen.findByText(
        'No useful library connection emerged from what you shared. You can leave it here or add more context.',
      );
    expect(JSON.stringify(model.fulfill.mock.calls[2][0].request.payload.context)).not.toContain(
      question,
    );
    expect(screen.queryByRole('button', { name: /Doesn.t fit|Partly fits|Fits/ })).toBeNull();
  },
);
