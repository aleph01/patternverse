import { expect, test } from '@playwright/test';
test('fits objectives and mixture projections in the article sandbox and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-worst-group-optimization');
  await expect(
    page.getByRole('heading', { name: 'Worst-Group Optimization', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  await page.screenshot({ path: info.outputPath('worst-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('worst-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await page
    .locator('.markdown-body table')
    .nth(1)
    .screenshot({
      path: info.outputPath('worst-article-table.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Worst-group objective explorer"]')
    .frameLocator('iframe');
  const initial = 'Worst group. Prediction 6.25 min. Mean MSE 1.5625. Worst MSE 1.5625.';
  await expect(example.locator('output')).toHaveText(initial);
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#fits-table', 'fits'],
    ['#group-table', 'groups'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('worst-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await expect(example.locator('#fits-data tr')).toHaveCount(3);
  await expect(example.locator('#fits-data tr').first()).toContainText('4.2400');
  await example.getByLabel('Selected training objective', { exact: true }).selectOption('erm');
  await expect(example.locator('output')).toHaveText(
    'Average. Prediction 5.20 min. Mean MSE 0.4600. Worst MSE 4.2400.',
  );
  await expect(example.locator('#projection')).toContainText('3.4000');
  await example.getByLabel('Hypothetical group B share', { exact: true }).selectOption('0.1');
  await expect(example.locator('#projection')).toContainText('0.4600');
  await expect(example.locator('output')).toContainText('Prediction 5.20');
  await example.getByLabel('Group B training records', { exact: true }).selectOption('50');
  await expect(example.locator('output')).toContainText('Prediction 6.00');
  await example.getByLabel('Group B spread around 7 minutes', { exact: true }).selectOption('3');
  await example.getByLabel('Selected training objective', { exact: true }).selectOption('worst');
  await expect(example.locator('output')).toContainText('Prediction 7.00');
  await expect(example.locator('output')).toContainText('Worst MSE 9.0000');
  await expect(example.locator('#group-data tr').first()).toContainText('4.0000');
  await example.locator('#data summary').click();
  await expect(example.locator('#data-values tr')).toHaveCount(2);
  await example.locator('#data-table').screenshot({ path: info.outputPath('worst-data.png') });
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  for (const [label, value] of [
    ['Group B training records', '10'],
    ['Group B spread around 7 minutes', '1'],
    ['Selected training objective', 'worst'],
    ['Hypothetical group B share', '0.8'],
  ])
    await expect(example.getByLabel(label, { exact: true })).toHaveValue(value);
  await expect(example.locator('#data')).toHaveJSProperty('open', false);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(example.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await example.locator('#mechanism').screenshot({ path: info.outputPath('worst-dark.png') });
  await page.emulateMedia({ colorScheme: 'light' });
  await example.getByLabel('Group B spread around 7 minutes', { exact: true }).selectOption('3');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-monitoring-and-robustness');
  await expect(page.getByRole('link', { name: /Worst-Group Optimization/ }).first()).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/worst-group-optimization' + suffix + '.svg');
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
