import { describe, expect, it, vi } from 'vitest';
import { handleContribution } from '../src/worker.js';

const origin = 'https://patternverse.org';
const idea = {
  name: 'A contributor',
  email: 'expert@example.com',
  message: 'A useful idea',
  website: '',
};
function environment() {
  return {
    ENABLED: 'true',
    FROM_EMAIL: 'contributions@patternverse.org',
    ALLOWED_ORIGINS: origin,
    EMAIL: { send: vi.fn().mockResolvedValue({ messageId: 'accepted' }) },
    CONTACT_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
  } satisfies Env;
}
function post(body: unknown = idea, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/contribute`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('contribution delivery', () => {
  it('sends to the fixed contact inbox, with a reply address and escaped message', async () => {
    const env = environment();
    const response = await handleContribution(
      post({ ...idea, message: '<script>alert("x")</script>', to: 'someone@example.com' }),
      env,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: true });
    expect(env.EMAIL.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'contact@patternverse.org',
        from: { email: 'contributions@patternverse.org', name: 'Patternverse contributions' },
        replyTo: 'expert@example.com',
        text: expect.stringContaining('<script>'),
        html: expect.stringContaining('&lt;script&gt;'),
      }),
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('does not report success until the provider accepts the message', async () => {
    const env = environment();
    env.EMAIL.send.mockRejectedValue(new Error('Private provider failure'));
    const response = await handleContribution(post(), env);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('Private provider failure');
  });

  it('leaves delivery off until explicitly enabled and exposes its status', async () => {
    const env = { ...environment(), ENABLED: 'false' };
    const status = await handleContribution(new Request(`${origin}/api/contribute/status`), env);
    expect(await status.json()).toEqual({ available: false });
    expect((await handleContribution(post(), env)).status).toBe(503);
    expect(env.EMAIL.send).not.toHaveBeenCalled();
  });

  it.each([
    { ...idea, email: 'bad-address' },
    { ...idea, email: 'sender@example.com\r\nBcc: other@example.com' },
    { ...idea, name: 'Injected\r\nname' },
    { ...idea, message: ' ' },
    { ...idea, message: 'a'.repeat(5001) },
    { ...idea, website: 'spam.example' },
  ])('rejects invalid or automated submissions before sending', async (body) => {
    const env = environment();
    expect((await handleContribution(post(body), env)).status).toBe(400);
    expect(env.EMAIL.send).not.toHaveBeenCalled();
  });

  it('rejects cross-origin submissions, other methods, and other paths', async () => {
    const env = environment();
    expect(
      (await handleContribution(post(idea, { Origin: 'https://elsewhere.example' }), env)).status,
    ).toBe(403);
    expect((await handleContribution(new Request(`${origin}/api/contribute`), env)).status).toBe(
      405,
    );
    expect(
      (await handleContribution(new Request(`${origin}/api/contribute/other`), env)).status,
    ).toBe(404);
    expect(env.EMAIL.send).not.toHaveBeenCalled();
  });

  it('rejects oversized streaming requests even without Content-Length', async () => {
    const env = environment();
    expect(
      (await handleContribution(post({ ...idea, message: 'a'.repeat(20_000) }), env)).status,
    ).toBe(413);
    expect(env.EMAIL.send).not.toHaveBeenCalled();
  });

  it('rate limits repeated submissions and fails closed when the limiter fails', async () => {
    const env = environment();
    env.CONTACT_LIMITER.limit.mockResolvedValueOnce({ success: false });
    const limited = await handleContribution(post(), env);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('60');
    env.CONTACT_LIMITER.limit.mockRejectedValueOnce(new Error('Limiter down'));
    expect((await handleContribution(post(), env)).status).toBe(503);
    expect(env.EMAIL.send).not.toHaveBeenCalled();
  });
});
