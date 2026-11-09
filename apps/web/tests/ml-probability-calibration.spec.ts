import { expect, test } from '@playwright/test';

test('reads the article, fits calibration independently, changes evidence and bins, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-probability-calibration');
  await expect(
    page.getByRole('heading', { name: 'Probability Calibration', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('probability-calibration-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('probability-calibration-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Probability calibration fitting explorer"]')
    .frameLocator('iframe');
  const initial =
    'Fitted T: 1.5850 · 20 calibration cases; 20 separate evaluation cases. Accuracy: 70.0% → 70.0%.';
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('#metrics tr').first()).toContainText('0.2500');
  await expect(example.locator('#metrics tr').first()).toContainText('0.2200');
  await expect(example.locator('#reliability tr')).toHaveCount(4);
  await example.locator('form').screenshot({
    path: info.outputPath('probability-calibration-controls.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example.locator('svg').screenshot({
    path: info.outputPath('probability-calibration-explorer.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example.locator('#metrics-table').screenshot({
    path: info.outputPath('probability-calibration-metrics.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Equal-width reliability bins', { exact: true }).selectOption('1');
  await expect(example.locator('#reliability tr')).toHaveCount(2);
  const binned = example.locator('#metrics tr').filter({ hasText: 'Positive-class binned error' });
  await expect(binned.locator('td').nth(1)).toHaveText('0.0000');
  await expect(binned.locator('td').nth(2)).toHaveText('0.0000');
  await expect(example.locator('output')).toHaveText(initial);
  await example.getByLabel('Equal-width reliability bins', { exact: true }).selectOption('2');
  await expect(example.locator('#reliability tr')).toHaveCount(4);
  await example
    .getByLabel('Separate evaluation outcomes', { exact: false })
    .selectOption('aligned');
  await expect(example.locator('output')).toContainText('Fitted T: 1.5850');
  await expect(example.locator('output')).toContainText('Accuracy: 90.0% → 90.0%');
  await expect(example.locator('#metrics tr').first()).toContainText('0.0900');
  await expect(example.locator('#metrics tr').first()).toContainText('0.1000');
  await example
    .getByLabel('Separate evaluation outcomes', { exact: false })
    .selectOption('reversed');
  await expect(example.locator('output')).toContainText('Accuracy: 20.0% → 20.0%');
  await expect(example.locator('#interpretation')).toContainText('cannot reverse');
  await example.getByLabel('Calibration positives · 10 low-score cases', { exact: true }).fill('8');
  await example
    .getByLabel('Calibration positives · 10 high-score cases', { exact: true })
    .fill('2');
  await expect(example.locator('#fitting')).toContainText(
    'Upper temperature bound reached: T = 10',
  );
  await example.getByLabel('Calibration positives · 10 low-score cases', { exact: true }).fill('0');
  await example
    .getByLabel('Calibration positives · 10 high-score cases', { exact: true })
    .fill('10');
  await expect(example.locator('#fitting')).toContainText(
    'Lower temperature bound reached: T = 0.25',
  );
  await example
    .getByLabel('Calibration positives · 10 low-score cases', { exact: true })
    .fill('-1');
  await expect(example.locator('output')).toContainText('whole positive-label counts');
  await expect(example.locator('#metrics tr')).toHaveCount(0);
  await expect(example.locator('svg rect')).toHaveCount(0);
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await expect(
    example.getByLabel('Calibration positives · 10 low-score cases', { exact: true }),
  ).toHaveValue('2');
  await expect(
    example.getByLabel('Calibration positives · 10 high-score cases', { exact: true }),
  ).toHaveValue('8');
  await expect(example.getByLabel('Equal-width reliability bins', { exact: true })).toHaveValue(
    '5',
  );
  await expect(example.getByLabel('Separate evaluation outcomes', { exact: false })).toHaveValue(
    'moderate',
  );
  await example.locator('#raw-records summary').click();
  await expect(example.locator('#data tr')).toHaveCount(40);
  await expect(example.locator('#data tr').first()).toContainText('CAL-L01');
  await expect(example.locator('#data tr').last()).toContainText('EVAL-H10');
  await example.getByLabel('Equal-width reliability bins', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('#reliability tr')).toHaveCount(4);
  await page.goto('/collection/machine-learning-evaluation-and-uncertainty');
  await expect(page.getByRole('link', { name: /Probability Calibration/ }).first()).toBeVisible();
});

test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/probability-calibration' + suffix + '.svg');
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
