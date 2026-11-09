import { expect, test } from '@playwright/test';
test('reads the article, computes clipping and privacy accounting, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-differentially-private-training');
  await expect(
    page.getByRole('heading', { name: 'Differentially Private Training', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('privacy-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('privacy-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Private training clipping and accounting explorer"]')
    .frameLocator('iframe');
  const initial =
    'REPLAY update: (-0.0150, 0.0175). Randomized mechanism ε bound: 2.5243 at δ = 0.00001.';
  await expect(example.locator('output')).toHaveText(initial);
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#metrics-table', 'metrics'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('privacy-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.locator('#records summary').click();
  await expect(example.locator('#record-data tr')).toHaveCount(4);
  await example.locator('#record-data tr').last().scrollIntoViewIfNeeded();
  await expect(example.locator('#record-data tr').last()).toBeVisible();
  await expect(example.locator('#record-data tr').last()).toContainText('(0.0000, -0.5000)');
  await example.locator('#record-table').screenshot({
    path: info.outputPath('privacy-records.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example
    .getByLabel('Full-data accesses counted in ledger T', { exact: true })
    .selectOption('4');
  await expect(example.locator('output')).toHaveText(initial.replace('2.5243', '5.2985'));
  await example.getByLabel('Noise multiplier σ', { exact: true }).selectOption('0');
  await expect(example.locator('output')).toContainText('NO FINITE DP BOUND');
  await expect(example.locator('#ledger')).toContainText('undefined');
  await example.getByLabel('Noise multiplier σ', { exact: true }).selectOption('4');
  await example.getByLabel('L2 clipping bound C', { exact: true }).selectOption('2');
  await expect(example.locator('output')).toContainText('(-0.0300, 0.0225)');
  await expect(example.locator('output')).toContainText('5.2985');
  await example
    .getByLabel('Public noise replay (standardized z)', { exact: true })
    .selectOption('zero');
  await expect(example.locator('output')).toContainText('(0.0200, -0.0775)');
  await expect(example.locator('output')).toContainText('5.2985');
  await example.getByLabel('Target δ', { exact: true }).selectOption('0.0000001');
  await expect(example.locator('output')).not.toContainText('5.2985');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  for (const [label, value] of [
    ['L2 clipping bound C', '1'],
    ['Noise multiplier σ', '4'],
    ['Full-data accesses counted in ledger T', '1'],
    ['Target δ', '0.00001'],
    ['Public noise replay (standardized z)', 'A'],
  ])
    await expect(example.getByLabel(label, { exact: true })).toHaveValue(value);
  await expect(example.locator('#records')).toHaveJSProperty('open', false);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(example.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await example.locator('#mechanism').screenshot({
    path: info.outputPath('privacy-dark.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await example.getByLabel('Noise multiplier σ', { exact: true }).selectOption('8');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-privacy-and-governance');
  await expect(
    page.getByRole('link', { name: /Differentially Private Training/ }).first(),
  ).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/differentially-private-training' + suffix + '.svg');
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
