import { expect, test } from '@playwright/test';

test('browses the authored collection from the action row without covering the article', async ({
  page,
}, info) => {
  await page.goto('/collection/decision-making-patterns');
  await page
    .getByRole('region', { name: 'Collection entries' })
    .getByRole('link', { name: /Define the Decision Before Comparing Options/ })
    .click();
  await expect(page).toHaveURL(
    /\/pattern\/define-the-decision-before-comparing-options\?collection=commons%3Adecision-making-patterns$/,
  );
  const trigger = page.getByRole('button', { name: 'Browse Decision-Making Patterns, 2 of 8' });
  const panel = page.getByRole('region', { name: 'Collection overview' });
  const heading = page.getByRole('heading', { level: 1 });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.hover();
  await expect(panel).toHaveCount(0);
  const closedTop = (await heading.boundingBox())!.y;
  const actionRow = page.getByRole('group', { name: 'Pattern navigation and actions' });
  await expect(actionRow.getByRole('link', { name: 'Try this pattern yourself' })).toBeVisible();
  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(panel.locator('a[aria-current="page"]')).toContainText(
    'Define the Decision Before Comparing Options',
  );
  await expect(panel.locator('.collection-items')).toHaveCSS('overflow-y', 'auto');
  const bounds = await panel.boundingBox();
  expect((await heading.boundingBox())!.y).toBeGreaterThan(closedTop);
  expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(bounds!.y + bounds!.height);
  await expect(page.locator('.reading-actions')).toHaveCSS('position', 'static');
  await expect(page.locator('.collection-browser')).toHaveCSS('position', 'static');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('collection-header-open.png'), fullPage: true });
  await panel.getByRole('link', { name: 'Run a Premortem', exact: true }).click();
  await expect(page).toHaveURL(
    /\/pattern\/run-a-premortem\?collection=commons%3Adecision-making-patterns$/,
  );
  await expect(panel).toHaveCount(0);
  const nextTrigger = page.getByRole('button', { name: 'Browse Decision-Making Patterns, 3 of 8' });
  await nextTrigger.click();
  await expect(panel.locator('a[aria-current="page"]')).toContainText('Run a Premortem');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(nextTrigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await page.getByRole('link', { name: /Previous pattern: Define the Decision/ }).click();
  await expect(trigger).toBeVisible();
  await page.getByRole('link', { name: 'Next pattern: Run a Premortem' }).click();
  await expect(nextTrigger).toBeVisible();
});

test('can scroll back to the first item of a long collection and switch collection context', async ({
  page,
}, info) => {
  await page.goto('/pattern/visitor?collection=commons%3Agof-design-patterns');
  const trigger = page.getByRole('button', { name: /Browse GoF Design Patterns, 23 of 23/ });
  await trigger.focus();
  await trigger.press('Enter');
  const panel = page.getByRole('region', { name: 'Collection overview' });
  const list = panel.locator('.collection-items');
  await expect(panel).toBeVisible();
  await expect(list).toHaveCSS('display', 'block');
  await expect(page.getByRole('button', { name: 'Next pattern' })).toBeDisabled();
  await expect(panel.locator('a[aria-current="page"]')).toBeInViewport();
  await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await list.evaluate((el) => {
    el.scrollTop = 0;
  });
  const first = list.getByRole('link').first();
  await expect(first).toBeInViewport();
  await page.waitForTimeout(250);
  expect(await list.evaluate((el) => el.scrollTop)).toBe(0);
  await expect(panel.locator('a[aria-current="page"]')).not.toBeInViewport();
  await page.screenshot({ path: info.outputPath('collection-earlier-items.png') });
  await panel
    .getByRole('combobox', { name: 'Browsing collection' })
    .selectOption('commons:gof-behavioral');
  await expect(page).toHaveURL(/collection=commons%3Agof-behavioral$/);
  await expect(page.getByRole('button', { name: /Browse Behavioral, 11 of 11/ })).toBeVisible();
  await expect(panel.locator('a[aria-current="page"]')).toBeInViewport();
  await panel
    .getByRole('combobox', { name: 'Browsing collection' })
    .selectOption('commons:gof-design-patterns');
  await list.evaluate((el) => {
    el.scrollTop = 0;
  });
  await first.click();
  await expect(
    page.getByRole('button', { name: /Browse GoF Design Patterns, 1 of 23/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous pattern' })).toBeDisabled();
  await page.getByRole('link', { name: /Next pattern:/ }).click();
  await expect(
    page.getByRole('button', { name: /Browse GoF Design Patterns, 2 of 23/ }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Previous pattern:/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('keeps collection and practice controls compact at narrow widths', async ({ page }, info) => {
  await page.goto('/pattern/cbt-problem-solving?collection=commons%3Acbt');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const row = page.getByRole('group', { name: 'Pattern navigation and actions' });
    const trigger = row.getByRole('button', { name: /Browse Cognitive Behavioral Therapy/ });
    const run = row.getByRole('link', { name: 'Try this pattern yourself' });
    await expect(trigger).toBeVisible();
    await expect(run).toBeVisible();
    const triggerBounds = (await trigger.boundingBox())!;
    const runBounds = (await run.boundingBox())!;
    expect(triggerBounds.height).toBeGreaterThanOrEqual(44);
    expect(runBounds.height).toBeGreaterThanOrEqual(44);
    if (width > 800) expect(Math.abs(triggerBounds.y - runBounds.y)).toBeLessThan(2);
    else expect(runBounds.y).toBeGreaterThanOrEqual(triggerBounds.y + triggerBounds.height);
    await trigger.click();
    const panel = page.getByRole('region', { name: 'Collection overview' });
    await expect(panel).toBeVisible();
    const rect = (await panel.boundingBox())!;
    const article = (await page.locator('.entity-hero').boundingBox())!;
    expect(article.y).toBeGreaterThanOrEqual(rect.y + rect.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 1440 || width === 320)
      await page.screenshot({ path: info.outputPath(`collection-toolbar-${width}.png`) });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
});
