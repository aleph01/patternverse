import { expect, test } from '@playwright/test';

test('reads the article, computes behavioral checks, changes rules and assertions, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-behavioral-testing');
  await expect(
    page.getByRole('heading', { name: 'Behavioral Testing', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('behavioral-testing-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('behavioral-testing-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Behavioral test suite explorer"]')
    .frameLocator('iframe');
  const initial =
    'Label tests: 2/3 · Invariance: 0/2 · Direction: 2/2. Selected cases, not deployment accuracy.';
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('svg')).toContainText('0.7311 → 0.8808');
  await expect(example.locator('tbody tr')).toHaveCount(7);
  await example.locator('form').screenshot({
    path: info.outputPath('behavioral-testing-controls.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example.locator('svg').screenshot({
    path: info.outputPath('behavioral-testing-explorer.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Invariance tolerance', { exact: false }).selectOption('0.2');
  await expect(example.locator('output')).toContainText('Invariance: 2/2');
  await expect(example.locator('svg')).toContainText('0.7311 → 0.8808');
  await example.getByLabel('Prediction rule', { exact: true }).selectOption('negation');
  await expect(example.locator('output')).toContainText('Label tests: 3/3');
  const weight = example.getByLabel('Name shortcut weight', { exact: false });
  await weight.focus();
  await weight.press('Home');
  await expect(weight).toHaveValue('0');
  await expect(example.locator('output')).toContainText(
    'Label tests: 3/3 · Invariance: 2/2 · Direction: 2/2',
  );
  await example.getByLabel('Invariance tolerance', { exact: false }).selectOption('0');
  await expect(example.locator('output')).toContainText('Invariance: 2/2');
  await example.getByLabel('Prediction rule', { exact: true }).selectOption('constant');
  await expect(weight).toBeDisabled();
  await expect(example.locator('output')).toContainText(
    'Label tests: 2/3 · Invariance: 2/2 · Direction: 2/2',
  );
  await expect(example.locator('#interpretation')).toContainText('fails the positive labeled case');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(weight).toBeEnabled();
  await expect(weight).toHaveValue('1');
  await expect(example.getByLabel('Prediction rule', { exact: true })).toHaveValue('lexicon');
  await expect(example.getByLabel('Invariance tolerance', { exact: false })).toHaveValue('0.02');
  await expect(example.locator('output')).toHaveText(initial);
  await example.getByLabel('Prediction rule', { exact: true }).selectOption('negation');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-evaluation-and-uncertainty');
  await expect(page.getByRole('link', { name: /Behavioral Testing/ }).first()).toBeVisible();
});

test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/behavioral-testing' + suffix + '.svg');
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
