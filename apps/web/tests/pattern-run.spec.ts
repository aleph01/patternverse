import { expect, test } from '@playwright/test';

test('a bundled Pattern Markdown exercise runs without opening Mira', async ({ page }) => {
  await page.route('https://openrouter.ai/**', (route) => route.abort());
  await page.goto('/pattern/cbt-thought-record');
  await page.getByRole('link', { name: 'Try this pattern', exact: true }).click();
  await expect(page).toHaveURL(/\/pattern\/cbt-thought-record\/run/);
  await expect(page.getByRole('button', { name: 'Yes, begin gently' })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: /Describe a manageable, recent situation/ }),
  ).toBeVisible();
  await page.getByLabel('Your response').fill('A friend cancelled our plans.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(
    page.getByRole('heading', { name: /Describe a manageable, recent situation/ }),
  ).toBeVisible();
  await expect(page.getByText('A friend cancelled our plans.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Your response' })).toHaveCount(1);
  await page.getByRole('button', { name: /Stop pattern/ }).click();
  await expect(page.getByText('This reflection was not saved to Mira.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the downward arrow runs offline and remains stoppable', async ({ page }) => {
  await page.route('https://openrouter.ai/**', (route) => route.abort());
  await page.goto('/pattern/cbt-downward-arrow/run');
  await page.getByLabel('Your response').fill('One mistake means I am incapable.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(page.getByRole('heading', { name: /If that thought were true/ })).toBeVisible();
  await expect(page.getByText('One mistake means I am incapable.')).toBeVisible();
  await page.getByRole('button', { name: /Stop pattern/ }).click();
  await expect(page.getByText('This reflection was not saved to Mira.')).toBeVisible();
});

test('reframing collection is browsable and rapid reframe reaches a test', async ({ page }) => {
  await page.goto('/collection/reframing');
  await expect(
    page.getByRole('heading', { name: 'See the Problem Differently', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Examine assumptions, constraints, and goals when the current approach feels stuck.',
    ),
  ).toBeVisible();
  await page.goto('/pattern/reframing-rapid-reframe');
  await expect(page.getByRole('heading', { name: 'Rapid Reframe' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try this pattern', exact: true })).toBeVisible();

  const requests: Record<string, unknown>[] = [];
  await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    requests.push(body);
    const messages = body.messages as { role: string; content: string }[];
    const system = messages.find((message) => message.role === 'system')?.content ?? '';
    const user = messages.find((message) => message.role === 'user')?.content ?? '';
    const reply = system.includes('Classify')
      ? JSON.stringify({ variant: system.includes('"solution"') ? 'solution' : 'general' })
      : system.includes('JSON in the form {"choices"')
        ? JSON.stringify({
            choices: [
              { value: 'need', label: 'People need access to the service away from a desk' },
              { value: 'reach', label: 'The right people do not encounter the current service' },
              { value: 'goal', label: 'A mobile app is not the outcome people value' },
            ],
          })
        : user.includes('small, reversible real-world learning step')
          ? 'Ask three affected people where they currently try to access the service; a different context would weaken the app-only frame.'
          : 'Maybe the underlying need is to reach people at a useful moment.';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: reply } }] }),
    });
  });
  await page.goto('/mira');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByText('Advanced · enter an API key manually', { exact: true }).click();
  await settings.getByLabel('OpenRouter API key').fill('test-key');
  await settings.getByRole('button', { name: 'Save API key' }).click();
  await page.goto('/pattern/reframing-rapid-reframe/run');
  await page.getByLabel('Your response').fill('We need to build a mobile app for this.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(page.getByText(/A possible starting frame is/)).toBeVisible();
  await page.getByLabel('Your response').fill('We need a mobile app to reach more people.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(
    page.getByRole('button', { name: /People need access to the service away/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: /People need access to the service away/ }).click();
  await expect(page.getByText(/A possible test is/)).toBeVisible();
  await page.getByLabel('Your response').fill('I will ask three people where they try to use it.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(page.getByText('This reflection was not saved to Mira.')).toBeVisible();
  expect(requests.some((body) => (body.provider as { zdr?: boolean })?.zdr === true)).toBe(true);
});
