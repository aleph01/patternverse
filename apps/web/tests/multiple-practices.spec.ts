import { expect, test } from '@playwright/test';

const source = (title: string, question: string) =>
  `:language 1\n:title ${JSON.stringify(title)}\nanswer = !ask {\n${question}\n}\n!show {\n{{answer}}\n}\n-> end`;

test('creates, validates, edits and removes additional practices with their parent pattern', async ({
  page,
}) => {
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('Multiple decision practices');
  await page.getByRole('button', { name: 'Add Decision Making', exact: true }).click();
  await page.locator('.novel-prose').fill('Keep the pattern article intact.');
  await page.locator('.editor-practice-disclosure summary').first().click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  await page.getByRole('button', { name: 'Add another practice', exact: true }).click();
  const drafts = page.locator('.practice-draft');
  await drafts.first().getByLabel('Practice title', { exact: true }).fill('A quick decision check');
  await drafts.first().getByLabel('What is this practice for?').fill('Name the decision.');
  await drafts.first().getByLabel('Minutes (optional)').fill('2');
  await drafts.first().getByRole('tab', { name: 'Source', exact: true }).click();
  await drafts
    .first()
    .getByRole('textbox', { name: 'Practice source', exact: true })
    .fill(source('Quick check', 'What are you deciding?'));
  await page.getByRole('button', { name: 'Add another practice', exact: true }).click();
  await drafts.nth(1).getByLabel('Practice title', { exact: true }).fill('Build a decision brief');
  await drafts
    .nth(1)
    .getByLabel('What is this practice for?')
    .fill('Name the scope and constraints.');
  await drafts.nth(1).getByRole('tab', { name: 'Source', exact: true }).click();
  await drafts
    .nth(1)
    .getByRole('textbox', { name: 'Practice source', exact: true })
    .fill('!show {{missing}}');
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Build a decision brief');
  await expect(page).toHaveURL(/type=pattern/);
  await drafts
    .nth(1)
    .getByRole('textbox', { name: 'Practice source', exact: true })
    .fill(source('Decision brief', 'Where are the boundaries?'));
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(
    page.getByText('Saved “Multiple decision practices” as draft.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(drafts).toHaveCount(2);
  await expect(page.locator('.novel-prose')).toContainText('Keep the pattern article intact.');
  await expect(page.locator('.editor-practice-status')).toHaveText('3 enabled');
  const quick = page
    .locator('.practice-draft')
    .filter({ has: page.locator('summary', { hasText: 'A quick decision check' }) });
  if ((await quick.getAttribute('open')) === null) await quick.locator('summary').click();
  await expect(quick.getByLabel('Minutes (optional)')).toHaveValue('2');
  await quick.getByLabel('Practice title', { exact: true }).fill('A revised quick check');
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(
    page.getByText('Saved “Multiple decision practices” as draft.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(drafts).toHaveCount(2);
  const revised = page
    .locator('.practice-draft')
    .filter({ has: page.locator('summary', { hasText: 'A revised quick check' }) });
  await expect(revised).toBeVisible();
  if ((await revised.getAttribute('open')) === null) await revised.locator('summary').click();
  page.once('dialog', (dialog) => dialog.accept());
  await revised.getByRole('button', { name: 'Remove from pattern', exact: true }).click();
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(
    page.getByText('Saved “Multiple decision practices” as draft.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(drafts).toHaveCount(1);
  await expect(page.locator('.editor-practice-status')).toHaveText('2 enabled');
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('keeps the original single-practice presentation and worksheet action', async ({ page }) => {
  await page.goto('/pattern/find-the-positive-intention');
  const section = page.getByRole('region', { name: 'try this pattern', exact: true });
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole('heading', { name: 'By yourself', exact: true })).toBeVisible();
  await expect(section.getByRole('heading', { name: 'With mira', exact: true })).toBeVisible();
  await expect(
    section.getByRole('heading', { name: 'In your own editor', exact: true }),
  ).toBeVisible();
  await expect(section.getByRole('table')).toHaveCount(0);
  await expect(section.getByRole('button', { name: 'Open worksheet', exact: true })).toBeVisible();
});

test('opens the specific linked practice in Mira with its own worksheet context', async ({
  page,
}) => {
  await page.goto('/mira?source=commons&pattern=five-alternative-frames');
  await page
    .locator('.mira-context-actions')
    .getByRole('button', { name: 'New session', exact: true })
    .click();
  const context = page.getByRole('region', { name: 'Selected pattern', exact: true });
  await expect(
    context.getByRole('heading', { name: 'Five Alternative Frames', exact: true }),
  ).toBeVisible();
  await expect(context.getByText('Selected practice', { exact: true })).toBeVisible();
  await context.getByText('Read article', { exact: true }).click();
  await expect(
    context.getByRole('heading', { name: 'Five Alternative Frames Practice', exact: true }),
  ).toBeVisible();
  await expect(context).toContainText('Describe the situation you are working with.');
  await expect(context.getByRole('link', { name: /Try yourself/ })).toHaveAttribute(
    'href',
    '/practice/five-alternative-frames/run',
  );
  await context.getByRole('link', { name: /Try yourself/ }).click();
  await expect(page).toHaveURL(/\/practice\/five-alternative-frames\/run$/);
  await expect(page.getByRole('textbox').first()).toBeVisible();
});
