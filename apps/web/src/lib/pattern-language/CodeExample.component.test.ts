// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
// Compile the lazy preview before interaction assertions; browser tests cover its loading.
import '$lib/pattern-editor/PatternPreview.svelte';
import CodeExample from './CodeExample.svelte';
import {
  agentExample,
  example,
  optionalExample,
  refineExample,
  semanticExample,
  suggestionExample,
  eventExample,
} from './examples';
import { exampleOptions } from './options';

vi.mock('$lib/widgets/library', () => ({
  widgetPackages: () => {
    throw new Error('Documentation examples must not read personal widget libraries.');
  },
}));

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
afterEach(cleanup);

it('runs the real question, accepts a response, and resets the temporary run', async () => {
  render(CodeExample, { filename: 'check-in.pattern.md', source: example });
  const response = await screen.findByLabelText('Your preview response');
  await fireEvent.input(response, { target: { value: 'A quieter morning' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
  await screen.findByText('You named A quieter morning. Take a moment with that.');
  await fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
  await screen.findByLabelText('Your preview response');
  expect(screen.queryByText('You named A quieter morning. Take a moment with that.')).toBeNull();
  await fireEvent.click(screen.getByRole('button', { name: 'End run' }));
  await screen.findByText('Cancelled');
  expect(screen.queryByLabelText('Your preview response')).toBeNull();
});

it('runs edited source, shows compiler errors, and recovers by resetting the example', async () => {
  render(CodeExample, { filename: 'editable.pattern.md', source: example });
  await screen.findByLabelText('Your preview response');
  await fireEvent.click(screen.getByRole('button', { name: 'Edit editable.pattern.md' }));
  const source = screen.getByLabelText('Edit editable.pattern.md source');
  await fireEvent.input(source, {
    target: {
      value: example.replace('What would you like to explore?', 'What is one useful action?'),
    },
  });
  expect(screen.getByText('Edits are waiting to run.')).toBeTruthy();
  await fireEvent.click(screen.getByRole('button', { name: 'Run changes' }));
  await screen.findByText('What is one useful action?');
  await fireEvent.input(source, { target: { value: example.replace('{{focus}}', '{{missing}}') } });
  await fireEvent.click(screen.getByRole('button', { name: 'Run changes' }));
  await screen.findByText('Check the source');
  expect(screen.queryByLabelText('Your preview response')).toBeNull();
  await fireEvent.click(screen.getByRole('button', { name: 'Reset editable.pattern.md' }));
  await screen.findByLabelText('Your preview response');
  expect(screen.queryByText('Check the source')).toBeNull();
});

it('switches explicit absent and present optional inputs without treating empty text as absence', async () => {
  render(CodeExample, {
    filename: 'optional-note.pattern.md',
    source: optionalExample,
    options: exampleOptions['optional-note.pattern.md'],
  });
  await screen.findByText('No note was supplied.');
  await fireEvent.change(screen.getByLabelText('Example input'), { target: { value: '1' } });
  await screen.findByText('Make a little space.');
  expect(screen.queryByText('No note was supplied.')).toBeNull();
});

it('uses real participant refinement controls through revision and acceptance', async () => {
  render(CodeExample, { filename: 'review-wording.pattern.md', source: refineExample });
  await fireEvent.click(await screen.findByRole('button', { name: 'Revise the wording' }));
  await fireEvent.input(await screen.findByLabelText('Your preview response'), {
    target: { value: 'I would like a quieter morning.' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
  await fireEvent.click(await screen.findByRole('button', { name: 'Keep this wording' }));
  await screen.findByText(/Wording: I would like a quieter morning\./);
  expect(screen.getByText(/Practice complete\./)).toBeTruthy();
});

it.each([
  {
    filename: 'typed-agent.pattern.md',
    source: agentExample,
    button: 'Use sample suggestion',
    result: 'Suggestion: Put a five-minute pause on your calendar.',
  },
  {
    filename: 'classify-a-message.pattern.md',
    source: semanticExample,
    button: 'Use sample: question',
    result: 'The question invites you to choose a topic.',
  },
])(
  'validates the explicit model fixture for $filename in the runtime',
  async ({ filename, source, button, result }) => {
    render(CodeExample, { filename, source, options: exampleOptions[filename] });
    await fireEvent.input(await screen.findByLabelText('Your preview response'), {
      target: { value: 'A small test topic' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
    await fireEvent.click(await screen.findByRole('button', { name: button }));
    await screen.findByText(new RegExp(result.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    expect(screen.queryByRole('alert')).toBeNull();
  },
);

it('shows both a decided ranking and an uncertain semantic result', async () => {
  render(CodeExample, {
    filename: 'semantic-suggestion.pattern.md',
    source: suggestionExample,
    options: exampleOptions['semantic-suggestion.pattern.md'],
  });
  await fireEvent.click(await screen.findByRole('button', { name: 'Use sample ranking' }));
  await waitFor(() =>
    expect(screen.getByRole('region', { name: 'Show suggestion.items' })).toBeTruthy(),
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
  await fireEvent.click(await screen.findByRole('button', { name: 'Use uncertain result' }));
  await screen.findByText('No confident suggestion is available.');
});

it('handles a side question and keeps the original question unanswered', async () => {
  render(CodeExample, { filename: 'message-handler.pattern.md', source: eventExample });
  await fireEvent.input(await screen.findByLabelText('Your preview response'), {
    target: { value: 'help' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
  await screen.findByText('Name any manageable topic. Your answer can be brief.');
  const response = await screen.findByLabelText('Your preview response');
  await fireEvent.input(response, { target: { value: 'A calmer afternoon' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
  await screen.findByText('You chose A calmer afternoon.');
});
