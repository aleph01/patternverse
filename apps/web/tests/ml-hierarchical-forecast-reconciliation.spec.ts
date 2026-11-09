import { expect, test } from '@playwright/test';
test('computes hierarchical reconciliation, weighted and constrained solves, counterexamples, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-hierarchical-forecast-reconciliation');
  await expect(
    page
      .getByRole('heading', { name: 'Hierarchical Forecast Reconciliation', exact: true })
      .first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  const style = '.article-outline{visibility:hidden!important}';
  await page.screenshot({ path: info.outputPath('reconciliation-article.png'), style });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({ path: info.outputPath('reconciliation-illustration.png'), style });
  await page
    .locator('.markdown-body table')
    .first()
    .screenshot({ path: info.outputPath('reconciliation-table.png'), style });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const ex = page
      .frameLocator('iframe[title="Hierarchical forecast reconciliation explorer"]')
      .frameLocator('iframe'),
    initial = 'Total 115.7143. Largest adding-up gap 0.0000. Negative stores 0.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#objective')).toContainText('109.5238');
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#forecast-table', 'forecasts'],
  ])
    await ex
      .locator(selector)
      .screenshot({ path: info.outputPath('reconciliation-' + name + '.png'), style });
  await ex.locator('#outcome summary').click();
  await expect(ex.locator('#outcome-data')).toContainText('3.3333');
  await ex
    .locator('#outcome-table')
    .screenshot({ path: info.outputPath('reconciliation-outcome.png'), style });
  await ex.getByLabel('Reconciliation method', { exact: true }).selectOption('bottom');
  await expect(ex.locator('output')).toContainText('Total 110.0000.');
  await ex.getByLabel('Reconciliation method', { exact: true }).selectOption('diagonal');
  await ex.getByLabel('Assumed error profile', { exact: true }).selectOption('aggregates');
  const diagonal = await ex.locator('output').textContent();
  await ex.getByLabel('Reconciliation method', { exact: true }).selectOption('covariance');
  await expect(ex.locator('output')).not.toHaveText(diagonal!);
  await ex.locator('#weights summary').click();
  await expect(ex.locator('#matrix-values')).toContainText('W (squared units)');
  await ex
    .locator('#weights')
    .screenshot({ path: info.outputPath('reconciliation-weights.png'), style });
  await ex.getByLabel('Base forecasts', { exact: true }).selectOption('coherent');
  await expect(ex.locator('output')).toHaveText(
    'Total 110.0000. Largest adding-up gap 0.0000. Negative stores 0.',
  );
  await ex.getByLabel('Base forecasts', { exact: true }).selectOption('negative');
  await ex.getByLabel('Reconciliation method', { exact: true }).selectOption('ols');
  await expect(ex.locator('output')).toContainText('Negative stores 2.');
  await ex
    .locator('#mechanism')
    .screenshot({ path: info.outputPath('reconciliation-negative.png'), style });
  await ex.locator('#constraints summary').click();
  await expect(ex.locator('#gap-data')).toContainText('-10.1429');
  await ex
    .locator('#gap-table')
    .screenshot({ path: info.outputPath('reconciliation-gaps.png'), style });
  await ex.getByLabel('Allowed store forecasts', { exact: true }).selectOption('nonnegative');
  await expect(ex.locator('output')).toHaveText(
    'Total 22.5000. Largest adding-up gap 0.0000. Negative stores 0.',
  );
  await expect(ex.locator('#objective')).toContainText('939.5000');
  await expect(ex.locator('#objective')).toContainText('N1, S1');
  await ex
    .locator('#mechanism')
    .screenshot({ path: info.outputPath('reconciliation-nonnegative.png'), style });
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  for (const id of ['#constraints', '#weights', '#outcome'])
    await expect(ex.locator(id)).toHaveJSProperty('open', false);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await ex
    .locator('#mechanism')
    .screenshot({ path: info.outputPath('reconciliation-dark.png'), style });
  await page.emulateMedia({ colorScheme: 'light' });
  await ex.getByLabel('Reconciliation method', { exact: true }).selectOption('bottom');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-decisions-and-feedback');
  await expect(
    page.getByRole('link', { name: /Hierarchical Forecast Reconciliation/ }).first(),
  ).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto(
      '/assets/machine-learning/hierarchical-forecast-reconciliation' + suffix + '.svg',
    );
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
