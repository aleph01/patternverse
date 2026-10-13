import { expect, test } from '@playwright/test';

test('filters slash commands, selects by keyboard, and preserves formatting undo in focus mode', async ({
  page,
}) => {
  await page.goto('/editor?type=pattern&verse=learning');
  await page.getByLabel('Title', { exact: true }).fill('Rich writing controls');
  const prose = page.locator('.novel-prose');
  await prose.click();
  await page.keyboard.type('/head');
  const menu = page.getByRole('listbox', { name: 'Insert a block' });
  await expect(menu.getByRole('option')).toHaveCount(3);
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('option', { name: /Heading 2/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Enter');
  await page.keyboard.type('A useful heading');
  await expect(prose.locator('h2')).toHaveText('A useful heading');
  await expect(menu).toHaveCount(0);
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await prose.click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(prose).not.toContainText('A useful heading');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(prose.locator('h2')).toHaveText('A useful heading');
  await page.getByRole('button', { name: 'Back to details', exact: true }).click();
  await prose.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/notacommand');
  await expect(menu.getByText('No matching blocks')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(prose).toContainText('/notacommand');
});

test('adds, edits, cancels and removes a link using the captured text selection', async ({
  page,
}, info) => {
  await page.goto('/editor?type=pattern&verse=learning');
  if (info.project.name === 'mobile-chromium')
    await page.setViewportSize({ width: 320, height: 900 });
  await page.getByLabel('Title', { exact: true }).fill('Link writing controls');
  const prose = page.locator('.novel-prose');
  await prose.fill('A useful reference');
  await prose.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Add or edit link', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Link URL' });
  await expect(field).toBeFocused();
  await field.fill('https://example.org/reference');
  await field.press('Enter');
  const link = prose.getByRole('link', { name: 'A useful reference' });
  await expect(link).toHaveAttribute('href', 'https://example.org/reference');
  await link.click();
  await page.getByRole('button', { name: 'Add or edit link', exact: true }).click();
  await expect(field).toHaveValue('https://example.org/reference');
  await field.fill('https://example.org/not-applied');
  await field.press('Escape');
  await expect(field).toHaveCount(0);
  await expect(link).toHaveAttribute('href', 'https://example.org/reference');
  await page.getByRole('button', { name: 'Add or edit link', exact: true }).click();
  await field.fill('https://example.org/updated');
  await field.press('Enter');
  await expect(link).toHaveAttribute('href', 'https://example.org/updated');
  await page.getByRole('button', { name: 'Add or edit link', exact: true }).click();
  await page.locator('.novel-formatting-toolbar').screenshot({
    path: `/tmp/patternverse-rich-links-${info.project.name}.png`,
  });
  await page.getByRole('button', { name: 'remove', exact: true }).click();
  await expect(prose.locator('a')).toHaveCount(0);
  await expect(prose).toHaveText('A useful reference');
  await prose.press('ControlOrMeta+z');
  await expect(link).toHaveAttribute('href', 'https://example.org/updated');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('deletes the contextual table and restores it with undo across narrow and wide layouts', async ({
  page,
}) => {
  await page.goto('/editor?type=pattern');
  const prose = page.locator('.novel-prose');
  await prose.click();
  await page.keyboard.type('/table');
  await page.keyboard.press('Enter');
  const table = prose.locator('table');
  await expect(table).toHaveCount(1);
  // Close the initial typing/insertion undo group using real history navigation.
  // Otherwise an immediate deletion can share that group and undo returns to the empty document.
  await prose.press('ControlOrMeta+z');
  await expect(table).toHaveCount(0);
  await prose.press('ControlOrMeta+Shift+z');
  await expect(table).toHaveCount(1);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await table.locator('th').first().click();
    await table.hover();
    const button = page.getByRole('button', { name: 'Delete table' });
    await expect(button).toBeVisible();
    const tableBox = await table.boundingBox(),
      buttonBox = await button.boundingBox();
    if (!tableBox || !buttonBox) throw new Error('Missing table control geometry');
    expect(
      buttonBox.y + buttonBox.height <= tableBox.y || buttonBox.x >= tableBox.x + tableBox.width,
    ).toBe(true);
    await button.click();
    await expect(table).toHaveCount(0);
    await prose.press('ControlOrMeta+z');
    await expect(table).toHaveCount(1);
    // Columns keep their existing minimum widths; this check covers control placement and history,
    // not a table reflow redesign.
  }
});
