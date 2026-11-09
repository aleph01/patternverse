import { expect, test } from '@playwright/test';

test('reads the article, computes contract findings, compares environments, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-schema-based-data-validation');
  await expect(
    page.getByRole('heading', { name: 'Schema-Based Data Validation', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('schema-based-data-validation-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('schema-based-data-validation-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Schema validation contract explorer"]')
    .frameLocator('iframe');
  const initial = 'Rows passing: 1/6. Flagged: 5. Violations: 6. Conversions: 0. Whole batch held.';
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('#mechanism')).toContainText('HOLD WHOLE BATCH');
  await expect(example.locator('#summary tr').first()).toContainText('3');
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#summary-table', 'summary'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('schema-based-data-validation-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.locator('#record-tables summary').click();
  await expect(example.locator('#data tr')).toHaveCount(6);
  await expect(example.locator('#data tr').nth(4)).toContainText(
    'distance_km: expected number; got null',
  );
  await expect(example.locator('#data tr').nth(4)).toContainText('pickup_hour: outside [0, 23]');
  await example.locator('#record-tables').screenshot({
    path: info.outputPath('schema-based-data-validation-records.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Distance parsing policy', { exact: true }).selectOption('decimal');
  await expect(example.locator('output')).toContainText(
    'Rows passing: 2/6. Flagged: 4. Violations: 5. Conversions: 1.',
  );
  await expect(example.locator('#data tr').nth(1)).toContainText('Converted "12" → 12');
  await example.getByLabel('Contract version', { exact: true }).selectOption('v2');
  await expect(example.locator('output')).toContainText(
    'Rows passing: 3/6. Flagged: 3. Violations: 4.',
  );
  await expect(example.locator('#interpretation')).toContainText('does not prove the encoder');
  await example.getByLabel('Input batch', { exact: true }).selectOption('serving');
  await expect(example.locator('output')).toContainText(
    'Rows passing: 0/6. Flagged: 6. Violations: 9.',
  );
  await example.getByLabel('Validation environment', { exact: true }).selectOption('serving');
  await expect(example.locator('output')).toContainText(
    'Rows passing: 4/6. Flagged: 2. Violations: 3.',
  );
  await example.getByLabel('Input batch', { exact: true }).selectOption('units');
  await expect(example.locator('output')).toContainText(
    'Rows passing: 0/6. Flagged: 6. Violations: 6.',
  );
  await example.getByLabel('Validation environment', { exact: true }).selectOption('training');
  await expect(example.locator('output')).toContainText(
    'Rows passing: 6/6. Flagged: 0. Violations: 0.',
  );
  await expect(example.locator('#mechanism')).toContainText('BATCH ELIGIBLE');
  await expect(example.locator('#interpretation')).toContainText(
    'no unit metadata reaches the gate',
  );
  await example.locator('#contract-details summary').click();
  await expect(example.locator('#contract')).toContainText('"unit": "km"');
  await expect(example.locator('#contract')).toContainText('"drone"');
  await example.locator('#contract').screenshot({
    path: info.outputPath('schema-based-data-validation-contract.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.getByLabel('Input batch', { exact: true })).toHaveValue('source');
  await expect(example.getByLabel('Validation environment', { exact: true })).toHaveValue(
    'training',
  );
  await expect(example.getByLabel('Contract version', { exact: true })).toHaveValue('v1');
  await expect(example.getByLabel('Distance parsing policy', { exact: true })).toHaveValue(
    'strict',
  );
  await example.getByLabel('Input batch', { exact: true }).selectOption('units');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-training-and-deployment');
  await expect(
    page.getByRole('link', { name: /Schema-Based Data Validation/ }).first(),
  ).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/schema-based-data-validation' + suffix + '.svg');
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
