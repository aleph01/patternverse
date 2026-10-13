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
