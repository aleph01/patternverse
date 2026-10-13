import { expect, test } from '@playwright/test';

test('previews a YouTube excerpt through the production content policy and edits its options', async ({
  page,
}) => {
  // Exercise the real SDK-loading and iframe paths without contacting a video account.
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.YT = { Player: class {
      constructor(frame, options) { this.frame = frame; this.time = 10; setTimeout(() => { frame.dataset.sdkReady = 'true'; options.events.onReady(); }, 0); }
      getDuration() { return 60; } getCurrentTime() { return this.time; }
      playVideo() {} pauseVideo() {} mute() {} destroy() {}
      seekTo(seconds) { this.time = seconds; }
    } };`,
    }),
  );
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body>Provider frame loaded</body></html>',
    }),
  );
  await page.goto('/editor?type=pattern');
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await page.getByRole('textbox', { name: 'Practice source', exact: true }).fill(`:language 1
!video {
  :url "https://youtu.be/M7lc1UVf-VE"
  :title "Clip preview"
  :start "0:10"
  :end "0:30"
  Watch this excerpt.
}
answer = !ask {
  What stood out?
}
-> end`);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Run preview', exact: true }).click();
  const frame = page.locator('iframe[title="Clip preview"]');
  await expect(frame).toHaveAttribute('data-sdk-ready', 'true');
  await expect(frame).toHaveAttribute('src', /start=10&end=30/);
  await expect(frame.contentFrame().getByText('Provider frame loaded')).toBeVisible();
  await expect(page.getByLabel('Your preview response')).toBeVisible();
  await page.getByRole('tab', { name: 'Blocks', exact: true }).click();
  await page.getByRole('button', { name: /Video Clip preview/ }).click();
  await page.getByLabel('Start time', { exact: true }).fill('0:15');
  await page.getByRole('button', { name: 'Apply changes', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Practice source', exact: true })).toHaveValue(
    /:start "0:15"/,
  );
});
