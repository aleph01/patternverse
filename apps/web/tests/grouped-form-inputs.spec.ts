import { expect, test } from '@playwright/test';

const source = `:language 1
:output assessment
assessment = !form {
  :title "Assess an initiative"
  initiative = !ask {
    What initiative are you considering?
  }
  impact = !rate -2.5..5 {
    :low "Small improvement"
    :high "Major improvement"
    Expected impact?
  }
  evidence = !choose {
    What supports your estimate?
    - observed: "Observed results"
    - assumption: "An untested assumption"
  }
  dependencies = !choose [multi, min=0, max=1] {
    Which team is needed?
    - design: "Design"
    - engineering: "Engineering"
  }
}
-> end
`;

test('mixed forms submit once and preserve drafts after invalid numeric or choice answers', async ({
  page,
}, info) => {
  await page.goto('/editor?type=pattern');
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await page.getByRole('textbox', { name: 'Practice source', exact: true }).fill(source);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  if (info.project.name === 'mobile-chromium')
    await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Run preview', exact: true }).click();
  const form = page.locator('.preview .pattern-form');
  const submit = form.getByRole('button', { name: /^(?:Next step|Continue) ↓$/, exact: true });
  const rating = form.getByRole('spinbutton', { name: 'Expected impact?' });
  await expect(rating).toHaveValue('');
  await expect(form.getByRole('button')).toHaveCount(1);
  await form.getByRole('textbox').fill('Improve onboarding');
  await submit.click();
  await expect(form.getByRole('alert')).toContainText('Enter a number');
  await rating.fill('5.1');
  await submit.click();
  await expect(form.getByRole('alert')).toContainText('Enter a number');
  await rating.fill('-1.5');
  await form.getByRole('radio', { name: 'Observed results' }).press('Space');
  await form.getByRole('checkbox', { name: 'Design', exact: true }).press('Space');
  await form.getByRole('checkbox', { name: 'Engineering', exact: true }).press('Space');
  await submit.click();
  await expect(form.getByRole('alert')).toContainText('Which team');
  await expect(form.getByRole('textbox')).toHaveValue('Improve onboarding');
  await expect(rating).toHaveValue('-1.5');
  await form.getByRole('checkbox', { name: 'Engineering', exact: true }).uncheck();
  await expect(page.getByText(/^Practice complete\./)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.preview').screenshot({ path: info.outputPath('grouped-form-draft.png') });
  await submit.click();
  await expect(page.getByText(/^Practice complete\./)).toBeVisible();
  await expect(form.getByText('-1.5', { exact: true })).toBeVisible();
  await expect(form.getByText('Observed results', { exact: true })).toBeVisible();
  await expect(form.getByText('Design', { exact: true })).toBeVisible();
  await expect(form.getByRole('button')).toHaveCount(0);
});
