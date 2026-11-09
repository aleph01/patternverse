// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import PatternIcon from './PatternIcon.svelte';
import { generatePatternIcon } from './pattern-icons';
import { findPatternGraphic } from './pattern-graphics';
afterEach(cleanup);
describe('PatternIcon rendering', () => {
  it('renders the authored concept graphic with an accessible title and meaning', () => {
    const { container } = render(PatternIcon, { slug: 'observer', title: 'Observer', size: 32 });
    const svg = screen.getByRole('img', { name: 'Observer' });
    expect(svg.getAttribute('viewBox')).toBe('0 0 96 96');
    expect(svg.getAttribute('data-icon-version')).toBe('2');
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.querySelector('title')?.textContent).toBe('Observer');
    expect(svg.querySelector('desc')?.textContent).toBe(findPatternGraphic('observer')?.reading);
    expect([...svg.querySelectorAll('path')].map((p) => p.getAttribute('d'))).toEqual(
      findPatternGraphic('observer')?.paths.map((p) => p.d),
    );
    expect(container.querySelector('circle,line,polygon,filter,[id]')).toBeNull();
  });
  it('keeps explicit legacy recipes renderable for archived projects', () => {
    const icon = generatePatternIcon('observer');
    const { container } = render(PatternIcon, { icon, title: 'Legacy observer' });
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 72 72');
    expect(container.querySelector('svg')?.getAttribute('data-icon-kind')).toBe('legacy-grid');
  });
  it('omits a duplicate accessible name when used beside a pattern title', () => {
    const { container } = render(PatternIcon, { slug: 'observer', decorative: true });
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('title')).toBeNull();
    expect(container.querySelector('desc')).toBeNull();
  });
});
