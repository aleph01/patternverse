import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import type { LocalWorkspace } from '@patternverse/workspace';
import type { PrivateMiraStore } from '../src/lib/mira/private-store';
import type { createEncryptedSyncStateStore } from '../src/lib/client/sync-state';
import type { PersonalCorpusStore } from '@patternverse/remote-store';
import type { WorkspaceSyncSnapshot } from '../src/lib/client/sync-snapshot';

type Fixture = {
  workspace: LocalWorkspace;
  mira: PrivateMiraStore;
  stateStore: ReturnType<typeof createEncryptedSyncStateStore>;
  local: PersonalCorpusStore;
  capture: () => Promise<WorkspaceSyncSnapshot>;
  update: (label: string, interrupt: boolean) => Promise<string>;
};
declare global {
  interface Window {
    syncFixture: Fixture;
  }
}

async function setup(page: Page, id: string) {
  await page.goto('/');
  await page.evaluate(
    async ({ id, root }) => {
      const load = (path: string) => import(/* @vite-ignore */ path);
      const workspaceModule = (await load(
        `/@fs${root}/packages/workspace/src/index.ts`,
      )) as typeof import('@patternverse/workspace');
      const { createSession } = (await load(
        `/@fs${root}/packages/companion-core/src/index.ts`,
      )) as typeof import('@patternverse/companion-core');
      const { createPrivateMiraStore } = (await load(
        '/src/lib/mira/private-store.ts',
      )) as typeof import('../src/lib/mira/private-store');
      const { createEncryptedSyncStateStore } = (await load(
        '/src/lib/client/sync-state.ts',
      )) as typeof import('../src/lib/client/sync-state');
      const { createRecoverableWorkspaceCorpusStore } = (await load(
        '/src/lib/client/sync-local-store.ts',
      )) as typeof import('../src/lib/client/sync-local-store');
      const { captureWorkspaceSyncSnapshot } = (await load(
        '/src/lib/client/sync-snapshot.ts',
      )) as typeof import('../src/lib/client/sync-snapshot');
      const { syncSnapshotToCorpus } = (await load(
        '/src/lib/client/sync-corpus.ts',
      )) as typeof import('../src/lib/client/sync-corpus');
      const { planCorpusSync } = (await load(
        `/@fs${root}/packages/sync-domain/src/index.ts`,
      )) as typeof import('@patternverse/sync-domain');
      const { deriveSyncKey, syncBase64 } = (await load(
        '/src/lib/client/sync-envelope.ts',
      )) as typeof import('../src/lib/client/sync-envelope');
      const workspace = workspaceModule.createIndexedDbWorkspace({
        databaseName: `test-workspace-${id}`,
      });
      const mira = createPrivateMiraStore({ databaseName: `test-mira-${id}` });
      if (!(await workspace.getEntity('one'))) {
        await workspace.createEntity({
          id: 'one',
          type: 'pattern',
          title: 'Original',
          body: 'Private browser test',
        });
        await mira.save(createSession('one', 'cbt', '2026-10-09T10:00:00.000Z'));
      }
      const identity = await workspace.getWorkspace();
      const salt = syncBase64(new Uint8Array(16).fill(14));
      const key = await deriveSyncKey('a long browser-only test phrase', salt);
      const stateStore = createEncryptedSyncStateStore({
        key,
        salt,
        databaseName: `test-state-${id}`,
        scope: { providerId: 'test', accountId: 'test', workspaceId: identity.id },
      });
      const local = createRecoverableWorkspaceCorpusStore({ workspace, mira, stateStore });
      window.syncFixture = {
        workspace,
        mira,
        stateStore,
        local,
        capture: () => captureWorkspaceSyncSnapshot(workspace, mira),
        update: async (label, interrupt) => {
          const before = await captureWorkspaceSyncSnapshot(workspace, mira);
          const desired = {
            ...before,
            workspace: {
              ...before.workspace,
              entities: before.workspace.entities.map((row) => ({ ...row, title: label })),
            },
            sessions: before.sessions.map((row) => ({ ...row, title: label })),
          };
          const base = await syncSnapshotToCorpus(before);
          const changes = planCorpusSync({
            base,
            local: base,
            remote: await syncSnapshotToCorpus(desired),
          }).pull;
          const store = interrupt
            ? createRecoverableWorkspaceCorpusStore({
                workspace,
                stateStore,
                mira: {
                  ...mira,
                  applySyncSessions: async () => {
                    throw new Error('browser interrupted');
                  },
                },
              })
            : local;
          try {
            await store.applyChanges(changes);
            return 'applied';
          } catch (error) {
            return (error as Error).message;
          }
        },
      };
    },
    { id, root: resolve(process.cwd(), '../..') },
  );
}

test('reviews versions with accessible controls and no horizontal overflow', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/tests/sync-review-browser.ts';
    const { mountReview } = await import(/* @vite-ignore */ path);
    const target = document.createElement('main');
    target.id = 'sync-review-test';
    target.style.cssText = 'max-width:760px;margin:24px auto;padding:12px';
    document.body.replaceChildren(target);
    mountReview(target);
  });
  await expect(page.getByRole('button', { name: 'Apply choices and sync' })).toBeDisabled();
  await page.getByText('Compare versions').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('radio', { name: 'This device' }).check();
  await page.getByRole('button', { name: 'Apply choices and sync' }).click();
  await expect(page.locator('#sync-review-test')).toHaveAttribute(
    'data-submitted',
    JSON.stringify({
      choices: { 'entities/one.json': 'local' },
      token: 'browser-reviewed-version',
    }),
  );
  await page.screenshot({
    path: `/tmp/patternverse-sync-review-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test('keeps light review and upgrade panels readable inside the dark sync controls', async ({
  page,
}) => {
  await page.goto('/my?pane=sync');
  await expect(page.locator('.sync-settings')).toBeVisible();
  await page.evaluate(async () => {
    const path = '/tests/sync-review-browser.ts';
    const { mountReview, mountUpgrade } = await import(/* @vite-ignore */ path);
    const controls = document.createElement('div');
    controls.className = 'sync-controls';
    document.querySelector('.sync-settings')!.append(controls);
    const review = document.createElement('div'),
      upgrade = document.createElement('div');
    controls.append(review, upgrade);
    mountReview(review);
    mountUpgrade(upgrade);
  });
  for (const name of ['Review workspace sync', 'Upgrade Dropbox archive']) {
    const panel = page.getByRole('region', { name });
    await expect(panel).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(panel.locator('p').first()).toHaveCSS('color', 'rgb(23, 25, 20)');
    expect(
      await panel.evaluate((node) => getComputedStyle(node).getPropertyValue('--muted').trim()),
    ).toBe('#62655f');
  }
});

test('uses the encrypted Dropbox adapter with native fetch, IndexedDB and whole-attempt Web Locks', async ({
  page,
}) => {
  const id = crypto.randomUUID();
  await setup(page, id);
  let document = await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { deriveSyncKey, syncBase64 } = await load('/src/lib/client/sync-envelope.ts');
    const { sealWorkspaceSyncSnapshot } = await load('/src/lib/client/sync-snapshot.ts');
    const salt = syncBase64(new Uint8Array(16).fill(14));
    const key = await deriveSyncKey('a long browser-only test phrase', salt);
    return JSON.stringify(
      await sealWorkspaceSyncSnapshot(await window.syncFixture.capture(), key, salt),
    );
  });
  let revision = 1,
    uploads = 0;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Dropbox-API-Result',
  };
  await page.route('https://content.dropboxapi.com/2/files/**', async (route) => {
    const request = route.request();
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
    expect(request.headers().authorization).toBe('Bearer browser-test-token');
    if (request.url().endsWith('download'))
      await route.fulfill({
        status: 200,
        headers: { ...cors, 'Dropbox-API-Result': JSON.stringify({ rev: `r${revision}` }) },
        body: document,
      });
    else {
      const args = JSON.parse(request.headers()['dropbox-api-arg']!);
      expect(args.strict_conflict).toBe(true);
      expect(args.mode.update).toBe(`r${revision}`);
      expect(args.path).toBe('/patternverse-sync-v2.json');
      document = request.postData()!;
      revision++;
      uploads++;
      await route.fulfill({
        status: 200,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify({ rev: `r${revision}` }),
      });
    }
  });
  const result = await page.evaluate(async (id) => {
    const path = '/src/lib/client/dropbox-workspace-sync.ts';
    const { syncWorkspaceWithDropbox } = await import(/* @vite-ignore */ path);
    const { workspace, mira } = window.syncFixture;
    const input = {
      workspace,
      mira,
      stateDatabaseName: `dropbox-browser-${id}`,
      connection: {
        accountId: 'browser-test-account',
        accessToken: 'browser-test-token',
        expiresAt: '2099-01-01T00:00:00Z',
      },
    };
    const first = await syncWorkspaceWithDropbox({
      ...input,
      phrase: 'a long browser-only test phrase',
    });
    await workspace.updateEntity('one', (row) => ({ ...row, body: 'PRIVATE BROWSER UPDATE' }));
    const concurrent = await Promise.all([
      syncWorkspaceWithDropbox(input),
      syncWorkspaceWithDropbox(input),
    ]);
    return { first, concurrent };
  }, id);
  expect(result, JSON.stringify(result)).toMatchObject({
    first: { type: 'complete' },
    concurrent: [{ type: 'complete' }, { type: 'complete' }],
  });
  expect(uploads).toBe(1);
  expect(document).not.toContain('PRIVATE BROWSER UPDATE');
  expect(document).not.toContain('browser-test-token');
});

test('reviews recovery choices and archive upgrades with explicit confirmation', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/tests/sync-review-browser.ts';
    const { mountRecovery, mountUpgrade } = await import(/* @vite-ignore */ path);
    const main = document.createElement('main');
    main.style.cssText = 'max-width:760px;margin:24px auto;padding:12px';
    document.body.replaceChildren(main);
    const recovery = document.createElement('div'),
      upgrade = document.createElement('div');
    recovery.id = 'recovery-test';
    upgrade.id = 'upgrade-test';
    main.append(recovery, upgrade);
    mountRecovery(recovery);
    mountUpgrade(upgrade);
  });
  const recovery = page.locator('#recovery-test'),
    upgrade = page.locator('#upgrade-test');
  await expect(recovery.getByRole('button', { name: 'Apply recovery choices' })).toBeDisabled();
  await expect(recovery.getByRole('radio', { name: 'Pending update' }).nth(1)).toBeDisabled();
  await recovery.getByRole('radio', { name: 'Pending update' }).first().check();
  await recovery.getByRole('radio', { name: 'This device' }).nth(1).check();
  await expect(recovery.getByRole('button', { name: 'Apply recovery choices' })).toBeDisabled();
  await recovery.getByRole('checkbox').check();
  await recovery.getByRole('button', { name: 'Apply recovery choices' }).click();
  await expect(recovery).toHaveAttribute(
    'data-submitted',
    JSON.stringify({
      choices: { 'entities/one.json': 'remote', 'sessions/one.json': 'local' },
      token: 'pending-review',
    }),
  );
  await expect(upgrade.getByRole('button', { name: 'Back up and upgrade' })).toBeDisabled();
  await upgrade.getByRole('checkbox').check();
  await upgrade.getByRole('button', { name: 'Back up and upgrade' }).click();
  await expect(upgrade).toHaveAttribute('data-submitted', 'upgrade-review');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `/tmp/patternverse-sync-upgrade-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test('settles reviewed local recovery across reload without losing newer work', async ({
  page,
}) => {
  const id = crypto.randomUUID();
  await setup(page, id);
  await page.evaluate(async () => {
    await window.syncFixture.update('Pending title', true);
    await window.syncFixture.workspace.updateEntity('one', (row) => ({
      ...row,
      title: 'Newer local title',
    }));
  });
  await page.reload();
  await setup(page, id);
  const result = await page.evaluate(async () => {
    const path = '/src/lib/client/sync-recovery-review.ts';
    const { createSyncRecoveryReview } = await import(/* @vite-ignore */ path);
    const f = window.syncFixture,
      recovery = createSyncRecoveryReview(f),
      review = await recovery.inspect();
    if (!review) throw new Error('Expected recovery review');
    const choices = Object.fromEntries(
      review.records.map((row: { path: string }) => [
        row.path,
        row.path.startsWith('sessions/') ? 'remote' : 'local',
      ]),
    );
    const resolved = await recovery.resolve({ token: review.token, choices, confirmed: true });
    await f.local.readSnapshot();
    return {
      resolved,
      title: (await f.workspace.getEntity('one'))?.title,
      chat: (await f.mira.load('one'))?.title,
      copy: !!(await f.stateStore.readRecoveryCopy()),
      pending: await f.stateStore.readApply(),
    };
  });
  expect(result).toEqual({
    resolved: { type: 'prepared' },
    title: 'Newer local title',
    chat: 'Pending title',
    copy: true,
    pending: null,
  });
});

test('recovers encrypted cross-database intent after an actual page reload', async ({ page }) => {
  const id = crypto.randomUUID();
  await setup(page, id);
  expect(await page.evaluate(() => window.syncFixture.update('Remote', true))).toBe(
    'browser interrupted',
  );
  expect(
    await page.evaluate(async () => (await window.syncFixture.stateStore.readApply()) !== null),
  ).toBe(true);
  await page.reload();
  await setup(page, id);
  const result = await page.evaluate(async () => {
    await window.syncFixture.local.readSnapshot();
    const snapshot = await window.syncFixture.capture();
    return {
      article: snapshot.workspace.entities[0]?.title,
      chat: snapshot.sessions[0]?.title,
      pending: await window.syncFixture.stateStore.readApply(),
      locks: Boolean(navigator.locks),
    };
  });
  expect(result).toEqual({ article: 'Remote', chat: 'Remote', pending: null, locks: true });
});

test('separate tabs serialize recovery and preserve a later local target edit', async ({
  page,
  context,
}) => {
  const id = crypto.randomUUID();
  await setup(page, id);
  const second = await context.newPage();
  await setup(second, id);
  expect(await page.evaluate(() => window.syncFixture.update('Remote', true))).toBe(
    'browser interrupted',
  );
  await second.evaluate(async () => {
    await window.syncFixture.workspace.updateEntity('one', (row) => ({
      ...row,
      title: 'Later local work',
    }));
  });
  const outcomes = await Promise.all(
    [page, second].map((tab) =>
      tab.evaluate(async () => {
        try {
          await window.syncFixture.local.readSnapshot();
          return 'unexpected success';
        } catch (error) {
          return (error as Error).name;
        }
      }),
    ),
  );
  expect(outcomes).toEqual(['CorpusChangePreconditionError', 'CorpusChangePreconditionError']);
  expect(
    await second.evaluate(async () => ({
      article: (await window.syncFixture.workspace.getEntity('one'))?.title,
      chat: (await window.syncFixture.mira.load('one'))?.title,
      pending: (await window.syncFixture.stateStore.readApply()) !== null,
    })),
  ).toEqual({ article: 'Later local work', chat: 'New session', pending: true });
});
