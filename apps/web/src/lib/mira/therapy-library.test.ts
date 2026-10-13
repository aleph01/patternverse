import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THERAPY_LIBRARY } from './therapy-library';

describe('public therapy library', () => {
  it('keeps readable sources identical to runnable patterns and release identities', () => {
    const root = resolve(process.cwd(), '../..');
    const catalog = JSON.parse(
      readFileSync(resolve(root, 'packages/therapy-patterns/catalog.json'), 'utf8'),
    ) as { name: string }[];
    expect(THERAPY_LIBRARY).toHaveLength(10);
    expect(new Set(THERAPY_LIBRARY.map((item) => item.id)).size).toBe(10);
    expect(THERAPY_LIBRARY.every((item) => item.modality === 'cbt' && !item.needsAi)).toBe(true);
    for (const item of THERAPY_LIBRARY) {
      const source = readFileSync(
        resolve(root, `packages/therapy-patterns/patterns/${item.id}.pattern.md`),
        'utf8',
      ).trim();
      const article = readFileSync(resolve(root, `content/patterns/${item.slug}.md`), 'utf8');
      expect(article).toContain(source);
      expect(catalog.some((entry) => entry.name === item.id)).toBe(true);
    }
  });

  it('uses the requested curated order and removes retired public content', () => {
    const root = resolve(process.cwd(), '../..');
    expect(THERAPY_LIBRARY.map((item) => item.id)).toEqual([
      'cbt.thought-record',
      'cbt.activation',
      'cbt.exposure',
      'cbt.experiment',
      'cbt.problem-solving',
      'cbt.thinking-patterns',
      'cbt.downward-arrow',
      'cbt.worry-time',
      'cbt.activity-mood',
      'cbt.graded-task',
    ]);
    const collection = readFileSync(resolve(root, 'content/collections/cbt.md'), 'utf8');
    expect(collection.match(/^ {2}- cbt-.+$/gm)?.map((line) => line.trim().slice(2))).toEqual(
      THERAPY_LIBRARY.map((item) => item.slug),
    );
    expect(existsSync(resolve(root, 'content/collections/act.md'))).toBe(false);
    expect(existsSync(resolve(root, 'content/collections/therapy-library.md'))).toBe(false);
    const files = readdirSync(resolve(root, 'content/patterns'));
    expect(files.filter((file) => file.startsWith('act-'))).toEqual([]);
    expect(files.filter((file) => file.startsWith('cbt-')).sort()).toEqual(
      THERAPY_LIBRARY.map((item) => `${item.slug}.md`).sort(),
    );
    const catalog = JSON.parse(
      readFileSync(resolve(root, 'packages/therapy-patterns/catalog.json'), 'utf8'),
    ) as { name: string }[];
    expect(catalog.filter((item) => item.name.startsWith('act.'))).toEqual([]);
    expect(catalog.filter((item) => item.name.startsWith('cbt.')).map((item) => item.name)).toEqual(
      THERAPY_LIBRARY.map((item) => item.id),
    );
    const checklist = readFileSync(
      resolve(root, 'packages/therapy-patterns/patterns/cbt.thinking-patterns.pattern.md'),
      'utf8',
    );
    for (const label of [
      'Catastrophizing',
      'Mind reading',
      'All-or-nothing thinking',
      'Overgeneralization',
      'Disqualifying or discounting the positive',
    ])
      expect(checklist).toContain(label);
  });
});
