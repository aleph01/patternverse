import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = new URL('../../app.css', import.meta.url);
const source = readFileSync(root, 'utf8');
const imports = [...source.matchAll(/@import\s+'([^']+)';/g)].map((match) => match[1]!);

describe('website stylesheet composition', () => {
  it('has a single import-only composition root without duplicated stylesheets', () => {
    expect(
      source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/@import\s+'[^']+';/g, '')
        .trim(),
    ).toBe('');
    expect(imports.length).toBeGreaterThan(1);
    expect(new Set(imports).size).toBe(imports.length);
  });

  it('keeps foundations before feature bases and compatibility overrides last', () => {
    expect(imports.slice(0, 2)).toEqual(['./lib/styles/tokens.css', './lib/styles/site.css']);
    const before = (base: string, override: string) => {
      expect(imports.indexOf(base)).toBeGreaterThanOrEqual(0);
      expect(imports.indexOf(override)).toBeGreaterThan(imports.indexOf(base));
    };
    for (const feature of [
      'home',
      'library',
      'workspace',
      'editor',
      'article',
      'practice',
      'about',
    ]) {
      before(`./lib/styles/features/${feature}.css`, './lib/styles/responsive-compatibility.css');
    }
    before('./lib/styles/features/home.css', './lib/styles/features/home-responsive.css');
    expect(imports.at(-1)).toBe('./lib/styles/reduced-motion.css');
  });

  it('resolves nonempty leaf modules without hidden imports or rebased asset URLs', () => {
    for (const path of imports) {
      const module = new URL(path, root);
      expect(fileURLToPath(module)).toContain('/src/lib/');
      const css = readFileSync(module, 'utf8');
      expect(css.trim(), path).not.toBe('');
      expect(css, path).not.toMatch(/@import\b/);
      // Relative assets would need rebasing when moved; none exist in these bases.
      expect(css, path).not.toMatch(/url\(/);
    }
  });

  it('retains the global Mira base and leaves its route-owned override in the route', () => {
    expect(imports).toContain('./lib/mira/base.css');
    expect(imports).not.toContain('./lib/mira/workspace.css');
    const route = readFileSync(new URL('../../routes/mira/+page.svelte', import.meta.url), 'utf8');
    expect(route).toContain("import '$lib/mira/workspace.css'");
    const base = readFileSync(new URL('../mira/base.css', import.meta.url), 'utf8');
    expect(base).toContain('.mira-app');
    expect(base).toContain('@media (max-width: 760px)');
  });
});
