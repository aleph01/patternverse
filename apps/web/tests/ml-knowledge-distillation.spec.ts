import { expect, test } from '@playwright/test';

test('reads the article and trains the student, exposes wrong-teacher behavior, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-knowledge-distillation');
  await expect(
    page.getByRole('heading', { name: 'Knowledge Distillation', exact: true }).first(),
  ).toBeVisible();
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('distillation-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Knowledge distillation temperature and student explorer"]')
    .frameLocator('iframe');
  await expect(example.locator('output')).toContainText(
    'Step 0/20 · total loss 1.082. At T = 1, top class: Tie.',
  );
  await example.getByRole('button', { name: 'Train one step', exact: true }).click();
  await expect(example.locator('output')).toContainText('Step 1/20 · total loss 0.773');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await example.getByRole('button', { name: 'Train ten steps', exact: true }).click();
  await expect(example.locator('output')).toContainText('Step 10/20 · total loss 0.128');
  await expect(example.locator('#inference tr').first()).toContainText('84.7%');
  await example.locator('svg').screenshot({
    path: info.outputPath('distillation-explorer.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByRole('button', { name: 'Train ten steps', exact: true }).click();
  await expect(example.getByRole('button', { name: 'Train one step', exact: true })).toBeDisabled();
  await example.getByLabel('Teacher scenario', { exact: true }).selectOption('wrong');
  await example.getByLabel('Teacher weight α', { exact: true }).selectOption('1');
  await example.getByRole('button', { name: 'Train ten steps', exact: true }).click();
  await expect(example.locator('output')).toContainText(
    'total loss 0.057. At T = 1, top class: Billing.',
  );
  await expect(example.locator('#losses')).toContainText(
    'Hard-label CE: 3.074. Scaled teacher KL: 0.057',
  );
  await expect(example.locator('#inference tr').nth(1)).toContainText('83.1%');
  await example.getByLabel('Teacher weight α', { exact: true }).selectOption('0');
  await example.getByRole('button', { name: 'Train ten steps', exact: true }).click();
  await expect(example.locator('output')).toContainText(
    'total loss 0.152. At T = 1, top class: Delivery.',
  );
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await example.getByLabel('Training temperature', { exact: true }).selectOption('4');
  await expect(example.locator('svg')).toContainText('50.6%');
  await expect(example.locator('output')).toContainText('Step 0/20');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.getByLabel('Training temperature', { exact: true })).toHaveValue('2');
  await expect(example.getByLabel('Teacher weight α', { exact: true })).toHaveValue('0.5');
  await expect(example.locator('output')).toContainText('Step 0/20 · total loss 1.082');
  await page.goto('/collection/machine-learning-learning-and-adaptation');
  await expect(page.getByRole('link', { name: /Knowledge Distillation/ }).first()).toBeVisible();
});

test('keeps all explanatory text inside both original illustration layouts', async ({ page }) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/knowledge-distillation' + suffix + '.svg');
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
