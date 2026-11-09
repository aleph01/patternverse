import { expect, test } from '@playwright/test';

test('reads the article, computes shadow queues and paired evidence, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-shadow-deployment');
  await expect(
    page.getByRole('heading', { name: 'Shadow Deployment', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('shadow-deployment-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('shadow-deployment-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Shadow deployment evidence explorer"]')
    .frameLocator('iframe');
  const initial =
    'Mirrored: 12/12. On time: 10/12. Labeled pairs: 8. Paired errors: incumbent 2/8, shadow 1/8. Shadow user responses: 0.';
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('#interpretation')).toContainText('320 ms');
  await expect(example.locator('#interpretation')).toContainText('970 worker-ms');
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#metrics-table', 'metrics'],
    ['#summary-table', 'summary'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('shadow-deployment-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.locator('#record-tables summary').click();
  await expect(example.locator('#data tr')).toHaveCount(12);
  await expect(example.locator('#data tr').last()).toContainText('Start 355; finish 595');
  await expect(example.locator('#data tr').last()).toContainText('Wait 80; elapsed 320');
  await expect(example.locator('#data tr').last()).toContainText('Deadline miss');
  await example.locator('#record-tables').screenshot({
    path: info.outputPath('shadow-deployment-records.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example.locator('#data tr').last().scrollIntoViewIfNeeded();
  await expect(example.locator('#data tr').last()).toBeVisible();
  await example
    .locator('#data tr')
    .last()
    .screenshot({
      path: info.outputPath('shadow-deployment-last-record.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Shadow deadline', { exact: false }).selectOption('500');
  await expect(example.locator('output')).toContainText(
    'On time: 12/12. Labeled pairs: 10. Paired errors: incumbent 3/10, shadow 3/10',
  );
  await expect(example.locator('#interpretation')).toContainText('970 worker-ms');
  await example.getByLabel('Label snapshot', { exact: true }).selectOption('complete');
  await expect(example.locator('output')).toContainText(
    'Labeled pairs: 12. Paired errors: incumbent 5/12, shadow 3/12',
  );
  await example.getByLabel('Isolated shadow workers', { exact: true }).selectOption('1');
  await expect(example.locator('#interpretation')).toContainText('695 ms');
  await example.getByLabel('Isolated shadow workers', { exact: true }).selectOption('4');
  await expect(example.locator('#interpretation')).toContainText('240 ms');
  await example.getByLabel('Mirror selection', { exact: true }).selectOption('quarter');
  await expect(example.locator('output')).toContainText('Mirrored: 3/12');
  await expect(example.locator('#interpretation')).toContainText('165 worker-ms');
  await example.getByLabel('Mirror selection', { exact: true }).selectOption('off');
  await expect(example.locator('#interpretation')).toContainText('rates are undefined');
  await expect(example.locator('#metrics')).toContainText('0/0 (undefined)');
  await expect(example.locator('#mechanism')).toContainText('0 shadow');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.getByLabel('Mirror selection', { exact: true })).toHaveValue('all');
  await expect(example.getByLabel('Isolated shadow workers', { exact: true })).toHaveValue('2');
  await expect(example.getByLabel('Shadow deadline', { exact: false })).toHaveValue('150');
  await expect(example.getByLabel('Label snapshot', { exact: true })).toHaveValue('partial');
  await example.getByLabel('Mirror selection', { exact: true }).selectOption('odd');
  await expect(example.locator('output')).toContainText('Mirrored: 6/12');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-training-and-deployment');
  await expect(page.getByRole('link', { name: /Shadow Deployment/ }).first()).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/shadow-deployment' + suffix + '.svg');
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
