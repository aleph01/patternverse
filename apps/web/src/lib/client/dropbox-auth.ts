export const DROPBOX_FLOW_STORAGE_KEY = 'patternverse:dropbox:oauth-flow:v1';
export const DROPBOX_CONNECTION_STORAGE_KEY = 'patternverse:dropbox:connection:v1';

export type DropboxOAuthFlow = {
  readonly codeVerifier: string;
  readonly redirectUri: string;
  readonly state: string;
};

export type DropboxConnection = {
  readonly accessToken: string;
  readonly accountId: string;
  readonly displayName?: string;
  readonly email?: string;
  readonly expiresAt: string;
};

type DropboxTokenResponse = {
  readonly access_token: string;
  readonly account_id: string;
  readonly expires_in: number;
};

type DropboxAccountResponse = {
  readonly account_id: string;
  readonly email?: string;
  readonly name?: { readonly display_name?: string };
};

const base64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};

const randomToken = (size: number): string => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
};

const sha256 = async (value: string): Promise<Uint8Array> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return new Uint8Array(digest);
};

export const createDropboxAuthorization = async (
  appKey: string,
  redirectUri: string,
): Promise<{ readonly flow: DropboxOAuthFlow; readonly url: string }> => {
  const flow: DropboxOAuthFlow = {
    codeVerifier: randomToken(64),
    redirectUri,
    state: randomToken(32),
  };
  const codeChallenge = base64Url(await sha256(flow.codeVerifier));
  const url = new URL('https://www.dropbox.com/oauth2/authorize');
  url.search = new URLSearchParams({
    client_id: appKey,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: redirectUri,
    response_type: 'code',
    state: flow.state,
    token_access_type: 'online',
  }).toString();
  return { flow, url: url.toString() };
};

export const exchangeDropboxAuthorizationCode = async ({
  appKey,
  code,
  flow,
  fetcher = fetch,
}: {
  readonly appKey: string;
  readonly code: string;
  readonly flow: DropboxOAuthFlow;
  readonly fetcher?: typeof fetch;
}): Promise<DropboxConnection> => {
  const tokenResponse = await fetcher('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appKey,
      code,
      code_verifier: flow.codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: flow.redirectUri,
    }),
  });
  if (!tokenResponse.ok) throw new Error('Dropbox could not complete authorization.');
  const token = (await tokenResponse.json()) as DropboxTokenResponse;
  if (
    typeof token.access_token !== 'string' ||
    !token.access_token ||
    typeof token.account_id !== 'string' ||
    !token.account_id ||
    !Number.isFinite(token.expires_in) ||
    token.expires_in <= 0
  )
    throw new Error('Dropbox returned an invalid authorization response.');

  const accountResponse = await fetcher('https://api.dropboxapi.com/2/users/get_current_account', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const account = accountResponse.ok
    ? ((await accountResponse.json()) as DropboxAccountResponse)
    : undefined;
  if (account && account.account_id !== token.account_id)
    throw new Error('Dropbox returned inconsistent account information. Please reconnect.');

  return {
    accessToken: token.access_token,
    accountId: account?.account_id ?? token.account_id,
    displayName: account?.name?.display_name,
    email: account?.email,
    expiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
  };
};

export const readDropboxConnection = (storage: Storage): DropboxConnection | undefined => {
  const raw = storage.getItem(DROPBOX_CONNECTION_STORAGE_KEY);
  if (!raw) return undefined;
  try {
    const connection = JSON.parse(raw) as DropboxConnection;
    if (
      !connection ||
      typeof connection.accessToken !== 'string' ||
      !connection.accessToken ||
      typeof connection.accountId !== 'string' ||
      !connection.accountId.trim() ||
      !Number.isFinite(Date.parse(connection.expiresAt)) ||
      Date.parse(connection.expiresAt) <= Date.now()
    ) {
      storage.removeItem(DROPBOX_CONNECTION_STORAGE_KEY);
      return undefined;
    }
    return connection;
  } catch {
    storage.removeItem(DROPBOX_CONNECTION_STORAGE_KEY);
    return undefined;
  }
};
