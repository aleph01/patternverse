import { expect, test } from '@playwright/test';
test('reads the article, compares estimators and exact toy expectations, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-off-policy-evaluation');
  await expect(
    page.getByRole('heading', { name: 'Off-Policy Evaluation', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('ope-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('ope-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Off-policy estimator comparison explorer"]')
    .frameLocator('iframe');
  const initial = 'DM: 0.70000. IPS: 0.31250. DR: 0.23125. Support: yes.';
  await expect(example.locator('output')).toHaveText(initial);
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#metrics-table', 'metrics'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('ope-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  await expect(example.locator('#data tr')).toHaveCount(8);
  await expect(example.locator('#data tr').last()).toContainText('Δ -4.000');
  await expect(example.locator('#data tr').last()).toContainText('DR -3.200');
  await example.locator('#data tr').last().scrollIntoViewIfNeeded();
  await expect(example.locator('#data tr').last()).toBeVisible();
  await example
    .locator('#data tr')
    .last()
    .screenshot({
      path: info.outputPath('ope-last-row.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.locator('#expectation summary').click();
  await expect(example.locator('#truth')).toContainText('0.62500');
  await expect(example.locator('#expectation-data tr').last()).toContainText('0.62500');
  await example.locator('#expectation-table').screenshot({
    path: info.outputPath('ope-expectations.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example
    .getByLabel('Propensities used in weighting', { exact: true })
    .selectOption('uniform');
  await expect(example.locator('output')).toHaveText(
    'DM: 0.70000. IPS: 0.50000. DR: 0.55000. Support: yes.',
  );
  await expect(example.locator('#expectation-data tr').last()).toContainText('0.76000');
  await expect(example.locator('#interpretation')).toContainText('incorrect uniform');
  await example.getByLabel('Reward model', { exact: true }).selectOption('oracle');
  await expect(example.locator('output')).toContainText('DM: 0.62500');
  await expect(example.locator('output')).toContainText('DR: 0.62500');
  await example.getByLabel('Logging coverage', { exact: true }).selectOption('A-only');
  await expect(example.locator('output')).toContainText('IPS: blocked. DR: blocked. Support: no');
  await expect(example.locator('#metrics')).toContainText('extrapolation');
  await expect(example.locator('#interpretation')).toContainText('Complex → B');
  await example.getByLabel('Reward model', { exact: true }).selectOption('approximate');
  await expect(example.locator('output')).toContainText('DM: 0.70000');
  await example.getByLabel('Target policy', { exact: true }).selectOption('A');
  await example
    .getByLabel('Propensities used in weighting', { exact: true })
    .selectOption('logged');
  await expect(example.locator('output')).toHaveText(
    'DM: 0.45000. IPS: 0.50000. DR: 0.50000. Support: yes.',
  );
  await example.getByLabel('Target policy', { exact: true }).selectOption('B');
  await expect(example.locator('output')).toContainText('Support: no');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.getByLabel('Reward model', { exact: true })).toHaveValue('approximate');
  await expect(example.getByLabel('Propensities used in weighting', { exact: true })).toHaveValue(
    'logged',
  );
  await expect(example.getByLabel('Logging coverage', { exact: true })).toHaveValue('mixed');
  await expect(example.locator('#expectation')).toHaveJSProperty('open', false);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(example.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await example.locator('#mechanism').screenshot({
    path: info.outputPath('ope-dark.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await example.getByLabel('Reward model', { exact: true }).selectOption('flat');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-decisions-and-feedback');
  await expect(page.getByRole('link', { name: /Off-Policy Evaluation/ }).first()).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/off-policy-evaluation' + suffix + '.svg');
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
