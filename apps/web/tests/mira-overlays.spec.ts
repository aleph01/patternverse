import { expect, test } from '@playwright/test';

test('header drawers can be reopened after dismissal without retaining another panel', async ({
  page,
}) => {
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  const history = page.getByRole('button', { name: 'Previous sessions' });
  await settings.click();
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(settings).toBeFocused();
  await settings.click();
  await page.keyboard.press('Escape');
  await history.click();
  await expect(page.getByRole('dialog', { name: 'Sessions', exact: true })).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(history).toBeFocused();
});

test('keyboard switches selectors exclusively and returns focus to the original control', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  const approach = page.getByRole('button', { name: 'Choose therapy approach' });
  await approach.click();
  const modalities = page.getByRole('dialog', { name: 'Therapy approach' });
  await expect(modalities).toBeFocused();
  await page.keyboard.press('Shift+Space');
  const patterns = page.getByRole('dialog', { name: 'Patterns & practices' });
  await expect(patterns).toBeFocused();
  await expect(modalities).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(approach).toBeFocused();
  await page.keyboard.press('Shift+Space');
  await expect(patterns).toBeFocused();
  await page.keyboard.press('Shift+Space');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(patterns).toBeFocused();
  await patterns.getByRole('button', { name: 'Close pattern and practice selector' }).click();
  await expect(approach).toBeFocused();
  expect(failures).toEqual([]);
});

test('closing or switching presentation does not discard a guided answer draft', async ({
  page,
}) => {
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  await page.getByRole('button', { name: 'Choose therapy approach' }).click();
  await page
    .getByRole('dialog', { name: 'Therapy approach' })
    .getByRole('button', { name: /CBT/ })
    .click();
  const trigger = page.getByRole('button', { name: 'Choose a pattern or practice' });
  await trigger.click();
  const picker = page.getByRole('dialog', { name: 'Patterns & practices' });
  await picker.getByRole('searchbox').fill('Thought Record');
  await picker.getByRole('button', { name: /Thought Record/ }).click();
  await picker.getByRole('button', { name: 'Start selected exercise' }).click();
  await expect(page.getByRole('button', { name: 'End exercise' })).toBeVisible();
  const answer = page.locator('#mira-guided-answer');
  await answer.fill('A synthetic answer that stays with this running exercise.');
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(answer).toHaveValue('A synthetic answer that stays with this running exercise.');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(answer).toHaveValue('A synthetic answer that stays with this running exercise.');
  await expect(page.getByRole('button', { name: 'End exercise' })).toBeVisible();
});
