import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type Config, type Stage } from './contracts.js';
import { exists, json } from './store.js';

export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly kind: 'usage-limit' | 'interrupted' | 'failed' = 'failed',
  ) {
    super(message);
  }
}
export function subscriptionEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of [
    'OPENAI_API_KEY',
    'CODEX_API_KEY',
    'OPENAI_BASE_URL',
    'OPENAI_ORG_ID',
    'OPENAI_PROJECT_ID',
    'CODEX_ACCESS_TOKEN',
  ])
    delete env[key];
  return env;
}
export function codexArgs(config: Config, stage: Stage, attemptDir: string): string[] {
  const model = config.stage_models[stage] ?? config.model;
  return [
    'exec',
    '--ignore-user-config',
    '--ephemeral',
    '--skip-git-repo-check',
    '--sandbox',
    'read-only',
    '-c',
    'approval_policy="never"',
    '-c',
    'forced_login_method="chatgpt"',
    '-c',
    'model_provider="openai"',
    '-c',
    `model_reasoning_effort=${JSON.stringify(config.reasoning_effort)}`,
    '-c',
    `web_search=${JSON.stringify(config.web_search && ['domain-research', 'research', 'factcheck'].includes(stage) ? 'live' : 'disabled')}`,
    ...(model ? ['--model', model] : []),
    '--json',
    '--color',
    'never',
    '--output-schema',
    join(attemptDir, 'schema.json'),
    '--output-last-message',
    join(attemptDir, 'response.json'),
    '-',
  ];
}
export type ExecuteRequest = {
  stage: Stage;
  pattern: string | null;
  revision: number;
  context: Record<string, unknown>;
  config: Config;
  attemptDir: string;
  collectionDir: string;
  signal?: AbortSignal;
};
export type ExecuteResult = { output: unknown; tokens: number };
export type Executor = (request: ExecuteRequest) => Promise<ExecuteResult>;

export async function checkLogin() {
  const result = await new Promise<string>((resolve, reject) => {
    const child = spawn('codex', ['login', 'status'], {
      env: subscriptionEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let message = '';
    child.stdout.on('data', (b) => (message += b.toString()));
    child.stderr.on('data', (b) => (message += b.toString()));
    const timeout = setTimeout(() => child.kill('SIGTERM'), 10000);
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(message);
      else reject(new Error('Run codex login to sign in with ChatGPT'));
    });
  });
  if (!/logged in using chatgpt/i.test(result))
    throw new Error('ChatGPT subscription login required; API key login is not supported');
}

export const codexExecutor: Executor = async (request) => {
  const { config, attemptDir, collectionDir, signal } = request;
  const prompt = await readFile(join(attemptDir, 'prompt.md'), 'utf8');
  const events = createWriteStream(join(attemptDir, 'events.jsonl'), { flags: 'wx', mode: 0o600 });
  const stderr = createWriteStream(join(attemptDir, 'stderr.log'), { flags: 'wx', mode: 0o600 });
  let stderrTail = '',
    terminalError = '',
    exitCode: number | null = null,
    bytes = 0,
    tokens = 0,
    reported = false,
    pending = '',
    reason: ExecutionError | null = null;
  const child = spawn('codex', codexArgs(config, request.stage, attemptDir), {
    cwd: attemptDir,
    env: subscriptionEnv(),
    detached: process.platform !== 'win32',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stop = (error: ExecutionError) => {
    if (reason) return;
    reason = error;
    try {
      if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch {
      /* already ended */
    }
    killer = setTimeout(() => {
      try {
        if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch {
        /* already ended */
      }
    }, 1500);
  };
  let killer: ReturnType<typeof setTimeout> | undefined;
  const onAbort = () =>
    stop(new ExecutionError('Interrupted; resume to retry this task', 'interrupted'));
  signal?.addEventListener('abort', onAbort, { once: true });
  const timeout = setTimeout(
    () => stop(new ExecutionError('Task timeout')),
    config.task_timeout_seconds * 1000,
  );
  const pause = setInterval(() => {
    void exists(join(collectionDir, 'PAUSE')).then((paused) => {
      if (paused) stop(new ExecutionError('Paused by operator', 'interrupted'));
    });
  }, 500);
  child.stdout.on('data', (chunk: Buffer) => {
    bytes += chunk.length;
    if (bytes > config.max_output_bytes) {
      stop(new ExecutionError('Output byte budget exceeded'));
      return;
    }
    events.write(chunk);
    pending += chunk.toString();
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as {
          type: string;
          error?: { message?: string };
          message?: string;
          usage?: { input_tokens?: number; output_tokens?: number };
        };
        if (event.type === 'turn.failed' || event.type === 'error')
          terminalError += event.error?.message ?? event.message ?? 'Codex execution failed';
        if (event.type === 'turn.completed' && event.usage) {
          reported = true;
          tokens += (event.usage.input_tokens ?? 0) + (event.usage.output_tokens ?? 0);
        }
      } catch {
        /* raw log preserves non-JSON diagnostic lines */
      }
    }
  });
  child.stderr.on('data', (chunk: Buffer) => {
    bytes += chunk.length;
    if (bytes > config.max_output_bytes) {
      stop(new ExecutionError('Output byte budget exceeded'));
      return;
    }
    stderr.write(chunk);
    stderrTail = (stderrTail + chunk.toString()).slice(-16000);
  });
  child.stdin.on('error', () => {
    /* spawn/close reports the actual failure */
  });
  child.stdin.end(prompt);
  if (signal?.aborted) onAbort();
  try {
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
    exitCode = code;
    if (reason) throw reason;
    if (
      (code !== 0 || terminalError) &&
      /usage limit|rate.limit|quota exceeded|limit reached|insufficient_quota/i.test(
        terminalError + stderrTail,
      )
    )
      throw new ExecutionError(
        'Subscription usage limit reached; resume after reset',
        'usage-limit',
      );
    if (code !== 0 || terminalError)
      throw new ExecutionError(`codex exec exited ${code}; inspect stderr.log and events.jsonl`);
    const response = await readFile(join(attemptDir, 'response.json'), 'utf8');
    if (Buffer.byteLength(response) > config.max_output_bytes)
      throw new ExecutionError('Response byte budget exceeded');
    return {
      output: JSON.parse(response),
      tokens: reported ? tokens : config.unreported_token_reserve,
    };
  } finally {
    clearTimeout(timeout);
    clearInterval(pause);
    if (killer) clearTimeout(killer);
    signal?.removeEventListener('abort', onAbort);
    await writeFile(
      join(attemptDir, 'execution.json'),
      json({
        tokens: reported ? tokens : config.unreported_token_reserve,
        usage_reported: reported,
        exit_code: exitCode,
        terminal_error: terminalError || null,
      }),
      { flag: 'wx' },
    );
    await Promise.all([
      new Promise<void>((r) => events.end(r)),
      new Promise<void>((r) => stderr.end(r)),
    ]);
  }
};
