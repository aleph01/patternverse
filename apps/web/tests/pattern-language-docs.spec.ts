import { expect, test } from '@playwright/test';

test('pairs source with a real interactive result and preserves copied code', async ({
  page,
}, testInfo) => {
  await page.goto('/about/pattern-language');
  const widget = page.locator('[data-example="a-small-check-in.pattern.md"]');
  const source = widget.getByRole('region', { name: 'a-small-check-in.pattern.md source' });
  const result = widget.getByRole('region', { name: 'a-small-check-in.pattern.md live result' });
  await widget.scrollIntoViewIfNeeded();
  await result.getByLabel('Your preview response').fill('A quieter morning');
  await result.getByRole('button', { name: 'Continue →' }).click();
  await expect(
    result.getByText('You named A quieter morning. Take a moment with that.'),
  ).toBeVisible();
  const sourceBox = (await source.boundingBox())!;
  const resultBox = (await result.boundingBox())!;
  if (testInfo.project.name === 'desktop')
    expect(resultBox.x).toBeGreaterThan(sourceBox.x + sourceBox.width - 2);
  else expect(resultBox.y).toBeGreaterThan(sourceBox.y);

  const text = await source.locator('code').textContent();
  await widget.getByRole('button', { name: 'Copy a-small-check-in.pattern.md' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(text);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('edits, checks, runs, and resets an example', async ({ page }) => {
  await page.goto('/about/pattern-language');
  const widget = page.locator('[data-example="a-small-check-in.pattern.md"]');
  await widget.scrollIntoViewIfNeeded();
  await widget.getByLabel('Your preview response').waitFor();
  const original = await widget.locator('pre code').textContent();
  await widget.getByRole('button', { name: 'Edit a-small-check-in.pattern.md' }).click();
  await widget
    .getByLabel('Edit a-small-check-in.pattern.md source')
    .fill(original!.replace('What would you like to explore?', 'What is one useful action?'));
  await widget.getByRole('button', { name: 'Run changes' }).click();
  await expect(
    widget.locator('.live-result').getByText('What is one useful action?'),
  ).toBeVisible();
  await widget
    .getByLabel('Edit a-small-check-in.pattern.md source')
    .fill(original!.replace('{{focus}}', '{{missing}}'));
  await widget.getByRole('button', { name: 'Run changes' }).click();
  await expect(widget.getByRole('alert')).toContainText('Check the source');
  await widget.getByRole('button', { name: 'Reset a-small-check-in.pattern.md' }).click();
  await expect(widget.getByLabel('Your preview response')).toBeVisible();
  await expect(widget.getByRole('alert')).toHaveCount(0);
});

test('navigates the reference and switches optional inputs', async ({ page }, testInfo) => {
  await page.goto('/about/pattern-language');
  const navigation = page.locator(
    testInfo.project.name === 'phone' ? '.mobile-contents' : '.desktop-contents',
  );
  if (testInfo.project.name === 'phone') await navigation.locator('summary').click();
  await navigation.getByRole('link', { name: 'Optional values', exact: true }).click();
  const widget = page.locator('[data-example="optional-note.pattern.md"]');
  await expect(widget.locator('.live-result').getByText('No note was supplied.')).toBeVisible();
  await widget.getByLabel('Example input').selectOption('1');
  await expect(widget.locator('.live-result').getByText('Make a little space.')).toBeVisible();
  await expect(widget.locator('.live-result').getByText('No note was supplied.')).toHaveCount(0);
});

test('renders collection displays and waits for explicit external-media activation', async ({
  page,
}, testInfo) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4235')) externalRequests.push(request.url());
  });
  await page.goto('/about/pattern-language');
  const widget = page.locator('[data-example="show-ideas.pattern.md"]');
  await widget.scrollIntoViewIfNeeded();
  const display = widget.getByRole('region', { name: 'Show ideas', exact: true });
  await expect(display).toBeVisible();
  await expect(display).toContainText('Take a pause');
  await expect(display).toContainText('Ask for help');
  if (testInfo.project.name === 'desktop')
    await expect(display.locator('svg[role="img"]').first()).toBeVisible();
  const media = page.locator('#media');
  await media.scrollIntoViewIfNeeded();
  await expect(media.getByRole('button', { name: 'Run example' })).toHaveCount(2);
  await expect(media.locator('iframe, video')).toHaveCount(0);
  expect(externalRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
