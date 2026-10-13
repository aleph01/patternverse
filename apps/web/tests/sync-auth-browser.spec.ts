import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const flowKey = 'patternverse:dropbox:oauth-flow:v1';
const connectionKey = 'patternverse:dropbox:connection:v1';
const providerPattern = /^https:\/\/(?:www\.dropbox\.com|(?:api|content)\.dropboxapi\.com)\//;

async function mockProvider(
  page: Page,
  options: {
    wrongState?: boolean;
    failToken?: boolean;
    accountId?: string;
    sync?: boolean;
    automatic?: boolean;
  } = {},
) {
  // Existing manual/auth scenarios deliberately opt out. Dedicated automatic
  // scenarios use the real default-on setting, always with synthetic content.
  await page.addInitScript((automatic) => {
    const key = 'patternverse:dropbox:auto-sync:v1';
    if (localStorage.getItem(key) === null) localStorage.setItem(key, String(automatic));
  }, options.automatic === true);
  let authorization: URL | undefined;
  let exchanges = 0;
  let downloads = 0;
  const unexpected: string[] = [];
  const uploads: string[] = [];
  let archive: string | undefined;
  let revision = 0;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Dropbox-API-Result',
  };
  // This also rejects unexpected provider requests; the tests never reach Dropbox.
  await page.context().route(providerPattern, async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization,content-type,dropbox-api-arg',
        },
      });
      return;
    }
    if (url.origin === 'https://www.dropbox.com' && url.pathname === '/oauth2/authorize') {
      authorization = url;
      expect(url.searchParams.get('client_id')).toBe('browser-test-app-key');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('token_access_type')).toBe('online');
      const callback = new URL(url.searchParams.get('redirect_uri')!);
      expect(callback.origin).toBe(new URL(test.info().project.use.baseURL!).origin);
      expect(callback.pathname).toBe('/auth/dropbox/callback');
      callback.searchParams.set('code', 'synthetic-dropbox-code');
      callback.searchParams.set(
        'state',
        options.wrongState ? 'incorrect-state' : url.searchParams.get('state')!,
      );
      await route.fulfill({
        contentType: 'text/html',
        body: `<a href="${callback.href.replaceAll('&', '&amp;')}">Approve test Dropbox</a>`,
      });
      return;
    }
    if (url.origin === 'https://api.dropboxapi.com' && url.pathname === '/oauth2/token') {
      exchanges++;
      const body = new URLSearchParams(request.postData()!);
      expect(body.get('code')).toBe('synthetic-dropbox-code');
      expect(body.get('client_id')).toBe('browser-test-app-key');
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.has('client_secret')).toBe(false);
      expect(body.get('redirect_uri')).toBe(authorization?.searchParams.get('redirect_uri'));
      expect(createHash('sha256').update(body.get('code_verifier')!).digest('base64url')).toBe(
        authorization?.searchParams.get('code_challenge'),
      );
      await route.fulfill({
        status: options.failToken ? 400 : 200,
        headers: cors,
        json: options.failToken
          ? { error: 'invalid_grant' }
          : {
              access_token: 'synthetic-dropbox-token',
              account_id: options.accountId ?? 'browser-auth-account',
              expires_in: 14400,
            },
      });
      return;
    }
    if (
      url.origin === 'https://api.dropboxapi.com' &&
      url.pathname === '/2/users/get_current_account'
    ) {
      expect(request.headers().authorization).toBe('Bearer synthetic-dropbox-token');
      await route.fulfill({
        headers: cors,
        json: {
          account_id: options.accountId ?? 'browser-auth-account',
          name: { display_name: 'Test reader' },
        },
      });
      return;
    }
    if (options.sync && url.pathname === '/2/files/get_metadata') {
      const body = request.postDataJSON() as { path: string };
      expect(['/patternverse-sync-v1.json', '/patternverse-sync-v2.json']).toContain(body.path);
      await route.fulfill({
        status: 409,
        headers: cors,
        json: { error: { '.tag': 'path', path: { '.tag': 'not_found' } } },
      });
      return;
    }
    if (options.sync && url.origin === 'https://content.dropboxapi.com') {
      expect(request.headers().authorization).toBe('Bearer synthetic-dropbox-token');
      const args = JSON.parse(request.headers()['dropbox-api-arg']!) as {
        path: string;
        mode?: { '.tag': string; update?: string };
        strict_conflict?: boolean;
        autorename?: boolean;
      };
      expect(args.path).toBe('/patternverse-sync-v3.json');
      if (url.pathname === '/2/files/download') {
        downloads++;
        if (archive === undefined)
          await route.fulfill({
            status: 409,
            headers: cors,
            json: { error: { '.tag': 'path', path: { '.tag': 'not_found' } } },
          });
        else
          await route.fulfill({
            headers: { ...cors, 'Dropbox-API-Result': JSON.stringify({ rev: `r${revision}` }) },
            contentType: 'application/json',
            body: archive,
          });
        return;
      }
      if (url.pathname === '/2/files/upload') {
        expect(args.strict_conflict).toBe(true);
        expect(args.autorename).toBe(false);
        expect(args.mode).toEqual(
          archive === undefined ? { '.tag': 'add' } : { '.tag': 'update', update: `r${revision}` },
        );
        archive = request.postData()!;
        uploads.push(archive);
        revision++;
        await route.fulfill({ headers: cors, json: { rev: `r${revision}` } });
        return;
      }
    }
    unexpected.push(url.origin + url.pathname);
    await route.abort('blockedbyclient');
  });
  return { exchanges: () => exchanges, downloads: () => downloads, unexpected, uploads };
}

async function openSyncPanel(page: Page) {
  // Wait for the client workspace read: SSR buttons are visible before hydration.
  await expect(page.getByText(/^No personal verses yet\./)).toBeVisible();
  await page.getByRole('button', { name: 'Sync & backup', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sync & backup', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
}
async function authorize(page: Page) {
  await page.goto('/my');
  await openSyncPanel(page);
  await page.getByRole('button', { name: 'Connect Dropbox', exact: true }).click();
  await page.getByRole('link', { name: 'Approve test Dropbox' }).click();
}

test('connects through the actual PKCE callback and disconnects without removing workspace data', async ({
  page,
}) => {
  const provider = await mockProvider(page);
  await authorize(page);
  await expect(page).toHaveURL(/\/my$/);
  await openSyncPanel(page);
  await expect(page.getByRole('heading', { name: 'Dropbox connected', exact: true })).toBeVisible();
  await expect(page.getByLabel(/Sync phrase/)).toHaveCount(0);
  const stored = await page.evaluate(
    ({ flowKey, connectionKey }) => ({
      flow: sessionStorage.getItem(flowKey),
      connection: JSON.parse(sessionStorage.getItem(connectionKey)!),
      persistentToken: Object.values(localStorage).some((value) =>
        String(value).includes('synthetic-dropbox-token'),
      ),
    }),
    { flowKey, connectionKey },
  );
  expect(stored.flow).toBeNull();
  expect(stored.connection).toMatchObject({
    accountId: 'browser-auth-account',
    accessToken: 'synthetic-dropbox-token',
  });
  expect(stored.persistentToken).toBe(false);
  await page.evaluate(async () => {
    const path = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(/* @vite-ignore */ path);
    await (
      await getLocalWorkspace()
    ).createEntity({ id: 'auth-note', type: 'pattern', title: 'My private note', body: 'Keep me' });
  });
  await page.reload();
  await openSyncPanel(page);
  await expect(page.getByRole('heading', { name: 'Dropbox connected', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Connect Dropbox', exact: true })).toBeVisible();
  const after = await page.evaluate(async (connectionKey) => {
    const path = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(/* @vite-ignore */ path);
    return {
      connection: sessionStorage.getItem(connectionKey),
      body: (await (await getLocalWorkspace()).getEntity('auth-note'))?.body,
    };
  }, connectionKey);
  expect(after).toEqual({ connection: null, body: 'Keep me' });
  expect(provider.exchanges()).toBe(1);
  expect(provider.unexpected).toEqual([]);
});

test('syncs through the actual sign-in-only UI only after an explicit action, without a phrase', async ({
  page,
}) => {
  const provider = await mockProvider(page, { sync: true });
  await authorize(page);
  await expect(page).toHaveURL(/\/my$/);
  await openSyncPanel(page);
  await expect(page.getByLabel(/Sync phrase/)).toHaveCount(0);
  await expect(
    page.getByText(/Dropbox and anyone with access to your account can\s+read it/),
  ).toBeVisible();
  expect(provider.uploads).toHaveLength(0);
  await page.evaluate(async () => {
    const path = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(/* @vite-ignore */ path);
    await (
      await getLocalWorkspace()
    ).createEntity({
      id: 'phrase-free-note',
      type: 'pattern',
      title: 'Synthetic sync note',
      body: 'Synthetic browser test content',
    });
  });
  await page.getByRole('button', { name: 'Sync now', exact: true }).click();
  await expect(page.getByText('Synced 2 private workspace records.')).toBeVisible();
  expect(provider.uploads).toHaveLength(1);
  expect(JSON.parse(provider.uploads[0]!)).toMatchObject({
    version: 3,
    protection: 'dropbox-account',
    snapshot: { version: 2 },
  });
  expect(provider.uploads[0]).toContain('Synthetic browser test content');
  expect(provider.uploads[0]).not.toContain('synthetic-dropbox-token');
  expect(provider.unexpected).toEqual([]);
});

test('automatically syncs saved content outside the backup page and stops when sync settings disables it', async ({
  page,
}) => {
  const provider = await mockProvider(page, { sync: true, automatic: true });
  await authorize(page);
  await expect(page).toHaveURL(/\/my$/);
  await expect.poll(() => provider.uploads.length).toBe(1);
  await page.getByRole('link', { name: 'library', exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
  await page.evaluate(async () => {
    const path = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(/* @vite-ignore */ path);
    await (
      await getLocalWorkspace()
    ).createEntity({
      type: 'verse',
      id: 'automatic-test-verse',
      title: 'Synthetic automatic sync verse',
      body: '',
    });
  });
  await expect.poll(() => provider.uploads.length).toBe(2);
  expect(provider.uploads[1]).toContain('Synthetic automatic sync verse');
  expect(provider.uploads[1]).not.toContain('synthetic-dropbox-token');
  await page.goto('/my?pane=settings');
  await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toBeEnabled();
  await expect(page.getByRole('switch', { name: /Automatic Dropbox sync/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sync & backup', exact: true }).click();
  // Pane buttons do not rewrite the URL; use the sync deep link for the reload check.
  await page.goto('/my?pane=sync');
  const toggle = page.getByRole('switch', { name: /Automatic Dropbox sync/ });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(toggle).not.toBeChecked();
  await page.evaluate(async () => {
    const path = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(/* @vite-ignore */ path);
    await (
      await getLocalWorkspace()
    ).updateEntity('automatic-test-verse', (value: Record<string, unknown>) => ({
      ...value,
      title: 'Synthetic saved while automatic sync off',
    }));
  });
  await page.waitForTimeout(2500);
  expect(provider.uploads).toHaveLength(2);
  await page.reload();
  await expect(toggle).not.toBeChecked();
  await expect(page.getByText(/Automatic sync off/)).toBeVisible();
  await page.getByRole('button', { name: 'Sync now', exact: true }).click();
  await expect.poll(() => provider.uploads.length).toBe(3);
  expect(provider.uploads[2]).toContain('Synthetic saved while automatic sync off');
  expect(provider.unexpected).toEqual([]);
});

test('rejects a mismatched callback state before token exchange and clears single-use credentials', async ({
  page,
}) => {
  const provider = await mockProvider(page, { wrongState: true });
  await authorize(page);
  await expect(
    page.getByRole('heading', { name: 'The Dropbox authorization state did not match.' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/dropbox\/callback$/);
  expect(
    await page.evaluate(
      ({ flowKey, connectionKey }) => [
        sessionStorage.getItem(flowKey),
        sessionStorage.getItem(connectionKey),
      ],
      { flowKey, connectionKey },
    ),
  ).toEqual([null, null]);
  expect(provider.exchanges()).toBe(0);
  expect(provider.unexpected).toEqual([]);
});

test('backup restore disables automatic uploads, refreshes content, and remains off after reload', async ({
  page,
}) => {
  const provider = await mockProvider(page, { sync: true, automatic: true });
  await authorize(page);
  await expect.poll(() => provider.uploads.length).toBe(1);
  await page.evaluate(async () => {
    const path = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(/* @vite-ignore */ path);
    await (
      await getLocalWorkspace()
    ).createEntity({
      type: 'verse',
      id: 'restore-test-verse',
      title: 'Synthetic original verse',
      body: '',
    });
  });
  // The workspace remains open: this refresh comes from the typed write event.
  await expect(
    page.getByRole('heading', { name: 'Synthetic original verse', exact: true }),
  ).toBeVisible();
  await expect.poll(() => provider.uploads.length).toBe(2);
  await page.goto('/my?pane=sync');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download workspace backup', exact: true }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks);
  await page.evaluate(async () => {
    const path = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(/* @vite-ignore */ path);
    await (
      await getLocalWorkspace()
    ).updateEntity('restore-test-verse', (value: Record<string, unknown>) => ({
      ...value,
      title: 'Synthetic newer verse',
    }));
  });
  await page.getByRole('button', { name: 'Restore from backup', exact: true }).click();
  await page.getByLabel('Choose a workspace backup').setInputFiles({
    name: 'synthetic-workspace.cbor',
    mimeType: 'application/cbor',
    buffer: bytes,
  });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Replace workspace', exact: true }).click();
  await expect(page.getByText(/Workspace restored on this device/)).toBeVisible();
  const toggle = page.getByRole('switch', { name: /Automatic Dropbox sync/ });
  await expect(toggle).not.toBeChecked();
  const before = provider.uploads.length;
  const readsBefore = provider.downloads();
  await page.clock.install();
  await page.clock.runFor(65_000);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.clock.runFor(2000);
  expect(provider.uploads).toHaveLength(before);
  expect(provider.downloads()).toBe(readsBefore);
  await page.reload();
  await expect(toggle).not.toBeChecked();
  await page.getByRole('button', { name: 'Your content', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Synthetic original verse', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Synthetic newer verse', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Sync & backup', exact: true }).click();
  await page.getByRole('button', { name: 'Sync now', exact: true }).click();
  // Restoring content already in Dropbox is intentionally a no-op upload.
  // A new provider read and completion prove manual sync still works while off.
  await expect.poll(() => provider.downloads()).toBeGreaterThan(readsBefore);
  await expect(
    page.getByText('Synced 2 private workspace records.', { exact: true }),
  ).toBeVisible();
  expect(provider.uploads.at(-1)).toContain('Synthetic original verse');
  expect(provider.uploads.at(-1)).not.toContain('Synthetic newer verse');
  expect(provider.unexpected).toEqual([]);
});

test('cleans up after a rejected authorization code without storing a connection', async ({
  page,
}) => {
  const provider = await mockProvider(page, { failToken: true });
  await authorize(page);
  await expect(
    page.getByRole('heading', { name: 'Dropbox could not complete authorization.' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/dropbox\/callback$/);
  expect(
    await page.evaluate(
      ({ flowKey, connectionKey }) => [
        sessionStorage.getItem(flowKey),
        sessionStorage.getItem(connectionKey),
      ],
      { flowKey, connectionKey },
    ),
  ).toEqual([null, null]);
  expect(provider.exchanges()).toBe(1);
  expect(provider.unexpected).toEqual([]);
});

test('refuses another account in an already owned workspace without moving private content', async ({
  page,
}) => {
  const provider = await mockProvider(page, { accountId: 'second-test-account' });
  await page.goto('/my');
  await page.evaluate(async () => {
    const accountPath = '/src/lib/client/dropbox-account.ts',
      workspacePath = '/src/lib/client/workspace.ts';
    const { claimDropboxWorkspace } = await import(/* @vite-ignore */ accountPath);
    const { getLocalWorkspace } = await import(/* @vite-ignore */ workspacePath);
    await claimDropboxWorkspace('original-test-account');
    await (
      await getLocalWorkspace()
    ).createEntity({
      id: 'original-note',
      type: 'pattern',
      title: 'Original account note',
      body: 'Must stay private',
    });
  });
  await authorize(page);
  await expect(
    page.getByRole('heading', {
      name: /This browser workspace belongs to another Dropbox account/,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/dropbox\/callback$/);
  expect(
    await page.evaluate(() => sessionStorage.getItem('patternverse:dropbox:connection:v1')),
  ).toBeNull();
  expect(
    await page.evaluate(async () => {
      const path = '/src/lib/client/workspace.ts';
      const { getLocalWorkspace } = await import(/* @vite-ignore */ path);
      return (await (await getLocalWorkspace()).getEntity('original-note'))?.body;
    }),
  ).toBe('Must stay private');
  expect(provider.unexpected).toEqual([]);
});

test('drops expired session credentials and keeps the workspace usable', async ({ page }) => {
  await page.goto('/my');
  await page.evaluate(
    (connectionKey) =>
      sessionStorage.setItem(
        connectionKey,
        JSON.stringify({
          accessToken: 'expired-test-token',
          accountId: 'browser-auth-account',
          expiresAt: '2000-01-01T00:00:00Z',
        }),
      ),
    connectionKey,
  );
  await page.reload();
  await openSyncPanel(page);
  await expect(page.getByRole('button', { name: 'Connect Dropbox', exact: true })).toBeVisible();
  expect(
    await page.evaluate((connectionKey) => sessionStorage.getItem(connectionKey), connectionKey),
  ).toBeNull();
  await expect(page.getByRole('heading', { name: 'your workspace.', exact: true })).toBeVisible();
});
