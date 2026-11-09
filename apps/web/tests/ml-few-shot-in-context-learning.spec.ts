import { expect, test } from '@playwright/test';
test('constructs prompts in the real article sandbox and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-few-shot-in-context-learning');
  await expect(
    page.getByRole('heading', { name: 'Few-Shot In-Context Learning', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('few-shot-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('few-shot-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Few-shot prompt construction explorer"]')
    .frameLocator('iframe');
  const initial =
    'FEW-SHOT. Order: D2 → D1 → D3. 369 characters. Labels demonstrated: 2/3. No model call.';
  await expect(example.locator('output')).toHaveText(initial);
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#prompt', 'prompt'],
    ['#rank-table', 'ranking'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('few-shot-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  await expect(example.locator('#rank-data tr')).toHaveCount(6);
  await expect(example.locator('#rank-data tr').first()).toContainText('5/10');
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example
    .getByLabel('Order of selected demonstrations', { exact: true })
    .selectOption('reverse');
  await expect(example.locator('output')).toHaveText(
    initial.replace('D2 → D1 → D3', 'D3 → D1 → D2'),
  );
  await example.getByLabel('Demonstrations to include', { exact: true }).selectOption('0');
  await expect(example.locator('output')).toContainText('ZERO-SHOT. Order: none.');
  await expect(example.locator('#prompt')).not.toContainText('Examples:');
  await expect(example.locator('#prompt')).toContainText(
    'New request: Can I renew Dune for another week?',
  );
  await example.getByLabel('Demonstrations to include', { exact: true }).selectOption('1');
  await expect(example.locator('output')).toContainText('ONE-SHOT. Order: D2.');
  await example.getByLabel('Demonstrations to include', { exact: true }).selectOption('6');
  await expect(example.locator('output')).toContainText('Labels demonstrated: 3/3.');
  await example.getByLabel('New library request', { exact: true }).selectOption('1');
  await expect(example.locator('#prompt')).toContainText(
    'New request: Please reserve Dune for me.',
  );
  await example.locator('#bank summary').click();
  await expect(example.locator('#bank-data .example-card')).toHaveCount(6);
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  for (const [label, value] of [
    ['New library request', '0'],
    ['Demonstrations to include', '3'],
    ['Order of selected demonstrations', 'ranked'],
  ])
    await expect(example.getByLabel(label, { exact: true })).toHaveValue(value);
  await expect(example.locator('#bank')).toHaveJSProperty('open', false);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(example.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await example.locator('#mechanism').screenshot({
    path: info.outputPath('few-shot-dark.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await example.getByLabel('Demonstrations to include', { exact: true }).selectOption('0');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-generative-systems');
  await expect(
    page.getByRole('link', { name: /Few-Shot In-Context Learning/ }).first(),
  ).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/few-shot-in-context-learning' + suffix + '.svg');
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
