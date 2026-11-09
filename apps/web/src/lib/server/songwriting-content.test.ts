// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { hasErrors, loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from './markdown';
import { findPatternGraphic, isPatternGraphic } from '$lib/illustrations/pattern-graphics';

const root = resolve(process.cwd(), '../..');
const listeningIntegration = JSON.parse(
  readFileSync(resolve(root, 'docs/songwriting-course/listening-integration.json'), 'utf8'),
) as {
  articles: { number: number; id: string; heading: string; source_links: string[] }[];
};
const plan = JSON.parse(
  readFileSync(resolve(root, 'docs/songwriting-course/chapters.json'), 'utf8'),
) as {
  chapters: {
    number: number;
    part: number;
    id: string;
    type: string;
    title: string;
    situation: string;
    response: string;
    boundary: string;
    article_words: number;
    prerequisites: string[];
    helpful_before: string[];
    related_patterns: string[];
    related_pattern_notes: Record<string, string>;
    example_user_queries?: string[];
    visual: { type: string; public_path?: string; alt_text?: string; caption?: string };
  }[];
};
const examples = JSON.parse(
  readFileSync(resolve(root, 'docs/songwriting-course/examples.json'), 'utf8'),
) as {
  porch_light: {
    tempo: number;
    beats_per_bar: number;
    verse_melody: { pitch: string; duration: number }[][];
    chorus_melody: { pitch: string; duration: number }[][];
    bridge_melody: { pitch: string; duration: number }[][];
    form: { section: string; bars: number }[];
  };
  platform_three: {
    tempo: number;
    beats_per_bar: number;
    bass: { pitch: string; duration: number }[];
    form_bars: number[];
  };
};
let draft: CompiledCorpus;
let publicCorpus: CompiledCorpus;
beforeAll(async () => {
  const location = {
    manifestPath: resolve(root, 'patternverse.yaml'),
    contentDirectory: resolve(root, 'content'),
    readonly: true,
  };
  [draft, publicCorpus] = await Promise.all([
    loadAndCompileCorpus(location, { includeDrafts: true }),
    loadAndCompileCorpus(location, { includeDrafts: false }),
  ]);
}, 30_000);

describe('Unpublished songwriting course', () => {
  it('keeps the complete course available for review and out of the production corpus', () => {
    expect(hasErrors(draft.diagnostics)).toBe(false);
    expect(hasErrors(publicCorpus.diagnostics)).toBe(false);
    const course = draft.entities.filter(
      (e) => e.id.startsWith('songwriting-') || e.id === 'music',
    );
    expect(course).toHaveLength(64); // 49 chapters, 8 parts, course, 5 references, and Music.
    expect(course.every((e) => e.status === 'draft')).toBe(true);
    expect(
      publicCorpus.entities.some((e) => e.id.startsWith('songwriting-') || e.id === 'music'),
    ).toBe(false);
  });

  it('offers 49 reusable patterns in sequence without a mandatory theory prerequisite', () => {
    expect(plan.chapters.map((c) => c.number)).toEqual(Array.from({ length: 49 }, (_, i) => i + 1));
    expect(new Set(plan.chapters.map((c) => c.id)).size).toBe(49);
    const ids = new Set(plan.chapters.map((c) => c.id));
    expect(
      draft.entities.filter((e) => e.id.startsWith('songwriting-') && e.type === 'concept'),
    ).toHaveLength(0);
    for (const reference of [
      'reading-the-examples',
      'example-songbook',
      'glossary',
      'listening-guide',
      'troubleshooting',
    ]) {
      const collection = draft.entities.find((e) => e.id === `songwriting-${reference}`)!;
      expect(collection.type).toBe('collection');
      expect(collection.collectionItems.length).toBeGreaterThan(0);
      expect(collection.collectionItems.every((item) => ids.has(item.entityId))).toBe(true);
    }
    for (let part = 1; part <= 8; part += 1) {
      const collection = draft.entities.find((e) => e.id === `songwriting-part-${part}`)!;
      expect(collection.type).toBe('collection');
      if (collection.type !== 'collection') throw new Error('Expected collection');
      expect(collection.items).toEqual(
        plan.chapters.filter((c) => c.part === part).map((c) => c.id),
      );
    }
    for (const c of plan.chapters) {
      expect(c.type).toBe('pattern');
      expect(c.article_words).toBeGreaterThanOrEqual(800);
      expect(c.situation.length).toBeGreaterThan(30);
      expect(c.response.length).toBeGreaterThan(30);
      expect(c.boundary.length).toBeGreaterThan(30);
      expect(c.prerequisites).toEqual([]);
      for (const refresher of c.helpful_before) expect(ids.has(refresher)).toBe(true);
      expect(c.related_patterns).toHaveLength(2);
      for (const related of c.related_patterns) {
        expect(ids.has(related)).toBe(true);
        expect(related).not.toBe(c.id);
        expect(c.related_pattern_notes[related].length).toBeGreaterThan(20);
      }
      if (c.type === 'pattern') {
        expect(c.example_user_queries).toHaveLength(8);
        expect(new Set(c.example_user_queries).size).toBe(8);
        const graphic = findPatternGraphic(c.id)!;
        expect(isPatternGraphic(graphic)).toBe(true);
        expect(graphic.reading.length).toBeGreaterThan(35);
      }
    }
  });

  it('integrates form perspectives and topic entry points without duplicating the course inventory', () => {
    const course = draft.entities.find((e) => e.id === 'songwriting-course')!;
    const form = draft.entities.find((e) => e.id === 'songwriting-choose-a-song-form')!;
    const energy = draft.entities.find((e) => e.id === 'songwriting-shape-energy-over-time')!;
    expect(course.body).toContain('A **concept** explains a relationship');
    for (const part of [
      'songwriting-part-2',
      'songwriting-part-3',
      'songwriting-part-4',
      'songwriting-part-6',
      'songwriting-part-7',
      'songwriting-part-8',
    ])
      expect(course.links.some((link) => link.target.entityId === part)).toBe(true);
    for (const term of [
      'Sectional',
      'Developmental',
      'Process-driven',
      'Binary form',
      'Ternary form',
      'Theme and variations',
    ])
      expect(form.body).toContain(term);
    expect(energy.body).toContain('## Build by layered entry');
    expect(
      energy.links.some((link) => link.target.entityId === 'songwriting-give-each-part-a-job'),
    ).toBe(true);
    const references = draft.entities.find((e) => e.id === 'songwriting-listening-guide')!;
    expect(references.body).toContain('full structural analysis pending');
    expect(references.body).toContain('No timestamps or exact section boundaries');
  });

  it('introduces scales separately before tonal home and connects the five foundation patterns', () => {
    const foundationIds = [
      'songwriting-pitch-and-intervals',
      'songwriting-build-a-scale',
      'songwriting-scales-and-tonal-home',
      'songwriting-build-and-hear-chords',
      'songwriting-chord-families-and-numbers',
    ];
    const part = draft.entities.find((entity) => entity.id === 'songwriting-part-3')!;
    expect(part.collectionItems.slice(0, 5).map((item) => item.entityId)).toEqual(foundationIds);
    const overview = draft.entities.find((entity) => entity.id === 'songwriting-course')!;
    expect(overview.body).toContain('## Build your musical foundations');
    for (const id of foundationIds) {
      expect(overview.links.some((link) => link.target.entityId === id)).toBe(true);
    }
    const home = draft.entities.find(
      (entity) => entity.id === 'songwriting-scales-and-tonal-home',
    )!;
    expect(home.body).not.toMatch(/harmonic minor|melodic minor|D Dorian/i);
    expect(home.links.some((link) => link.target.entityId === 'songwriting-build-a-scale')).toBe(
      true,
    );
    const chords = draft.entities.find(
      (entity) => entity.id === 'songwriting-build-and-hear-chords',
    )!;
    expect(chords.body).toContain("A chord's root and a song's tonic describe different roles.");
  });

  it.each(plan.chapters)(
    'renders chapter $number with working navigation and no executable practice',
    async (c) => {
      const entity = draft.entities.find((e) => e.id === c.id)!;
      expect(entity.type).toBe(c.type);
      expect(entity.title).toBe(c.title);
      expect(entity.body).toContain(`**Use when:** ${c.situation}`);
      expect(entity.body).toContain(c.response);
      expect(entity.body).toContain(c.boundary);
      for (const related of c.related_patterns) {
        expect(entity.links.some((l) => l.target.entityId === related)).toBe(true);
      }
      expect(entity.body).not.toMatch(/patternverse-(?:language|practice|widget)/);
      expect(entity.languagePracticeSource).toBeUndefined();
      expect(entity.links.some((l) => l.target.entityId === 'songwriting-course')).toBe(true);
      if (c.number > 1) {
        expect(entity.links.some((l) => l.target.entityId === plan.chapters[c.number - 2].id)).toBe(
          true,
        );
      }
      if (c.number < plan.chapters.length) {
        expect(entity.links.some((l) => l.target.entityId === plan.chapters[c.number].id)).toBe(
          true,
        );
      }
      const html = await renderEntityMarkdown(entity, draft.entities);
      const page = new DOMParser().parseFromString(html, 'text/html');
      expect(page.querySelectorAll('h2').length).toBeGreaterThanOrEqual(3);
      expect(page.querySelectorAll('p').length).toBeGreaterThanOrEqual(10);
      expect(html).not.toContain('[[');
      expect(page.querySelector('iframe, script, audio, form')).toBeNull();
      if (c.visual.type === 'diagram') {
        const figure = page.querySelector('figure.content-diagram');
        expect(figure?.querySelector('img')?.getAttribute('alt')).toBe(c.visual.alt_text);
        expect(figure?.querySelector('figcaption')?.textContent).toContain(c.visual.caption);
        const path = resolve(root, 'apps/web/static' + c.visual.public_path);
        expect(existsSync(path)).toBe(true);
        const xml = new DOMParser().parseFromString(readFileSync(path, 'utf8'), 'image/svg+xml');
        expect(xml.querySelector('parsererror')).toBeNull();
        expect(xml.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 720 470');
        expect(xml.querySelector('title')?.textContent).toBeTruthy();
        expect(xml.querySelector('desc')?.textContent).toBeTruthy();
        expect(xml.querySelector('script, foreignObject, image, a')).toBeNull();
      }
    },
  );

  it('puts a developed, source-linked listening study inside every article', async () => {
    expect(listeningIntegration.articles.map((study) => study.id)).toEqual(
      plan.chapters.map((chapter) => chapter.id),
    );
    for (const study of listeningIntegration.articles) {
      const entity = draft.entities.find((candidate) => candidate.id === study.id)!;
      const html = await renderEntityMarkdown(entity, draft.entities);
      const page = new DOMParser().parseFromString(html, 'text/html');
      const headings = [...page.querySelectorAll('h2')].filter(
        (heading) => heading.textContent === study.heading,
      );
      expect(headings, study.id).toHaveLength(1);
      const section = page.createElement('section');
      let next = headings[0].nextElementSibling;
      while (next && next.tagName !== 'H2') {
        section.append(next.cloneNode(true));
        next = next.nextElementSibling;
      }
      expect(section.textContent!.length, study.id).toBeGreaterThan(600);
      expect(study.source_links.length, study.id).toBeGreaterThan(0);
      for (const url of study.source_links) {
        expect(new URL(url).protocol).toBe('https:');
        expect(
          [...section.querySelectorAll('a')].some((link) => link.href === url),
          url,
        ).toBe(true);
      }
      expect(section.querySelector('iframe, script, audio')).toBeNull();
      expect(section.textContent).not.toMatch(/Taylor Swift|\bCreep\b/);
    }
  });

  it('indexes every listening study in eight readable listening-guide tables', async () => {
    const guide = draft.entities.find((entity) => entity.id === 'songwriting-listening-guide')!;
    const html = await renderEntityMarkdown(guide, draft.entities);
    const page = new DOMParser().parseFromString(html, 'text/html');
    const tables = [...page.querySelectorAll('table')].filter(
      (table) => table.querySelector('thead th')?.textContent === 'Pattern',
    );
    expect(tables).toHaveLength(8);
    const rows = tables.flatMap((table) => [...table.querySelectorAll('tbody tr')]);
    expect(rows).toHaveLength(plan.chapters.length);
    for (const [index, row] of rows.entries()) {
      expect(row.querySelectorAll('td')).toHaveLength(2);
      expect(row.querySelector('a')?.getAttribute('href')).toBe(
        `/pattern/${plan.chapters[index].id}`,
      );
      expect(row.querySelector('a')?.textContent).toBe(plan.chapters[index].title);
    }
    expect(html).not.toContain('[[');
    expect(page.body.textContent).toContain('Only the three studies above');
  });

  it('accounts for every counted example bar and the complete song durations', () => {
    const song = examples.porch_light;
    for (const section of [song.verse_melody, song.chorus_melody, song.bridge_melody]) {
      for (const bar of section) {
        expect(bar.reduce((beats, note) => beats + note.duration, 0)).toBe(song.beats_per_bar);
        expect(bar.every((note) => note.duration > 0)).toBe(true);
      }
    }
    expect(song.verse_melody).toHaveLength(8);
    expect(song.chorus_melody).toHaveLength(8);
    expect(song.bridge_melody).toHaveLength(4);
    const bars = song.form.reduce((sum, section) => sum + section.bars, 0);
    expect(bars).toBe(52);
    expect((bars * song.beats_per_bar * 60) / song.tempo).toBeCloseTo(148.5714, 3);
    const instrumental = examples.platform_three;
    expect(instrumental.bass.reduce((sum, note) => sum + note.duration, 0)).toBe(4);
    expect(instrumental.form_bars.reduce((sum, length) => sum + length, 0)).toBe(32);
    expect((32 * instrumental.beats_per_bar * 60) / instrumental.tempo).toBeCloseTo(73.8462, 3);
  });

  it('renders the problem-led entry table as two columns of working pattern links', async () => {
    const overview = draft.entities.find((e) => e.id === 'songwriting-course')!;
    const html = await renderEntityMarkdown(overview, draft.entities);
    const page = new DOMParser().parseFromString(html, 'text/html');
    expect(html).not.toContain('[[');
    const table = [...page.querySelectorAll('table')].find((candidate) =>
      candidate.querySelector('thead th')?.textContent?.includes('If this is happening'),
    )!;
    expect(table.querySelectorAll('thead th')).toHaveLength(2);
    expect(table.querySelectorAll('tbody tr')).toHaveLength(8);
    for (const row of table.querySelectorAll('tbody tr')) {
      expect(row.querySelectorAll('td')).toHaveLength(2);
      expect(row.querySelectorAll('a[href^="/pattern/songwriting-"]')).toHaveLength(2);
    }
  });
});
