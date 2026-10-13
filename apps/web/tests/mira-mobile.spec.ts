import { expect, test } from '@playwright/test';

test('offers a soft logo-only mobile header and a functional practice bottom sheet', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/mira');
  await expect(page.locator('.mira-brand span')).toBeHidden();
  await expect(page.locator('.mira-brand .mira-mark')).toBeVisible();
  await page.getByRole('button', { name: 'Choose a pattern or practice' }).click();
  const picker = page.getByRole('dialog', { name: 'Patterns & practices' });
  await expect(picker).toBeVisible();
  await expect(
    picker.getByRole('button', { name: 'Close pattern and practice selector' }),
  ).toBeInViewport();
  await picker.locator('.mira-picker-results').evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await expect(picker.getByRole('searchbox')).toBeInViewport();
  await expect(
    picker.getByRole('button', { name: 'Close pattern and practice selector' }),
  ).toBeInViewport();
  const bounds = await picker.boundingBox();
  await expect(picker.getByRole('button', { name: 'Continue without a practice' })).toHaveCount(0);
  await picker.getByRole('button', { name: 'Close pattern and practice selector' }).click();
  await expect(picker).toHaveCount(0);
  // The welcome trigger is replaced when the first session is created.
  await expect(page.getByRole('button', { name: 'Choose a pattern or practice' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose a pattern or practice' }).click();
  await picker.getByRole('button', { name: 'Close pattern and practice selector' }).click();
  await expect(page.getByRole('button', { name: 'Choose a pattern or practice' })).toBeFocused();
  await page.getByRole('button', { name: 'Choose a pattern or practice' }).click();
  expect(Math.abs(bounds!.y + bounds!.height - 844)).toBeLessThan(2);
  await expect(picker.getByRole('group', { name: 'Practice category' })).toHaveCount(0);
  await picker.getByRole('searchbox').fill('Creative Reframing');
  await expect(picker.getByRole('button', { name: /Creative Reframing/ })).toHaveCount(0);
  await picker.getByRole('button', { name: 'Close pattern and practice selector' }).click();
  await expect(page.getByRole('button', { name: 'Choose a pattern or practice' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose therapy approach' }).click();
  await page
    .getByRole('dialog', { name: 'Therapy approach' })
    .getByRole('button', { name: /CBT/ })
    .click();
  await page.getByRole('button', { name: 'Choose a pattern or practice' }).click();
  await expect(picker.getByRole('button', { name: /Creative Reframing/ })).toHaveCount(0);
  await expect(
    picker.getByRole('button', { name: /Identify Cognitive Distortions/ }),
  ).toBeAttached();
  await expect(
    picker.getByRole('button', { name: /Identify Cognitive Distortions/ }),
  ).toContainText('Guided practice · CBT');
  await picker.getByRole('searchbox').fill('thought');
  await expect(picker.getByRole('button', { name: /Thought Record/ })).toBeVisible();
  await picker.getByRole('searchbox').fill('Creative Reframing');
  await expect(picker.getByRole('button', { name: /Creative Reframing/ })).toHaveCount(0);
  await picker.getByRole('button', { name: 'Close pattern and practice selector' }).click();
  await page.getByRole('button', { name: 'Choose therapy approach' }).click();
  await page
    .getByRole('dialog', { name: 'Therapy approach' })
    .getByRole('button', { name: /DBT/ })
    .click();
  await page.getByRole('button', { name: 'Choose a pattern or practice' }).click();
  await expect(
    picker.getByRole('button', { name: /Thought Record|Identify Cognitive Distortions/ }),
  ).toHaveCount(0);
  await expect(picker.locator('.mira-pattern-option')).toHaveCount(0);
  await expect(picker.getByText(/Guided practice · DBT/).first()).toBeVisible();
  await picker.getByRole('button', { name: 'Close pattern and practice selector' }).click();
  await page.getByRole('button', { name: 'Choose therapy approach' }).click();
  await page
    .getByRole('dialog', { name: 'Therapy approach' })
    .getByRole('button', { name: /CBT/ })
    .click();
  await page.getByRole('button', { name: 'Choose a pattern or practice' }).click();
  await picker.getByRole('searchbox').fill('Identify Cognitive Distortions');
  await picker.getByRole('button', { name: /Identify Cognitive Distortions/ }).click();
  await picker.getByRole('button', { name: 'Start selected exercise' }).click();
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'End exercise' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose a pattern or practice' }).click();
  await picker.press('Escape');
  await expect(page.getByRole('button', { name: 'Choose a pattern or practice' })).toBeFocused();
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole('textbox', { name: 'Message mira' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
      844,
    );
  }
});
