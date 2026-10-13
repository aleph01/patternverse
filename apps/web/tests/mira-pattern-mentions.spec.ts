import { expect, test, type Page } from '@playwright/test';

async function newChat(page: Page) {
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
}
const composer = (page: Page) => page.getByLabel('Message mira', { exact: true });

test('mentions Therapy patterns from the caret, preserves draft text, and removes chips', async ({
  page,
}) => {
  await newChat(page);
  await composer(page).fill('Discuss @worry');
  const suggestions = page.getByRole('listbox', { name: 'Therapy pattern suggestions' });
  await expect(suggestions).toBeVisible();
  await expect(suggestions.getByRole('button', { name: /Worry Time/ })).toBeVisible();
  await composer(page).press('Enter');
  const chip = page.getByRole('button', { name: /Remove Worry Time.*from draft/ });
  await expect(chip).toBeVisible();
  await expect(composer(page)).toHaveValue('Discuss ');
  await expect(page.locator('.mira-messages article.from-user')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Choose therapy approach' })).toHaveText('NARM');
  await expect(page.getByRole('button', { name: 'End exercise' })).toHaveCount(0);
  await chip.click();
  await expect(chip).toHaveCount(0);
  await expect(composer(page)).toHaveValue('Discuss ');
  await expect(composer(page)).toBeFocused();

  await composer(page).fill('person@example.com');
  await expect(suggestions).toHaveCount(0);
  await page.getByRole('button', { name: 'Mention a Therapy pattern' }).click();
  await expect(suggestions).toBeVisible();
  await page.getByLabel('Therapy collection').selectOption({ label: 'Sleep and Nightmares' });
  await expect(suggestions.getByRole('button', { name: /Rewrite the Nightmare/ })).toBeVisible();
  await expect(suggestions.getByRole('button', { name: /Worry Time/ })).toHaveCount(0);
  await composer(page).press('Escape');
  await expect(suggestions).toHaveCount(0);
  await expect(composer(page)).toHaveValue('person@example.com @');
});

test('sends mentioned articles as context, retains them across retry and reload, and clears draft chips', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const requests: { messages: { role: string; content: string }[] }[] = [];
  await page.route('https://openrouter.ai/api/v1/key', (route) =>
    route.fulfill({ json: { data: { usage_monthly: 0 } } }),
  );
  await page.route('https://openrouter.ai/api/v1/endpoints/zdr', (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill(
      requests.length === 1
        ? { status: 503, json: { error: { message: 'Synthetic failure' } } }
        : { json: { choices: [{ message: { content: 'Synthetic reflection' } }] } },
    );
  });
  await newChat(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Advanced · enter an API key manually', { exact: true }).click();
  await page.getByLabel('OpenRouter API key').fill('synthetic-key');
  await page.getByRole('button', { name: 'Save API key' }).click();
  await expect(page.getByText('Provider settings saved encrypted on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();

  await composer(page).fill('Help me think about @worry');
  await composer(page).press('Enter');
  await composer(page).pressSequentially('@nightmare');
  await composer(page).press('Enter');
  await expect(page.locator('.mira-draft-pattern')).toHaveCount(2);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('button', { name: 'Retry reply' })).toBeVisible();
  await expect(page.locator('.mira-draft-pattern')).toHaveCount(0);
  await expect(page.locator('.mira-message-patterns span')).toHaveCount(2);
  expect(requests[0].messages[0].content).toContain('Therapy modality: NARM');
  expect(requests[0].messages[0].content).toContain('Worry Time');
  expect(requests[0].messages[0].content).toContain('Rewrite the Nightmare');
  expect(requests[0].messages[0].content).toContain('<library-reference>');
  await page.reload();
  await expect(page.locator('.mira-message-patterns span')).toHaveCount(2);
  await page.getByRole('button', { name: 'Retry reply' }).click();
  await expect(page.getByText('Synthetic reflection', { exact: true })).toBeVisible();
  expect(requests[1].messages[0].content).toEqual(requests[0].messages[0].content);
  await expect(page.locator('.mira-messages article.from-user')).toHaveCount(1);
  await composer(page).fill('A new topic');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.mira-messages article.from-user')).toHaveCount(2);
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2].messages[0].content).not.toContain('<library-reference>');
  expect(errors).toEqual([]);
});

test('keeps long suggestion rows and chips within the mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await newChat(page);
  await composer(page).fill('@');
  await expect(page.getByRole('listbox')).toBeVisible();
  const layout = await page.locator('.mira-mention-picker').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.width);
  expect(layout.top).toBeGreaterThanOrEqual(0);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
  await composer(page).press('Enter');
  await expect(page.locator('.mira-draft-pattern')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
});
