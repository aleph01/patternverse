import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findPatternGraphic, isPatternGraphic, patternGraphicForPattern } from './pattern-graphics';

const metadata = JSON.parse(
  readFileSync(
    new URL('../../../../../docs/pattern-packages/photography.json', import.meta.url),
    'utf8',
  ),
) as { patterns: { id: string; title: string; short_description: string }[] };

describe('Photography concept graphics', () => {
  it.each(metadata.patterns)('assigns authored, explained artwork to $title', (article) => {
    const graphic = findPatternGraphic(article.id);
    expect(graphic).toBeDefined();
    expect(patternGraphicForPattern(article.id)).toBe(graphic);
    expect(isPatternGraphic(graphic)).toBe(true);
    expect(graphic?.title).toBe(article.title);
    expect(graphic?.mechanism).toBe(article.short_description);
    expect(graphic?.reading.length).toBeGreaterThan(35);
    expect(graphic?.motif).not.toBe('unassigned');
  });

  it('gives all 30 patterns distinct compositions', () => {
    const compositions = metadata.patterns.map((article) =>
      JSON.stringify(findPatternGraphic(article.id)?.paths),
    );
    expect(compositions).toHaveLength(30);
    expect(new Set(compositions).size).toBe(30);
  });
});
