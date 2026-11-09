import { expect, test } from '@playwright/test';
test('computes exact attacks and objective choices in the article sandbox and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-adversarial-training');
  await expect(
    page.getByRole('heading', { name: 'Adversarial Training', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  await page.screenshot({ path: info.outputPath('adversarial-article.png') });
  const style = '.article-outline{visibility:hidden!important}',
    preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({ path: info.outputPath('adversarial-illustration.png'), style });
  await page
    .locator('.markdown-body table')
    .first()
    .screenshot({ path: info.outputPath('adversarial-table.png'), style });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const ex = page
    .frameLocator('iframe[title="Adversarial training neighborhood explorer"]')
    .frameLocator('iframe');
  const initial = 'Broad cue. Clean 75%. Robust 75%. Worst loss 0.6656.';
  await expect(ex.locator('output')).toHaveText(initial);
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#fits-table', 'fits'],
  ])
    await ex
      .locator(selector)
      .screenshot({ path: info.outputPath('adversarial-' + name + '.png'), style });
  await ex.getByLabel('Model selection objective', { exact: true }).selectOption('clean');
  await expect(ex.locator('output')).toHaveText(
    'Fragile cue. Clean 100%. Robust 0%. Worst loss 0.8259.',
  );
  await ex
    .locator('#mechanism')
    .screenshot({ path: info.outputPath('adversarial-fragile.png'), style });
  await ex.getByLabel('Model selection objective', { exact: true }).selectOption('robust');
  await ex.getByLabel('Allowed perturbation shape', { exact: true }).selectOption('l2');
  await expect(ex.locator('output')).toHaveText(
    'Both cues. Clean 75%. Robust 75%. Worst loss 0.6269.',
  );
  await ex.locator('#mechanism').screenshot({ path: info.outputPath('adversarial-l2.png'), style });
  await ex.getByLabel('Perturbation budget ε', { exact: true }).selectOption('0');
  await expect(ex.locator('output')).toContainText('Fragile cue. Clean 100%. Robust 100%.');
  await ex.getByLabel('Model to inspect', { exact: true }).selectOption('broad');
  await ex.getByLabel('Record to inspect', { exact: true }).selectOption('P4');
  await expect(ex.locator('#mechanism')).toContainText('Inspected P4');
  await expect(ex.locator('#selection')).toContainText('Objective winner: Fragile cue.');
  await ex.locator('#data summary').click();
  await expect(ex.locator('#data-table tbody tr')).toHaveCount(4);
  await ex
    .locator('#data-table')
    .screenshot({ path: info.outputPath('adversarial-data.png'), style });
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#data')).toHaveJSProperty('open', false);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await ex
    .locator('#mechanism')
    .screenshot({ path: info.outputPath('adversarial-dark.png'), style });
  await page.emulateMedia({ colorScheme: 'light' });
  await ex.getByLabel('Perturbation budget ε', { exact: true }).selectOption('0.5');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-monitoring-and-robustness');
  await expect(page.getByRole('link', { name: /Adversarial Training/ }).first()).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/adversarial-training' + suffix + '.svg');
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
