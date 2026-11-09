import { expect, test } from '@playwright/test';

test.skip(!process.env.SONGWRITING_DRAFT_REVIEW, 'Local unpublished-course review only.');
declare global {
  interface Window {
    __listeningReadyDelay?: number;
    __listeningPlayers: {
      playing: boolean;
      destroyed: boolean;
      time: number;
      options: { events: { onError(): void; onReady(): void } };
    }[];
  }
}
const guide = '/collection/songwriting-listening-guide';
const revision = '/pattern/songwriting-revise-the-weakest-moment';

// Controlled SDK/frames exercise our host lifecycle, not real audio, ads or account access.
const controlledSdk = `
window.__listeningPlayers = [];
window.YT = { Player: class {
  constructor(frame, options) {
    this.frame = frame; this.options = options; this.time = Number(new URL(frame.src).searchParams.get('start'));
    this.playing = false; this.destroyed = false; this.seeks = [];
    window.__listeningPlayers.push(this);
    setTimeout(() => options.events.onReady(), window.__listeningReadyDelay || 0);
  }
  playVideo() { this.playing = true; }
  pauseVideo() { this.playing = false; }
  seekTo(time) { this.time = time; this.seeks.push(time); }
  getCurrentTime() { return this.time; }
  getDuration() { return 400; }
  mute() {}
  destroy() { this.destroyed = true; this.playing = false; this.frame.remove(); }
}};
`;
test.beforeEach(async ({ page }) => {
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: controlledSdk }),
  );
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Controlled YouTube frame</title><button>Provider play</button>',
    }),
  );
});

test('uses YouTube only, waits for a request, and keeps exact recording versions', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/youtube|spotify|bandcamp/.test(request.url())) requests.push(request.url());
  });
  // A preference saved by the previous pilot must not restore the removed provider controls.
  await page.addInitScript(() =>
    localStorage.setItem(
      'patternverse:music-listening:v1',
      JSON.stringify({ version: 1, service: 'spotify' }),
    ),
  );
  const response = await page.goto(guide);
  const policy = response?.headers()['content-security-policy'] ?? '';
  const frameSources = policy.split(';').find((d) => d.trim().startsWith('frame-src'));
  expect(frameSources).toContain('https://www.youtube-nocookie.com');
  expect(frameSources).not.toContain('bandcamp');
  expect(frameSources).not.toContain('spotify');
  const cards = page.locator('.listening-example');
  await expect(cards).toHaveCount(3);
  await expect(cards.first().getByRole('button', { name: 'Load YouTube player' })).toBeEnabled();
  await expect(cards.locator('iframe')).toHaveCount(0);
  expect(requests).toHaveLength(0);
  await expect(cards.first().getByRole('checkbox')).toHaveCount(0);
  await cards.first().screenshot({ path: test.info().outputPath('youtube-listening-card.png') });
  const card = cards.first();
  await card.getByRole('button', { name: 'Load YouTube player' }).click();
  await expect(card.locator('iframe')).toHaveAttribute('src', /embed\/WSnc_6Z7HqQ\?/);
  await expect(card.locator('iframe')).toHaveAttribute('src', /start=0&end=45/);
  await expect(card.locator('iframe')).toHaveAttribute(
    'referrerpolicy',
    'strict-origin-when-cross-origin',
  );
  await expect(card.getByRole('button', { name: 'Play / replay passage' })).toBeEnabled();
  expect(await page.evaluate(() => window.__listeningPlayers[0].playing)).toBe(false);
  await card.getByRole('button', { name: 'Live · 2001', exact: true }).click();
  await expect(card.locator('iframe')).toHaveCount(0);
  await expect(card.getByRole('link', { name: 'Open on YouTube' })).toHaveAttribute(
    'href',
    'https://www.youtube.com/watch?v=mbVKGlh3gg4&t=0s',
  );
  await card.getByRole('button', { name: 'Load YouTube player' }).click();
  await expect(card.locator('iframe')).toHaveAttribute('src', /embed\/mbVKGlh3gg4\?/);
  expect(await page.evaluate(() => window.__listeningPlayers[0].destroyed)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('plays a bounded passage, pauses at its end, replays, and can load the whole recording', async ({
  page,
}) => {
  await page.goto(guide);
  const card = page.locator('[data-study="two-thousand-and-seventeen"]');
  await card.getByRole('button', { name: 'Later comparison 1:30–2:00' }).click();
  await expect(card.getByRole('link', { name: 'Open on YouTube' })).toHaveAttribute(
    'href',
    /&t=90s$/,
  );
  await card.getByRole('button', { name: 'Load YouTube player' }).click();
  await expect(card.locator('iframe')).toHaveAttribute('src', /start=90&end=120/);
  const replay = card.getByRole('button', { name: 'Play / replay passage' });
  await expect(replay).toBeEnabled();
  await replay.click();
  expect(await page.evaluate(() => window.__listeningPlayers[0].playing)).toBe(true);
  await page.evaluate(() => {
    window.__listeningPlayers[0].time = 120.1;
  });
  await expect.poll(() => page.evaluate(() => window.__listeningPlayers[0].playing)).toBe(false);
  expect(await page.evaluate(() => window.__listeningPlayers[0].time)).toBe(90);
  await replay.click();
  expect(await page.evaluate(() => window.__listeningPlayers[0].playing)).toBe(true);
  await card.getByRole('button', { name: 'Whole recording', exact: true }).click();
  await expect(card.locator('iframe')).not.toHaveAttribute('src', /end=/);
  await expect(card.locator('iframe')).toHaveAttribute('src', /start=0/);
  await expect(card.getByRole('button', { name: 'Play / restart recording' })).toBeEnabled();
  expect(await page.evaluate(() => window.__listeningPlayers[0].destroyed)).toBe(true);
  expect(await page.evaluate(() => window.__listeningPlayers[1].playing)).toBe(false);
  await card.getByRole('button', { name: 'Close player' }).click();
  await expect(card.locator('iframe')).toHaveCount(0);
});

test('handles provider errors with retry and a direct recording link', async ({ page }) => {
  await page.goto(revision);
  const card = page.locator('.listening-example');
  await card.getByRole('button', { name: 'Load YouTube player' }).click();
  await expect(card.getByRole('button', { name: 'Play / replay passage' })).toBeEnabled();
  await page.evaluate(() => window.__listeningPlayers[0].options.events.onError());
  await expect(card.getByRole('alert')).toContainText('embedding may be disabled');
  await expect(card.getByRole('link', { name: 'Open on YouTube' })).toBeVisible();
  await card.getByRole('button', { name: 'Retry YouTube player' }).click();
  await expect(card.getByRole('alert')).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Play / replay passage' })).toBeEnabled();
  expect(await page.evaluate(() => window.__listeningPlayers[0].destroyed)).toBe(true);
  await expect(card.locator('iframe')).toHaveCount(1);
});

test('only keeps one player and disposes it on hide, navigation and delayed readiness', async ({
  page,
}) => {
  await page.goto(guide);
  const cards = page.locator('.listening-example');
  await cards.nth(0).getByRole('button', { name: 'Load YouTube player' }).click();
  await expect(cards.nth(0).getByRole('button', { name: 'Play / replay passage' })).toBeEnabled();
  await cards.nth(1).getByRole('button', { name: 'Load YouTube player' }).click();
  await expect(cards.nth(1).getByRole('button', { name: 'Play / replay passage' })).toBeEnabled();
  await expect(cards.nth(0).locator('iframe')).toHaveCount(0);
  await expect(cards.locator('iframe')).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(cards.locator('iframe')).toHaveCount(0);
  await page.evaluate(() => {
    window.__listeningReadyDelay = 20000;
  });
  await cards.nth(2).getByRole('button', { name: 'Load YouTube player' }).click();
  await expect(cards.nth(2).locator('iframe')).toHaveCount(1);
  await cards.nth(2).getByRole('button', { name: 'Close player' }).click();
  await page.evaluate(() => window.__listeningPlayers.at(-1)!.options.events.onReady());
  await expect(cards.locator('iframe')).toHaveCount(0);
  await page.evaluate(() => {
    window.__listeningReadyDelay = 0;
  });
  await cards.nth(0).getByRole('button', { name: 'Load YouTube player' }).click();
  await expect(cards.nth(0).locator('iframe')).toHaveCount(1);
  await page
    .locator('.entity-article .markdown-body')
    .getByRole('link', { name: 'Course overview', exact: true })
    .click();
  await expect(page).toHaveURL(/collection\/songwriting-course$/);
  await expect(page.locator('.listening-example iframe')).toHaveCount(0);
});

test('keeps the timed source link and written study usable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(revision);
  await expect(page.getByRole('heading', { name: 'True Love Waits', exact: true })).toBeVisible();
  await expect(
    page.locator('.listening-example').getByRole('link', { name: 'Open on YouTube' }),
  ).toHaveAttribute('href', 'https://www.youtube.com/watch?v=WSnc_6Z7HqQ&t=0s');
  await expect(page.locator('.listening-example iframe')).toHaveCount(0);
  await context.close();
});

test('connects the pilot recordings to bounded explanations in their actual articles', async ({
  page,
}) => {
  for (const [id, heading, source] of [
    [
      'songwriting-repetition-variation-surprise',
      'Hear continuity through a changing texture',
      'ZNuaLyPMc48',
    ],
    [
      'songwriting-pitch-and-intervals',
      'Hear the difference between contour and distance',
      'gOZgo8gMIoM',
    ],
    [
      'songwriting-revise-the-weakest-moment',
      'Hear two settings of True Love Waits',
      'mbVKGlh3gg4',
    ],
  ]) {
    await page.goto(`/pattern/${id}`);
    const body = page.locator('.entity-article .markdown-body');
    const section = body.getByRole('heading', { name: heading, exact: true });
    await expect(section).toBeVisible();
    await expect(body.locator(`a[href="https://www.youtube.com/watch?v=${source}"]`)).toHaveCount(
      1,
    );
    await section.scrollIntoViewIfNeeded();
    if (id === 'songwriting-revise-the-weakest-moment') {
      await expect(body).toContainText('This pair does not isolate one revision.');
      await expect(
        body.locator('a[href="https://www.youtube.com/watch?v=WSnc_6Z7HqQ"]'),
      ).toHaveCount(1);
      await page.screenshot({
        path: test.info().outputPath('article-example-context.png'),
        fullPage: false,
      });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.locator('.listening-example iframe')).toHaveCount(0);
  }
  await page.goto('/pattern/songwriting-choose-a-sonic-setting');
  const body = page.locator('.entity-article .markdown-body');
  await expect(body.getByRole('link', { name: 'Clouds (1969)' })).toHaveAttribute(
    'href',
    'https://jonimitchell.com/music/album.cfm?id=3',
  );
  await expect(body.getByRole('link', { name: 'Both Sides Now (2000)' })).toHaveAttribute(
    'href',
    'https://www.jonimitchell.com/music/album.cfm?id=22',
  );
  await expect(body).toContainText('a matched YouTube player pair has not yet been added here');
  await expect(body.locator('a[href*="d9zk2j3JPK4"]')).toHaveCount(0);
});
