// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConceptGraphicStudio from './ConceptGraphicStudio.svelte';
import { PATTERN_GRAPHICS } from '../../lib/illustrations/pattern-graphics';
import { downloadText } from '../../lib/client/download';

vi.mock('../../lib/client/download', () => ({ downloadText: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Concept graphic studio', () => {
  it('shows the complete authored catalog and filters by meaning and visual relationship', async () => {
    render(ConceptGraphicStudio);
    const gallery = screen.getByRole('region', { name: 'Pattern concept gallery' });
    expect(gallery.querySelectorAll('button')).toHaveLength(PATTERN_GRAPHICS.length);
    expect(gallery.querySelectorAll('[data-icon-version="2"]')).toHaveLength(
      PATTERN_GRAPHICS.length,
    );
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'Observer' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Observer' }));
    expect(screen.getByRole('heading', { name: 'Observer' })).toBeTruthy();
    expect(screen.getByText(/changing subject sends outward/, { selector: 'p' })).toBeTruthy();
    await fireEvent.input(screen.getByRole('searchbox'), { target: { value: '' } });
    await fireEvent.change(screen.getByRole('combobox', { name: 'Visual relationship' }), {
      target: { value: 'feedback' },
    });
    expect(gallery.querySelectorAll('button')).toHaveLength(
      PATTERN_GRAPHICS.filter((g) => g.motif === 'feedback').length,
    );
    await fireEvent.change(screen.getByRole('combobox', { name: 'Gallery size' }), {
      target: { value: '32' },
    });
    expect(
      [...gallery.querySelectorAll('svg')].every((svg) => svg.getAttribute('width') === '32'),
    ).toBe(true);
  });

  it('exports the selected artwork and a reusable design brief instead of generating a new variation', async () => {
    render(ConceptGraphicStudio);
    await fireEvent.click(screen.getByRole('button', { name: 'Export SVG' }));
    expect(downloadText).toHaveBeenCalledWith(
      expect.stringContaining('viewBox="0 0 96 96"'),
      'reframing-alternative-paths.svg',
      'image/svg+xml',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Export design brief' }));
    expect(downloadText).toHaveBeenLastCalledWith(
      expect.stringContaining('Current visual mapping: Three routes share one green destination'),
      'reframing-alternative-paths-design-brief.txt',
      'text/plain',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Export collection' }));
    const project = JSON.parse(vi.mocked(downloadText).mock.calls.at(-1)![0]);
    expect(project.graphics).toHaveLength(PATTERN_GRAPHICS.length);
  });
});
