import { expect, test } from '@playwright/test';
test('reads the article, computes exploration and evaluation, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-controlled-exploration-with-propensity-logging');
  await expect(
    page
      .getByRole('heading', { name: 'Controlled Exploration with Propensity Logging', exact: true })
      .first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('exploration-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('exploration-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Exploration and propensity logging explorer"]')
    .frameLocator('iframe');
  const initial = 'Support: yes. Matches: 4/10. IPS: 1.250. SNIPS: 0.909.';
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('#data tr')).toHaveCount(10);
  await expect(example.locator('#data tr').nth(8)).toContainText('p 0.100');
  await expect(example.locator('#data tr').nth(8)).toContainText('w 10.000');
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#metrics-table', 'metrics'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('exploration-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  await example
    .locator('#data tr')
    .first()
    .screenshot({
      path: info.outputPath('exploration-first-row.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  await example.locator('#data tr').last().scrollIntoViewIfNeeded();
  await expect(example.locator('#data tr').last()).toBeVisible();
  await example
    .locator('#data tr')
    .last()
    .screenshot({
      path: info.outputPath('exploration-last-row.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Importance-weight cap', { exact: true }).selectOption('2');
  await expect(example.locator('#metrics')).toContainText('0.450');
  await expect(example.locator('output')).toHaveText(initial);
  await example.getByLabel('Exploration probability ε', { exact: true }).selectOption('0');
  await expect(example.locator('output')).toContainText('Support: no');
  await expect(example.locator('#interpretation')).toContainText('Complex → B');
  await expect(example.locator('#metrics')).toContainText('Blocked: zero support');
  await example.getByLabel('Target policy', { exact: true }).selectOption('A');
  await expect(example.locator('output')).toContainText('IPS: 0.400. SNIPS: 0.400');
  await example.getByLabel('Exploration probability ε', { exact: true }).selectOption('0.1');
  await example.getByLabel('Target policy', { exact: true }).selectOption('C');
  await expect(example.locator('output')).toHaveText(
    'Support: yes. Matches: 0/10. IPS: 0.000. SNIPS: undefined.',
  );
  await expect(example.locator('#interpretation')).toContainText('absent evidence');
  await example.getByLabel('Eligible actions', { exact: true }).selectOption('AB');
  await expect(example.locator('output')).toContainText('Support: no');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.getByLabel('Exploration probability ε', { exact: true })).toHaveValue('0.3');
  await expect(example.getByLabel('Target policy', { exact: true })).toHaveValue('contextual');
  await expect(example.getByLabel('Eligible actions', { exact: true })).toHaveValue('ABC');
  await expect(example.getByLabel('Importance-weight cap', { exact: true })).toHaveValue('none');
  await example.locator('#potential summary').click();
  await expect(example.locator('#truth')).toContainText('0.700');
  await expect(example.locator('#potential-data tr')).toHaveCount(10);
  await example.locator('#potential-data tr').last().scrollIntoViewIfNeeded();
  await expect(example.locator('#potential-data tr').last()).toBeVisible();
  await example
    .locator('#potential-data tr')
    .last()
    .screenshot({
      path: info.outputPath('exploration-potential-row.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(example.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await example.locator('#mechanism').screenshot({
    path: info.outputPath('exploration-dark.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await example.getByLabel('Exploration probability ε', { exact: true }).selectOption('1');
  await expect(example.locator('output')).toContainText('IPS: 0.600. SNIPS: 0.500');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-decisions-and-feedback');
  await expect(
    page.getByRole('link', { name: /Controlled Exploration with Propensity Logging/ }).first(),
  ).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto(
      '/assets/machine-learning/controlled-exploration-with-propensity-logging' + suffix + '.svg',
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
