import { expect, test } from '@playwright/test';

test('reads the article and computes generated targets, smoothed probabilities, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-self-supervised-pretraining');
  await expect(
    page.getByRole('heading', { name: 'Self-Supervised Pretraining', exact: true }).first(),
  ).toBeVisible();
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('self-supervised-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Self-supervised target and loss explorer"]')
    .frameLocator('iframe');
  await expect(example.locator('output')).toContainText(
    '20 training targets · 8 words. Query target “safely”: 15.4% probability; 1.872 nats.',
  );
  await expect(example.locator('#context')).toContainText('(1 + 1) / (5 + 1 × 8)');
  await expect(example.locator('tbody tr')).toHaveCount(8);
  await example.locator('svg').screenshot({
    path: info.outputPath('self-supervised-explorer.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Held-out query', { exact: true }).selectOption('1');
  await expect(example.locator('output')).toContainText('“late”: 23.1% probability; 1.466 nats');
  await example.getByLabel('Pretraining objective', { exact: true }).selectOption('masked');
  await example.getByLabel('Target position', { exact: true }).selectOption('2');
  await expect(example.locator('output')).toContainText('“arrived”: 12.5% probability; 2.079 nats');
  await expect(example.locator('#context')).toContainText(
    'refund / late. Target count 0; context total 0',
  );
  await example.getByLabel('Smoothing per word', { exact: true }).selectOption('2');
  await expect(example.locator('output')).toContainText('12.5% probability; 2.079 nats');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.getByLabel('Pretraining objective', { exact: true })).toHaveValue('causal');
  await expect(example.getByLabel('Held-out query', { exact: true })).toHaveValue('0');
  await expect(example.getByLabel('Target position', { exact: true })).toHaveValue('3');
  await expect(example.getByLabel('Smoothing per word', { exact: true })).toHaveValue('1');
  await example.getByLabel('Smoothing per word', { exact: true }).selectOption('2');
  await expect(example.locator('output')).toContainText('14.3% probability; 1.946 nats');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toContainText('15.4% probability; 1.872 nats');
  await page.goto('/collection/machine-learning-learning-and-adaptation');
  await expect(
    page.getByRole('link', { name: /Self-Supervised Pretraining/ }).first(),
  ).toBeVisible();
});

test('keeps all text inside the desktop and phone illustrations', async ({ page }) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/self-supervised-pretraining' + suffix + '.svg');
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
