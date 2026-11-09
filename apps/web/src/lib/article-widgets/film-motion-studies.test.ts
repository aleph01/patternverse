// @vitest-environment node
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
// @ts-expect-error Test-only jsdom dependency has no bundled declarations.
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';
const directory = resolve(process.cwd(), '../../content/assets/widgets');
const files = (await readdir(directory)).filter((name) => name.startsWith('film-'));
it('bundles twelve self-contained illustrative studies', () => expect(files).toHaveLength(12));
it.each(files)('%s starts paused, supports inspection, and resets safely', async (file) => {
  const source = await readFile(resolve(directory, file), 'utf8');
  expect(source).not.toMatch(/https?:\/\/|<iframe|<script\s+src/);
  const dom = new JSDOM(source, { runScripts: 'dangerously', pretendToBeVisual: true });
  const { document, Event } = dom.window;
  const play = document.querySelector<HTMLButtonElement>('#play')!;
  const range = document.querySelector<HTMLInputElement>('input')!;
  const svg = document.querySelector('svg')!;
  expect(play.textContent).toBe('Play');
  expect(svg.getAttribute('aria-labelledby')).toBe('study-title study-desc');
  expect(svg.querySelector('desc')?.textContent).toBeTruthy();
  const first = svg.innerHTML;
  for (const value of ['250', '500', '750', '1000']) {
    range.value = value;
    range.dispatchEvent(new Event('input'));
    expect(svg.innerHTML).not.toMatch(/NaN|Infinity|undefined/);
    expect(document.querySelector('output')?.textContent).toBe(`${Number(value) / 10}%`);
  }
  expect(svg.innerHTML).not.toBe(first);
  play.click();
  expect(play.textContent).toBe('Pause');
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(Number(range.value)).toBeGreaterThan(0);
  range.value = '500';
  range.dispatchEvent(new Event('input'));
  expect(play.textContent).toBe('Play');
  document.querySelector<HTMLButtonElement>('#start')!.click();
  expect(range.value).toBe('0');
  expect(svg.innerHTML).toBe(first);
  expect(document.body.textContent).toContain('not a documented film setup');
  dom.window.close();
});
