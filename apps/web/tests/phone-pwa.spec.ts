import { expect, test } from '@playwright/test';

test('keeps saved Mira sessions and the pattern editor available offline', async ({
  page,
  context,
}) => {
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session' }).click();
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toBeVisible();

  await page.goto('/editor?type=pattern');
  await expect(page.getByRole('heading', { name: 'new pattern' })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'new pattern' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Title' }).fill('Offline pocket pattern');
  await page.getByRole('button', { name: 'Add Learning', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved “Offline pocket pattern”')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'edit Offline pocket pattern' })).toBeVisible();

  await page.goto('/mira');
  await page.getByRole('button', { name: 'Previous sessions' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Sessions' }).getByRole('button', { name: 'New session' }),
  ).toBeVisible();
});

test('keeps the principal phone screens within a narrow viewport', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 740 });
    for (const route of [
      '/',
      '/my',
      '/editor?type=pattern',
      '/mira',
      '/about',
      '/about/pattern-language',
      '/about/mira',
    ]) {
      await page.goto(route);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width);
    }
  }
});

test('offers dictation and spoken replies with a zero-retention automatic model', async ({
  page,
}) => {
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session' }).click();
  await expect(page.getByRole('button', { name: 'Start voice input' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByLabel('Model', { exact: true })).toHaveValue('google/gemini-3.8-flash');
  await expect(page.getByLabel('Read new replies aloud automatically')).not.toBeChecked();
});

test('dictation updates the draft live and never sends it by itself', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: ((event: { results: ArrayLike<[{ transcript: string }]> }) => void) | null = null;
      onerror = null;
      onend: (() => void) | null = null;
      start() {
        (window as typeof window & { testRecognition?: FakeRecognition }).testRecognition = this;
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    (
      window as typeof window & {
        SpeechRecognition?: typeof FakeRecognition;
        webkitSpeechRecognition?: typeof FakeRecognition;
      }
    ).SpeechRecognition = FakeRecognition;
    (
      window as typeof window & { webkitSpeechRecognition?: typeof FakeRecognition }
    ).webkitSpeechRecognition = FakeRecognition;
  });
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session' }).click();
  await page.getByRole('button', { name: 'Start voice input' }).click();
  await page.evaluate(() => {
    const recognition = (
      window as typeof window & {
        testRecognition?: {
          onresult: ((event: { results: ArrayLike<[{ transcript: string }]> }) => void) | null;
        };
      }
    ).testRecognition;
    recognition?.onresult?.({ results: [[{ transcript: 'I feel more grounded' }]] });
  });
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toHaveValue(
    'I feel more grounded',
  );
  await page.getByRole('button', { name: 'Stop dictation' }).click();
  await expect(page.getByRole('button', { name: 'Start voice input' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toHaveValue(
    'I feel more grounded',
  );
  await expect(page.getByText('I feel more grounded', { exact: true })).toHaveCount(0);
});
