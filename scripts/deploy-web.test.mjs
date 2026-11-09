import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runDeployment } from './deploy-web.mjs';

function recorder() {
  const calls = [];
  return { calls, run: async (...args) => calls.push(args), log: () => {} };
}

test('build-only validates and checks production assets without uploading', async () => {
  const recorded = recorder();
  await runDeployment({
    ...recorded,
    args: ['--build-only'],
    env: { CI: 'true', PATTERNVERSE_INCLUDE_DRAFTS: 'true', CLOUDFLARE_API_TOKEN: 'fixture' },
  });
  assert.equal(recorded.calls.length, 4);
  assert.deepEqual(
    recorded.calls.slice(0, 3).map((call) => call[1][0]),
    ['validate:content', 'compile:content:production', 'build'],
  );
  for (const [, , options] of recorded.calls) {
    assert.equal(options.env.PATTERNVERSE_INCLUDE_DRAFTS, 'false');
    assert.equal(options.env.NODE_ENV, 'production');
    assert.equal(options.env.CLOUDFLARE_API_TOKEN, undefined);
  }
  assert.match(recorded.calls[3][1][0], /check-public-build\.mjs$/);
});

test('publishes only after checks, using the configured project and production branch', async () => {
  const recorded = recorder();
  await runDeployment({
    ...recorded,
    args: [],
    env: {
      CI: 'true',
      CLOUDFLARE_API_TOKEN: 'fixture',
      CLOUDFLARE_ACCOUNT_ID: 'fixture-account',
      CLOUDFLARE_PAGES_PROJECT: 'patternverse-site',
      GITHUB_SHA: 'fixture-sha',
    },
  });
  assert.equal(recorded.calls.length, 5);
  const [, args, options] = recorded.calls[4];
  assert.deepEqual(args.slice(1), [
    'pages',
    'deploy',
    'build',
    '--project-name',
    'patternverse-site',
    '--branch',
    'main',
    '--commit-hash',
    'fixture-sha',
  ]);
  assert.equal(options.env.CLOUDFLARE_API_TOKEN, 'fixture');
  assert.match(options.cwd, /apps\/web$/);
});

test('failed builds never reach the upload step', async () => {
  let calls = 0;
  await assert.rejects(
    runDeployment({
      args: [],
      env: {},
      log: () => {},
      run: async () => {
        calls++;
        throw new Error('Build failed');
      },
    }),
    /Build failed/,
  );
  assert.equal(calls, 1);
});

test('prebuilt publication scans and uploads without rebuilding or recompiling', async () => {
  const recorded = recorder();
  await runDeployment({
    ...recorded,
    args: ['--prebuilt'],
    env: {
      CI: 'true',
      CLOUDFLARE_API_TOKEN: 'fixture',
      CLOUDFLARE_ACCOUNT_ID: 'fixture-account',
      GITHUB_SHA: 'verified-revision',
    },
  });
  assert.equal(recorded.calls.length, 2);
  const [scan, upload] = recorded.calls;
  assert.equal(scan[0], process.execPath);
  assert.match(scan[1][0], /check-public-build\.mjs$/);
  assert.equal(scan[1][1], 'apps/web/build');
  assert.equal(scan[2].env.CLOUDFLARE_API_TOKEN, undefined);
  assert.equal(scan[2].env.CLOUDFLARE_ACCOUNT_ID, undefined);
  assert.equal(upload[0], process.execPath);
  assert.deepEqual(upload[1].slice(1), [
    'pages',
    'deploy',
    'build',
    '--project-name',
    'patternverse',
    '--branch',
    'main',
    '--commit-hash',
    'verified-revision',
  ]);
  assert.equal(upload[2].env.CLOUDFLARE_API_TOKEN, 'fixture');
});

test('a failed prebuilt scan stops publication without rebuilding', async () => {
  const calls = [];
  await assert.rejects(
    runDeployment({
      args: ['--prebuilt'],
      env: {},
      log: () => {},
      run: async (...args) => {
        calls.push(args);
        throw new Error('Public build rejected');
      },
    }),
    /Public build rejected/,
  );
  assert.equal(calls.length, 1);
  assert.match(calls[0][1][0], /check-public-build\.mjs$/);
});

test('prebuilt mode requires CI credentials and rejects conflicting build options', async () => {
  const recorded = recorder();
  await assert.rejects(
    runDeployment({ ...recorded, args: ['--prebuilt'], env: { CI: 'true' } }),
    /Configure/,
  );
  await assert.rejects(
    runDeployment({ ...recorded, args: ['--prebuilt', '--build-only'], env: {} }),
    /either --build-only or --prebuilt/,
  );
  assert.equal(recorded.calls.length, 0);
});

test('missing CI credentials and unknown flags fail before running any commands', async () => {
  const recorded = recorder();
  await assert.rejects(runDeployment({ ...recorded, args: [], env: { CI: 'true' } }), /Configure/);
  await assert.rejects(
    runDeployment({ ...recorded, args: ['--watch'], env: {} }),
    /Unknown option/,
  );
  assert.equal(recorded.calls.length, 0);
});

test('help never builds or uploads', async () => {
  const recorded = recorder();
  await runDeployment({ ...recorded, args: ['--help'], env: {} });
  assert.equal(recorded.calls.length, 0);
});
