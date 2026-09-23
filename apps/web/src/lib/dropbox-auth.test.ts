import { describe, expect, it, vi } from 'vitest';
import {
  createDropboxAuthorization,
  DROPBOX_CONNECTION_STORAGE_KEY,
  exchangeDropboxAuthorizationCode,
  readDropboxConnection,
} from './client/dropbox-auth';

describe('Dropbox browser authorization', () => {
  it('creates an authorization-code request using PKCE and exact localhost callback', async () => {
    const { flow, url } = await createDropboxAuthorization(
      'public-app-key',
      'http://localhost:5177/auth/dropbox/callback',
    );
    const request = new URL(url);

    expect(request.origin + request.pathname).toBe('https://www.dropbox.com/oauth2/authorize');
    expect(request.searchParams.get('client_id')).toBe('public-app-key');
    expect(request.searchParams.get('response_type')).toBe('code');
    expect(request.searchParams.get('code_challenge_method')).toBe('S256');
    expect(request.searchParams.get('code_challenge')).toBeTruthy();
    expect(request.searchParams.get('state')).toBe(flow.state);
    expect(request.searchParams.get('redirect_uri')).toBe(flow.redirectUri);
    expect(request.searchParams.get('token_access_type')).toBe('online');
    expect(flow.codeVerifier.length).toBeGreaterThan(43);
  });

  it('exchanges the code without an app secret and reads the connected account', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'short-lived-token',
            account_id: 'dbid:one',
            expires_in: 14_400,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            account_id: 'dbid:one',
            email: 'reader@example.com',
            name: { display_name: 'Pattern Reader' },
          }),
          { status: 200 },
        ),
      );

    const connection = await exchangeDropboxAuthorizationCode({
      appKey: 'public-app-key',
      code: 'authorization-code',
      flow: {
        codeVerifier: 'verifier',
        redirectUri: 'http://localhost:5177/auth/dropbox/callback',
        state: 'state',
      },
      fetcher,
    });

    expect(connection).toMatchObject({
      accessToken: 'short-lived-token',
      accountId: 'dbid:one',
      displayName: 'Pattern Reader',
      email: 'reader@example.com',
    });
    const tokenRequest = fetcher.mock.calls[0];
    expect(String(tokenRequest?.[1]?.body)).toContain('code_verifier=verifier');
    expect(String(tokenRequest?.[1]?.body)).not.toContain('client_secret');
  });

  it('clears an expired browser-session connection', () => {
    const values = new Map<string, string>([
      [
        DROPBOX_CONNECTION_STORAGE_KEY,
        JSON.stringify({
          accessToken: 'expired',
          accountId: 'dbid:one',
          expiresAt: '2000-01-01T00:00:00.000Z',
        }),
      ],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    } as unknown as Storage;

    expect(readDropboxConnection(storage)).toBeUndefined();
    expect(values.has(DROPBOX_CONNECTION_STORAGE_KEY)).toBe(false);
  });
});
