import { expect, test } from '@playwright/test';
test('executes tool states, uncertain outcomes, replay, and resets in the article sandbox', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-tool-augmented-interaction');
  await expect(
    page.getByRole('heading', { name: 'Tool-Augmented Interaction', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  await page.screenshot({ path: info.outputPath('tool-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('tool-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await page
    .locator('.markdown-body table')
    .first()
    .screenshot({
      path: info.outputPath('tool-article-table.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Tool interaction and retry walkthrough"]')
    .frameLocator('iframe');
  const initial =
    'Event 4/4. Client: SUCCESS. Server: 2 available, 1 reservation(s). 2 tool attempts.';
  await expect(example.locator('output')).toHaveText(initial);
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#state-table', 'state'],
    ['#trace', 'trace'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('tool-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByRole('button', { name: 'Replay from start', exact: true }).click();
  await expect(example.locator('output')).toContainText(
    'Event 1/4. Client: LOOKUP_READY. Server: 5 available, 0 reservation(s).',
  );
  await expect(example.locator('#trace .example-card')).toHaveCount(1);
  await example.getByRole('button', { name: 'Next event', exact: true }).click();
  await expect(example.locator('output')).toContainText('PROPOSED');
  await example.getByRole('button', { name: 'Show complete run', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await example.getByLabel('First successful write response', { exact: true }).selectOption('lost');
  await expect(example.locator('output')).toContainText(
    'Event 5/5. Client: SUCCESS. Server: 2 available, 1 reservation(s). 3 tool attempts.',
  );
  await example.getByLabel('Maximum write attempts', { exact: true }).selectOption('1');
  await expect(example.locator('output')).toContainText(
    'Client: UNKNOWN. Server: 2 available, 1 reservation(s).',
  );
  await example.locator('#state-table').screenshot({ path: info.outputPath('tool-unknown.png') });
  await example.getByLabel('Simulated user role', { exact: true }).selectOption('viewer');
  await expect(example.locator('output')).toContainText('DENIED');
  await example.getByLabel('Tripods requested', { exact: true }).selectOption('0');
  await expect(example.locator('output')).toContainText('INVALID');
  await example.getByLabel('Tripods requested', { exact: true }).selectOption('6');
  await example.getByLabel('Simulated user role', { exact: true }).selectOption('clerk');
  await expect(example.locator('output')).toContainText('OUT_OF_STOCK');
  await example.getByLabel('Request confirmation', { exact: true }).selectOption('no');
  await expect(example.locator('output')).toContainText('NEEDS_CONFIRMATION');
  await example.locator('#contract summary').click();
  await expect(example.locator('#payload')).toBeVisible();
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  for (const [label, value] of [
    ['Tripods requested', '3'],
    ['Simulated user role', 'clerk'],
    ['Request confirmation', 'yes'],
    ['First successful write response', 'normal'],
    ['Maximum write attempts', '2'],
  ])
    await expect(example.getByLabel(label, { exact: true })).toHaveValue(value);
  await expect(example.locator('#contract')).toHaveJSProperty('open', false);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(example.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await example.locator('#mechanism').screenshot({ path: info.outputPath('tool-dark.png') });
  await page.emulateMedia({ colorScheme: 'light' });
  await example.getByLabel('Tripods requested', { exact: true }).selectOption('0');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-generative-systems');
  await expect(
    page.getByRole('link', { name: /Tool-Augmented Interaction/ }).first(),
  ).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/tool-augmented-interaction' + suffix + '.svg');
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
