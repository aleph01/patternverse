import { expect, test } from '@playwright/test';

// The same inline selector serves the full-width Library on desktop and phone.
test('choosing a Verse collapses the selector and Change verse reopens it without an All verses action', async ({
  page,
}, info) => {
  await page.goto('/library');
  const picker = page.locator('.mobile-verse-mosaic');
  const selector = picker.locator('.verse-selector');
  const filters = picker.getByRole('navigation', { name: 'Verse Areas' });
  await expect(filters.getByRole('button', { name: 'Arts & Design' })).toBeEnabled();
  const availableAreas = await picker.locator('.selector-area').count();
  expect(availableAreas).toBeGreaterThanOrEqual(5);
  expect(await picker.locator('.verse-square').count()).toBeGreaterThanOrEqual(17);
  await expect(picker.getByRole('button', { name: 'All verses', exact: true })).toHaveCount(0);
  await filters.getByRole('button', { name: 'Arts & Design' }).click();
  await expect(picker.locator('.selector-area')).toHaveCount(1);
  await expect(page).toHaveURL('/library');
  await picker.getByRole('button', { name: 'Architecture', exact: true }).click();
  await expect(page).toHaveURL('/library?verse=commons%3Aarchitecture');
  await expect(selector).toHaveAttribute('data-state', 'closed');
  await expect(picker.locator('.verse-chooser')).toHaveAttribute('aria-hidden', 'true');
  await expect(picker.getByRole('heading', { name: 'Architecture', exact: true })).toBeVisible();
  await expect(picker.getByRole('button', { name: 'Change verse', exact: true })).toBeFocused();
  await expect(picker).toHaveJSProperty(
    'scrollWidth',
    await picker.evaluate((node) => node.clientWidth),
  );
  await picker.screenshot({ path: info.outputPath('selected-verse-bar.png') });
  await page.reload();
  await expect(picker.getByRole('button', { name: 'Change verse', exact: true })).toBeEnabled();
  await expect(selector).toHaveAttribute('data-state', 'closed');
  await picker.getByRole('button', { name: 'Change verse', exact: true }).click();
  await expect(picker.getByRole('button', { name: 'Architecture', exact: true })).toBeFocused();
  await filters.getByRole('button', { name: 'Thinking & Learning' }).click();
  await picker.getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(page).toHaveURL('/library?verse=commons%3Alearning');
  await expect(selector).toHaveAttribute('data-state', 'closed');
  await expect(picker.getByRole('button', { name: 'All verses', exact: true })).toHaveCount(0);
  await picker.getByRole('button', { name: 'Change verse', exact: true }).click();
  await filters.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page).toHaveURL('/library?verse=commons%3Alearning');
  await expect(picker.locator('.selector-area')).toHaveCount(availableAreas);
  await expect(picker.getByRole('button', { name: 'Learning', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await picker.screenshot({ path: info.outputPath('horizontal-verse-areas.png') });
});

test('horizontal rows scroll on phone, tablet, and desktop and retain their position after reselection', async ({
  page,
}) => {
  await page.goto('/library');
  const picker = page.locator('.mobile-verse-mosaic');
  await expect(picker.getByRole('button', { name: 'Done', exact: true })).toBeEnabled();
  const track = picker.locator('.verse-track[data-area="thinking"]');
  const next = picker.getByRole('button', {
    name: 'More Verses in Thinking & Learning',
    exact: true,
  });
  for (const width of [320, 390, 768, 801, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(track).toHaveCSS('display', 'flex');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await picker
        .locator('.verse-square')
        .evaluateAll((nodes) => nodes.every((node) => node.scrollWidth <= node.clientWidth)),
    ).toBe(true);
    await track.evaluate((node) => {
      node.scrollLeft = 0;
      node.dispatchEvent(new Event('scroll'));
    });
    await expect(next).toBeEnabled();
    await next.click();
    await expect.poll(() => track.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await picker.getByRole('button', { name: 'Pedagogy', exact: true }).click();
  await expect(picker.locator('.verse-selector')).toHaveAttribute('data-state', 'closed');
  const savedScroll = await track.evaluate((node) => node.scrollLeft);
  await picker.getByRole('button', { name: 'Change verse', exact: true }).click();
  await expect(picker.getByRole('button', { name: 'Pedagogy', exact: true })).toBeFocused();
  expect(await track.evaluate((node) => node.scrollLeft)).toBeCloseTo(savedScroll, 0);
});

test('selection animates through closing and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/library');
  const picker = page.locator('.mobile-verse-mosaic');
  await expect(picker.getByRole('button', { name: 'Done', exact: true })).toBeEnabled();
  await picker.locator('.verse-selector').evaluate((node) => {
    node.setAttribute('data-observed-states', 'open');
    new MutationObserver(() =>
      node.setAttribute(
        'data-observed-states',
        `${node.getAttribute('data-observed-states')},${node.getAttribute('data-state')}`,
      ),
    ).observe(node, { attributes: true, attributeFilter: ['data-state'] });
  });
  await picker.getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(picker.locator('.verse-selector')).toHaveAttribute('data-state', 'closed');
  await expect(picker.locator('.verse-selector')).toHaveAttribute(
    'data-observed-states',
    /closing,closed/,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await picker.getByRole('button', { name: 'Change verse', exact: true }).click();
  await expect(picker.locator('.verse-chooser-wrap')).toHaveCSS('transition-duration', '0s');
  // Choosing the current Verse still closes the chooser, even though its URL is unchanged.
  await picker.getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(picker.locator('.verse-selector')).toHaveAttribute('data-state', 'closed');
  await expect(page).toHaveURL('/library?verse=commons%3Alearning');
});

test('the phone picker keeps selection focus and returns to results after its collapse', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile-chromium');
  await page.goto('/library?verse=commons%3Alearning');
  const mosaic = page.locator('.mobile-verse-mosaic');
  await expect(mosaic.getByRole('button', { name: 'Change verse', exact: true })).toBeEnabled();
  await expect(mosaic.getByRole('heading', { name: 'Learning', exact: true })).toBeVisible();
  const collection = page.getByRole('button', { name: /^Learning How to Learn \d+ patterns$/ });
  await expect(collection).toBeVisible();
  if ((await collection.getAttribute('aria-expanded')) !== 'true') await collection.click();
  expect(
    await page
      .getByRole('region', { name: 'Learning How to Learn patterns', exact: true })
      .getByRole('link')
      .count(),
  ).toBeGreaterThan(10);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const change = page.getByRole('button', { name: 'Change Verse', exact: true });
  await expect(change).toBeVisible();
  await change.click();
  const dialog = page.getByRole('dialog', { name: 'Choose a Verse', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Learning', exact: true })).toBeFocused();
  await dialog
    .getByRole('navigation', { name: 'Verse Areas' })
    .getByRole('button', { name: 'Science & Technology' })
    .click();
  await expect(dialog.locator('.verse-area-divider')).toHaveCount(1);
  await dialog.screenshot({ path: info.outputPath('phone-horizontal-picker.png') });
  await dialog.getByRole('button', { name: 'Software Engineering', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL('/library?verse=commons%3Asoftware-engineering');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await expect(page.locator('.library-results-heading')).toBeInViewport();
  await expect(mosaic.getByRole('button', { name: 'All verses', exact: true })).toHaveCount(0);
});
