import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink, lstat, readdir } from 'node:fs/promises';
import { hostname } from 'node:os';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { stateSchema, type State, type Task } from './contracts.js';

export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
export const readJson = async (file: string): Promise<unknown> =>
  JSON.parse(await readFile(file, 'utf8'));
export const exists = async (file: string) =>
  lstat(file).then(
    () => true,
    () => false,
  );
export async function atomicWrite(file: string, content: string) {
  await mkdir(dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, content, { flag: 'wx', mode: 0o600 });
  await rename(temp, file);
}
export const save = (dir: string, state: State) =>
  atomicWrite(join(dir, 'state.json'), json(stateSchema.parse(state)));
export const load = async (dir: string) =>
  stateSchema.parse(await readJson(join(dir, 'state.json')));
export function inside(dir: string, child: string) {
  const path = resolve(dir, child);
  const rel = relative(resolve(dir), path);
  if (isAbsolute(rel) || rel === '..' || rel.startsWith('../'))
    throw new Error('Path escapes collection');
  return path;
}
export async function artifact(dir: string, task: Task): Promise<unknown> {
  if (!task.artifact || !task.sha256) throw new Error(`Task ${task.id} has no artifact`);
  const value = await readFile(inside(dir, task.artifact), 'utf8');
  if (hash(value) !== task.sha256) throw new Error(`Artifact changed: ${task.id}`);
  return JSON.parse(value);
}
export async function treeHash(dir: string): Promise<string> {
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const values: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw new Error('Symlinks are not accepted artifacts');
    const path = join(dir, entry.name);
    values.push(
      entry.name,
      entry.isDirectory() ? await treeHash(path) : hash(await readFile(path, 'utf8')),
    );
  }
  return hash(json(values));
}
export async function verifyAccepted(dir: string, state: State) {
  for (const accepted of state.accepted) {
    if ((await treeHash(inside(dir, accepted.directory))) !== accepted.sha256)
      throw new Error(`Accepted work changed: ${accepted.id}`);
  }
}
// A live owner is never evicted. Dead locks are reclaimed only on this host.
export async function lock(dir: string): Promise<() => Promise<void>> {
  await mkdir(dir, { recursive: true });
  const path = join(dir, '.lock');
  const token = randomUUID();
  const claim = async () =>
    writeFile(path, json({ pid: process.pid, host: hostname(), token }), {
      flag: 'wx',
      mode: 0o600,
    });
  try {
    await claim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const owner = (await readJson(path)) as { pid: number; host: string; token: string };
    if (owner.host !== hostname() || !Number.isInteger(owner.pid))
      throw new Error('Collection locked on another host or lock is malformed', { cause: error });
    let alive = true;
    try {
      process.kill(owner.pid, 0);
    } catch (e) {
      alive = (e as NodeJS.ErrnoException).code !== 'ESRCH';
    }
    if (alive) throw new Error(`Collection locked by PID ${owner.pid}`, { cause: error });
    // Serialize stale-lock reclamation; never unlink a replacement owner's lock.
    const recovery = `${path}.recovery`;
    await writeFile(recovery, token, { flag: 'wx' });
    try {
      const current = (await readJson(path)) as { token: string };
      if (current.token !== owner.token)
        throw new Error('Lock changed during recovery; retry', { cause: error });
      await unlink(path);
      await claim();
    } finally {
      await unlink(recovery);
    }
  }
  return async () => {
    const owner = (await readJson(path)) as { token: string };
    if (owner.token === token) await unlink(path);
  };
}
