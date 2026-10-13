// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import PatternIcon from './PatternIcon.svelte';
import { generatePatternIcon } from './pattern-icons';
afterEach(cleanup);
describe('PatternIcon rendering', () => {
  it('renders an accessible scalable vector using only squares and exact quarter disks', () => {
    const { container } = render(PatternIcon, { slug: 'observer', title: 'Observer', size: 32 });
    const svg = screen.getByRole('img', { name: 'Observer' });
    expect(svg.getAttribute('viewBox')).toBe('0 0 72 72');
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.querySelector('title')?.textContent).toBe('Observer');
    expect(
      [...svg.querySelectorAll('path')].reduce(
        (count, path) => count + (path.getAttribute('d')!.match(/M/g) ?? []).length,
        0,
      ),
    ).toBe(generatePatternIcon('observer').cells.filter((c) => c.shape !== 'empty').length);
    expect(container.querySelector('circle,line,polygon,filter,[id]')).toBeNull();
  });
  it('omits a duplicate accessible name when used beside a pattern title', () => {
    const icon = generatePatternIcon('observer');
    const { container } = render(PatternIcon, { icon, decorative: true });
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('title')).toBeNull();
  });
});
