import { expect, test } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { selectLibraryCategory } from './helpers/library';

// This course is deliberately absent from the normal public-build test server.
test.skip(
  !process.env.SONGWRITING_DRAFT_REVIEW,
  'Run with playwright.songwriting.config.ts for local draft review.',
);

test('course contents lead through a part and between adjacent chapters', async ({ page }) => {
  await page.goto('/collection/songwriting-course');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'From First Idea to Finished Song',
  );
  await expect(page.locator('.draft-label')).toBeVisible();
  const article = page.locator('.entity-article');
  await article.getByRole('link', { name: 'Start Making Songs', exact: true }).click();
  await expect(page).toHaveURL(/\/collection\/songwriting-part-1$/);
  await page
    .locator('.entity-article')
    .getByRole('link', { name: "Protect the Song's Identity", exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Protect the Song's Identity");
  await page.getByRole('link', { name: 'Next: Begin with What You Have', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Begin with What You Have');
  await expect(page.locator('.entity-article iframe, .entity-article form')).toHaveCount(0);
});

test('beginner foundations connect distances, scale construction, tonal home, and chords', async ({
  page,
}, info) => {
  await page.goto('/collection/songwriting-course');
  await expect(
    page.getByRole('heading', { name: 'Build your musical foundations', exact: true }),
  ).toBeVisible();
  await page
    .locator('.entity-article')
    .getByRole('link', { name: 'Build a Scale from Steps', exact: true })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build a Scale from Steps');
  const player = page.getByRole('region', { name: 'Musical example player' });
  await expect(player.getByLabel('Musical example', { exact: true })).toHaveValue(
    'foundation-major-scales',
  );
  await expect(player).toContainText('the whole- and half-step shape stays the same');
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await player
    .getByLabel('Musical example', { exact: true })
    .selectOption('foundation-scale-color');
  await expect(player).toContainText('Natural minor lowers E, A, and B');
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('[data-playback]')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  const diagram = page.locator('figure.content-diagram img').first();
  await expect(diagram).toHaveJSProperty('complete', true);
  expect(await diagram.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(720);
  await diagram.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('foundation-scale.png') });
  await page.getByRole('link', { name: 'Next: Establish a Tonal Home', exact: true }).click();
  await expect(player.getByLabel('Musical example', { exact: true })).toHaveValue(
    'foundation-home-c',
  );
  await player.getByLabel('Musical example', { exact: true }).selectOption('foundation-home-a');
  await expect(player).toContainText('A sustained A bass');
  await page.getByRole('link', { name: 'Next: Choose Chords by Their Notes', exact: true }).click();
  await expect(player.getByLabel('Musical example', { exact: true })).toHaveValue(
    'foundation-chord-notes',
  );
  await expect(page.locator('.entity-article')).toContainText(
    "A chord's root and a song's tonic describe different roles.",
  );
  await page.getByRole('link', { name: 'Next: Think in Chord Numbers', exact: true }).click();
  await expect(page.locator('details.chord-editor[open]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

for (const [type, id, title] of [
  ['pattern', 'songwriting-circle-of-fifths', 'Transpose the Song to Fit the Voice'],
  ['pattern', 'songwriting-write-through-images', 'Write Through Images'],
  ['pattern', 'songwriting-choose-a-song-form', 'Choose a Form That Serves the Song'],
] as const) {
  test(`illustrated chapter: ${title}`, async ({ page }, info) => {
    await page.goto(`/${type}/${id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    const figure = page.locator('figure.content-diagram').first();
    await expect(figure).toBeVisible();
    await expect(figure.locator('img')).toHaveJSProperty('complete', true);
    expect(await figure.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(
      720,
    );
    const broken = page.locator('.entity-article a').filter({ hasText: '[[' });
    await expect(broken).toHaveCount(0);
    await figure.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${id}.png`), fullPage: false });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('supporting examples and glossary remain readable and linked', async ({ page }) => {
  await page.goto('/collection/songwriting-example-songbook');
  await expect(page.getByRole('heading', { name: 'Complete lyric', exact: true })).toBeVisible();
  await expect(page.locator('.entity-article')).toContainText('52 bars');
  await expect(page.locator('.entity-article')).toContainText('Platform Three');
  await page
    .locator('.entity-article')
    .getByRole('link', { name: 'Glossary', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Songwriting Glossary');
  await expect(page.locator('.entity-article')).toContainText('Tonicization');
});

test('former concept links redirect to patterns and reference collections', async ({
  page,
}, info) => {
  await page.goto('/concept/songwriting-circle-of-fifths');
  await expect(page).toHaveURL(/\/pattern\/songwriting-circle-of-fifths$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Transpose the Song to Fit the Voice',
  );
  await expect(page.locator('.entity-article')).toContainText('Use when:');
  await expect(page.getByRole('heading', { name: 'The move', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', {
      name:
        info.project.name === 'phone'
          ? 'Browse Part 3: Notes, Keys, and Chords, 6 of 7'
          : 'Part 3: Notes, Keys, and Chords',
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('/concept/songwriting-glossary');
  await expect(page).toHaveURL(/\/collection\/songwriting-glossary$/);
  await expect(page.locator('.entity-article')).toContainText('Reference collection');
  await page.goto(
    '/concept/songwriting-chord-families-and-numbers?collection=commons%3Asongwriting-glossary',
  );
  await expect(page).toHaveURL(
    /\/pattern\/songwriting-chord-families-and-numbers\?collection=commons%3Asongwriting-glossary$/,
  );
  await expect(
    page.getByRole('button', {
      name:
        info.project.name === 'phone'
          ? 'Browse Songwriting Glossary, 7 of 12'
          : 'Songwriting Glossary',
      exact: true,
    }),
  ).toBeVisible();
});

test('Music library exposes reusable patterns and a problem-led course route', async ({ page }) => {
  await page.goto('/library?verse=commons%3Amusic');
  await selectLibraryCategory(page, 'Patterns');
  const results = page.locator('#library .pattern-feed');
  await expect(results.locator('a[href^="/concept/"]')).toHaveCount(0);
  await expect(results.locator('a[href^="/pattern/songwriting-"]').first()).toBeVisible();
  await page.goto('/collection/songwriting-course');
  await expect(
    page.getByRole('heading', { name: 'Start with the problem in your song', exact: true }),
  ).toBeVisible();
  const problemTable = page.locator('.entity-article table').first();
  await expect(problemTable).not.toContainText('[[');
  await problemTable.getByRole('link', { name: 'Think in Chord Numbers', exact: true }).click();
  await expect(page).toHaveURL(/\/pattern\/songwriting-chord-families-and-numbers$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Think in Chord Numbers');
  await expect(page.locator('details.chord-editor[open]')).toBeVisible();
});

test('all authored diagrams have contained labels in light and dark', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'Phone article scrolling is covered above.');
  await page.setViewportSize({ width: 720, height: 470 });
  const files = readdirSync(new URL('../static/diagrams/songwriting/', import.meta.url)).filter(
    (name) => name.endsWith('.svg'),
  );
  expect(files).toHaveLength(17);
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    for (const file of files) {
      await page.goto(`/diagrams/songwriting/${file}`);
      await expect(page.locator('svg')).toHaveAttribute('viewBox', '0 0 720 470');
      const outside = await page.locator('svg text').evaluateAll((labels) =>
        labels
          .filter((label) => {
            const bounds = (label as SVGGraphicsElement).getBBox();
            return (
              bounds.x < 0 ||
              bounds.y < 0 ||
              bounds.x + bounds.width > 720 ||
              bounds.y + bounds.height > 470
            );
          })
          .map((label) => label.textContent),
      );
      expect(outside, file).toEqual([]);
      const overlaps = await page.locator('svg text').evaluateAll((labels) => {
        const conflicts: string[] = [];
        for (let a = 0; a < labels.length; a += 1) {
          const first = (labels[a] as SVGGraphicsElement).getBBox();
          for (let b = a + 1; b < labels.length; b += 1) {
            const second = (labels[b] as SVGGraphicsElement).getBBox();
            const width =
              Math.min(first.x + first.width, second.x + second.width) -
              Math.max(first.x, second.x);
            const height =
              Math.min(first.y + first.height, second.y + second.height) -
              Math.max(first.y, second.y);
            if (width > 1 && height > 1)
              conflicts.push(`${labels[a].textContent} / ${labels[b].textContent}`);
          }
        }
        return conflicts;
      });
      expect(overlaps, file).toEqual([]);
      await page.screenshot({ path: info.outputPath(`diagrams-${colorScheme}/${file}.png`) });
    }
  }
});
