// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatternForm from './PatternForm.svelte';
import type { PatternEffect } from '$lib/pattern-runtime/types';
import type { FormAnswers } from '$lib/pattern-run/form';

afterEach(cleanup);
const choice = (value: string) => ({
  type: 'choice' as const,
  value: { value, label: value.toUpperCase() },
});
const effect: PatternEffect = {
  effect_id: 'assessment',
  run_id: 'run',
  request: {
    kind: 'interaction.form',
    payload: {
      title: 'Assessment',
      blocks: [
        {
          type: 'ask',
          id: 'name',
          prompt: 'Initiative',
          required: true,
          multiline: false,
          placeholder: null,
        },
        {
          type: 'rate',
          id: 'impact',
          prompt: 'Impact',
          rating: { min: -2.5, max: 5, low: 'Little', high: 'Much', prefer: null },
        },
        {
          type: 'select',
          id: 'evidence',
          prompt: 'Evidence',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
          selection: { mode: 'single', min: 1, max: 1, prefer: null },
        },
        {
          type: 'select',
          id: 'dependencies',
          prompt: 'Dependencies',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
          selection: { mode: 'multi', min: 0, max: 1, prefer: null },
        },
      ],
    },
  },
};
const answers: FormAnswers = {
  name: { type: 'text', value: 'Onboarding' },
  impact: { type: 'number', value: -1.5 },
  evidence: choice('b'),
  dependencies: { type: 'list', value: { element_type: 'choice', items: [choice('a')] } },
};

describe('atomic grouped inputs', () => {
  it('keeps edits local, requires a deliberate rating and choice, then submits one typed record', async () => {
    const onConfirm = vi.fn(),
      onDraftChange = vi.fn();
    render(PatternForm, { effect, onConfirm, onDraftChange });
    expect((screen.getByRole('spinbutton', { name: 'Impact' }) as HTMLInputElement).value).toBe('');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await fireEvent.input(screen.getByRole('textbox', { name: 'Initiative' }), {
      target: { value: 'Onboarding' },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByRole('alert').textContent).toContain('Enter a number');
    await fireEvent.input(screen.getByRole('spinbutton'), { target: { value: '-1.5' } });
    await fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByRole('alert').textContent).toContain('Evidence');
    await fireEvent.click(screen.getByRole('radio', { name: 'B' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'A' }));
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(onDraftChange).toHaveBeenLastCalledWith(answers));
    await fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('form', answers);
  });

  it('retains corrections after invalid bounds and accepts zero plus an explicitly empty multi-selection', async () => {
    const onConfirm = vi.fn();
    render(PatternForm, { effect, initialAnswers: { kind: 'form', value: answers }, onConfirm });
    await fireEvent.input(screen.getByRole('spinbutton'), { target: { value: '5.1' } });
    await fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Onboarding');
    await fireEvent.input(screen.getByRole('spinbutton'), { target: { value: '0' } });
    await fireEvent.click(screen.getByRole('checkbox', { name: 'B' }));
    await fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByRole('alert').textContent).toContain('Dependencies');
    expect(onConfirm).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('checkbox', { name: 'A' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'B' }));
    await fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('form', {
      ...answers,
      impact: { type: 'number', value: 0 },
      dependencies: { type: 'list', value: { element_type: 'choice', items: [] } },
    });
  });

  it('restores typed drafts and displays completed values using offered labels', () => {
    const { unmount } = render(PatternForm, {
      effect,
      initialAnswers: { kind: 'form', value: answers },
    });
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('-1.5');
    expect((screen.getByRole('radio', { name: 'B' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'A' }) as HTMLInputElement).checked).toBe(true);
    unmount();
    render(PatternForm, {
      effect,
      result: {
        kind: 'form',
        value: {
          ...answers,
          evidence: { type: 'choice', value: { value: 'b', label: 'Untrusted label' } },
        },
      },
    });
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('-1.5')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.queryByText('Untrusted label')).toBeNull();
  });
});
