import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const collectionGroups = JSON.parse(
  readFileSync(
    new URL('../../../docs/pattern-packages/data-visualization.json', import.meta.url),
    'utf8',
  ),
).collections as { id: string; title: string; items: string[] }[];
import { lessonManifest } from '../src/lib/article-widgets/dataviz/lesson-manifest';
import { expansionManifest } from '../src/lib/article-widgets/dataviz/expansion-manifest';

for (const lesson of [...lessonManifest, ...expansionManifest]) {
  test(`${lesson.title}: controls, recorded data, labels, and reset`, async ({ page }, info) => {
    await page.goto(`/pattern/dataviz-${lesson.id}`);
    await expect(
      page.getByRole('heading', { name: lesson.title, exact: true }).first(),
    ).toBeVisible();
    const outer = page.locator(`iframe[title="${lesson.title} explorer"]`);
    const example = page
      .frameLocator(`iframe[title="${lesson.title} explorer"]`)
      .frameLocator('iframe');
    const graphics = example.locator('#panels svg');
    await expect(graphics.first()).toHaveAttribute('data-mode', lesson.modes[0][0]);
    const recorded = await example.locator('table').textContent();

    const positionControls = async () => {
      await expect
        .poll(async () =>
          Math.abs(
            Number(await outer.getAttribute('height')) -
              (await example.locator('body').evaluate((body) => body.scrollHeight)),
          ),
        )
        .toBeLessThan(4);
      await outer.evaluate((element) =>
        window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 160),
      );
    };
    for (const [mode, label] of lesson.modes) {
      await positionControls();
      await example.getByRole('radio', { name: label, exact: true }).check();
      await expect(graphics.first()).toHaveAttribute('data-mode', mode);
      await expect(example.locator('#readout')).not.toBeEmpty();
      expect(await example.locator('table').textContent()).toBe(recorded);
      const clipped = await graphics.locator('text').evaluateAll((nodes) =>
        nodes
          .filter((node) => {
            const svg = node.closest('svg')!,
              bounds = svg.getBoundingClientRect(),
              box = node.getBoundingClientRect();
            return (
              box.left < bounds.left - 1 ||
              box.right > bounds.right + 1 ||
              box.top < bounds.top - 1 ||
              box.bottom > bounds.bottom + 1
            );
          })
          .map((node) => node.textContent),
      );
      expect(clipped, `${lesson.id} ${mode}: clipped SVG labels`).toEqual([]);
      expect(
        await example
          .locator('body')
          .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBe(true);
      if (lesson.id === 'preserve-meaningful-geography' && mode === 'map') {
        const regions = graphics.locator('g[aria-label="geo"]');
        await expect(regions.locator('path')).toHaveCount(6);
        const bounds = (await regions.boundingBox())!;
        expect(bounds.height).toBeGreaterThan(200);
        expect(bounds.width).toBeGreaterThan(150);
      }
      if (lesson.id === 'small-multiples')
        await expect(graphics).toHaveCount(mode === 'multiples' ? 3 : 1);
      if (lesson.id === 'provide-an-equivalent-text-account') {
        if (mode === 'account')
          await expect(
            example.getByRole('heading', { name: 'Text account', exact: true }),
          ).toBeVisible();
        else await expect(example.locator('#text-account')).toBeHidden();
      }
    }
    if ('controls' in lesson) {
      for (const control of lesson.controls) {
        const input = example.locator(`#control-${control.key}`);
        if (control.type === 'range') {
          await input.focus();
          await input.press('Home');
          await input.press('End');
          await expect(input).toHaveValue(String(control.max));
        } else {
          await input.selectOption(control.options.at(-1)![0]);
        }
        await expect(example.locator('#readout')).not.toBeEmpty();
        expect(await example.locator('table').textContent()).toBe(recorded);
      }
    }
    if (lesson.id === 'redundant-coding') {
      await example.getByRole('checkbox', { name: 'View in grayscale', exact: true }).check();
      await expect(example.locator('#panels')).toHaveCSS('filter', 'grayscale(1)');
      await expect(example.locator('#key')).toContainText('△West');
    }
    await positionControls();
    await example.locator('summary').click();
    await expect(example.getByRole('table')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath(`${lesson.id}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Reset example', exact: true }).click();
    await expect(graphics.first()).toHaveAttribute('data-mode', lesson.modes[0][0]);
    await expect(example.locator('details')).not.toHaveAttribute('open', '');
    if ('controls' in lesson)
      for (const control of lesson.controls)
        await expect(example.locator(`#control-${control.key}`)).toHaveValue(String(control.value));
    if (lesson.id === 'redundant-coding')
      await expect(example.getByRole('checkbox')).not.toBeChecked();
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(example.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });
}

test('the collection groups all 38 lessons without repeated description links and a bundled lesson survives an offline reload', async ({
  page,
  context,
}, info) => {
  await page.goto('/collection/data-visualization-patterns');
  await expect(page.getByRole('article').locator('a')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Comparison & Scale/ }).last()).toBeVisible();
  await page.screenshot({ path: info.outputPath('collections.png'), fullPage: true });
  for (const group of collectionGroups) {
    await page.goto('/collection/data-visualization-patterns');
    await page
      .getByRole('link', { name: new RegExp(group.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      .last()
      .click();
    await expect(page).toHaveURL(new RegExp(`/collection/${group.id}`));
    await expect(
      page.getByRole('heading', { name: group.title, exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByRole('article').locator('a')).toHaveCount(0);
    for (const id of group.items)
      await expect(page.locator(`a[href^="/pattern/${id}?"]`).first()).toBeVisible();
  }
  await page.goto('/pattern/dataviz-show-uncertainty');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await page.reload();
  const example = page
    .frameLocator('iframe[title="Show Uncertainty explorer"]')
    .frameLocator('iframe');
  await expect(example.locator('svg')).toHaveAttribute('data-mode', 'estimates');
  await context.setOffline(true);
  await page.reload();
  await expect(example.locator('svg')).toHaveAttribute('data-mode', 'estimates');
  await example.getByText('95% intervals', { exact: true }).click();
  await expect(example.locator('svg')).toHaveAttribute('data-mode', 'intervals');
  await expect(example.locator('#readout')).toContainText('39.7–89.2%');
});
