import { expect, test } from '@playwright/test';

test('offers two flat creativity collections with useful starting techniques', async ({ page }) => {
  await page.goto('/verse/creativity');
  const collections = page.locator('.verse-groups .paginated-entries[aria-label="Collections"]');
  await expect(collections.getByRole('link')).toHaveCount(2);
  await expect(
    collections.getByRole('link', { name: /See the Problem Differently/ }),
  ).toHaveAttribute('href', '/collection/reframing');
  await expect(collections.getByRole('link', { name: /Find New Possibilities/ })).toHaveAttribute(
    'href',
    '/collection/getting-unstuck',
  );
  for (const [id, title, count, first] of [
    ['reframing', 'See the Problem Differently', 17, 'Rapid Reframe'],
    ['getting-unstuck', 'Find New Possibilities', 9, 'Five Alternative Frames'],
  ] as const) {
    await page.goto(`/collection/${id}`);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    const entries = page.getByRole('region', { name: 'Collection entries', exact: true });
    await expect(entries.getByRole('link')).toHaveCount(count);
    await expect(entries.locator('h3').first()).toHaveText(first);
    await expect(entries.locator('a[href^="/collection/"]')).toHaveCount(0);
  }
});

test('redirects former reframing groups to their consolidated collection', async ({ page }) => {
  for (const [old, destination] of [
    ['reframing-start-here', 'reframing'],
    ['reframing-inspect-frame', 'reframing'],
    ['reframing-question-goal', 'reframing'],
    ['reframing-change-perspective', 'getting-unstuck'],
    ['reframing-move-forward', 'getting-unstuck'],
  ]) {
    await page.goto(`/collection/${old}`);
    await expect(page).toHaveURL(`/collection/${destination}`);
    await expect(
      page.getByRole('region', { name: 'Collection entries', exact: true }),
    ).toBeVisible();
  }
});
