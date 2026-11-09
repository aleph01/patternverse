import { expect, test } from '@playwright/test';
test('retrieves evidence in the real article sandbox and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-retrieval-augmented-generation');
  await expect(
    page.getByRole('heading', { name: 'Retrieval Augmented Generation', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  await page.screenshot({ path: info.outputPath('rag-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('rag-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="RAG evidence and context explorer"]')
    .frameLocator('iframe');
  const initial = 'Selected P1 → P5. 4/6 eligible. 0 superseded passages. No model call.';
  await expect(example.locator('output')).toHaveText(initial);
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#prompt', 'context'],
    ['#rank-table', 'ranking'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('rag-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await expect(example.locator('#rank-data tr')).toHaveCount(6);
  await expect(example.locator('#rank-data tr').first()).toContainText('2.8669');
  await example.getByLabel('Eligible versions', { exact: true }).selectOption('all');
  await expect(example.locator('output')).toContainText('Selected P1 → P2.');
  await expect(example.locator('#prompt')).toContainText('48 hours');
  await example.getByLabel('Eligible versions', { exact: true }).selectOption('current');
  await example.getByLabel('Simulated reader', { exact: true }).selectOption('staff');
  await example.getByLabel('Maximum passages', { exact: true }).selectOption('4');
  await expect(example.locator('#prompt')).toContainText('[P4]');
  await example.getByLabel('Simulated reader', { exact: true }).selectOption('public');
  await expect(example.locator('#prompt')).not.toContainText('[P4]');
  await example.getByLabel('Question', { exact: true }).selectOption('3');
  await expect(example.locator('output')).toContainText('Selected none.');
  await expect(example.locator('#prompt')).toContainText('[No matching eligible passages]');
  await example.locator('#bank summary').click();
  await expect(example.locator('#bank-data .example-card')).toHaveCount(6);
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  for (const [label, value] of [
    ['Question', '0'],
    ['Maximum passages', '2'],
    ['Eligible versions', 'current'],
    ['Simulated reader', 'public'],
  ])
    await expect(example.getByLabel(label, { exact: true })).toHaveValue(value);
  await expect(example.locator('#bank')).toHaveJSProperty('open', false);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(example.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await example.locator('#mechanism').screenshot({ path: info.outputPath('rag-dark.png') });
  await page.emulateMedia({ colorScheme: 'light' });
  await example.getByLabel('Question', { exact: true }).selectOption('3');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-generative-systems');
  await expect(
    page.getByRole('link', { name: /Retrieval Augmented Generation/ }).first(),
  ).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/retrieval-augmented-generation' + suffix + '.svg');
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
