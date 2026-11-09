// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import { inspectSource } from '$lib/pattern-editor/bridge';
import PatternLanguage from './+page.svelte';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
afterEach(cleanup);

it('highlights documentation examples and copies their exact source', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  try {
    render(PatternLanguage);
    const source = `:language 1
:title "A small check-in"

focus = !ask {
    What would you like to explore?
}

!show {
    You named {{focus}}. Take a moment with that.
}

-> end`;
    const example = screen.getByRole('region', { name: 'a-small-check-in.pattern.md source' });
    expect(example.querySelector('code')?.textContent).toBe(source);
    expect(example.querySelector('.token-metadata')?.textContent).toBe(':language');
    expect(example.querySelector('.token-string')?.textContent).toBe('"A small check-in"');
    expect(example.querySelector('.token-directive')?.textContent).toBe('focus =');
    expect(example.querySelector('.token-reference')?.textContent).toBe('{{focus}}');
    expect(example.getAttribute('tabindex')).toBe('0');
    const timer = screen.getByRole('region', { name: 'timed-reflection.pattern.md source' });
    expect(timer.querySelector('.token-directive')?.textContent).toBe('reflection =');
    expect(timer.querySelector('code')?.textContent).toContain(
      '        :blocking true\n        :sticky false',
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Copy a-small-check-in.pattern.md' }));
    expect(writeText).toHaveBeenCalledWith(source);
    expect(screen.getByText('Copied')).toBeTruthy();
  } finally {
    vi.unstubAllGlobals();
  }
});

it('compiles every complete documentation example with the shipped Rust engine', async () => {
  const { container } = render(PatternLanguage);
  const examples = container.querySelectorAll('.source-example[data-runnable="true"]');
  expect(examples.length).toBeGreaterThan(20);
  for (const example of examples) {
    const filename = example.querySelector('figcaption > span')!.textContent!;
    const inspection = await inspectSource(example.querySelector('code')!.textContent!, {
      isolated: true,
    });
    expect(
      inspection.diagnostics.filter(({ severity }) => severity === 'Error'),
      filename,
    ).toEqual([]);
    expect(inspection.structure, filename).toBeTruthy();
  }
});

it('links every contents entry to its reference section in reading order', () => {
  const { container } = render(PatternLanguage);
  const links = [...container.querySelectorAll('.desktop-contents a')];
  const headings = [...container.querySelectorAll('.docs-intro, .docs-article > section')];
  expect(links.map((link) => link.getAttribute('href'))).toEqual(
    headings.map((heading) => `#${heading.id}`),
  );
});
