import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const imported = JSON.parse(
  await readFile(resolve(process.cwd(), '../../docs/pattern-packages/nvc-import.json'), 'utf8'),
) as { patterns: { id: string; title: string }[] };

test('the NVC collection and verse contain all eight articles alongside Bowen and Games People Play', async ({
  page,
}) => {
  await page.goto('/collection/nonviolent-communication');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nonviolent Communication');
  for (const pattern of imported.patterns) {
    await expect(page.locator(`a[href="/pattern/${pattern.id}"]`).first()).toBeVisible();
  }
  await page.goto('/verse/communication-and-relationships');
  if ((page.viewportSize()?.width ?? 0) <= 800) {
    const collection = page.getByRole('button', { name: 'Nonviolent Communication 8 patterns' });
    await expect(collection).toBeVisible();
    if ((await collection.getAttribute('aria-expanded')) !== 'true') await collection.click();
    for (const pattern of imported.patterns) {
      await expect(page.locator(`a[href^="/pattern/${pattern.id}?"]`)).toBeVisible();
    }
    await expect(
      page.getByRole('button', { name: 'Bowen Family Systems Theory 6 patterns' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Games People Play 36 patterns' })).toBeVisible();
  } else {
    for (const id of ['nonviolent-communication', 'bowen-family-systems', 'games-people-play']) {
      await expect(page.locator(`a[href="/collection/${id}"]`).first()).toBeVisible();
    }
  }
  await expect(page.locator('a[href="/collection/transactional-analysis"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Transactional Analysis/ })).toHaveCount(0);
  await page.goto('/collection/games-people-play');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Games People Play');
  const games = JSON.parse(
    await readFile(
      resolve(process.cwd(), '../../docs/pattern-packages/transactional-analysis-import.json'),
      'utf8',
    ),
  ) as { patterns: { id: string }[] };
  for (const { id } of games.patterns) {
    await expect(page.locator(`a[href="/pattern/${id}"]`).first()).toBeVisible();
  }
  await expect(page.locator('a[href="/collection/transactional-analysis"]')).toHaveCount(0);
  await page.goto('/pattern/ta-why-dont-you-yes-but');
  await expect(page.locator('a[href="/collection/games-people-play"]').first()).toBeVisible();
  await expect(
    page.locator('a[href="/verse/communication-and-relationships"]').first(),
  ).toBeVisible();
  await expect(page.locator('a[href="/collection/transactional-analysis"]')).toHaveCount(0);
});

for (const pattern of imported.patterns) {
  test(`${pattern.title}: full article, sources, and related patterns`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/pattern/${pattern.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(pattern.title);
    await expect(page.locator('.entity-header-top button').first()).toBeEnabled();
    expect((await page.locator('main').innerText()).split(/\s+/).length).toBeGreaterThan(850);
    await expect(page.getByRole('heading', { name: 'Common mistakes', exact: true })).toBeVisible();
    expect(await page.locator('main blockquote').count()).toBeGreaterThanOrEqual(1);
    expect(await page.locator('main a[href^="https://"]').count()).toBeGreaterThanOrEqual(1);
    const related = page
      .getByRole('article', { name: `${pattern.title} article`, exact: true })
      .locator('a[href^="/pattern/nvc-"]')
      .first();
    await expect(related).toBeVisible();
    const target = new URL((await related.getAttribute('href'))!, 'https://patternverse.org');
    expect(imported.patterns.some((p) => target.pathname === '/pattern/' + p.id)).toBe(true);
    await related.click();
    await expect(page).toHaveURL(new RegExp(target.pathname));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}

test('normal refresh discovers the published release and retains the NVC article', async ({
  page,
}) => {
  await page.goto('/pattern/nvc-make-the-request-concrete');
  const version = (await (await page.request.get('/_app/version.json')).json()).version;
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration?.active?.scriptURL;
      }),
    )
    .toContain('version=' + version);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Make the Request Concrete');
});
