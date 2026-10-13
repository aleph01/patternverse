import { expect, test } from '@playwright/test';

test('one compact timer stays reachable across steps without disturbing writing', async ({
  page,
}, info) => {
  await page.clock.install();
  await page.goto('/pattern/cbt-worry-time/run');
  const widget = page.locator('.timer-widget');
  await expect(widget).toContainText('10 min');
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  await page.getByRole('button', { name: 'Increase timer by one minute' }).click();
  await expect(widget).toContainText('11 min');
  const dimensions = await widget.evaluate((bar) => {
    const controls = [...bar.querySelectorAll('button, strong')].map((el) =>
      el.getBoundingClientRect(),
    );
    return {
      background: getComputedStyle(bar).backgroundColor,
      height: bar.getBoundingClientRect().height,
      centers: controls.map((box) => box.y + box.height / 2),
    };
  });
  expect(dimensions.background).toBe('rgb(24, 24, 20)');
  expect(dimensions.height).toBeLessThanOrEqual(60);
  expect(Math.max(...dimensions.centers) - Math.min(...dimensions.centers)).toBeLessThan(2);
  await page.getByRole('button', { name: 'Start timer' }).click();
  const dock = page.getByRole('complementary', { name: 'Practice timers' });
  await expect(dock.getByRole('button', { name: 'Pause timer' })).toBeVisible();
  await expect(widget).toHaveCount(1);
  await page.getByRole('button', { name: 'Continue ↓', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Your response', exact: true });
  await expect(field).toBeVisible();
  await field.fill('I want to give this thought a little more room.');
  await page.clock.fastForward(60_000);
  await expect(dock).toContainText('10:00');
  await dock.getByRole('button', { name: 'Pause timer' }).click();
  await page.clock.fastForward(120_000);
  await expect(dock).toContainText('10:00');
  await expect(field).toHaveValue('I want to give this thought a little more room.');
  await dock.getByRole('button', { name: 'Reset timer' }).click();
  await expect(dock).toContainText('11 min');
  await dock.getByRole('button', { name: 'Start timer' }).click();
  await expect(widget).toHaveCount(1);
  await field.scrollIntoViewIfNeeded();
  await expect(dock.getByRole('button', { name: 'Pause timer' })).toBeInViewport();
  const barBox = await dock.boundingBox();
  const fieldBox = await field.boundingBox();
  expect(fieldBox!.y).toBeGreaterThanOrEqual(barBox!.y + barBox!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('persistent-timer.png') });
  if (info.project.name === 'mobile-chromium') {
    // A shorter visual viewport approximates the space available with a keyboard open.
    await page.setViewportSize({ width: 393, height: 520 });
    await field.focus();
    await field.scrollIntoViewIfNeeded();
    await expect(dock.getByRole('button', { name: 'Pause timer' })).toBeInViewport();
    const compactBar = await dock.boundingBox();
    const compactField = await field.boundingBox();
    expect(compactField!.y).toBeGreaterThanOrEqual(compactBar!.y + compactBar!.height);
    await page.screenshot({ path: info.outputPath('persistent-timer-small-viewport.png') });
  }
  await page.getByRole('button', { name: 'Stop pattern', exact: true }).click();
  await expect(dock.getByRole('button', { name: 'Resume timer' })).toBeDisabled();
});

test('preview retains blocking behavior and clears timers on restart', async ({ page }) => {
  await page.clock.install();
  await page.goto('/editor?type=pattern');
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await page.getByRole('textbox', { name: 'Practice source', exact: true }).fill(`:language 1
:title "Timer preview"
!timer pause {
  :duration 2
  :blocking true
  Take a quiet pause.
}
!ask reflection {
  What do you notice?
}
-> end`);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Run preview', exact: true }).click();
  const next = page.getByRole('button', { name: 'Continue ↓', exact: true });
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(next).toBeDisabled();
  await page.clock.fastForward(2_000);
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByRole('textbox', { name: 'Your preview response' })).toBeVisible();
  await expect(page.locator('.timer-widget')).toHaveCount(1);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Practice timers' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start timer' })).toBeVisible();
});
