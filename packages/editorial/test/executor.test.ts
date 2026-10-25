import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { configSchema } from '../src/contracts.js';
import { codexArgs, codexExecutor, subscriptionEnv, checkLogin } from '../src/executor.js';

const dirs: string[] = [];
const originalPath = process.env.PATH;
afterEach(async () => {
  process.env.PATH = originalPath;
  delete process.env.EDITORIAL_FAKE_CASE;
  await Promise.all(dirs.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});
async function setup(testCase = 'success') {
  const dir = await mkdtemp(join(tmpdir(), 'editorial-cli-'));
  dirs.push(dir);
  const bin = join(dir, 'bin');
  await mkdir(bin);
  await writeFile(
    join(bin, 'codex'),
    `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'login') { console.log(process.env.EDITORIAL_FAKE_CASE === 'api' ? 'Logged in using an API key' : 'Logged in using ChatGPT'); process.exit(0); }
let input = ''; process.stdin.on('data', b => input += b); process.stdin.on('end', () => {
 fs.writeFileSync('observed.json', JSON.stringify({ args, input, hasKey: !!process.env.OPENAI_API_KEY }));
 const mode = process.env.EDITORIAL_FAKE_CASE;
 if (mode === 'quota') { console.error('You have hit your usage limit'); process.exit(1); }
 if (mode === 'overflow') { process.stdout.write('x'.repeat(5000)); return; }
 if (mode === 'hang') { setInterval(() => {}, 1000); return; }
 if (mode === 'fail') { console.error('transport failed'); process.exit(1); }
 fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], JSON.stringify({ answer: mode === 'content-limit' ? 'Respect actuator rate limits and usage limits in the example' : 'fixture' }));
 console.log(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 10, output_tokens: 2 } }));
});
`,
    { mode: 0o700 },
  );
  process.env.PATH = `${bin}:${originalPath}`;
  process.env.EDITORIAL_FAKE_CASE = testCase;
  await writeFile(join(dir, 'prompt.md'), 'Focused fixture prompt');
  await writeFile(join(dir, 'schema.json'), '{}');
  return {
    stage: 'research' as const,
    pattern: 'fixture',
    revision: 0,
    context: {},
    config: configSchema.parse({ task_timeout_seconds: 1, max_output_bytes: 2000 }),
    attemptDir: dir,
    collectionDir: dir,
  };
}
it('calls codex exec with stdin, schema, read-only sandbox and subscription-only settings', async () => {
  const request = await setup();
  expect(await codexExecutor(request)).toEqual({ output: { answer: 'fixture' }, tokens: 12 });
  const observed = JSON.parse(await readFile(join(request.attemptDir, 'observed.json'), 'utf8'));
  expect(observed.args).toContain('exec');
  expect(observed.args).toContain('--output-schema');
  expect(observed.args).toContain('forced_login_method="chatgpt"');
  expect(observed.args).toContain('--ignore-user-config');
  expect(observed.args).toContain('read-only');
  expect(observed.args).not.toContain('--dangerously-bypass-approvals-and-sandbox');
  expect(observed.input).toBe('Focused fixture prompt');
  expect(observed.hasKey).toBe(false);
  expect(await readFile(join(request.attemptDir, 'events.jsonl'), 'utf8')).toContain(
    'turn.completed',
  );
});
it('identifies usage-limit failures and records conservative usage when unreported', async () => {
  const request = await setup('quota');
  await expect(codexExecutor(request)).rejects.toMatchObject({ kind: 'usage-limit' });
  expect(
    JSON.parse(await readFile(join(request.attemptDir, 'execution.json'), 'utf8')),
  ).toMatchObject({ usage_reported: false, tokens: 50000 });
});
it('kills oversized output and timeout processes', async () => {
  await expect(codexExecutor(await setup('overflow'))).rejects.toThrow('byte budget');
  await expect(codexExecutor(await setup('hang'))).rejects.toThrow('timeout');
});
it('cancels an active process on operator signal', async () => {
  const request = await setup('hang');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 100);
  await expect(codexExecutor({ ...request, signal: controller.signal })).rejects.toMatchObject({
    kind: 'interrupted',
  });
  clearTimeout(timer);
});
it('refuses API authentication and accepts ChatGPT login status', async () => {
  await setup();
  await checkLogin();
  process.env.EDITORIAL_FAKE_CASE = 'api';
  await expect(checkLogin()).rejects.toThrow('subscription login');
});
it('removes API keys and honors per-stage model overrides', () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-sentinel';
  try {
    expect(subscriptionEnv().OPENAI_API_KEY).toBeUndefined();
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
  const args = codexArgs(
    configSchema.parse({
      model: 'base-model',
      stage_models: { research: 'research-model' },
      web_search: false,
    }),
    'research',
    '/tmp/fixture',
  );
  expect(args).toContain('research-model');
  expect(args).toContain('web_search="disabled"');
});

it('does not interpret article prose about rate limits as a subscription failure', async () => {
  const result = await codexExecutor(await setup('content-limit'));
  expect(result.output).toMatchObject({ answer: expect.stringContaining('rate limits') });
});
