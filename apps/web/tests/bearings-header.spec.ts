import { expect, test } from '@playwright/test';
import { addTextCell, clickNotebookControl, fillField, expectFieldValue } from './bearings-helpers';

test('keeps Direct controls in one header row and secondary actions accessible on narrow screens', async ({
  page,
}, info) => {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(
    page.getByLabel('What would you like to work through?'),
    'Possible Career Transition',
  );
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  const cell = await addTextCell(page, 'Keep my writing while changing views.');
  const header = page.locator('.app-header');
  await expect(page.locator('.notebook > nav')).toHaveCount(0);
  await expect(header.getByRole('combobox', { name: 'Priority', exact: true })).toHaveCount(0);
  await expect(
    header.getByRole('button', { name: 'Break out a subproblem', exact: true }),
  ).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Keyboard shortcuts', exact: true })).toHaveCount(
    0,
  );
  await expect(header.getByRole('button', { name: 'Tree', exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'Notebook', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const bounds = await header.boundingBox();
  expect(bounds!.height).toBeLessThanOrEqual(60);
  const viewport = await page.locator('.viewport').boundingBox();
  expect(Math.abs(viewport!.y - (bounds!.y + bounds!.height))).toBeLessThan(2);
  const controls = await header
    .locator('button:visible, input:visible, select:visible, .brand')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
  for (const box of controls) {
    expect(box.left).toBeGreaterThanOrEqual(bounds!.x);
    expect(box.right).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
    expect(box.top).toBeGreaterThanOrEqual(bounds!.y);
    expect(box.bottom).toBeLessThanOrEqual(bounds!.y + bounds!.height + 1);
  }
  await clickNotebookControl(page, 'Keyboard shortcuts');
  const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true });
  await expect(shortcuts).toBeVisible();
  await shortcuts.getByRole('button', { name: 'Close keyboard shortcuts', exact: true }).click();
  await clickNotebookControl(page, 'Automatically follow new entries');
  await expect(
    page.getByRole('button', { name: 'Automatically follow new entries', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await header.getByRole('button', { name: 'Tree', exact: true }).click();
  await expect(header.getByRole('button', { name: 'Tree', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.tree-cell')).toContainText('Keep my writing while changing views.');
  await header.getByRole('button', { name: 'Notebook', exact: true }).click();
  await expectFieldValue(cell.locator('.cell-text'), 'Keep my writing while changing views.');
  await page.screenshot({ path: `/private/tmp/bearings-direct-header-${info.project.name}.png` });
  if (info.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 760 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    const narrow = await header.boundingBox();
    const more = await header
      .getByRole('button', { name: 'Notebook actions', exact: true })
      .boundingBox();
    expect(more!.x + more!.width).toBeLessThanOrEqual(narrow!.x + narrow!.width);
  } else {
    await expect(
      header.getByRole('button', { name: 'Show situation map', exact: true }),
    ).toBeVisible();
    await expect(
      header.getByRole('button', { name: 'Start a new chapter', exact: true }),
    ).toBeVisible();
  }
});
