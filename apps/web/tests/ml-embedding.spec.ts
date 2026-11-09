import { expect, test } from '@playwright/test';

test('Embedding performs actual row updates, distinguishes retrieval metrics, handles unknown IDs and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-embedding');
  await expect(page.getByRole('heading', { name: 'Embedding', exact: true }).first()).toBeVisible();
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
  const initial = 'Camp Cooking · updates 0/12. Dot 0.000; model p 0.500; loss 0.693 nats.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#ranking tbody tr').first()).toContainText('Weekend Trails');
  await ex.getByLabel('Retrieval scoring rule', { exact: true }).selectOption('cosine');
  await expect(ex.locator('#ranking tbody tr').first()).toContainText('Hiking Guide');
  await expect(ex.locator('output')).toHaveText(initial);
  await ex.getByRole('button', { name: 'Learn one step', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(
    'Camp Cooking · updates 1/12. Dot 0.500; model p 0.622; loss 0.474 nats.',
  );
  await ex.locator('#mechanism').screenshot({ path: info.outputPath('after-one-step.png') });
  await ex.locator('#state summary').click();
  await expect(ex.locator('#vectors tbody tr').nth(1)).toContainText('0.500000');
  await expect(ex.locator('#history tbody tr')).toHaveCount(1);
  await ex.getByLabel('Title for the next example', { exact: true }).selectOption('2');
  await ex.getByLabel('Observed feedback', { exact: true }).selectOption('0');
  await ex.getByRole('button', { name: 'Learn ten steps', exact: true }).click();
  await ex.getByRole('button', { name: 'Learn ten steps', exact: true }).click();
  await expect(ex.locator('output')).toContainText('updates 12/12');
  await expect(ex.getByRole('button', { name: 'Learn one step', exact: true })).toBeDisabled();
  await expect(ex.locator('#history tbody tr')).toHaveCount(12);
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await ex.getByLabel('Title for the next example', { exact: true }).selectOption('4');
  await expect(ex.locator('#interpretation')).toContainText('cosine is N/A');
  await expect(ex.getByRole('button', { name: 'Learn one step', exact: true })).toBeDisabled();
  await expect(ex.locator('#ranking tbody tr')).toHaveCount(4);
  await ex.locator('#mechanism').screenshot({ path: info.outputPath('unknown-id.png') });
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-inputs-and-features');
  await expect(page.getByRole('link', { name: 'Embedding', exact: true }).first()).toBeVisible();
});

test('Embedding keeps all labels inside both authored illustration layouts', async ({ page }) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/embedding' + suffix + '.svg');
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
