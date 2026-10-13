// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import { inspectSource } from './bridge';
import PatternPreview from './PatternPreview.svelte';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
afterEach(cleanup);
const source =
  ':language 1\n:title "Preview lifecycle"\nanswer = !ask {\nWhat is on your mind?\n}\nscore = !rate 0..5 {\nHow clear is your next step?\n}\n-> end';

it('keeps pinned source, history, pause/resume, and restart behavior using the real runtime', async () => {
  const result = render(PatternPreview, { source, inspection: await inspectSource(source) });
  await fireEvent.click(screen.getByRole('button', { name: 'Run preview' }));
  const answer = await screen.findByLabelText('Your preview response');
  await fireEvent.input(answer, { target: { value: 'A small test note' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  await screen.findByRole('button', { name: 'Resume' });
  expect(answer.hasAttribute('disabled')).toBe(true);
  await fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  await screen.findByRole('button', { name: 'Pause' });
  await fireEvent.input(screen.getByLabelText('Your preview response'), {
    target: { value: 'A small test note' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
  await screen.findByRole('slider');
  expect(screen.getByText('A small test note')).toBeTruthy();
  const changed = source.replace('on your mind', 'important today');
  await result.rerender({ source: changed, inspection: await inspectSource(changed) });
  expect(screen.getByText(/Source changed. Restart/)).toBeTruthy();
  expect(screen.getByText('What is on your mind?')).toBeTruthy();
  await fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
  await screen.findByText('What is important today?');
  expect(screen.queryByText('A small test note')).toBeNull();
  expect(screen.queryByText(/Source changed. Restart/)).toBeNull();
});

it('keeps a rejected step available for retry without advancing or clearing accepted history', async () => {
  render(PatternPreview, { source, inspection: await inspectSource(source) });
  await fireEvent.click(screen.getByRole('button', { name: 'Run preview' }));
  await fireEvent.input(await screen.findByLabelText('Your preview response'), {
    target: { value: 'An accepted response' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
  const slider = await screen.findByRole('slider');
  // Native range controls clamp values; bypass them to exercise runtime validation.
  slider.setAttribute('max', '100');
  await fireEvent.input(slider, { target: { value: '99' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
  await screen.findByRole('alert');
  expect(screen.getByText('An accepted response')).toBeTruthy();
  await fireEvent.input(slider, { target: { value: '3' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
  await screen.findByText(/^Practice complete\./);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('An accepted response')).toBeTruthy();
});

it('submits single, bounded multiple and ranked choices through the real runtime', async () => {
  const selections = `:language 1
!choose direction {
:option begin "Begin"
:option stop "Stop"
Where next?
}
!choose picked [multi, min=1, max=2] {
Which options?
- a: "Alpha"
- b: "Beta"
- c: "Gamma"
}
!rank ordered [from=picked] {
What order?
}
-> end`;
  render(PatternPreview, { source: selections, inspection: await inspectSource(selections) });
  await fireEvent.click(screen.getByRole('button', { name: 'Run preview' }));
  await fireEvent.click(await screen.findByRole('button', { name: 'Begin' }));
  const confirm = await screen.findByRole('button', { name: 'Continue →' });
  expect(confirm.hasAttribute('disabled')).toBe(true);
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Alpha' }));
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Beta' }));
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Gamma' }));
  expect(confirm.hasAttribute('disabled')).toBe(true);
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Gamma' }));
  await fireEvent.click(confirm);
  await fireEvent.click(await screen.findByRole('button', { name: 'Move Beta up' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Confirm order →' }));
  await screen.findByText(/^Practice complete\./);
  expect(screen.getByText('Beta → Alpha')).toBeTruthy();
});
