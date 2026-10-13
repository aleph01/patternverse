// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PracticeDefinition } from '@patternverse/schema';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import PracticeRunner from './PracticeRunner.svelte';

const practice: PracticeDefinition = {
  title: 'Test Practice',
  introduction: 'Start with one thing.',
  steps: [
    {
      id: 'write',
      title: 'Write',
      blocks: [
        { id: 'copy', type: 'markdown', content: '**Safe instructions**.' },
        { id: 'answer', type: 'text-input', label: 'Your answer', multiline: true, required: true },
        {
          id: 'optional',
          type: 'text-input',
          label: 'Anything else',
          multiline: false,
          required: false,
        },
      ],
    },
    {
      id: 'wait',
      title: 'Wait',
      blocks: [
        {
          id: 'adjustable-timer',
          type: 'timer',
          label: 'Adjustable timer',
          defaultDurationSeconds: 120,
          userAdjustable: true,
          persistent: true,
        },
        {
          id: 'fixed-timer',
          type: 'timer',
          label: 'Fixed timer',
          defaultDurationSeconds: 60,
          userAdjustable: false,
        },
      ],
    },
  ],
};
beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
afterEach(cleanup);
const openRunner = async () => {
  render(PracticeRunner, {
    practiceId: 'test-practice',
    practice,
    returnHref: '/pattern/test',
    returnLabel: 'Test',
  });
  await screen.findByRole('textbox', { name: 'Your answer' });
};
describe('shared Rust-backed practice runner', () => {
  it('keeps grouped controls, validates required answers, and appends read-only history', async () => {
    await openRunner();
    expect(screen.getByRole('textbox', { name: /Anything else/ })).toBeTruthy();
    expect(screen.getByText('Safe instructions')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Wait' })).toBeNull();
    const answer = screen.getByRole('textbox', { name: 'Your answer' });
    await fireEvent.input(answer, { target: { value: '   ' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Continue ↓' }));
    expect(screen.getByRole('alert').textContent).toContain('Please answer');
    expect(screen.queryByRole('heading', { name: 'Wait' })).toBeNull();
    await fireEvent.input(answer, { target: { value: 'A private answer' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Continue ↓' }));
    await screen.findByRole('heading', { name: 'Wait' });
    expect(screen.getByRole('heading', { name: 'Write' })).toBeTruthy();
    expect(screen.getByText('A private answer')).toBeTruthy();
    expect(screen.getByText('Not answered')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Your answer' })).toBeNull();
    expect(screen.getByText('Safe instructions')).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Wait' })),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Continue ↓' }));
    await screen.findByRole('heading', { name: 'A moment to review.' });
    expect(screen.getByText('A private answer')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Return to pattern' }).getAttribute('href')).toBe(
      '/pattern/test',
    );
  });
  it('makes persistent timers available from the start, and fixed timers in their original step', async () => {
    await openRunner();
    expect(screen.getByText('2 min')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Increase timer by one minute' }));
    expect(screen.getByText('3 min')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
    expect(screen.getByRole('button', { name: 'Pause timer' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Pause timer' }));
    expect(screen.getByRole('button', { name: 'Resume timer' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Resume timer' }));
    await fireEvent.input(screen.getByRole('textbox', { name: 'Your answer' }), {
      target: { value: 'Continue' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Continue ↓' }));
    const step = await screen.findByRole('region', { name: 'Wait' });
    expect(within(step).getByText('1 min')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pause timer' })).toBeTruthy();
    expect(
      within(screen.getByRole('complementary', { name: 'Practice timers' })).getByRole('button', {
        name: 'Pause timer',
      }),
    ).toBeTruthy();
    expect(within(step).queryByRole('spinbutton')).toBeNull();
  });
});
