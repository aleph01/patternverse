import { expect, test } from '@playwright/test';

test('keeps chat and local practice selectors available while hiding advanced Mira tools', async ({
  page,
}) => {
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose therapy approach' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose a pattern or practice' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start voice input' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start voice control' })).toHaveCount(0);
  await page.keyboard.press('Shift+Space');
  const picker = page.getByRole('dialog', { name: 'Patterns & practices' });
  await expect(picker).toBeVisible();
  await picker.getByRole('button', { name: 'Close pattern and practice selector' }).click();
  await page.getByRole('button', { name: 'Choose therapy approach' }).click();
  await page
    .getByRole('dialog', { name: 'Therapy approach' })
    .getByRole('button', { name: /CBT/ })
    .click();
  await page.getByRole('button', { name: 'Choose a pattern or practice' }).click();
  await expect(picker.getByRole('group', { name: 'Practice category' })).toHaveCount(0);
  await expect(picker.getByRole('button', { name: /Activity–Mood Monitoring/ })).toBeVisible();
  await expect(picker.getByRole('button', { name: /Follow a worry chain/ })).toHaveCount(0);
  await picker.getByRole('searchbox').fill('Thought Record');
  await picker.getByRole('button', { name: /Thought Record/ }).click();
  await picker.getByRole('button', { name: 'Start selected exercise' }).click();
  await expect(page.getByRole('button', { name: 'Yes, begin gently' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('group', { name: 'Choose what suits you' })).toBeVisible();
  await expect(page.getByText('Advanced · choose any model')).toHaveCount(0);
  await expect(page.getByText('Voice control', { exact: true })).toHaveCount(0);
});

test('hides Dropbox while preserving the personal workspace', async ({ page }) => {
  await page.goto('/my');
  await expect(page.getByRole('heading', { name: 'your workspace.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /connect dropbox/i })).toHaveCount(0);
  await expect(page.getByText('Sync and backup', { exact: true })).toHaveCount(0);
  await page.goto('/auth/dropbox/callback?code=synthetic-code&state=synthetic-state');
  await expect(page.getByText('Dropbox sync is unavailable in this release.')).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/dropbox\/callback$/);
});

test('keeps browsing and editing patterns available', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'your library.' })).toBeVisible();
  await page.goto('/editor?type=pattern');
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true }).first()).toBeVisible();
});

test('keeps the CBT collection and its practices available without AI', async ({ page }) => {
  let aiRequests = 0;
  await page.route('https://openrouter.ai/**', (route) => {
    aiRequests += 1;
    return route.abort();
  });
  await page.goto('/pattern/reduce-the-first-step');
  await expect(page.getByRole('link', { name: 'Try this pattern', exact: true })).toHaveAttribute(
    'href',
    '/pattern/reduce-the-first-step/run',
  );
  await page.goto('/pattern/reduce-the-first-step/practice');
  await expect(page.getByRole('heading', { name: 'Name the task' })).toBeVisible();
  await page.goto('/pattern/cbt-thought-record');
  await expect(page.getByRole('link', { name: 'Try this pattern', exact: true })).toHaveAttribute(
    'href',
    '/pattern/cbt-thought-record/run',
  );
  await expect(page.getByText(/No AI needed/)).toBeVisible();
  await page.goto('/pattern/cbt-thought-record/run');
  await expect(page.getByRole('button', { name: 'Yes, begin gently' })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: /Describe a manageable, recent situation/ }),
  ).toBeVisible();
  expect(aiRequests).toBe(0);
  await page.goto('/collection/cbt');
  await expect(
    page.locator('section[aria-labelledby="collection-items-heading"] .feed-copy h3'),
  ).toHaveCount(11);
});

test('offers public standalone practice without sending creativity patterns to mira', async ({
  page,
}) => {
  await page.goto('/pattern/creative-reframing');
  await expect(page.getByRole('link', { name: 'Try this pattern', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /mira/i })).toHaveCount(0);
  await page.getByRole('link', { name: 'Try this pattern', exact: true }).click();
  await expect(page).toHaveURL(/\/practice\/five-alternative-frames\/run$/);
  await expect(page.getByRole('heading', { name: 'Describe the situation' })).toBeVisible();
  await expect(page.getByLabel('Describe the situation you are working with.')).toBeVisible();
  await page.goto('/pattern/reframing-frame-problem');
  await expect(page.getByRole('link', { name: 'Try this pattern', exact: true })).toBeVisible();
  await expect(page.getByText(/An OpenRouter connection is needed/)).toBeVisible();
  await expect(page.getByRole('link', { name: /mira/i })).toHaveCount(0);
  await page.getByRole('link', { name: 'Try this pattern', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Connect with OpenRouter', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Connect with OpenRouter ↗' })).toHaveAttribute(
    'href',
    '/auth/openrouter/connect',
  );
  await expect(page.getByLabel('OpenRouter API key')).toHaveCount(0);
  await page.goto('/pattern/reduce-the-first-step');
  await expect(page.getByRole('link', { name: 'Try this pattern', exact: true })).toHaveAttribute(
    'href',
    '/pattern/reduce-the-first-step/run',
  );
  await expect(page.getByRole('link', { name: /mira/i })).toHaveCount(0);
  await page.getByRole('link', { name: 'Try this pattern', exact: true }).click();
  await expect(page.getByLabel('What are you finding hard to start?')).toBeVisible();
});
