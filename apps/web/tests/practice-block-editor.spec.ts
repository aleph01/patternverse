import { expect, test } from '@playwright/test';

const source = `:language 1
:title "Paths authoring"
!choose route {
  :option explore "Explore options"
  :option plan "Make a plan"
  :option unsure "Not sure yet"
  What would help?
}
!rate clarity 0..10 {
  How clear is your next step?
}
?match route {
  :case explore -> explore
  :case plan -> plan
  :else -> other
}
explore:
!ask possibilities {
  What options could you explore?
}
-> review
plan:
!ask next {
  What is one small action?
}
-> review
other:
-> review
review:
!ask takeaway {
  What will you take away?
}
!collect notes {
  :max 2
  !ask note {
    A note?
  }
}
-> end
`;

async function open(page: import('@playwright/test').Page, title: string) {
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Add Decision Making', exact: true }).click();
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await page.getByRole('textbox', { name: 'Practice source', exact: true }).fill(source);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Blocks', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Paths block', exact: true })).toBeVisible();
}

test('keeps blocks, source, private storage and the real preview synchronized', async ({
  page,
}, info) => {
  await open(page, 'Block paths review');
  const paths = page.getByRole('region', { name: 'Paths block', exact: true });
  const first = paths.getByRole('region', { name: 'Case 1', exact: true });
  await first.getByRole('button', { name: /What options could you explore/ }).click();
  await first
    .getByLabel('Block prompt', { exact: true })
    .fill('Which options are worth comparing?');
  await expect(page.getByRole('button', { name: 'Save pattern', exact: true })).toBeDisabled();
  await expect(page.getByRole('tab', { name: 'Source', exact: true })).toBeDisabled();
  await first.getByRole('button', { name: 'Apply changes', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Source', exact: true })).toBeEnabled();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Practice source', exact: true });
  await expect(field).toHaveValue(
    source.replace('What options could you explore?', 'Which options are worth comparing?'),
  );
  const changed = (await field.inputValue()).replace('What would help?', 'Choose a useful route.');
  await field.fill(changed);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Blocks', exact: true }).click();
  await expect(paths.getByLabel('Based on an earlier response')).toHaveValue('route');
  await expect(paths.getByLabel('Based on an earlier response')).toContainText(
    'Choose a useful route.',
  );
  await paths.getByRole('button', { name: 'Add case', exact: true }).click();
  await expect(paths.getByLabel('Answer for case 3')).toHaveValue('unsure');
  const otherwise = paths.getByRole('region', { name: 'Otherwise path', exact: true });
  await otherwise.getByRole('button', { name: 'Add block to this path' }).click();
  await otherwise.getByRole('button', { name: 'Question', exact: true }).click();
  await expect(otherwise.getByRole('button', { name: /Write your question here/ })).toBeVisible();
  await paths.getByLabel('Destination for Otherwise').selectOption('end');
  await paths.getByRole('button', { name: 'Apply path changes' }).click();
  await expect(page.getByRole('tab', { name: 'Preview', exact: true })).toBeEnabled();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  const savedSource = await field.inputValue();
  expect(savedSource).toContain('!collect notes');
  expect(savedSource).toContain('  :max 2');
  expect(savedSource).toContain(':case "unsure"');
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Run preview', exact: true }).click();
  await page.getByRole('button', { name: 'Explore options', exact: true }).click();
  await page.getByRole('slider').fill('6');
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  await expect(page.locator('.preview-body')).toContainText('Which options are worth comparing?');
  await page.getByLabel('Your preview response').fill('A small experiment');
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  await expect(page.locator('.preview-body')).toContainText('What will you take away?');
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(page.getByText('Saved “Block paths review” as draft.')).toBeVisible();
  await page.goto('/editor?id=block-paths-review');
  await expect(paths).toBeVisible();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  // Existing Markdown-fence storage normalizes trailing whitespace, not the practice body.
  await expect(field).toHaveValue(savedSource.trimEnd());
  await page.getByRole('tab', { name: 'Blocks', exact: true }).click();
  if (info.project.name === 'mobile-chromium')
    await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await paths.screenshot({
    path: `/tmp/patternverse-paths-${info.project.name}.png`,
    style: '.editor-footer { visibility: hidden; }',
  });
});

test('converts cases to ordered rating rules and preserves explicit completion destinations', async ({
  page,
}) => {
  await open(page, 'Rule paths review');
  const paths = page.getByRole('region', { name: 'Paths block', exact: true });
  await paths.getByLabel('Based on an earlier response').selectOption('clarity');
  await paths.getByLabel('Threshold for rule 1').fill('9');
  await paths.getByRole('button', { name: 'Apply path changes' }).click();
  await expect(paths.getByRole('button', { name: 'Move rule 2 up' })).toBeEnabled();
  await paths.getByRole('button', { name: 'Move rule 2 up' }).click();
  await expect(paths.getByLabel('Threshold for rule 1')).toHaveValue('4');
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Practice source', exact: true });
  expect(await field.inputValue()).toContain(
    '?branch {\n  :when clarity >= 4 -> plan\n  :when clarity >= 9 -> explore',
  );
  await page.getByRole('tab', { name: 'Blocks', exact: true }).click();
  await paths.getByLabel('Destination for Otherwise').selectOption('end');
  await paths.getByRole('button', { name: 'Apply path changes' }).click();
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Run preview', exact: true }).click();
  await page.getByRole('button', { name: 'Make a plan', exact: true }).click();
  await page.getByRole('slider').fill('2');
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  await expect(
    page.getByText(
      'Practice complete. Your test answers remain visible until you restart or leave.',
    ),
  ).toBeVisible();
  await expect(page.getByLabel('Your preview response')).toHaveCount(0);
});

test('creates a choice and switch paths entirely through blocks', async ({ page }) => {
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('Visual paths');
  await page.getByRole('button', { name: 'Add Decision Making', exact: true }).click();
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  const add = page.getByRole('button', { name: 'Add block before completion', exact: true });
  await expect(add).toBeEnabled();
  await add.click();
  await page.locator('.insert-menu').getByRole('button', { name: 'Choice', exact: true }).click();
  await expect(add).toBeEnabled();
  await add.click();
  await page.locator('.insert-menu').getByRole('button', { name: 'Paths', exact: true }).click();
  await page.getByLabel('Route based on an earlier response').selectOption('choice');
  await page.getByRole('button', { name: 'Add Paths', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Paths block', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Practice source', exact: true })).toHaveValue(
    /\?match choice/,
  );
});
