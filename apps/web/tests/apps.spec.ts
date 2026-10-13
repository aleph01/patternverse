import { expect, test } from '@playwright/test';

test('a CBT checklist and cached pattern page work offline', async ({ page, context }) => {
  await page.goto('/pattern/cbt-thinking-patterns');
  await page.goto('/apps/mira?technique=cbt.thinking-patterns');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.getByRole('button', { name: '+ New session', exact: true }).click();
  await page.getByRole('button', { name: 'Start selected exercise' }).click();
  await page.getByRole('button', { name: 'Yes, begin gently' }).click();
  await context.setOffline(true);
  await page
    .getByLabel('Exercise response')
    .fill('One mistake means the whole effort was worthless.');
  await page.getByRole('button', { name: 'Continue ↓', exact: true }).click();
  await page.getByLabel('All-or-nothing thinking', { exact: true }).check();
  await page.getByLabel('Disqualifying or discounting the positive', { exact: true }).check();
  await page.getByRole('button', { name: 'Continue ↓', exact: true }).click();
  await expect(page.getByLabel('Exercise response')).toBeVisible();
  await page.getByRole('link', { name: 'mira home' }).click();
  await expect(page.locator('.landing-session')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.landing-session')).toHaveCount(1);
  await page.goto('/pattern/cbt-thinking-patterns');
  await expect(
    page.getByRole('heading', { name: 'Identify Cognitive Distortions', exact: true }),
  ).toBeVisible();
  const actionPanel = page.getByRole('region', { name: 'Ways to use this pattern' });
  await expect(actionPanel.getByRole('heading', { name: 'Try it yourself' })).toBeVisible();
  await expect(actionPanel.getByRole('heading', { name: 'Talk it through' })).toBeVisible();
});

test('Apps opens mira, creates a session using the preferred approach, and manages it', async ({
  page,
}) => {
  await page.goto('/apps');
  await page.getByRole('link', { name: /Open mira/ }).click();
  await expect(page.getByRole('heading', { name: 'mira', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'NARM', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /CBT/ }).click();
  await page.getByRole('button', { name: '+ New session', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toBeVisible();
  await page.getByRole('link', { name: 'mira home' }).click();
  await expect(page.locator('.landing-session')).toHaveCount(1);
  await expect(page.locator('.landing-session')).toContainText('CBT');
  const sessionActions = page.getByLabel('Manage New session');
  await sessionActions.hover();
  await expect(sessionActions).toHaveAttribute('title', 'Rename or delete session');
  await sessionActions.click();
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
  await page.getByLabel('Session name').fill('A useful reflection');
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCSS(
    'border-radius',
    '999px',
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('link', { name: /A useful reflection/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'CBT', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /A useful reflection/ })).toBeVisible();
  for (const width of [320, 390, 768, 1200]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByLabel('Manage A useful reflection').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  const confirmation = page.getByRole('group', { name: 'Delete A useful reflection' });
  await expect(confirmation).toContainText('Delete this session?');
  await confirmation.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('.landing-session')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.landing-session')).toHaveCount(0);
});

test('a library technique opens for review and runs with checklist choices without AI', async ({
  page,
}) => {
  await page.route('https://openrouter.ai/**', (route) => route.abort());
  await page.goto('/collection/cbt');
  await page
    .getByRole('link', { name: /Identify Cognitive Distortions/ })
    .first()
    .click();
  await page.getByRole('link', { name: 'Open in mira' }).click();
  await expect(page.getByRole('complementary', { name: 'Selected technique' })).toContainText(
    'Identify Cognitive Distortions',
  );
  await page.getByRole('button', { name: '+ New session', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Selected pattern' })).toContainText(
    'Identify Cognitive Distortions',
  );
  await page.getByRole('button', { name: 'Start selected exercise' }).click();
  await page.getByRole('button', { name: 'Yes, begin gently' }).click();
  await page.getByLabel('Exercise response').fill('I always get everything wrong.');
  await page.getByRole('button', { name: 'Continue ↓', exact: true }).click();
  await page.getByLabel('All-or-nothing thinking').check();
  await page.getByLabel('Overgeneralization').check();
  await page.getByRole('button', { name: 'Continue ↓', exact: true }).click();
  await expect(page.getByLabel('Exercise response')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Close pattern and practice selector' }).click();
  await expect(page.getByLabel('Exercise response')).toBeVisible();
});
