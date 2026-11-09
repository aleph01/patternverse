import { expect, test } from '@playwright/test';
test('reads the article, computes gated exposure and recovery, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-canary-rollout-with-rollback');
  await expect(
    page.getByRole('heading', { name: 'Canary Rollout with Rollback', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('canary-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('canary-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Canary rollout and rollback explorer"]')
    .frameLocator('iframe');
  const initial =
    'ROLL BACK. Candidate exposure: 35/200. Candidate serving failures: 3. Next candidate share: 0%.';
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('#history tr')).toHaveCount(2);
  await expect(example.locator('#history tr').last()).toContainText('3/25 (12.0%)');
  await expect(example.locator('#history tr').last()).toContainText('1/22 (4.5%)');
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#history-table', 'history'],
    ['#metrics-table', 'metrics'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('canary-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(example.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await example
    .locator('#mechanism')
    .screenshot({ path: info.outputPath('canary-explorer-dark.png') });
  await page.emulateMedia({ colorScheme: 'light' });
  await example.locator('#record-tables summary').click();
  await expect(example.locator('#data tr')).toHaveCount(35);
  await expect(example.locator('#data tr').filter({ hasText: 'W2-003' })).toContainText(
    'No prediction',
  );
  await example.locator('#data tr').last().scrollIntoViewIfNeeded();
  await expect(example.locator('#data tr').last()).toBeVisible();
  await example
    .locator('#data tr')
    .last()
    .screenshot({ path: info.outputPath('canary-last-request.png') });
  await example.getByLabel('Rollback lag', { exact: true }).selectOption('1');
  await expect(example.locator('output')).toContainText('60/300. Candidate serving failures: 6');
  await expect(example.locator('#data tr')).toHaveCount(60);
  await expect(example.locator('#history tr').last()).toContainText('RECOVER');
  await example.getByLabel('Candidate behavior', { exact: true }).selectOption('quality');
  await expect(example.locator('output')).toContainText('Candidate serving failures: 0');
  await expect(example.locator('#history tr').nth(1)).toContainText('5/25 (20.0%)');
  await example.getByLabel('Quality labels', { exact: true }).selectOption('pending');
  await expect(example.locator('output')).toContainText('HOLD. Candidate exposure: 10/100');
  await expect(example.locator('#history tr').first()).toContainText('0/0 (undefined)');
  await expect(example.locator('#interpretation')).toContainText('would keep serving traffic');
  await example.getByLabel('Quality labels', { exact: true }).selectOption('ready');
  await example.getByLabel('Candidate behavior', { exact: true }).selectOption('healthy');
  await expect(example.locator('output')).toContainText('PROMOTE. Candidate exposure: 185/400');
  await example.getByLabel('Initial candidate share', { exact: true }).selectOption('25');
  await expect(example.locator('output')).toContainText('175/300');
  await example
    .getByLabel('Minimum candidate requests per window', { exact: true })
    .selectOption('30');
  await expect(example.locator('output')).toContainText('HOLD. Candidate exposure: 25/100');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.getByLabel('Initial candidate share', { exact: true })).toHaveValue('10');
  await expect(example.getByLabel('Quality labels', { exact: true })).toHaveValue('ready');
  await expect(
    example.getByLabel('Minimum candidate requests per window', { exact: true }),
  ).toHaveValue('10');
  await expect(example.getByLabel('Rollback lag', { exact: true })).toHaveValue('0');
  await example.getByLabel('Candidate behavior', { exact: true }).selectOption('healthy');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-training-and-deployment');
  await expect(
    page.getByRole('link', { name: /Canary Rollout with Rollback/ }).first(),
  ).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/canary-rollout-with-rollback' + suffix + '.svg');
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
