import { createRemoteJWKSet, jwtVerify, customFetch } from 'jose';

export type AccessSettings = {
  OWNER_EMAIL: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
};

export async function authorizeOwner(
  request: Request,
  env: AccessSettings,
  fetchKeys: typeof fetch = fetch,
): Promise<boolean> {
  // Deny before fetching keys if configuration is incomplete. Never trust an email header alone.
  if (
    !env.OWNER_EMAIL ||
    !env.ACCESS_AUD ||
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN)
  )
    return false;
  const assertion = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!assertion || assertion.length > 16384) return false;
  const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
  try {
    const { payload } = await jwtVerify(
      assertion,
      createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`), { [customFetch]: fetchKeys }),
      {
        issuer,
        audience: env.ACCESS_AUD,
        algorithms: ['RS256'],
        requiredClaims: ['exp', 'iat', 'email', 'sub'],
      },
    );
    return (
      typeof payload.email === 'string' &&
      payload.email.toLowerCase() === env.OWNER_EMAIL.toLowerCase()
    );
  } catch {
    return false;
  }
}
