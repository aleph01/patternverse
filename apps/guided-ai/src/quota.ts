import { DurableObject } from 'cloudflare:workers';
import {
  MINUTE_REQUESTS_PER_NETWORK,
  REQUESTS_PER_NETWORK,
  REQUESTS_PER_SHARD,
  nextUtcDay,
} from './limits.js';

type Counter = { used: number; minute: number; minute_used: number };
export type Reservation =
  { allowed: true } | { allowed: false; code: 'FREE_LIMIT' | 'RATE_LIMIT'; resetAt: number };

/** One small, fixed budget partition per object, never an inference/session store.
 * Eight partitions bound the shared total without one global coordination bottleneck. */
export class GuidedAiQuota extends DurableObject<Cloudflare.Env> {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, used INTEGER NOT NULL, minute INTEGER NOT NULL, minute_used INTEGER NOT NULL)',
    );
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS day (id INTEGER PRIMARY KEY CHECK (id = 1), value INTEGER NOT NULL)',
    );
  }

  async reserve(network: string): Promise<Reservation> {
    if (!/^[a-f0-9]{64}$/.test(network)) throw new Error('Invalid quota identity');
    const now = Date.now();
    const day = Math.floor(now / 86_400_000);
    const minute = Math.floor(now / 60_000);
    const result = this.ctx.storage.transactionSync((): Reservation => {
      const sql = this.ctx.storage.sql;
      const previous = sql
        .exec<{ value: number }>('SELECT value FROM day WHERE id = 1')
        .toArray()[0]?.value;
      if (previous !== day) {
        sql.exec('DELETE FROM counters');
        sql.exec('INSERT OR REPLACE INTO day (id, value) VALUES (1, ?)', day);
      }
      const total =
        sql
          .exec<Counter>("SELECT used, minute, minute_used FROM counters WHERE key = 'budget'")
          .toArray()[0]?.used ?? 0;
      const user = sql
        .exec<Counter>('SELECT used, minute, minute_used FROM counters WHERE key = ?', network)
        .toArray()[0];
      if (total >= REQUESTS_PER_SHARD || (user?.used ?? 0) >= REQUESTS_PER_NETWORK)
        return { allowed: false, code: 'FREE_LIMIT', resetAt: nextUtcDay(now) };
      const recent = user?.minute === minute ? user.minute_used : 0;
      if (recent >= MINUTE_REQUESTS_PER_NETWORK)
        return { allowed: false, code: 'RATE_LIMIT', resetAt: (minute + 1) * 60_000 };
      sql.exec("INSERT OR REPLACE INTO counters VALUES ('budget', ?, ?, 0)", total + 1, minute);
      sql.exec(
        'INSERT OR REPLACE INTO counters VALUES (?, ?, ?, ?)',
        network,
        (user?.used ?? 0) + 1,
        minute,
        recent + 1,
      );
      return { allowed: true };
    });
    // Delete old daily pseudonyms even if the object receives no request tomorrow.
    if (result.allowed && (await this.ctx.storage.getAlarm()) === null)
      await this.ctx.storage.setAlarm(nextUtcDay(now));
    return result;
  }

  async alarm(): Promise<void> {
    const day = this.ctx.storage.sql
      .exec<{ value: number }>('SELECT value FROM day WHERE id = 1')
      .toArray()[0]?.value;
    if (day !== undefined && day < Math.floor(Date.now() / 86_400_000)) {
      this.ctx.storage.sql.exec('DELETE FROM counters');
      this.ctx.storage.sql.exec('DELETE FROM day');
    } else await this.ctx.storage.setAlarm(nextUtcDay(Date.now()));
  }
}
