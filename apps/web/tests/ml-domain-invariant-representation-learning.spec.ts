import { expect, test } from '@playwright/test';
test('computes alignment tradeoffs in the article sandbox and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-domain-invariant-representation-learning');
  await expect(
    page
      .getByRole('heading', { name: 'Domain-Invariant Representation Learning', exact: true })
      .first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  await page.screenshot({ path: info.outputPath('domain-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('domain-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await page
    .locator('.markdown-body table')
    .first()
    .screenshot({
      path: info.outputPath('domain-table.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const ex = page
    .frameLocator('iframe[title="Domain representation tradeoff explorer"]')
    .frameLocator('iframe');
  const initial = 'Cue only. Source 100%. Target check 100%. Domain classifier 50%.';
  await expect(ex.locator('output')).toHaveText(initial);
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#fits-table', 'fits'],
  ])
    await ex.locator(selector).screenshot({ path: info.outputPath('domain-' + name + '.png') });
  await ex.getByLabel('Data relationship', { exact: true }).selectOption('prior');
  await ex.getByLabel('Alignment weight λ', { exact: true }).selectOption('2');
  await expect(ex.locator('output')).toHaveText(
    'Zero. Source 75%. Target check 25%. Domain classifier 50%.',
  );
  await expect(ex.locator('#score')).toContainText('-0.75');
  await ex.locator('#mechanism').screenshot({
    path: info.outputPath('domain-collapse.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await ex.getByLabel('Representation choice', { exact: true }).selectOption('signal');
  await expect(ex.locator('output')).toContainText('Domain classifier 75%');
  await ex.getByLabel('Data relationship', { exact: true }).selectOption('reversed');
  await expect(ex.locator('output')).toContainText('Target check 0%');
  await ex.getByLabel('Representation choice', { exact: true }).selectOption('auto');
  await ex.getByLabel('Domain-classifier rule', { exact: true }).selectOption('constant');
  await expect(ex.locator('output')).toContainText('Cue + camera.');
  await ex.locator('#data summary').click();
  await expect(ex.locator('#data-values tr')).toHaveCount(4);
  await ex.locator('#data-table').screenshot({
    path: info.outputPath('domain-data.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#data')).toHaveJSProperty('open', false);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await ex.locator('#mechanism').screenshot({
    path: info.outputPath('domain-dark.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await ex.getByLabel('Alignment weight λ', { exact: true }).selectOption('2');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-monitoring-and-robustness');
  await expect(
    page.getByRole('link', { name: /Domain-Invariant Representation Learning/ }).first(),
  ).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto(
      '/assets/machine-learning/domain-invariant-representation-learning' + suffix + '.svg',
    );
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
