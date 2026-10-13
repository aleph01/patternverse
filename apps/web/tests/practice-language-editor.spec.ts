import { expect, test } from '@playwright/test';

const source = `:language 1
:title "Test reflection"
answer = !ask {
What is on your mind?
}
score = !rate 0..5 {
:low "low"
:high "high"
How clear is your next step?
}
!show {
**Your note**
{{answer}}
}
-> end`;

test('authors, validates, previews and restores a private language practice', async ({
  page,
  request,
}, info) => {
  const mobile = info.project.name === 'mobile-chromium';
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('Language practice review');
  await page.getByRole('button', { name: 'Add Decision Making', exact: true }).click();
  await page.locator('.novel-prose').fill('An unchanged article.');
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Practice source', exact: true });
  await expect(field).toContainText('');
  await field.fill('!as');
  await field.press('Control+Space');
  await expect(page.getByRole('listbox', { name: 'Pattern suggestions' })).toBeVisible();
  await field.press('Enter');
  await expect(field).toHaveValue(/!ask response/);
  await field.fill('!show {{missing}}');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(page.getByText('Saved “Language practice review” as draft.')).toHaveCount(0);
  await expect(field).toHaveValue('!show {{missing}}');
  await field.fill(source);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  await expect(page.locator('.token-directive').first()).toBeAttached();
  if (mobile) await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Run preview', exact: true }).click();
  await page.getByLabel('Your preview response').fill('A small test note');
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  await expect(page.locator('.completed')).toContainText('A small test note');
  const scale = page.getByRole('slider');
  await expect(scale).toHaveAttribute('max', '5');
  await scale.fill('3');
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  await expect(
    page.getByText(
      'Practice complete. Your test answers remain visible until you restart or leave.',
    ),
  ).toBeVisible();
  if (mobile) await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await field.fill(source.replace('on your mind', 'important today'));
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  if (mobile) await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(page.getByText(/Source changed. Restart/)).toBeVisible();
  await expect(page.locator('.completed').first()).toContainText('What is on your mind?');
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(page.getByText('Saved “Language practice review” as draft.')).toBeVisible();
  await page.goto('/editor?id=language-practice-review');
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await expect(field).toHaveValue(source.replace('on your mind', 'important today'));
  await expect(page.locator('.novel-prose')).toContainText('An unchanged article.');
  if (mobile) {
    await page.setViewportSize({ width: 320, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
    await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Run preview', exact: true })).toBeVisible();
  await expect(page.getByText('A small test note', { exact: true })).toHaveCount(0);
  expect(await (await request.get('/library')).text()).not.toContain('Language practice review');
});
