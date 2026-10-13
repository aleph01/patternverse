import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // A restored preference confirms the controls are initialized before interacting.
  await page.addInitScript(() => {
    if (!localStorage.getItem('patternverse:library-layout')) {
      localStorage.setItem('patternverse:library-layout', 'list');
    }
  });
});

test('switches collection views without losing page, order, or browsing context', async ({
  page,
}) => {
  await page.goto('/collection/gof-design-patterns');
  const view = page.getByRole('group', { name: 'Collection view', exact: true });
  const entries = page.getByRole('region', { name: 'Collection entries', exact: true });
  const feed = entries.locator('.pattern-feed');
  await expect(view.getByRole('button', { name: 'List', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await view.getByRole('button', { name: 'Cards', exact: true }).click();
  await expect(view.getByRole('button', { name: 'Cards', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(feed).toHaveCSS('display', 'grid');
  expect(await page.evaluate(() => localStorage.getItem('patternverse:library-layout'))).toBe(
    'cards',
  );
  await entries.getByRole('button', { name: 'Go to page 2' }).click();
  await expect(entries.getByRole('status')).toContainText('21–23 of 23 entries');
  const links = await entries
    .getByRole('link')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('href')));
  await view.getByRole('button', { name: 'List', exact: true }).click();
  await expect(feed).not.toHaveClass(/card-grid/);
  await expect(entries.getByRole('status')).toContainText('21–23 of 23 entries');
  expect(
    await entries
      .getByRole('link')
      .evaluateAll((elements) => elements.map((element) => element.getAttribute('href'))),
  ).toEqual(links);
  expect(links.every((href) => href?.includes('collection=commons%3Agof-design-patterns'))).toBe(
    true,
  );
  await view.getByRole('button', { name: 'Cards', exact: true }).click();
  await expect(feed).toHaveCSS('display', 'grid');
  await expect(entries.getByRole('status')).toContainText('21–23 of 23 entries');
  await view.getByRole('button', { name: 'List', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('patternverse:library-layout'))).toBe(
    'list',
  );
  await page.reload();
  await expect(view.getByRole('button', { name: 'List', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(feed).not.toHaveClass(/card-grid/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('aligns the collection heading and entries on wide screens and stacks the switch on mobile', async ({
  page,
  isMobile,
}) => {
  if (!isMobile) await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/collection/decision-making-patterns');
  const heading = page.getByRole('heading', { name: 'In this Collection', exact: true });
  const view = page.getByRole('group', { name: 'Collection view', exact: true });
  const feed = page
    .getByRole('region', { name: 'Collection entries', exact: true })
    .locator('.pattern-feed');
  await expect(view).toBeVisible();
  await expect(view.getByRole('button', { name: 'List', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  for (const layout of ['List', 'Cards']) {
    await view.getByRole('button', { name: layout, exact: true }).click();
    await expect(feed).toHaveClass(layout === 'Cards' ? /card-grid/ : /^(?!.*card-grid)/);
    const headingBox = await heading.boundingBox();
    const feedBox = await feed.boundingBox();
    expect(headingBox).not.toBeNull();
    expect(feedBox).not.toBeNull();
    expect(Math.abs(headingBox!.x - feedBox!.x)).toBeLessThan(1);
    const viewBox = await view.boundingBox();
    if (isMobile) expect(viewBox!.y).toBeGreaterThan(headingBox!.y + headingBox!.height);
    else expect(viewBox!.x).toBeGreaterThan(headingBox!.x + headingBox!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await heading.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `/tmp/patternverse-collection-layout-${isMobile ? 'mobile' : 'wide'}.png`,
  });
});
