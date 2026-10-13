// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import HeroTileArtwork from './HeroTileArtwork.svelte';
import { HERO_TILE_SIZE, heroLandscape, heroPortrait } from './hero-tiles';

afterEach(cleanup);

describe('Homepage tiled artwork', () => {
  it.each([heroLandscape, heroPortrait])(
    'keeps authored native geometry inside its canvas',
    (art) => {
      expect(art.tiles.length).toBeGreaterThan(30);
      expect(new Set(art.tiles.map((tile) => `${tile.x}:${tile.y}`)).size).toBe(art.tiles.length);
      for (const tile of art.tiles) {
        expect(tile.x % HERO_TILE_SIZE).toBe(0);
        expect(tile.y % HERO_TILE_SIZE).toBe(0);
        expect(tile.x + HERO_TILE_SIZE).toBeLessThanOrEqual(art.width);
        expect(tile.y + HERO_TILE_SIZE).toBeLessThanOrEqual(art.height);
        expect(tile.path).toMatch(/^(M.*A(24 24|12 12)|M.*h24)/);
      }
      for (const tone of ['green', 'purple']) {
        expect(art.tiles.some((tile) => tile.tone === tone)).toBe(true);
        expect(art.birds.some((bird) => bird.tone === tone)).toBe(true);
      }
      const accents = art.tiles.filter((tile) => ['green', 'purple'].includes(tile.tone));
      expect(accents.length / art.tiles.length).toBeLessThan(0.1);
    },
  );

  it('recomposes the flock for mobile without images, glyphs, motion or SVG IDs', () => {
    const { container } = render(HeroTileArtwork);
    expect(container.querySelector('.tile-artwork')?.getAttribute('aria-hidden')).toBe('true');
    const views = [...container.querySelectorAll('svg')];
    expect(views.map((view) => view.getAttribute('viewBox'))).toEqual([
      '0 0 960 640',
      '0 0 480 880',
    ]);
    views.forEach((view, index) => {
      const art = [heroLandscape, heroPortrait][index]!;
      expect(view.querySelectorAll('path')).toHaveLength(art.tiles.length + art.birds.length * 2);
      expect(view.querySelectorAll('[data-bird]')).toHaveLength(art.birds.length);
      expect(view.getAttribute('preserveAspectRatio')).toBe('xMaxYMax meet');
      expect(view.getAttribute('focusable')).toBe('false');
    });
    expect(views[0]!.innerHTML).not.toBe(views[1]!.innerHTML);
    expect(
      container.querySelector('image,text,foreignObject,filter,[id],[data-letter],animate'),
    ).toBeNull();
  });
});
