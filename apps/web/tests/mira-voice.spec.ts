import { expect, test, type Page } from '@playwright/test';

async function say(page: Page, text: string, final = true) {
  await page.evaluate(
    ({ text, final }) => {
      const speech = window as unknown as { emitVoice: (text: string, final: boolean) => void };
      speech.emitVoice(text, final);
    },
    { text, final },
  );
}
test('hands-free control drafts, selects separately, switches approach and explicitly sends', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    class Recognition {
      static current: Recognition;
      onresult?: (event: unknown) => void;
      onend?: () => void;
      results: unknown[] = [];
      start() {
        Recognition.current = this;
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    Object.assign(window, {
      SpeechRecognition: Recognition,
      emitVoice: (text: string, final: boolean) => {
        const current = Recognition.current;
        const result = Object.assign([{ transcript: text }], { isFinal: final });
        const results = [...current.results, result];
        if (final) current.results = results;
        current.onresult?.({ results });
      },
    });
  });
  let sent = 0;
  await page.route('https://openrouter.ai/api/v1/key', (route) =>
    route.fulfill({ json: { data: { usage_monthly: 0 } } }),
  );
  await page.route('https://openrouter.ai/api/v1/chat/completions', (route) => {
    expect(route.request().postDataJSON().provider.zdr).toBe(true);
    sent += 1;
    return route.fulfill({ json: { choices: [{ message: { content: 'I am here.' } }] } });
  });
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Advanced · enter an API key manually', { exact: true }).click();
  await page.getByLabel('OpenRouter API key').fill('test-key');
  await page.getByRole('button', { name: 'Save API key' }).click();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Start voice control' }).click();
  await expect(page.getByText('Listening · say “send” to send your draft.')).toBeVisible();
  await say(page, 'I want to think about today', false);
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toHaveValue(
    'I want to think about today',
  );
  await say(page, 'I want to think about today');
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toHaveValue(
    'I want to think about today',
  );
  expect(sent).toBe(0);
  await say(page, 'choose therapy approach');
  const modalities = page.getByRole('dialog', { name: 'Therapy approach' });
  await expect(modalities).toBeVisible();
  await say(page, 'the third one');
  await expect(modalities).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Choose therapy approach' })).toHaveText('CBT');
  await say(page, 'open patterns');
  const picker = page.getByRole('dialog', { name: 'Patterns & practices' });
  await expect(picker).toBeVisible();
  await say(page, 'open settings');
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(settings).toBeFocused();
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await say(page, 'open settings');
  await expect(settings).toBeVisible();
  await say(page, 'A thought spoken while settings are open');
  await expect(
    page.getByText('Close this panel to draft a message.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Message mira', includeHidden: true }),
  ).toHaveValue('I want to think about today');
  await say(page, 'send');
  await expect(
    page.getByText('Close this panel before sending your message.', { exact: true }),
  ).toBeVisible();
  expect(sent).toBe(0);
  await say(page, 'close');
  await expect(settings).toHaveCount(0);
  await say(page, 'open settings');
  await expect(settings).toBeVisible();
  await say(page, 'open sessions');
  await expect(page.getByRole('dialog', { name: 'Sessions', exact: true })).toBeFocused();
  await expect(settings).toHaveCount(0);
  await say(page, 'choose therapy approach');
  await expect(modalities).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Sessions', exact: true })).toHaveCount(0);
  await say(page, 'open patterns');
  await expect(picker).toBeFocused();
  await expect(modalities).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await say(page, 'search for Creative Reframing');
  await expect(picker.getByRole('searchbox')).toHaveValue('creative reframing');
  await expect(picker.getByRole('button', { name: /Creative Reframing/ })).toHaveCount(0);
  await say(page, 'search for Thought Record');
  await expect(picker.getByRole('searchbox')).toHaveValue('thought record');
  await say(page, 'the first one');
  await expect(picker.getByRole('region', { name: 'Selected pattern' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'End exercise' })).toHaveCount(0);
  expect(sent).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('voice-picker.png') });
  await expect(page.getByText('Library pattern: Creative Reframing')).toHaveCount(0);
  await say(page, 'start');
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'End exercise' })).toBeVisible();
  await say(page, 'sent', false);
  expect(sent).toBe(0);
  await say(page, 'sent');
  await expect(page.getByText('I am here.', { exact: true })).toBeVisible();
  expect(sent).toBe(1);
  await say(page, 'stop listening');
  await expect(page.getByRole('button', { name: 'Start voice control' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Start voice input' })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('mira-chat.png') });
});
