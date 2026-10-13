// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { generateIllustration, illustrationSvg } from '$lib/illustrations/generator';
import Studio from './Studio.svelte';
import PatternMarkStudio from './PatternMarkStudio.svelte';

const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:studio-download');
let filename = '';

beforeEach(() => {
  filename = '';
  localStorage.clear();
  createObjectURL.mockClear();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = vi.fn();
    },
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ token: 'fixture', patterns: [] }) })),
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filename = this.download;
    expect(this.isConnected).toBe(true);
  });
  const timer = setTimeout(() => {}, 0);
  clearTimeout(timer);
  vi.spyOn(window, 'setTimeout').mockReturnValue(timer);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

async function downloadedText(): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(createObjectURL.mock.calls[0][0]);
  });
}

it('exports the exact existing illustration SVG and keeps its variation filename and MIME type', async () => {
  render(Studio);
  await fireEvent.input(screen.getByLabelText('Title', { exact: false }), {
    target: { value: 'A quiet illustration' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'New variation' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Download SVG' }));
  expect(filename).toBe('patternverse-reframe-2.svg');
  expect(createObjectURL.mock.calls[0][0].type).toBe('image/svg+xml;charset=utf-8');
  expect(await downloadedText()).toBe(
    illustrationSvg(
      generateIllustration('reframe', 'mint', 'landscape', 2),
      'A quiet illustration',
    ),
  );
  expect(screen.getByRole('status').textContent).toContain('SVG downloaded.');
  expect(document.querySelectorAll('a[download]')).toHaveLength(0);
});

it('exports the existing portable icon project JSON without applying or publishing it', async () => {
  render(PatternMarkStudio);
  await fireEvent.click(screen.getByRole('button', { name: 'Keep this icon' }));
  const stored = JSON.parse(localStorage.getItem('patternverse.personal-icons.v1')!);
  await fireEvent.click(screen.getByRole('button', { name: 'Export project' }));
  expect(filename).toBe('patternverse-icons.json');
  expect(createObjectURL.mock.calls[0][0].type).toBe('application/json');
  expect(await downloadedText()).toBe(JSON.stringify(stored, null, 2));
  expect(vi.mocked(fetch).mock.calls.every(([, init]) => !init || init.method !== 'POST')).toBe(
    true,
  );
  expect(document.querySelectorAll('a[download]')).toHaveLength(0);
});
