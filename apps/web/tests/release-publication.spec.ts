import { expect, test } from '@playwright/test';

test('publishes The Work in Self-Inquiry without a practice section in its article', async ({
  page,
}) => {
  await page.goto('/collection/self-inquiry');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Self-Inquiry');
  await page.goto('/pattern/the-work');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Work of Byron Katie');
  await expect(page.locator('.markdown-body h2').first()).toBeVisible();
  await expect(page.locator('.markdown-body h2').filter({ hasText: /^Practice/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Try this pattern', exact: true })).toHaveAttribute(
    'href',
    '/pattern/the-work/run',
  );
});

for (const path of ['single', 'worksheet'] as const) {
  test(`runs The Work's ${path} opening without AI`, async ({ page }) => {
    const modelRequests: string[] = [];
    await page.route('https://openrouter.ai/**', (route) => {
      modelRequests.push(route.request().url());
      return route.abort();
    });
    await page.goto('/pattern/the-work/run');
    await expect(
      page
        .getByText('An independent Patternverse practice adaptation of The Work of Byron Katie.', {
          exact: false,
        })
        .first(),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name:
          path === 'single'
            ? 'I already have one stressful thought.'
            : 'Help me explore a situation first.',
        exact: true,
      })
      .click();
    if (path === 'single') {
      await page
        .getByRole('textbox')
        .nth(0)
        .fill('Maya cancelled dinner an hour before we were due to meet.');
      await page.getByRole('textbox').nth(1).fill("Maya doesn't respect my time.");
    } else {
      await page
        .getByRole('textbox')
        .first()
        .fill('Maya cancelled dinner an hour before we were due to meet.');
      await page.getByRole('button', { name: /Next step/ }).click();
      await page.getByRole('textbox').fill("Maya doesn't respect my time.");
    }
    await page.getByRole('button', { name: /Next step/ }).click();
    await expect(page.locator('.pattern-run-steps')).toContainText('Question 1: Is it true?');
    await page.getByRole('button', { name: 'No', exact: true }).click();
    await expect(page.locator('.pattern-run-steps')).toContainText(
      'Question 3: How do you react, what happens, when you believe that thought?',
    );
    await expect(page.locator('.pattern-run-steps')).not.toContainText(
      "Question 2: Can you absolutely know that it's true?",
    );
    await page.getByRole('button', { name: /Next step/ }).click();
    await expect(page.locator('.pattern-run-steps')).toContainText(
      'Question 4: Who would you be without that thought?',
    );
    await page.getByRole('button', { name: /Next step/ }).click();
    await page
      .getByRole('button', {
        name: 'Leave turnarounds for now and reflect on what I noticed.',
        exact: true,
      })
      .click();
    expect(modelRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test('does not publish the Tender Wilds route', async ({ request }) => {
  const response = await request.get('/apps/tender-wilds');
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('Tender Wilds');
});
