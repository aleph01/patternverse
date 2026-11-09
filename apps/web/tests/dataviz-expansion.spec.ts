import { expect, test } from '@playwright/test';

test('brushing updates both views, supports keyboard controls, and resets the selection', async ({
  page,
}) => {
  await page.goto('/pattern/dataviz-brushing-and-linking');
  const example = page
    .frameLocator('iframe[title="Brushing and Linking explorer"]')
    .frameLocator('iframe');
  const scatter = example.locator('#panels svg').first();
  await expect(scatter).toBeVisible();
  await scatter.scrollIntoViewIfNeeded();
  const bounds = (await scatter.boundingBox())!;
  const x = (hours: number) => bounds.x + 48 + (hours / 11) * (bounds.width - 48 - 25);
  await page.mouse.move(x(3), bounds.y + 80);
  await page.mouse.down();
  await page.mouse.move(x(7), bounds.y + 140, { steps: 12 });
  await page.mouse.up();
  await expect(example.locator('#readout')).toContainText(
    '7 of 12 requests selected with 3–7 hours',
  );
  await expect(example.locator('#control-low')).toHaveValue('3');
  await expect(example.locator('#control-high')).toHaveValue('7');
  const selected = scatter.locator('g[aria-label="dot"] circle[fill="#007a4d"]');
  await expect(selected).toHaveCount(7);
  await expect(
    example.locator('#panels svg').nth(1).locator('g[aria-label="rect"]').last().locator('rect'),
  ).toHaveCount(5);
  await example.locator('#control-low').focus();
  await example.locator('#control-low').press('End');
  await expect(example.locator('#readout')).toContainText(
    '1 of 12 requests selected with 10–10 hours',
  );
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(scatter).toHaveAttribute('data-mode', 'all');
  await expect(example.locator('#control-low')).toHaveValue('3');
  await expect(example.locator('#control-high')).toHaveValue('7');
});

test('filtering has an explicit empty result and case details persist without hovering', async ({
  page,
}) => {
  await page.goto('/pattern/dataviz-filter-to-focus');
  let example = page
    .frameLocator('iframe[title="Filter to Focus explorer"]')
    .frameLocator('iframe');
  await expect(example.locator('svg')).toBeVisible();
  await example.locator('#control-minimum').focus();
  await example.locator('#control-minimum').press('End');
  await expect(example.locator('#readout')).toContainText('0 of 12 requests shown');
  await expect(example.locator('svg')).toContainText('No matching requests');
  await page.goto('/pattern/dataviz-details-on-demand');
  example = page.frameLocator('iframe[title="Details on Demand explorer"]').frameLocator('iframe');
  await example.getByLabel('Case', { exact: true }).selectOption('12');
  await expect(example.locator('#text-account')).toBeVisible();
  await expect(example.locator('#text-account')).toContainText(
    'Case 12 · West. 10 hours; 9 completed tasks.',
  );
});
