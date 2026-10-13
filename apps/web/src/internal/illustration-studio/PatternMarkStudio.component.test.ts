// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PatternMarkStudio from './PatternMarkStudio.svelte';

const storageKey = 'patternverse.personal-icons.v1';
beforeEach(() => {
  localStorage.removeItem(storageKey);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.endsWith('/catalog')
          ? { token: 'fixture-token', patterns: [{ id: 'observer', title: 'Observer' }] }
          : { applied: 1 },
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.removeItem(storageKey);
});

describe('Private mark studio', () => {
  it('shows 100 sample icons, all six preview sizes and six primitive states', async () => {
    render(PatternMarkStudio);
    expect(screen.getByTestId('sample-gallery').querySelectorAll('svg')).toHaveLength(100);
    for (const size of [16, 24, 32, 48, 64, 96])
      expect(screen.getAllByText(`${size} px`).length).toBeGreaterThan(0);
    for (const name of ['Empty', 'Square', 'Top left', 'Top right', 'Bottom right', 'Bottom left'])
      expect(screen.getByRole('img', { name })).toBeTruthy();
    await fireEvent.change(screen.getByRole('combobox', { name: 'Gallery family' }), {
      target: { value: 'flow' },
    });
    const filtered = screen.getByTestId('sample-gallery').querySelectorAll('svg');
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(100);
    expect([...filtered].every((svg) => svg.getAttribute('data-icon-family') === 'flow')).toBe(
      true,
    );
    await fireEvent.change(screen.getByRole('combobox', { name: 'Gallery size' }), {
      target: { value: '16' },
    });
    expect([...filtered].every((svg) => svg.getAttribute('width') === '16')).toBe(true);
  });
  it('exports a standalone SVG through the download control', async () => {
    const createObjectURL = vi.fn<(value: Blob) => string>(() => 'blob:mark-fixture');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = revokeObjectURL;
      },
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('creative-reframing.svg');
      expect(this.href).toBe('blob:mark-fixture');
    });
    render(PatternMarkStudio);
    await fireEvent.click(screen.getByRole('button', { name: 'Export SVG' }));
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(click).toHaveBeenCalledOnce();
  });
  it('imports new IDs while preserving existing matching marks', async () => {
    const mark = {
      patternId: 'observer',
      title: 'Observer',
      generatorVersion: 1,
      variation: 3,
      rotation: 0,
    };
    localStorage.setItem(
      storageKey,
      JSON.stringify({ kind: 'patternverse-marks', version: 2, marks: [mark] }),
    );
    const { container } = render(PatternMarkStudio);
    const imported = JSON.stringify({
      kind: 'patternverse-marks',
      version: 2,
      marks: [
        { ...mark, variation: 7 },
        { ...mark, patternId: 'builder', title: 'Builder' },
      ],
    });
    await fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [{ size: imported.length, text: async () => imported }] },
    });
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Imported 1 icons'),
    );
    const stored = JSON.parse(localStorage.getItem(storageKey)!);
    expect(stored.marks).toHaveLength(2);
    expect(stored.marks[0].variation).toBe(3);
  });
  it('selects a public pattern, varies it, keeps a portable recipe and applies only on explicit action', async () => {
    render(PatternMarkStudio);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Observer' })).toBeTruthy());
    await fireEvent.change(screen.getByRole('combobox', { name: 'Pattern' }), {
      target: { value: 'observer' },
    });
    expect(
      (screen.getByRole('combobox', { name: 'Composition family' }) as HTMLSelectElement).value,
    ).toBe('');
    await fireEvent.input(screen.getByRole('spinbutton', { name: 'Variation' }), {
      target: { value: '0' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Use variation 1' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Keep this icon' }));
    const stored = JSON.parse(localStorage.getItem(storageKey)!);
    expect(stored.marks[0]).toMatchObject({ patternId: 'observer', variation: 1 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Apply to local library' }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Nothing was published'),
    );
    expect(vi.mocked(fetch).mock.calls[1][1]).toMatchObject({
      method: 'POST',
      headers: { 'X-Patternverse-Studio': 'fixture-token' },
    });
  });
  it('does not overwrite damaged stored projects and disables invalid recipes', async () => {
    localStorage.setItem(storageKey, 'damaged');
    render(PatternMarkStudio);
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('not been overwritten'),
    );
    expect(
      (screen.getByRole('button', { name: 'Keep this icon' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await fireEvent.input(screen.getByRole('textbox', { name: 'Pattern ID' }), {
      target: { value: '../escape' },
    });
    expect((screen.getByRole('button', { name: 'Export SVG' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(localStorage.getItem(storageKey)).toBe('damaged');
  });
});
