import { isIP } from 'node:net';
import { z } from 'zod';
import { fulfillModelEffect } from '@patternverse/guided-ai';
import { admit, requestSchema, type InvokeRuntime } from './admission.js';
import type { PracticeManifest } from './manifest.js';
import {
  MAX_OUTPUT_TOKENS,
  MAX_PROMPT_BYTES,
  MAX_REQUEST_BYTES,
  MODEL,
  REQUESTS_PER_NETWORK,
  SHARDS,
  nextUtcDay,
} from './limits.js';
import type { Reservation } from './quota.js';

// Narrow dependency ports for tests; production bindings use generated Env types.
type HandlerPorts = {
  enabled: boolean;
  origins: readonly string[];
  salt: string;
  reserve: (shard: number, fingerprint: string) => Promise<Reservation>;
  infer: (
    messages: readonly { role: 'system' | 'user'; content: string }[],
    maxTokens: number,
  ) => Promise<unknown>;
};
class RequestError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}
const replySchema = z.object({ response: z.string().min(1).max(8192) });

async function readBody(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.match(/^application\/json(?:\s*;|$)/i))
    throw new RequestError('INVALID_REQUEST', 415);
  if (Number(request.headers.get('content-length') ?? 0) > MAX_REQUEST_BYTES)
    throw new RequestError('CONTEXT_TOO_LARGE', 413);
  if (!request.body) throw new RequestError('INVALID_REQUEST', 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new RequestError('CONTEXT_TOO_LARGE', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new RequestError('INVALID_REQUEST', 400);
  }
}

/** Cloudflare overwrites CF-Connecting-IP at the edge. IPv6 is limited by /64;
 * quota identity is a daily HMAC, never a raw IP or a client-selected session ID. */
export function networkIdentity(ip: string): string | null {
  const family = isIP(ip);
  if (family === 4) return ip;
  if (family !== 6 || ip.includes('.')) return null;
  const parts = ip.toLowerCase().split('::');
  const left = parts[0]?.split(':').filter(Boolean) ?? [];
  const right = parts[1]?.split(':').filter(Boolean) ?? [];
  const words =
    parts.length === 1
      ? left
      : [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right];
  return `${words
    .slice(0, 4)
    .map((word) => word.padStart(4, '0'))
    .join(':')}::/64`;
}

async function fingerprint(network: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${Math.floor(Date.now() / 86_400_000)}:${network}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export function createHandler(manifest: PracticeManifest, invoke: InvokeRuntime) {
  return async (request: Request, ports: HandlerPorts): Promise<Response> => {
    const origin = request.headers.get('origin');
    const allowed = origin !== null && ports.origins.includes(origin);
    const headers = new Headers({
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      'X-Content-Type-Options': 'nosniff',
    });
    if (allowed) headers.set('Access-Control-Allow-Origin', origin);
    const response = (body: unknown, status = 200) => Response.json(body, { status, headers });
    const url = new URL(request.url);
    const enabled = ports.enabled && ports.salt.length >= 32;
    // Same-origin browser GETs need not have Origin. Status contains public
    // capability metadata only, never quota identities or participant answers.
    if (request.method === 'GET' && url.pathname === '/api/guided-ai/status' && !url.search) {
      headers.set('Access-Control-Allow-Origin', '*');
      return response({
        available: enabled,
        patternIds: enabled ? Object.keys(manifest) : [],
        provider: 'Cloudflare Workers AI',
        model: MODEL,
        dailyNetworkLimit: REQUESTS_PER_NETWORK,
      });
    }
    if (!allowed) return response({ code: 'ORIGIN_DENIED' }, 403);
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return new Response(null, { status: 204, headers });
    }
    if (url.search) return response({ code: 'INVALID_REQUEST' }, 400);
    if (url.pathname !== '/api/guided-ai/step') return response({ code: 'NOT_FOUND' }, 404);
    if (request.method !== 'POST') return response({ code: 'METHOD_NOT_ALLOWED' }, 405);
    if (!enabled) return response({ code: 'UNAVAILABLE' }, 503);
    const network = networkIdentity(request.headers.get('CF-Connecting-IP') ?? '');
    if (!network) return response({ code: 'UNAVAILABLE' }, 503);
    try {
      const parsed = requestSchema.safeParse(await readBody(request));
      if (!parsed.success) throw new RequestError('INVALID_REQUEST', 400);
      let admitted: ReturnType<typeof admit>;
      try {
        admitted = admit(parsed.data, manifest, invoke);
      } catch {
        throw new RequestError('INVALID_STEP', 422);
      }
      const { effect, practice, revision } = admitted;
      const result = await fulfillModelEffect(effect, async (messages) => {
        const bytes = new TextEncoder().encode(JSON.stringify(messages)).byteLength;
        if (bytes > MAX_PROMPT_BYTES) throw new RequestError('CONTEXT_TOO_LARGE', 413);
        const id = await fingerprint(network, ports.salt);
        const reservation = await ports.reserve(parseInt(id.slice(0, 2), 16) % SHARDS, id);
        if (!reservation.allowed) {
          headers.set(
            'Retry-After',
            String(Math.max(1, Math.ceil((reservation.resetAt - Date.now()) / 1000))),
          );
          throw new RequestError(reservation.code, 429);
        }
        // One bounded inference call, no retries or paid fallback. Reservations are
        // intentionally never refunded (timeouts may still consume inference).
        let reply: unknown;
        try {
          reply = await ports.infer(messages, MAX_OUTPUT_TOKENS);
        } catch (cause) {
          // Workers AI 3036 is daily allocation, NOT temporary capacity error 3040.
          const code =
            typeof cause === 'object' && cause !== null && 'code' in cause ? Number(cause.code) : 0;
          const message = cause instanceof Error ? cause.message : '';
          if (code === 3036 || /\b3036\b/.test(message)) {
            headers.set(
              'Retry-After',
              String(Math.ceil((nextUtcDay(Date.now()) - Date.now()) / 1000)),
            );
            throw new RequestError('FREE_LIMIT', 429);
          }
          throw new RequestError('PROVIDER_UNAVAILABLE', 503);
        }
        const answer = replySchema.safeParse(reply);
        if (!answer.success) throw new RequestError('INVALID_OUTPUT', 502);
        return answer.data.response;
      });
      // Runtime contract validation is the same as on the website. Do not return
      // the reconstituted checkpoint or record either answers or prompts anywhere.
      try {
        invoke(practice.transport, {
          ...(practice.transport === 'catalog' ? { version: 1 } : {}),
          operation: 'apply',
          saved: parsed.data.saved,
          expected_revision: revision,
          command: {
            run_id: effect.run_id,
            event: { Fulfill: { effect_id: effect.effect_id, result } },
          },
        });
      } catch {
        throw new RequestError('INVALID_OUTPUT', 502);
      }
      return response({ effectId: effect.effect_id, revision, result, provider: 'cloudflare' });
    } catch (cause) {
      // Never echo/log provider errors, prompts, identifiers or private checkpoints.
      if (cause instanceof RequestError) return response({ code: cause.code }, cause.status);
      return response({ code: 'INVALID_OUTPUT' }, 502);
    }
  };
}
