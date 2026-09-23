// @vitest-environment jsdom

import type { PracticeDefinition } from '@patternverse/schema';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PracticeRunner from './PracticeRunner.svelte';

const practice: PracticeDefinition = {
  title: 'Test Practice',
  introduction: 'Start with one thing.',
  steps: [
    {
      id: 'write',
      title: 'Write',
      blocks: [
        { id: 'copy', type: 'markdown', content: 'Rendered on the server.' },
        {
          id: 'answer',
          type: 'text-input',
          label: 'Your answer',
          multiline: true,
          required: true,
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

const openRunner = () =>
  render(PracticeRunner, {
    practiceId: 'test-practice',
    practice,
    markdownHtml: { copy: '<p>Safe <strong>instructions</strong>.</p>' },
    returnHref: '/pattern/test',
    returnLabel: 'Test',
  });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Practice runner component', () => {
  it('renders safe Markdown, updates text input, validates, and preserves the response on Back', async () => {
    openRunner();

    expect(screen.getByLabelText('Step 1 of 2')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Next' }).textContent?.trim()).toBe('');
    expect(screen.getByText('instructions')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('This field is required.')).toBeTruthy();

    const response = screen.getByRole('textbox', { name: 'Your answer *' });
    await fireEvent.input(response, { target: { value: 'A private answer' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByLabelText('Step 2 of 2')).toBeTruthy();

    expect(screen.getByRole('button', { name: 'Back' }).textContent?.trim()).toBe('');
    await fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(
      (screen.getByRole('textbox', { name: 'Your answer *' }) as HTMLTextAreaElement).value,
    ).toBe('A private answer');
  });

  it('shows adjustable and fixed timer defaults correctly', async () => {
    openRunner();
    expect(screen.getByRole('region', { name: 'Adjustable timer' })).toBeTruthy();
    await fireEvent.input(screen.getByRole('textbox', { name: 'Your answer *' }), {
      target: { value: 'Continue' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    const minutes = screen.getByRole('spinbutton', { name: 'Adjustable timer in minutes' });
    expect((minutes as HTMLInputElement).value).toBe('2');
    expect(screen.queryByRole('spinbutton', { name: 'Fixed timer in minutes' })).toBeNull();
    expect(screen.getByText('01:00')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('region', { name: 'Adjustable timer' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await fireEvent.click(
      screen.getByRole('button', { name: 'Increase Adjustable timer by one minute' }),
    );
    expect((minutes as HTMLInputElement).value).toBe('3');
    await fireEvent.click(
      screen.getByRole('button', { name: 'Decrease Adjustable timer by one minute' }),
    );
    expect((minutes as HTMLInputElement).value).toBe('2');

    await fireEvent.change(minutes, { target: { value: '3' } });
    expect(
      (screen.getByRole('spinbutton', { name: 'Adjustable timer in minutes' }) as HTMLInputElement)
        .value,
    ).toBe('3');
  });

  it('supports Start, Pause, Resume, and Reset with restrained live announcements', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T12:00:00Z'));
    openRunner();
    await fireEvent.input(screen.getByRole('textbox', { name: 'Your answer *' }), {
      target: { value: 'Continue' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    const adjustable = screen.getByRole('region', { name: 'Adjustable timer' });
    await fireEvent.click(within(adjustable).getByRole('button', { name: 'Start timer' }));
    expect(adjustable.textContent).toContain('Timer started.');
    expect(screen.getByRole('button', { name: 'Pause timer' })).toBeTruthy();

    await vi.advanceTimersByTimeAsync(30_000);
    await fireEvent.click(screen.getByRole('button', { name: 'Pause timer' }));
    expect(adjustable.textContent).toContain('Timer paused.');
    await fireEvent.click(screen.getByRole('button', { name: 'Resume timer' }));
    expect(adjustable.textContent).toContain('Timer resumed.');
    await fireEvent.click(screen.getAllByRole('button', { name: 'Reset timer' })[0]!);
    expect(
      (
        within(adjustable).getByRole('spinbutton', {
          name: 'Adjustable timer in minutes',
        }) as HTMLInputElement
      ).value,
    ).toBe('2');
  });
});
