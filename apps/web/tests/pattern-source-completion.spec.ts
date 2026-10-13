import { expect, test, type Page } from '@playwright/test';

async function sourceEditor(page: Page) {
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('Completion controls');
  await page.getByRole('button', { name: 'Add Decision Making', exact: true }).click();
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  return page.getByRole('textbox', { name: 'Practice source', exact: true });
}

test('completion keeps keyboard selection, dismissal, insertion and undo/redo', async ({
  page,
}) => {
  const field = await sourceEditor(page);
  await field.fill('!');
  await field.press('Control+Space');
  const options = page.getByRole('listbox', { name: 'Pattern suggestions' }).getByRole('option');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await field.press('ArrowUp');
  await expect(options.last()).toHaveAttribute('aria-selected', 'true');
  await field.press('ArrowDown');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await field.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(field).toHaveValue('!');

  await field.fill('  !as');
  await field.press('Control+Space');
  await field.press('Tab');
  const inserted = '  !ask response {\n    What comes to mind?\n  }';
  await expect(field).toHaveValue(inserted);
  expect(
    await field.evaluate((element: HTMLTextAreaElement) =>
      element.value.slice(element.selectionStart),
    ),
  ).toMatch(/^What comes/);
  await field.press('Control+z');
  await expect(field).toHaveValue('  !as');
  await field.press('Control+Shift+z');
  await expect(field).toHaveValue(inserted);
});

test('completion replaces a full token, reuses compiler fields and stays out of prose', async ({
  page,
}) => {
  const field = await sourceEditor(page);
  const source = ':language 1\n:title "café 🙂"\n  !askkk\n-> end';
  await field.fill(source);
  await field.evaluate(
    (element: HTMLTextAreaElement, position: number) =>
      element.setSelectionRange(position, position),
    source.indexOf('!askkk') + 3,
  );
  await field.press('Control+Space');
  await page.getByRole('option', { name: /!ask Ask for text/ }).click();
  await expect(field).toHaveValue(
    ':language 1\n:title "café 🙂"\n  !ask response {\n    What comes to mind?\n  }\n-> end',
  );
  expect(
    await field.evaluate((element: HTMLTextAreaElement) =>
      element.value.slice(element.selectionStart),
    ),
  ).toMatch(/^What comes/);

  const typedSource =
    ':language 1\n!form reflection {\n!ask thought {\nYour thought?\n}\n}\nvalue = reflection.thought\n-> end';
  await field.fill(typedSource);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  await field.evaluate(
    (element: HTMLTextAreaElement, position: number) =>
      element.setSelectionRange(position, position),
    typedSource.indexOf('reflection.thought') + 'reflection.th'.length,
  );
  await field.press('Control+Space');
  const options = page.getByRole('listbox', { name: 'Pattern suggestions' }).getByRole('option');
  await expect(options).toHaveCount(1);
  await expect(options).toContainText('reflection.thought');
  await field.press('Enter');
  await expect(field).toHaveValue(typedSource);

  await field.fill('!show {\nPlease !as');
  await field.press('Control+Space');
  await expect(page.getByRole('listbox')).toHaveCount(0);
});
