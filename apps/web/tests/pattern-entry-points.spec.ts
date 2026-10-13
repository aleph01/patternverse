import { expect, test } from '@playwright/test';

test('groups compact article shortcuts at the top, with quiet choices at the end', async ({
  page,
}) => {
  await page.goto('/pattern/find-the-positive-intention');
  const shortcuts = page.getByRole('navigation', { name: 'Pattern shortcuts' });
  await expect(shortcuts.getByRole('link')).toHaveCount(2);
  await expect(shortcuts).toBeInViewport();
  await expect(page.locator('.reading-actions')).toHaveCSS('position', 'static');
  const choices = page.getByRole('region', { name: 'try this pattern', exact: true });
  await choices.scrollIntoViewIfNeeded();
  await expect(choices.getByRole('heading', { name: 'By yourself' })).toBeVisible();
  await expect(choices.getByRole('heading', { name: 'With mira', exact: true })).toBeVisible();
  expect(
    await choices
      .getByRole('heading', { name: 'By yourself' })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeLessThan(20);
  const bounds = await shortcuts.getByRole('link').first().boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/pattern/abstract-factory');
  await expect(page.getByRole('navigation', { name: 'Pattern shortcuts' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'try this pattern', exact: true })).toHaveCount(0);
});

test('runs an NLP source as an appended worksheet without Mira or AI', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/^https:\/\/(?:openrouter\.ai|api\.openai\.com)\//.test(request.url()))
      external.push(request.url());
  });
  await page.goto('/pattern/redefine-the-terms');
  await page
    .getByRole('navigation', { name: 'Pattern shortcuts' })
    .getByRole('link', { name: 'Try this pattern yourself' })
    .click();
  await expect(page).toHaveURL(/\/pattern\/redefine-the-terms\/run$/);
  await page.getByRole('button', { name: /Begin reflection/ }).click();
  await page
    .getByRole('textbox', { name: 'Your response' })
    .fill('I called one missed deadline a failure.');
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(
    page.getByText('I called one missed deadline a failure.', { exact: true }),
  ).toBeVisible();
  for (let step = 2; step <= 6; step += 1) {
    await page
      .getByRole('textbox', { name: 'Your response' })
      .fill(`A specific observation for step ${step}.`);
    await page.getByRole('button', { name: /Continue/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'A moment to review.' })).toBeVisible();
  expect(external).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('shows and preserves the selected NLP article in Mira', async ({ page }) => {
  await page.goto('/pattern/find-the-positive-intention');
  await page
    .getByRole('navigation', { name: 'Pattern shortcuts' })
    .getByRole('link', { name: 'Explore this pattern with mira' })
    .click();
  await page
    .locator('.mira-context-actions')
    .getByRole('button', { name: 'New session', exact: true })
    .click();
  const card = page.getByRole('region', { name: 'Selected pattern', exact: true });
  await expect(card.getByRole('heading', { name: 'Find the Positive Intention' })).toBeVisible();
  await card.getByText('Read article', { exact: true }).click();
  await expect(
    card.getByRole('heading', { name: 'What the objection is protecting' }),
  ).toBeVisible();
  await expect(card).toContainText('Robert Dilts');
  await expect(card.getByRole('link', { name: /Try yourself/ })).toHaveAttribute(
    'href',
    '/pattern/find-the-positive-intention/run',
  );
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toBeVisible();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole('textbox', { name: 'Message mira' })).toBeInViewport();
  }
  await page.goto('/mira');
  await expect(card.getByRole('heading', { name: 'Find the Positive Intention' })).toBeVisible();
  await expect(card.getByRole('link', { name: /Back to pattern/ })).toHaveAttribute(
    'href',
    '/pattern/find-the-positive-intention',
  );
  await card.getByRole('button', { name: 'Remove selected library pattern' }).click();
  await expect(card).toHaveCount(0);
});

test('attaches the canonical CBT article when starting through Mira home', async ({ page }) => {
  await page.goto('/apps/mira?technique=cbt.thought-record');
  await page
    .getByRole('button', { name: /New session|Start/ })
    .first()
    .click();
  const card = page.getByRole('region', { name: 'Selected pattern', exact: true }).first();
  await expect(
    card.getByRole('heading', { name: 'Thought Record / Cognitive Restructuring' }),
  ).toBeVisible();
  await expect(card.getByRole('link', { name: /Back to pattern/ })).toHaveAttribute(
    'href',
    '/pattern/cbt-thought-record',
  );
});

test('grounds Mira replies in the full selected article without making a real AI request', async ({
  page,
}) => {
  let systemPrompt = '';
  await page.route('https://openrouter.ai/api/v1/key', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { usage_monthly: 0 } }),
    }),
  );
  await page.route('https://openrouter.ai/api/v1/chat/completions', (route) => {
    systemPrompt = route.request().postDataJSON().messages[0].content;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { content: 'What concern might this strategy be protecting?' } }],
      }),
    });
  });
  await page.goto('/mira?source=commons&pattern=find-the-positive-intention');
  await page
    .locator('.mira-context-actions')
    .getByRole('button', { name: 'New session', exact: true })
    .click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.getByText('Advanced · enter an API key manually', { exact: true }).click();
  await settings.getByLabel('OpenRouter API key').fill('test-key');
  await settings.getByRole('button', { name: 'Save API key' }).click();
  await settings.getByRole('button', { name: 'Close settings' }).click();
  await page
    .getByRole('textbox', { name: 'Message mira' })
    .fill('Help me explore this everyday example.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(
    page.getByText('What concern might this strategy be protecting?', { exact: true }),
  ).toBeVisible();
  expect(systemPrompt).toContain('A product manager refuses to launch a feature');
  expect(systemPrompt).toContain('Understanding an intention also leaves responsibility intact.');
  expect(systemPrompt).toContain('untrusted reference material');
  expect(systemPrompt).not.toContain('patternverse-language');
});
