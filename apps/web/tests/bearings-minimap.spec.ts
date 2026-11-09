import { expect, test, type Page } from '@playwright/test';

async function notebook(page: Page, count = 12, branch = false) {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).waitFor();
  const id = await page.evaluate(
    async ({ count, branch }) => {
      const modulePath = '/src/lib/client/workspace.ts';
      const { getLocalWorkspace } = await import(modulePath);
      const workspace = await getLocalWorkspace();
      const situation = await workspace.createSituation('A longer notebook');
      const cells = Array.from({ length: count }, (_, index) => ({
        id: `cell-${index + 1}`,
        kind: index % 3 === 1 ? 'note' : index % 3 === 2 ? 'approach' : 'answer',
        ...(branch && index ? { parentId: 'cell-1' } : {}),
        text: `Cell ${String(index + 1).padStart(2, '0')}\n\n${'A little room to work through this thought.\n\n'.repeat(4)}One useful next step.`,
      }));
      await workspace.updateSituation(
        situation.id,
        {
          title: situation.title,
          context: '',
          notebook: {
            version: 1,
            chapters: [{ id: 'chapter', title: 'Beginning', collapsed: false, cells }],
            activeChapterId: 'chapter',
            activeCellId: 'cell-1',
            draft: '',
            draftKind: 'answer',
            scrollTop: 0,
            view: 'notebook',
          },
        },
        situation.revision,
      );
      return situation.id;
    },
    { count, branch },
  );
  await page.goto(`/apps/bearings?preview=1&situation=${id}`);
  await expect(page.locator('.notebook-cell')).toHaveCount(count);
  return page.getByRole('navigation', { name: 'Notebook mini-map', exact: true });
}

test('previews and jumps through a long notebook with mouse and keyboard, and hides when it fits', async ({
  page,
}, info) => {
  const map = await notebook(page);
  if (info.project.name === 'mobile') {
    await expect(map).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    return;
  }
  await expect(map).toBeVisible();
  await expect(map.getByRole('button')).toHaveCount(12);
  const marks = await map
    .getByRole('button')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
  expect(marks.every((mark) => Math.abs(mark.left - marks[0]!.left) < 1)).toBe(true);
  expect(marks[11]!.top).toBeGreaterThan(marks[0]!.bottom);
  const viewport = page.locator('.viewport');
  const before = await viewport.evaluate((node) => node.scrollTop);
  const last = map.getByRole('button', { name: /^Go to cell 12:/ });
  await last.hover();
  await expect(map.getByRole('tooltip')).toContainText('Cell 12');
  expect(await viewport.evaluate((node) => node.scrollTop)).toBe(before);
  await page.screenshot({ path: '/private/tmp/bearings-minimap-desktop.png' });
  await last.click();
  await expect(last).toHaveAttribute('aria-current', 'location');
  await expect(page.locator('[data-cell="cell-12"]')).toBeFocused();
  await expect.poll(() => viewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect
    .poll(async () => {
      const view = await viewport.boundingBox();
      const cell = await page.locator('[data-cell="cell-12"]').boundingBox();
      return !!view && !!cell && cell.y < view.y + view.height && cell.y + cell.height > view.y;
    })
    .toBe(true);
  await map.getByRole('button').first().focus();
  await page.keyboard.press('ArrowDown');
  const second = map.getByRole('button', { name: /^Go to cell 02:/ });
  await expect(second).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('aria-current', 'location');
  await expect(page.locator('[data-cell="cell-2"]')).toBeFocused();
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await expect(map).toHaveCount(0);
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  await expect(map).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 6000 });
  await expect(map).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(map).toBeVisible();
});

test('counts visible cells and updates after folding, deletion, and undo', async ({
  page,
}, info) => {
  const map = await notebook(page, 8, true);
  if (info.project.name === 'mobile') {
    await expect(map).toHaveCount(0);
    return;
  }
  await expect(map).toBeVisible();
  await page.getByRole('button', { name: 'Collapse note branch', exact: true }).click();
  await expect(map).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand note branch', exact: true }).click();
  await expect(map.getByRole('button')).toHaveCount(8);
  await map.getByRole('button').last().click();
  await page.keyboard.press('Meta+Backspace');
  await expect(page.locator('.notebook-cell')).toHaveCount(7);
  await expect(map).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(map.getByRole('button')).toHaveCount(8);
});
