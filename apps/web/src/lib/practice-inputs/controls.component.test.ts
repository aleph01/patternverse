// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Controls from './Controls.test.svelte';
import GuidedSelection from '$lib/mira/GuidedSelection.svelte';
import type { PatternEffect } from '$lib/pattern-runtime/types';

afterEach(cleanup);
const draft = () => JSON.parse(screen.getByLabelText('Drafts').textContent!);

it('binds text and both rating presentations without resetting drafts on disabled updates', async () => {
  const view = render(Controls);
  const text = screen.getByLabelText('Response');
  expect(text.getAttribute('maxlength')).toBe('30000');
  expect(text.getAttribute('rows')).toBe('4');
  expect(text.getAttribute('placeholder')).toBe('Write here');
  const number = screen.getByRole('spinbutton', { name: 'Your rating' });
  expect(number.getAttribute('min')).toBe('-2');
  expect(number.getAttribute('max')).toBe('5');
  const range = screen.getByRole('slider', { name: /Low — High/ });
  expect(range.getAttribute('step')).toBe('any');
  await fireEvent.input(text, { target: { value: 'Unfinished thought' } });
  await fireEvent.input(number, { target: { value: '-1' } });
  await fireEvent.input(range, { target: { value: '2.5' } });
  expect(draft()).toMatchObject({ text: 'Unfinished thought', rating: -1, range: 2.5 });
  await view.rerender({ disabled: true });
  expect(text.hasAttribute('disabled')).toBe(true);
  expect(number.hasAttribute('disabled')).toBe(true);
  expect(range.hasAttribute('disabled')).toBe(true);
  await view.rerender({ disabled: false });
  expect(draft()).toMatchObject({ text: 'Unfinished thought', rating: -1, range: 2.5 });
  await fireEvent.input(number, { target: { value: '' } });
  expect(draft().rating).toBeNull();
});

it('keeps caller-supplied IDs distinct when multiple input groups are rendered', () => {
  render(Controls, { prefix: 'first' });
  render(Controls, { prefix: 'second' });
  expect(screen.getAllByLabelText('Response').map((input) => input.id)).toEqual([
    'first-text',
    'second-text',
  ]);
  const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
  expect(new Set(ids).size).toBe(ids.length);
});

describe.each(['worksheet', 'guided'] as const)('%s choices', (presentation) => {
  it('binds multi-select drafts and preserves them across disabling', async () => {
    const view = render(Controls, { presentation });
    expect((screen.getByRole('checkbox', { name: 'Alpha' }) as HTMLInputElement).checked).toBe(
      true,
    );
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Beta' }));
    expect(draft().selected).toEqual(['a', 'b']);
    await view.rerender({ disabled: true });
    expect(screen.getByRole('checkbox', { name: 'Beta' }).hasAttribute('disabled')).toBe(true);
    await view.rerender({ disabled: false });
    expect(draft().selected).toEqual(['a', 'b']);
  });

  it('reorders through accessible buttons, preserving boundaries and caller order', async () => {
    render(Controls, { mode: 'rank', presentation });
    const name = (value: string, label: string, direction: string) =>
      `Move ${presentation === 'worksheet' ? value : label} ${direction}`;
    expect(
      screen.getByRole('button', { name: name('b', 'Beta', 'up') }).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: name('c', 'Gamma', 'down') }).hasAttribute('disabled'),
    ).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: name('a', 'Alpha', 'up') }));
    expect(draft().order).toEqual(['a', 'b', 'c']);
    await fireEvent.click(screen.getByRole('button', { name: name('a', 'Alpha', 'down') }));
    expect(draft().order).toEqual(['b', 'a', 'c']);
  });

  it('returns canonical single-choice values rather than display labels', async () => {
    render(Controls, { mode: 'single', presentation });
    await fireEvent.click(screen.getByRole('button', { name: /^Gamma/ }));
    expect(draft().selected).toEqual(['c']);
  });
});

it('keeps guided confirmation limits and submits the typed selection result', async () => {
  const results: unknown[] = [];
  const effect: PatternEffect = {
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
  };
  render(GuidedSelection, {
    effect,
    disabled: false,
    onConfirm: (kind, value) => results.push({ kind, value }),
  });
  const confirm = screen.getByRole('button', { name: 'Continue →' });
  expect(confirm.hasAttribute('disabled')).toBe(true);
  await fireEvent.click(screen.getByLabelText('Alpha'));
  expect(confirm.hasAttribute('disabled')).toBe(false);
  await fireEvent.click(screen.getByLabelText('Beta'));
  expect(confirm.hasAttribute('disabled')).toBe(true);
  await fireEvent.click(screen.getByLabelText('Beta'));
  await fireEvent.click(confirm);
  expect(results).toEqual([{ kind: 'selected_many', value: ['a'] }]);
});
