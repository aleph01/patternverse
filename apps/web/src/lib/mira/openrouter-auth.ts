import { DEFAULT_OPENROUTER_MODEL } from './openrouter';
import type { PrivateMiraStore } from './private-store';

export const OPENROUTER_FLOW_KEY = 'patternverse-openrouter-pkce-v1';
const MAX_AGE = 10 * 60 * 1000;
type Flow = {
  verifier: string;
  state: string;
  callback: string;
  returnTo: string;
  createdAt: number;
};
type FlowStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function safeReturn(url: URL, origin: string): string {
  if (url.origin !== origin) {
    throw new Error('The OpenRouter return address is invalid. Start the connection again.');
  }
  if (/\/auth\/openrouter\/connect\/?$/.test(url.pathname)) {
    // The practice stays in its original tab. Only connection state travels through OAuth.
    url.search = '?connected=1';
    url.hash = '';
  } else if (/\/mira\/?$/.test(url.pathname)) {
    url.searchParams.set('panel', 'settings');
  } else {
    throw new Error('The OpenRouter return address is invalid. Start the connection again.');
  }
  return url.pathname + url.search;
}

/** Same-tab PKCE: only a short-lived verifier is stored in sessionStorage, never the API key. */
export async function beginOpenRouterConnection({
  callbackUrl,
  returnUrl,
  storage,
  cryptography = crypto,
  now = Date.now(),
}: {
  callbackUrl: string;
  returnUrl: string;
  storage: FlowStorage;
  cryptography?: Crypto;
  now?: number;
}): Promise<string> {
  const callback = new URL(callbackUrl);
  const returnTo = safeReturn(new URL(returnUrl), callback.origin);
  if (
    callback.protocol !== 'https:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(callback.hostname)
  ) {
    throw new Error('Connect to OpenRouter from a secure HTTPS page.');
  }
  const verifier = base64url(cryptography.getRandomValues(new Uint8Array(32)));
  const state = base64url(cryptography.getRandomValues(new Uint8Array(32)));
  callback.searchParams.set('state', state);
  const challenge = base64url(
    new Uint8Array(await cryptography.subtle.digest('SHA-256', new TextEncoder().encode(verifier))),
  );
  const flow: Flow = { verifier, state, callback: callback.href, returnTo, createdAt: now };
  storage.setItem(OPENROUTER_FLOW_KEY, JSON.stringify(flow));
  const authorization = new URL('https://openrouter.ai/auth');
  authorization.searchParams.set('callback_url', callback.href);
  authorization.searchParams.set('code_challenge', challenge);
  authorization.searchParams.set('code_challenge_method', 'S256');
  authorization.searchParams.set(
    'key_label',
    /\/mira\/?$/.test(new URL(returnUrl).pathname) ? 'Patternverse Mira' : 'Patternverse practices',
  );
  return authorization.href;
}

/** Consume the flow once, exchange directly with OpenRouter, and encrypt the key on this device. */
export async function finishOpenRouterConnection({
  url,
  storage,
  store,
  transport = fetch,
  now = Date.now(),
}: {
  url: URL;
  storage: FlowStorage;
  store: Pick<PrivateMiraStore, 'loadSettings' | 'saveSettings'>;
  transport?: typeof fetch;
  now?: number;
}): Promise<string> {
  const raw = storage.getItem(OPENROUTER_FLOW_KEY);
  storage.removeItem(OPENROUTER_FLOW_KEY);
  if (url.searchParams.has('error'))
    throw new Error(
      'OpenRouter connection was not approved. Your existing connection is unchanged.',
    );
  const code = url.searchParams.get('code');
  if (!raw || !code)
    throw new Error('No pending OpenRouter connection. Start the connection again.');
  let flow: Flow;
  try {
    flow = JSON.parse(raw) as Flow;
  } catch {
    throw new Error('The OpenRouter connection is invalid. Start the connection again.');
  }
  if (
    !flow ||
    typeof flow.verifier !== 'string' ||
    !/^[\w-]{43}$/.test(flow.verifier) ||
    typeof flow.state !== 'string' ||
    !/^[\w-]{43}$/.test(flow.state) ||
    typeof flow.callback !== 'string' ||
    typeof flow.returnTo !== 'string' ||
    !Number.isFinite(flow.createdAt) ||
    now < flow.createdAt ||
    now - flow.createdAt > MAX_AGE
  ) {
    throw new Error(
      'The OpenRouter connection has expired or is invalid. Start the connection again.',
    );
  }
  const expected = new URL(flow.callback);
  if (
    expected.origin !== url.origin ||
    expected.pathname !== url.pathname ||
    url.searchParams.get('state') !== flow.state
  ) {
    throw new Error(
      'The OpenRouter connection did not match this browser tab. Start the connection again.',
    );
  }
  const returnTo = safeReturn(new URL(flow.returnTo, url.origin), url.origin);
  let response: Response;
  try {
    response = await transport('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({ code, code_verifier: flow.verifier, code_challenge_method: 'S256' }),
    });
  } catch {
    throw new Error(
      'OpenRouter could not be reached. Start again when you are online. Your existing connection is unchanged.',
    );
  }
  if (!response.ok)
    throw new Error('OpenRouter could not authorize this connection. Start the connection again.');
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('OpenRouter returned an invalid connection response.');
  }
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('key' in payload) ||
    typeof payload.key !== 'string' ||
    !payload.key.trim() ||
    payload.key.length > 500
  ) {
    throw new Error('OpenRouter returned an invalid connection response.');
  }
  const settings = await store.loadSettings();
  await store.saveSettings({
    ...settings,
    openRouterKey: payload.key.trim(),
    model: settings.model || DEFAULT_OPENROUTER_MODEL,
  });
  return returnTo;
}
