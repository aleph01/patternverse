import { expect, test } from '@playwright/test';

test('reads the article, computes corrected ranks and intervals, handles infinity, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-conformal-prediction');
  await expect(
    page.getByRole('heading', { name: 'Conformal Prediction', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('conformal-prediction-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('conformal-prediction-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Conformal prediction interval explorer"]')
    .frameLocator('iframe');
  const initial =
    'Target: 90% · n = 9 · rank 9 · q = 9 min. Separate evaluation: 9/10 covered (90.0%).';
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('#mechanism')).toContainText('[31, 49] minutes');
  await expect(example.locator('#summary tr').last()).toContainText('1/2');
  await example.locator('form').screenshot({
    path: info.outputPath('conformal-prediction-controls.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example.locator('#mechanism').screenshot({
    path: info.outputPath('conformal-prediction-explorer.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example.locator('#evaluation').screenshot({
    path: info.outputPath('conformal-prediction-evaluation.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example.locator('#summary-table').screenshot({
    path: info.outputPath('conformal-prediction-summary.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Target marginal coverage', { exact: true }).selectOption('80');
  await expect(example.locator('output')).toContainText('rank 8 · q = 7');
  await expect(example.locator('output')).toContainText('7/10 covered (70.0%)');
  await expect(example.locator('#mechanism')).toContainText('[33, 47] minutes');
  await example.getByLabel('Target marginal coverage', { exact: true }).selectOption('95');
  await expect(example.locator('output')).toContainText('rank 10 · q = ∞');
  await expect(example.locator('#mechanism')).toContainText('All real values');
  await expect(example.locator('#evaluation')).toContainText('Arrows extend beyond');
  await expect(example.locator('#interpretation')).toContainText('no finite planning bound');
  await expect(example.locator('output')).toContainText('10/10 covered (100.0%)');
  await example.getByLabel('Calibration records', { exact: false }).selectOption('3');
  await expect(example.locator('output')).toContainText('n = 3 · rank 4 · q = ∞');
  await example.getByLabel('Target marginal coverage', { exact: true }).selectOption('60');
  await expect(example.locator('output')).toContainText('rank 3 · q = 7');
  await example.getByLabel('Calibration records', { exact: false }).selectOption('5');
  await expect(example.locator('output')).toContainText('n = 5 · rank 4 · q = 7');
  await example.getByLabel('Target marginal coverage', { exact: true }).selectOption('80');
  await expect(example.locator('output')).toContainText('rank 5 · q = 9');
  await example.getByLabel('New point prediction', { exact: false }).fill('100');
  await expect(example.locator('#mechanism')).toContainText('[91, 109] minutes');
  await example.getByLabel('Separate evaluation outcomes', { exact: true }).selectOption('harder');
  await expect(example.locator('output')).toContainText('q = 9');
  await expect(example.locator('output')).toContainText('8/10 covered (80.0%)');
  await expect(example.locator('#summary tr').last()).toContainText('0/2');
  await example.getByLabel('New point prediction', { exact: false }).fill('-1');
  await expect(example.locator('output')).toContainText('whole new-point prediction');
  await expect(example.locator('#summary tr')).toHaveCount(0);
  await expect(example.locator('#evaluation path')).toHaveCount(0);
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.getByLabel('New point prediction', { exact: false })).toHaveValue('40');
  await expect(example.getByLabel('Calibration records', { exact: false })).toHaveValue('9');
  await expect(example.getByLabel('Target marginal coverage', { exact: true })).toHaveValue('90');
  await expect(example.getByLabel('Separate evaluation outcomes', { exact: true })).toHaveValue(
    'baseline',
  );
  await example.locator('#record-tables summary').click();
  await expect(example.locator('#calibration tr')).toHaveCount(9);
  await expect(example.locator('#data tr')).toHaveCount(10);
  await expect(example.locator('#calibration tr').first()).toContainText('C01');
  await expect(example.locator('#data tr').last()).toContainText('E10');
  await example.getByLabel('Target marginal coverage', { exact: true }).selectOption('95');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-evaluation-and-uncertainty');
  await expect(page.getByRole('link', { name: /Conformal Prediction/ }).first()).toBeVisible();
});

test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/conformal-prediction' + suffix + '.svg');
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
