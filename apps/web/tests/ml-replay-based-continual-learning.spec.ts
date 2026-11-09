import { expect, test } from '@playwright/test';
test('computes continual replay updates, memory selection, controls, and resets in the article sandbox', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-replay-based-continual-learning');
  await expect(
    page.getByRole('heading', { name: 'Replay-Based Continual Learning', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  await page.screenshot({ path: info.outputPath('replay-article.png') });
  const style = '.article-outline{visibility:hidden!important}',
    preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({ path: info.outputPath('replay-illustration.png'), style });
  await page
    .locator('.markdown-body table')
    .nth(1)
    .screenshot({ path: info.outputPath('replay-table.png'), style });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const ex = page
      .frameLocator('iframe[title="Continual replay buffer explorer"]')
      .frameLocator('iframe'),
    initial = 'Update 12 of 12. Old MSE 0.0619. New MSE 0.0079.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#control')).toContainText('old MSE 0.1103');
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#buffer-table', 'buffer'],
  ])
    await ex
      .locator(selector)
      .screenshot({ path: info.outputPath('replay-' + name + '.png'), style });
  await ex.getByRole('button', { name: 'Show start', exact: true }).click();
  await expect(ex.locator('output')).toHaveText('Update 0 of 12. Old MSE 0.0000. New MSE 1.0000.');
  await expect(ex.getByRole('button', { name: 'Previous update', exact: true })).toBeDisabled();
  await ex.getByRole('button', { name: 'Next update', exact: true }).click();
  await expect(ex.locator('output')).toHaveText('Update 1 of 12. Old MSE 0.0156. New MSE 0.3906.');
  await ex.locator('#gradient summary').click();
  await expect(ex.locator('#step-values')).toContainText('(1.1250, -0.8750, 0.1250)');
  await ex.locator('#gradient').screenshot({ path: info.outputPath('replay-gradient.png'), style });
  await ex.getByRole('button', { name: 'Previous update', exact: true }).click();
  const slider = ex.getByLabel('Inspect update', { exact: true });
  await slider.press('Home');
  for (let i = 0; i < 4; i++) await slider.press('ArrowRight');
  await expect(ex.locator('output')).toContainText('Update 4 of 12');
  await ex.getByRole('button', { name: 'Show final', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await ex.getByLabel('Memory selection policy', { exact: true }).selectOption('fifo');
  await expect(ex.locator('#buffer-data')).not.toContainText('A');
  await ex.locator('#mechanism').screenshot({ path: info.outputPath('replay-fifo.png'), style });
  await ex.getByLabel('Historical memory slots', { exact: true }).selectOption('2');
  await ex.getByLabel('Memory selection policy', { exact: true }).selectOption('reservoir');
  await ex.getByLabel('Reservoir illustration seed', { exact: true }).selectOption('19');
  await expect(ex.locator('#buffer-data')).toContainText('B3');
  await expect(ex.locator('#buffer-data')).not.toContainText('A');
  await expect(ex.locator('#coverage')).toContainText('42.86%');
  await ex.getByLabel('Replay weight ρ', { exact: true }).selectOption('0.75');
  await ex.getByLabel('New-cohort updates', { exact: true }).selectOption('4');
  await expect(ex.locator('output')).toContainText('Update 4 of 4');
  await ex.getByLabel('Historical memory slots', { exact: true }).selectOption('0');
  await expect(ex.locator('#control')).toContainText('Effective replay weight 0.');
  await expect(ex.locator('#buffer-data')).toContainText('No retained records.');
  await ex.locator('#data summary').click();
  await ex.locator('#data-table').screenshot({ path: info.outputPath('replay-data.png'), style });
  await ex.locator('#history summary').click();
  await expect(ex.locator('#history-data tr')).toHaveCount(5);
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  for (const id of ['#data', '#gradient', '#history'])
    await expect(ex.locator(id)).toHaveJSProperty('open', false);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await ex.locator('#mechanism').screenshot({ path: info.outputPath('replay-dark.png'), style });
  await page.emulateMedia({ colorScheme: 'light' });
  await ex.getByLabel('Historical memory slots', { exact: true }).selectOption('0');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-learning-and-adaptation');
  await expect(
    page.getByRole('link', { name: /Replay-Based Continual Learning/ }).first(),
  ).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/replay-based-continual-learning' + suffix + '.svg');
    const outside = await page
      .locator('svg')
      .first()
      .evaluate((svg) => {
        const root = svg as SVGSVGElement,
          limit = root.viewBox.baseVal;
        return [...root.querySelectorAll('text')].flatMap((label) => {
          const b = label.getBBox(),
            m = label.getCTM()!;
          return [
            [b.x, b.y],
            [b.x + b.width, b.y + b.height],
          ].some(([x, y]) => {
            const p = root.createSVGPoint();
            p.x = x;
            p.y = y;
            const q = p.matrixTransform(m);
            return q.x < -1 || q.y < -1 || q.x > limit.width + 1 || q.y > limit.height + 1;
          })
            ? [label.textContent]
            : [];
        });
      });
    expect(outside).toEqual([]);
  }
});
