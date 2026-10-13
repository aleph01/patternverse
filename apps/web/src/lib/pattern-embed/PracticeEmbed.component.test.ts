// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, expect, it } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/svelte';
import { parseLanguagePracticeFromBody } from '@patternverse/compiler/practice';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import PracticeEmbed from './PracticeEmbed.svelte';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
const source = parseLanguagePracticeFromBody(
  readFileSync(
    resolve(
      process.cwd(),
      '../../content/patterns/define-the-decision-before-comparing-options.md',
    ),
    'utf8',
  ),
).source!;

it('hands off the checkpoint between isolated views and keeps earlier answers visible', async () => {
  let checkpoint = '';
  render(PracticeEmbed, {
    source,
    title: 'Define the Decision',
    oncheckpoint: (saved) => (checkpoint = saved),
  });
  await fireEvent.input(
    await screen.findByLabelText('How are you currently phrasing the decision?'),
    {
      target: { value: 'Should we rewrite the app?' },
    },
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Continue ↓' }));
  await screen.findByRole('heading', { name: 'Clarify the outcome' });
  await waitFor(() => expect(checkpoint).not.toBe(''));
  cleanup();
  render(PracticeEmbed, { source, title: 'Define the Decision', checkpoint });
  await screen.findByRole('heading', { name: 'Clarify the outcome' });
  expect(screen.getByText('Should we rewrite the app?', { exact: true })).toBeTruthy();
  await fireEvent.input(screen.getByLabelText('What problem are you trying to solve?'), {
    target: { value: 'Reduce maintenance' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Continue ↓' }));
  expect(screen.queryByRole('heading', { name: 'Separate facts from assumptions' })).toBeNull();
  await fireEvent.input(screen.getByLabelText('What would a good outcome give you?'), {
    target: { value: 'Simpler boundaries' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Continue ↓' }));
  await screen.findByRole('heading', { name: 'Separate facts from assumptions' });
  await fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
  await screen.findByLabelText('How are you currently phrasing the decision?');
  expect(screen.queryByText('Simpler boundaries')).toBeNull();
  cleanup();
});

it('does not silently restart or accept an invalid transferred checkpoint', async () => {
  render(PracticeEmbed, { source, title: 'Define the Decision', checkpoint: '{}' });
  await screen.findByRole('alert');
  expect(screen.queryByLabelText('How are you currently phrasing the decision?')).toBeNull();
  cleanup();
});

it('confirms single-line responses with Enter without native form submission', async () => {
  render(PracticeEmbed, {
    source: source.replace(':multiline true', ':multiline false'),
    title: 'Define the Decision',
  });
  const input = await screen.findByLabelText('How are you currently phrasing the decision?');
  expect(input.tagName).toBe('INPUT');
  await fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.queryByRole('heading', { name: 'Clarify the outcome' })).toBeNull();
  await fireEvent.input(input, { target: { value: 'Should we rewrite the app?' } });
  await fireEvent.keyDown(input, { key: 'Enter' });
  await screen.findByRole('heading', { name: 'Clarify the outcome' });
  cleanup();
});
