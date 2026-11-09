import { expect, test } from '@playwright/test';
test('computes token masks, completion states, and resets in the article sandbox', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-constrained-decoding');
  await expect(
    page.getByRole('heading', { name: 'Constrained Decoding', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  await page.screenshot({ path: info.outputPath('decoding-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('decoding-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await page
    .locator('.markdown-body table')
    .first()
    .screenshot({
      path: info.outputPath('decoding-article-table.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Constrained decoding token explorer"]')
    .frameLocator('iframe');
  const initial = 'FINISHED. 3 new token(s). Text accepted: yes. End token emitted: yes.';
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('#result')).toHaveText('{"label":"HOLD"}');
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#distribution', 'distribution'],
    ['#trace', 'trace'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('decoding-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await expect(example.locator('#distribution-data tr')).toHaveCount(10);
  await expect(example.locator('#distribution-data tr').nth(1)).toContainText('40.82%');
  await example.getByLabel('Fictional token weights', { exact: true }).selectOption('1');
  await expect(example.locator('#result')).toHaveText('{"label":"RENEW"}');
  await expect(example.locator('output')).toContainText('FINISHED. 2');
  await example.getByLabel('New token budget', { exact: true }).selectOption('1');
  await expect(example.locator('output')).toHaveText(
    'TOKEN_LIMIT. 1 new token(s). Text accepted: yes. End token emitted: no.',
  );
  await expect(example.locator('#interpretation')).toContainText('already an accepted object');
  await example.getByLabel('Prefilled prefix', { exact: true }).selectOption('4');
  await expect(example.locator('output')).toHaveText(initial.replace('3 new', '1 new'));
  await example.getByLabel('Prefilled prefix', { exact: true }).selectOption('5');
  await expect(example.locator('output')).toContainText('DEAD_END. 0');
  await expect(example.locator('#distribution-data tr').filter({ hasText: '0.00%' })).toHaveCount(
    10,
  );
  await example.getByLabel('Decoding constraint', { exact: true }).selectOption('off');
  await expect(example.locator('output')).toContainText('TOKEN_LIMIT. 1');
  await expect(example.locator('#interpretation')).toContainText('not an accepted');
  await example.locator('#language summary').click();
  await expect(example.locator('#language-data')).toBeVisible();
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  for (const [label, value] of [
    ['Prefilled prefix', '1'],
    ['Fictional token weights', '0'],
    ['Decoding constraint', 'on'],
    ['New token budget', '3'],
  ])
    await expect(example.getByLabel(label, { exact: true })).toHaveValue(value);
  await expect(example.locator('#language')).toHaveJSProperty('open', false);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(example.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await example.locator('#mechanism').screenshot({ path: info.outputPath('decoding-dark.png') });
  await page.emulateMedia({ colorScheme: 'light' });
  await example.getByLabel('Prefilled prefix', { exact: true }).selectOption('5');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-generative-systems');
  await expect(page.getByRole('link', { name: /Constrained Decoding/ }).first()).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/constrained-decoding' + suffix + '.svg');
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
