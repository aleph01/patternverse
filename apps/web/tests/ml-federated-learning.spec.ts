import { expect, test } from '@playwright/test';
test('reads the article, computes federated rounds and population references, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-federated-learning');
  await expect(
    page.getByRole('heading', { name: 'Federated Learning', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('federated-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('federated-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Federated training round explorer"]')
    .frameLocator('iframe');
  const initial =
    'UPDATED. Shared w: 0.367500. Centralized returned clients: 0.410625. Centralized all clients: 0.410625.';
  await expect(example.locator('output')).toHaveText(initial);
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#metrics-table', 'metrics'],
    ['#loss-table', 'losses'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('federated-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  await expect(example.locator('#losses tr').last()).toContainText('0.935028');
  await expect(example.locator('#history tr')).toHaveCount(1);
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.locator('#records summary').click();
  await expect(example.locator('#step-data tr')).toHaveCount(6);
  await example.locator('#step-data tr').last().scrollIntoViewIfNeeded();
  await expect(example.locator('#step-data tr').last()).toBeVisible();
  await expect(example.locator('#step-data tr').last()).toContainText('-0.10000 → -0.19000');
  await expect(example.locator('#step-data tr').last()).toContainText('0.90000');
  await example
    .locator('#step-data tr')
    .last()
    .screenshot({
      path: info.outputPath('federated-last-step.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  await example.getByLabel('Local steps per round', { exact: true }).selectOption('1');
  await expect(example.locator('output')).toHaveText(
    'UPDATED. Shared w: 0.225000. Centralized returned clients: 0.225000. Centralized all clients: 0.225000.',
  );
  await example.getByLabel('Local steps per round', { exact: true }).selectOption('2');
  await example.getByLabel('Aggregation objective', { exact: true }).selectOption('clients');
  await expect(example.locator('output')).toContainText('Shared w: 0.426667');
  await example.getByLabel('Aggregation objective', { exact: true }).selectOption('examples');
  await example.getByLabel('Participating clients', { exact: true }).selectOption('AC');
  await expect(example.locator('output')).toHaveText(
    'UPDATED. Shared w: 0.063333. Centralized returned clients: 0.063333. Centralized all clients: 0.410625.',
  );
  await example.getByLabel('Participating clients', { exact: true }).selectOption('none');
  await expect(example.locator('output')).toContainText('NO UPDATE. Shared w: 0.000000');
  await expect(example.locator('output')).toContainText('returned clients: undefined');
  await expect(example.locator('#step-data tr')).toHaveCount(0);
  await example.getByLabel('Participating clients', { exact: true }).selectOption('all');
  await example.getByLabel('Client B feature value x', { exact: true }).selectOption('1');
  await expect(example.locator('output')).toHaveText(
    'UPDATED. Shared w: 0.237500. Centralized returned clients: 0.237500. Centralized all clients: 0.237500.',
  );
  await example.getByLabel('Rounds to attempt', { exact: true }).selectOption('3');
  await expect(example.locator('#history tr')).toHaveCount(3);
  await expect(example.locator('#step-data tr')).toHaveCount(18);
  await expect(
    example.locator('#metrics tr').filter({ hasText: 'Logical parameter downloads / uploads' }),
  ).toContainText('9 / 9');
  await expect(
    example.locator('#metrics tr').filter({ hasText: 'Local example passes' }),
  ).toContainText('48');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.getByLabel('Local steps per round', { exact: true })).toHaveValue('2');
  await expect(example.getByLabel('Client B feature value x', { exact: true })).toHaveValue('2');
  await expect(example.getByLabel('Aggregation objective', { exact: true })).toHaveValue(
    'examples',
  );
  await expect(example.getByLabel('Participating clients', { exact: true })).toHaveValue('all');
  await expect(example.getByLabel('Rounds to attempt', { exact: true })).toHaveValue('1');
  await expect(example.locator('#records')).toHaveJSProperty('open', false);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(example.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await example.locator('#mechanism').screenshot({
    path: info.outputPath('federated-dark.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await example.getByLabel('Local steps per round', { exact: true }).selectOption('5');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-privacy-and-governance');
  await expect(page.getByRole('link', { name: /Federated Learning/ }).first()).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/federated-learning' + suffix + '.svg');
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
