import { expect, test } from '@playwright/test';

test('reads the article, computes risk and workload, handles abstention, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-selective-prediction');
  await expect(
    page.getByRole('heading', { name: 'Selective Prediction', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('selective-prediction-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('selective-prediction-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Selective prediction risk and coverage explorer"]')
    .frameLocator('iframe');
  const initial = 'Automated: 8/12 (66.7%). Accepted errors: 2/8 (25.0%). Deferred: 4.';
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('#cost')).toContainText('28 cost units');
  await expect(example.locator('#summary tr').last()).toContainText('2/2 · 100.0%');
  const clippedCurveText = await example.locator('#curve').evaluate((svg) => {
    const bounds = (svg as SVGSVGElement).viewBox.baseVal;
    return [...svg.querySelectorAll('text')].flatMap((label) => {
      const box = label.getBBox();
      return box.x < -1 ||
        box.y < -1 ||
        box.x + box.width > bounds.width + 1 ||
        box.y + box.height > bounds.height + 1
        ? [label.textContent]
        : [];
    });
  });
  expect(clippedCurveText).toEqual([]);
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#curve', 'curve'],
    ['#summary-table', 'summary'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('selective-prediction-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Acceptance threshold', { exact: true }).selectOption('0.9');
  await expect(example.locator('output')).toContainText('1/5 (20.0%)');
  await expect(example.locator('#interpretation')).toContainText('exceeds capacity by 3');
  await expect(example.locator('#cost')).toContainText('24 cost units');
  await example.getByLabel('Acceptance threshold', { exact: true }).selectOption('0.95');
  await expect(example.locator('output')).toContainText('1/3 (33.3%)');
  await example.getByLabel('Acceptance threshold', { exact: true }).selectOption('0.97');
  await expect(example.locator('output')).toContainText('0/2 (0.0%)');
  await example.getByLabel('Evaluation outcomes', { exact: true }).selectOption('harder');
  await expect(example.locator('output')).toContainText('2/2 (100.0%)');
  await example.getByLabel('Acceptance threshold', { exact: true }).selectOption('1');
  await expect(example.locator('output')).toContainText('0/0 (undefined)');
  await expect(example.locator('#curve')).toContainText('risk undefined');
  await expect(example.locator('#summary tr').last()).toContainText('0/0 · undefined');
  await example.getByLabel('Review capacity', { exact: false }).fill('12');
  await expect(example.locator('#interpretation')).toContainText('fits');
  await example.getByLabel('Cost per reviewed ticket', { exact: false }).fill('6');
  await expect(example.locator('#cost')).toContainText('72 cost units');
  await example.getByLabel('Cost per reviewed ticket', { exact: false }).fill('-1');
  await expect(example.locator('output')).toContainText('whole costs');
  await expect(example.locator('#data tr')).toHaveCount(0);
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.getByLabel('Cost per reviewed ticket', { exact: false })).toHaveValue('2');
  await expect(example.getByLabel('Review capacity', { exact: false })).toHaveValue('4');
  await expect(example.getByLabel('Evaluation outcomes', { exact: true })).toHaveValue('baseline');
  await example.locator('#record-tables summary').click();
  await expect(example.locator('#data tr')).toHaveCount(12);
  await expect(example.locator('#data tr').first()).toContainText('T01');
  await expect(example.locator('#data tr').last()).toContainText('T12');
  await example.getByLabel('Acceptance threshold', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-evaluation-and-uncertainty');
  await expect(page.getByRole('link', { name: /Selective Prediction/ }).first()).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/selective-prediction' + suffix + '.svg');
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
