import { expect, test } from '@playwright/test';

test('reads the article and computes target-dependent validity from transformed pixels', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-label-preserving-augmentation');
  await expect(
    page.getByRole('heading', { name: 'Label-Preserving Augmentation', exact: true }).first(),
  ).toBeVisible();
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('augmentation-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Label-preserving augmentation explorer"]')
    .frameLocator('iframe');
  await expect(example.locator('output')).toContainText(
    'Arrow present → Arrow present. Copy original label: valid.',
  );
  await expect(example.locator('#statistics')).toContainText(
    '12/64 pixels changed; 26 foreground pixels remain.',
  );
  await example.getByLabel('Target to preserve', { exact: false }).selectOption('direction');
  await expect(example.locator('output')).toContainText(
    'Right → Left. Copy original label: invalid.',
  );
  await expect(example.locator('svg rect[data-value="100"]')).toHaveCount(52);
  await example.locator('svg').screenshot({
    path: info.outputPath('augmentation-explorer.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Flip horizontally', { exact: true }).uncheck();
  await expect(example.locator('output')).toContainText(
    'Right → Right. Copy original label: valid.',
  );
  await expect(example.locator('#statistics')).toContainText('0/64 pixels changed');
  await example.getByLabel('Flip vertically', { exact: true }).check();
  await expect(example.locator('#statistics')).toContainText('0/64 pixels changed');
  const contrast = example.getByRole('slider', { name: /Foreground contrast/ });
  await contrast.focus();
  await contrast.press('Home');
  await expect(example.locator('output')).toContainText(
    'Right → Undefined. Copy original label: unsupported.',
  );
  await expect(example.locator('#statistics')).toContainText(
    '26/64 pixels changed; 0 foreground pixels remain.',
  );
  await expect(example.locator('#statistics')).toContainText('produce 1 unique image');
  await example.getByLabel('Target to preserve', { exact: false }).selectOption('presence');
  await expect(example.locator('output')).toContainText(
    'Arrow present → No arrow. Copy original label: invalid.',
  );
  await contrast.focus();
  await contrast.press('ArrowRight');
  await expect(example.locator('output')).toContainText('Copy original label: valid.');
  await expect(example.locator('#contrast-value')).toHaveText('25%');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.getByLabel('Flip horizontally', { exact: true })).toBeChecked();
  await expect(example.getByLabel('Flip vertically', { exact: true })).not.toBeChecked();
  await expect(example.locator('#contrast-value')).toHaveText('100%');
  await example.getByLabel('Target to preserve', { exact: false }).selectOption('direction');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.getByLabel('Target to preserve', { exact: false })).toHaveValue('presence');
  await page.goto('/collection/machine-learning-learning-and-adaptation');
  await expect(
    page.getByRole('link', { name: /Label-Preserving Augmentation/ }).first(),
  ).toBeVisible();
});

test('keeps all explanatory text inside both original SVG layouts', async ({ page }) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/label-preserving-augmentation' + suffix + '.svg');
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
