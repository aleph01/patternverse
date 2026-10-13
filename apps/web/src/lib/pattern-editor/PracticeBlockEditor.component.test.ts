// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import PracticeBlockEditor from './PracticeBlockEditor.svelte';
import type { Inspection } from './types';
import { newBlock, newPaths, responseOptions, endInsertion, patchSource } from './blocks';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
afterEach(cleanup);
const inspect = (source: string): Inspection =>
  JSON.parse(editor(JSON.stringify({ operation: 'inspect', source })));
const simple = ':language 1\n:title "Editor test"\n' + newBlock('', 'choose') + '-> end\n';
function fixture() {
  const model = inspect(simple).structure!;
  return patchSource(simple, [
    {
      span: endInsertion(model)!,
      replacement: newPaths(simple, responseOptions(model, endInsertion(model)!.start)[0]),
    },
  ]);
}
function setup(source: string) {
  const onchange = vi.fn(),
    onreveal = vi.fn(),
    onpendingchange = vi.fn();
  const result = render(PracticeBlockEditor, {
    source,
    inspection: inspect(source),
    onchange,
    onreveal,
    onpendingchange,
  });
  return { ...result, onchange, onreveal, onpendingchange };
}

describe('synchronized practice block editing', () => {
  it('keeps multi-selection attributes between options when editing a label', async () => {
    const source =
      ':language 1\n!choose route {\n  :option yes "Yes"\n  :multi\n  :min 1\n  :option no "No"\n  Choose any that apply.\n}\n-> end';
    const view = setup(source);
    await fireEvent.click(screen.getByRole('button', { name: /Choose any that apply/ }));
    await fireEvent.input(screen.getByLabelText('Option 1 label'), {
      target: { value: 'Definitely' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(view.onchange).toHaveBeenCalledTimes(1));
    expect(view.onchange.mock.calls[0][0]).toBe(source.replace('"Yes"', '"Definitely"'));
  });
  it('keeps advanced branch expressions as Source-only blocks', async () => {
    const source = fixture()
      .replace(newBlock('', 'choose'), newBlock('', 'rate'))
      .replace('?match choice', '?branch')
      .replace(':case "explore"', ':when rating > 5 and rating < 9')
      .replace(':case "plan"', ':when rating < 4');
    const view = setup(source);
    expect(inspect(source).structure).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: /\?branch · edit in Source/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Edit in Source' }));
    expect(view.onreveal).toHaveBeenCalled();
    expect(view.onchange).not.toHaveBeenCalled();
  });
  it('edits static choice labels without changing response or option identities', async () => {
    const view = setup(simple);
    await fireEvent.click(screen.getByRole('button', { name: /What would help/ }));
    await fireEvent.input(screen.getByLabelText('Option 1 label'), {
      target: { value: 'Explore another possibility' },
    });
    await fireEvent.click(screen.getByRole('button', { name: '+ Add option' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(view.onchange).toHaveBeenCalledTimes(1));
    const candidate = view.onchange.mock.calls[0][0];
    expect(candidate).toContain(':option explore "Explore another possibility"');
    expect(candidate).toContain(':option option_2 "New option"');
    expect(inspect(candidate).structure!.bindings[0].name).toBe('choice');
  });
  it('validates timer changes before committing and can recover from a rejected duration', async () => {
    const source = ':language 1\n' + newBlock('', 'timer') + '-> end';
    const view = setup(source);
    await fireEvent.click(screen.getByRole('button', { name: /Take a quiet pause/ }));
    await fireEvent.input(screen.getByLabelText('Duration (minutes)'), { target: { value: '0' } });
    // Submit programmatically so compiler validation also covers bypassed browser constraints.
    await fireEvent.submit(screen.getByLabelText('Duration (minutes)').closest('form')!);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('valid minutes'));
    expect(view.onchange).not.toHaveBeenCalled();
    await fireEvent.input(screen.getByLabelText('Duration (minutes)'), {
      target: { value: '1.5' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(view.onchange).toHaveBeenCalledTimes(1));
    expect(view.onchange.mock.calls[0][0]).toContain(':duration 90');
  });
  it('preserves functional rating syntax and endpoint labels when editing its range', async () => {
    const source =
      ':language 1\nscore = !rate 0..5 {\n:low "Low"\n:high "High"\nClarity?\n}\n-> end';
    const view = setup(source);
    await fireEvent.click(screen.getByRole('button', { name: /Clarity/ }));
    await fireEvent.input(screen.getByLabelText('Rating range'), { target: { value: '-5..5' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(view.onchange).toHaveBeenCalledTimes(1));
    expect(view.onchange.mock.calls[0][0]).toBe(source.replace('0..5', '-5..5'));
  });
  it('exposes switch cases, adds the remaining choice, and rebuilds from source changes', async () => {
    const source = fixture(),
      view = setup(source);
    expect(screen.getByLabelText('Answer for case 1')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Add case' }));
    await waitFor(() => expect(view.onchange).toHaveBeenCalledTimes(1));
    const candidate = view.onchange.mock.calls[0][0];
    expect(inspect(candidate).structure!.paths![0].arms).toHaveLength(4);
    await view.rerender({ source: candidate, inspection: inspect(candidate) });
    expect(screen.getByLabelText('Answer for case 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add case' }).hasAttribute('disabled')).toBe(true);
  });
  it('stages route changes, rejects duplicates through the compiler and can discard them', async () => {
    const source = fixture(),
      view = setup(source);
    // Use two equal cases in the raw scalar editor by switching to a text input.
    const textSource = source.replace(
      newBlock('', 'choose'),
      '!ask choice {\nWhat would help?\n}\n',
    );
    await view.rerender({ source: textSource, inspection: inspect(textSource) });
    await fireEvent.input(screen.getByLabelText('Answer for case 2'), {
      target: { value: 'explore' },
    });
    await waitFor(() => expect(view.onpendingchange).toHaveBeenLastCalledWith(true));
    await fireEvent.click(screen.getByRole('button', { name: 'Apply path changes' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Duplicate match case'),
    );
    expect(view.onchange).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(view.onpendingchange).toHaveBeenLastCalledWith(false));
  });
  it('edits a nested question without changing its parent choice or other paths', async () => {
    const source = fixture(),
      view = setup(source);
    const arm = screen.getByRole('region', { name: 'Case 1' });
    await fireEvent.click(
      within(arm).getByRole('button', { name: /What options could you explore/ }),
    );
    await fireEvent.input(screen.getByLabelText('Block prompt'), {
      target: { value: 'What would you like to explore next?' },
    });
    await waitFor(() => expect(view.onpendingchange).toHaveBeenLastCalledWith(true));
    await fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(view.onchange).toHaveBeenCalledTimes(1));
    const candidate = view.onchange.mock.calls[0][0];
    expect(candidate).toContain('What would you like to explore next?');
    expect(candidate).toContain('What is one small action you could take?');
    expect(candidate).toContain(':case "explore"');
  });
  it('shows unsupported constructs as intact source blocks and disables stale/busy edits', async () => {
    const source = ':language 1\n!collect notes {\n:max 2\n!ask note {\nA note?\n}\n}\n-> end';
    const view = setup(source);
    await fireEvent.click(screen.getByRole('button', { name: /collect · edit in Source/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Edit in Source' }));
    expect(view.onreveal).toHaveBeenCalled();
    expect(view.onchange).not.toHaveBeenCalled();
    await view.rerender({ checking: true });
    expect(
      screen.getByRole('button', { name: 'Add block before completion' }).hasAttribute('disabled'),
    ).toBe(true);
  });
});
