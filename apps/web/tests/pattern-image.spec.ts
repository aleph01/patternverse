import { expect, test } from '@playwright/test';

test('previews, enlarges and edits images on desktop and mobile', async ({ page }) => {
  await page.route('https://example.com/decision-tree.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800"><rect width="1600" height="800" fill="#ecf4ec"/><path d="M800 100V350M800 350L300 650M800 350L1300 650" stroke="#213c31" stroke-width="12"/><text x="650" y="80" font-size="40">Three options</text></svg>',
    }),
  );
  await page.goto('/editor?type=pattern');
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Practice source', exact: true });
  await field.fill(`:language 1
!image {
  :url "https://example.com/decision-tree.svg"
  :alt "Three possible next steps."
  :title "Explore your options"
  Follow **each branch**.
}
answer = !ask {
  Which option stands out?
}
-> end`);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Run preview', exact: true }).click();
  const image = page.getByRole('img', { name: 'Three possible next steps.', exact: true });
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
    .toBe(1600);
  const size = await image.boundingBox();
  expect(size!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(size!.width / size!.height).toBeCloseTo(2);
  await expect(page.getByText('each branch', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Your preview response')).toBeVisible();
  const enlarge = page.getByRole('button', { name: 'Enlarge image: Explore your options' });
  await enlarge.focus();
  await enlarge.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Explore your options' })).toBeVisible();
  await page.getByRole('button', { name: 'Close enlarged image' }).press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(enlarge).toBeFocused();
  await page.getByRole('tab', { name: 'Blocks', exact: true }).click();
  await page.getByRole('button', { name: /Image Explore your options/ }).click();
  await page.getByLabel('Alternative text', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Apply changes', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await expect(field).toHaveValue(/:alt ""/);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
});
