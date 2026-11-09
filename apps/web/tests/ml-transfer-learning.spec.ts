import { expect, test } from '@playwright/test';

test('Transfer Learning computes both training routes, switches tasks and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-transfer-learning');
  await expect(
    page.getByRole('heading', { name: 'Transfer Learning', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  await page.addStyleTag({ content: '.article-outline{visibility:hidden!important}' });
  await page.screenshot({ path: info.outputPath('article-viewport.png') });
  const figure = page.locator('.content-diagram');
  await figure.scrollIntoViewIfNeeded();
  await expect
    .poll(() => figure.locator('img').evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await figure.screenshot({ path: info.outputPath('figure-and-caption.png') });
  await page
    .locator('.markdown-body table')
    .first()
    .screenshot({ path: info.outputPath('worked-table.png') });
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  await page
    .locator('.article-widget > iframe')
    .evaluate((el) => el.scrollIntoView({ block: 'start' }));
  const ex = page.frameLocator('.article-widget > iframe').frameLocator('iframe');
  const initial = 'Steps 0/40. Frozen loss 0.250000; fine-tuned loss 0.250000. Training rows only.';
  await expect(ex.locator('output')).toHaveText(initial);
  await ex.getByRole('button', { name: 'Train one step', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(
    'Steps 1/40. Frozen loss 0.250000; fine-tuned loss 0.140625. Training rows only.',
  );
  await ex.locator('#mechanism').screenshot({ path: info.outputPath('after-one-step.png') });
  await ex.locator('#state summary').click();
  await expect(ex.locator('#parameters tbody tr').nth(1)).toContainText('0.250000');
  await expect(ex.locator('#predictions tbody tr')).toHaveCount(4);
  await ex.locator('#state').screenshot({ path: info.outputPath('inspection.png') });
  for (let i = 0; i < 4; i++)
    await ex.getByRole('button', { name: 'Train ten steps', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(
    'Steps 40/40. Frozen loss 0.250000; fine-tuned loss 0.000000. Training rows only.',
  );
  await expect(ex.getByRole('button', { name: 'Train one step', exact: true })).toBeDisabled();
  await ex.getByLabel('Target task', { exact: true }).selectOption('retained');
  await expect(ex.locator('output')).toHaveText(
    'Steps 0/40. Frozen loss 0.000000; fine-tuned loss 0.000000. Training rows only.',
  );
  await ex.getByRole('button', { name: 'Train ten steps', exact: true }).click();
  await expect(ex.locator('output')).toContainText(
    'Steps 10/40. Frozen loss 0.000000; fine-tuned loss 0.000000.',
  );
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await ex.getByRole('button', { name: 'Train one step', exact: true }).click();
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-learning-and-adaptation');
  await expect(
    page.getByRole('link', { name: 'Transfer Learning', exact: true }).first(),
  ).toBeVisible();
});

test('Transfer Learning keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/transfer-learning' + suffix + '.svg');
    const result = await page
      .locator('svg')
      .first()
      .evaluate((el) => {
        const root = el as SVGSVGElement,
          limit = root.viewBox.baseVal;
        return {
          style: root.dataset.mlStyle,
          weight: getComputedStyle(root.querySelector('text')!).fontWeight,
          font: getComputedStyle(root.querySelector('text')!).fontFamily,
          paper: getComputedStyle(root).backgroundColor,
          outside: [...root.querySelectorAll('text')].flatMap((label) => {
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
          }),
        };
      });
    expect(result.outside).toEqual([]);
    expect(result.style).toBe('light-editorial');
    expect(result.weight).toBe('400');
    expect(result.font).toContain('Helvetica Neue');
    expect(result.paper).toBe('rgb(255, 255, 255)');
  }
});
