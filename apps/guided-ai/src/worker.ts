import practices from '../dist/practices.json' with { type: 'json' };
import type { PracticeManifest } from './manifest.js';
import { createHandler } from './handler.js';
import { invokeRuntime } from './runtime.js';
import { MODEL } from './limits.js';
export { GuidedAiQuota } from './quota.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Augment generated bindings only with the Wrangler-managed secret.
  namespace Cloudflare {
    interface Env {
      QUOTA_SALT: string;
    }
  }
}
const handle = createHandler(practices as PracticeManifest, invokeRuntime);
export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    return handle(request, {
      enabled: env.ENABLED === 'true',
      origins: env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),
      salt: env.QUOTA_SALT ?? '',
      reserve: (shard, id) => env.QUOTAS.getByName(`budget-${shard}`).reserve(id),
      infer: (messages, maxTokens) =>
        env.AI.run(
          MODEL,
          { messages: [...messages], max_tokens: maxTokens, temperature: 0.2 },
          { signal: AbortSignal.timeout(20_000) },
        ),
    });
  },
} satisfies ExportedHandler<Cloudflare.Env>;
