import { expect, test } from '@playwright/test';

test('reads the article, refits both objectives, changes constraints, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-decision-focused-learning');
  await expect(
    page.getByRole('heading', { name: 'Decision-Focused Learning', exact: true }).first(),
  ).toBeVisible();
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('decision-focused-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Decision-focused fitting and regret explorer"]')
    .frameLocator('iframe');
  await expect(example.locator('output')).toContainText(
    '21 candidates fitted · 5 feasible subsets. Best true benefit: 11. Training regret — MSE fit: 1; decision fit: 0.',
  );
  await expect(example.locator('svg')).toContainText('Selected θ: 0.1');
  await expect(example.locator('svg')).toContainText('Selected θ: 1.1');
  await expect(example.locator('#candidates tr')).toHaveCount(21);
  await example.locator('svg').screenshot({
    path: info.outputPath('decision-focused-explorer.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Capacity budget', { exact: true }).selectOption('3');
  await expect(example.locator('output')).toContainText(
    '4 feasible subsets. Best true benefit: 10',
  );
  await expect(example.locator('output')).toContainText('MSE fit: 0; decision fit: 0');
  await example.getByLabel('Observed benefit C', { exact: false }).fill('0');
  await expect(example.locator('output')).toContainText('Best true benefit: 6');
  await expect(example.locator('output')).toContainText('MSE fit: 6; decision fit: 6');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.getByLabel('Capacity budget', { exact: true })).toHaveValue('4');
  await expect(example.getByLabel('Observed benefit C', { exact: false })).toHaveValue('10');
  await example.getByLabel('Observed benefit A', { exact: false }).fill('-1');
  await expect(example.locator('output')).toContainText('Enter whole observed benefits');
  await expect(example.locator('#predictions tr')).toHaveCount(0);
  await expect(example.locator('svg rect')).toHaveCount(0);
  for (const name of ['A', 'B', 'C'])
    await example.getByLabel('Observed benefit ' + name, { exact: false }).fill('0');
  await expect(example.locator('output')).toContainText('Best true benefit: 0');
  await expect(example.locator('svg')).not.toContainText('NaN');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toContainText('MSE fit: 1; decision fit: 0');
  await page.goto('/collection/machine-learning-decisions-and-feedback');
  await expect(page.getByRole('link', { name: /Decision-Focused Learning/ }).first()).toBeVisible();
});

test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/decision-focused-learning' + suffix + '.svg');
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
