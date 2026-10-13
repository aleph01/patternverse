import { expect, test, type Page } from '@playwright/test';

interface SpeechHarness {
  starts: number;
  stops: number;
  cancels: number;
  utterances: {
    text: string;
    lang: string;
    rate: number;
    onend?: () => void;
    onerror?: (event: { error: string }) => void;
  }[];
}

async function installSpeech(page: Page, unsupported = false) {
  await page.addInitScript((unsupported) => {
    const harness: SpeechHarness = { starts: 0, stops: 0, cancels: 0, utterances: [] };
    class Utterance {
      lang = '';
      rate = 1;
      onend?: () => void;
      onerror?: (event: { error: string }) => void;
      constructor(public text: string) {}
    }
    class Recognition {
      onend?: () => void;
      start() {
        harness.starts += 1;
      }
      abort() {
        harness.stops += 1;
        this.onend?.();
      }
      stop() {
        this.abort();
      }
    }
    Object.assign(window, {
      miraSpeech: harness,
      SpeechRecognition: Recognition,
      SpeechSynthesisUtterance: Utterance,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: unsupported
        ? undefined
        : {
            cancel: () => {
              harness.cancels += 1;
              harness.utterances.at(-1)?.onerror?.({ error: 'canceled' });
            },
            speak: (utterance: Utterance) => harness.utterances.push(utterance),
          },
    });
  }, unsupported);
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const harness = (window as unknown as { miraSpeech: SpeechHarness }).miraSpeech;
    return {
      starts: harness.starts,
      stops: harness.stops,
      cancels: harness.cancels,
      utterances: harness.utterances.map(({ text, lang, rate }) => ({ text, lang, rate })),
    };
  });
}

async function finish(page: Page, index: number, error?: string) {
  await page.evaluate(
    ({ index, error }) => {
      const utterance = (window as unknown as { miraSpeech: SpeechHarness }).miraSpeech.utterances[
        index
      ]!;
      if (error) utterance.onerror?.({ error });
      else utterance.onend?.();
    },
    { index, error },
  );
}

async function prepareMira(page: Page) {
  let replies = 0;
  await page.route('https://openrouter.ai/api/v1/key', (route) =>
    route.fulfill({ json: { data: { usage_monthly: 0 } } }),
  );
  await page.route('https://openrouter.ai/api/v1/endpoints/zdr', (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.route('https://openrouter.ai/api/v1/chat/completions', (route) => {
    replies += 1;
    return route.fulfill({
      json: { choices: [{ message: { content: `Synthetic reply ${replies}.` } }] },
    });
  });
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Advanced · enter an API key manually', { exact: true }).click();
  await page.getByLabel('OpenRouter API key').fill('synthetic-test-key');
  await page.getByRole('button', { name: 'Save API key' }).click();
  await expect(page.getByText('Provider settings saved encrypted on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();
}

async function send(page: Page, number: number) {
  await page.getByRole('textbox', { name: 'Message mira' }).fill(`Synthetic message ${number}.`);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText(`Synthetic reply ${number}.`, { exact: true })).toBeVisible();
}

test('manual read-aloud pauses/resumes listening and ignores obsolete events for the same reply', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await installSpeech(page);
  await prepareMira(page);
  await send(page, 1);
  expect((await snapshot(page)).utterances).toHaveLength(0);
  await page.getByRole('button', { name: 'Start voice control' }).click();
  await expect.poll(async () => (await snapshot(page)).starts).toBe(1);
  await page.getByRole('button', { name: 'Play spoken reply' }).click();
  await expect(page.getByRole('button', { name: 'Stop spoken reply' })).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).stops).toBe(1);
  expect((await snapshot(page)).utterances[0]).toMatchObject({
    text: 'Synthetic reply 1.',
    rate: 0.96,
  });
  await page.getByRole('button', { name: 'Stop spoken reply' }).click();
  await expect.poll(async () => (await snapshot(page)).starts).toBe(2);
  await page.getByRole('button', { name: 'Play spoken reply' }).click();
  await finish(page, 0);
  await finish(page, 0, 'audio-busy');
  await expect(page.getByRole('button', { name: 'Stop spoken reply' })).toBeVisible();
  expect((await snapshot(page)).starts).toBe(2);
  await expect(
    page.getByText('The device could not read this reply. Try its play button.'),
  ).toHaveCount(0);
  await finish(page, 1);
  await expect(page.getByRole('button', { name: 'Play spoken reply' })).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).starts).toBe(3);
  expect(errors).toEqual([]);
});

test('automatic read-aloud is opt-in, remains saved, and stops when disabled', async ({ page }) => {
  await installSpeech(page);
  await prepareMira(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const automatic = page.getByLabel('Read new replies aloud automatically');
  await expect(automatic).not.toBeChecked();
  await automatic.check();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await send(page, 1);
  await expect.poll(async () => (await snapshot(page)).utterances.length).toBe(1);
  await finish(page, 0);
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(automatic).toBeChecked();
  await automatic.uncheck();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await send(page, 2);
  expect((await snapshot(page)).utterances).toHaveLength(0);
});

test('unsupported device speech gives a useful message without hiding the reply', async ({
  page,
}) => {
  await installSpeech(page, true);
  await prepareMira(page);
  await send(page, 1);
  await page.getByRole('button', { name: 'Play spoken reply' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Spoken replies are unavailable in this browser.',
  );
  await expect(page.getByRole('button', { name: 'Play spoken reply' })).toBeVisible();
  await expect(page.getByText('Synthetic reply 1.', { exact: true })).toBeVisible();
  expect((await snapshot(page)).starts).toBe(0);
});

test('leaving Mira cancels playback and late callbacks cannot restart listening', async ({
  page,
}) => {
  await installSpeech(page);
  await prepareMira(page);
  await send(page, 1);
  await page.getByRole('button', { name: 'Start voice control' }).click();
  await page.getByRole('button', { name: 'Play spoken reply' }).click();
  const before = await snapshot(page);
  await page.locator('.mira-app-header a').first().click();
  await expect(page.locator('.mira-app')).toHaveCount(0);
  await finish(page, 0);
  await finish(page, 0, 'audio-busy');
  expect((await snapshot(page)).starts).toBe(before.starts);
  expect((await snapshot(page)).cancels).toBeGreaterThan(before.cancels);
});
