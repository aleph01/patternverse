const recipient = 'contact@patternverse.org';
const unavailable = 'The form is temporarily unavailable. Please email contact@patternverse.org.';
const maxBytes = 16_384;
const hasControlCharacters = (value: string) =>
  Array.from(value).some(
    (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  );

function respond(body: object, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

async function readMessage(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new RangeError('Body too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function handleContribution(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const origins = env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
  const ready =
    env.ENABLED === 'true' && Boolean(env.EMAIL && env.CONTACT_LIMITER && env.FROM_EMAIL);
  if (url.pathname === '/api/contribute/status' && request.method === 'GET')
    return respond({ available: ready });
  if (url.pathname !== '/api/contribute') return respond({ error: 'Not found.' }, 404);
  if (request.method !== 'POST') return respond({ error: 'Use POST.' }, 405, { Allow: 'POST' });
  // Only the configured site origins may submit. Neither recipient nor sender comes from input.
  if (!origins.includes(request.headers.get('Origin') ?? ''))
    return respond({ error: 'Please send your message from the contribution page.' }, 403);
  if (!ready) return respond({ error: unavailable }, 503);
  if (request.headers.get('Content-Type')?.split(';')[0]?.trim() !== 'application/json')
    return respond({ error: 'Use a JSON message.' }, 415);

  try {
    const limited = await env.CONTACT_LIMITER.limit({
      key: request.headers.get('CF-Connecting-IP') ?? 'unknown',
    });
    if (!limited.success)
      return respond({ error: 'Please wait a minute before sending another message.' }, 429, {
        'Retry-After': '60',
      });

    let body: unknown;
    try {
      body = await readMessage(request);
    } catch (error) {
      return respond(
        {
          error:
            error instanceof RangeError
              ? 'Your message is too long.'
              : 'Check your message and try again.',
        },
        error instanceof RangeError ? 413 : 400,
      );
    }
    if (!body || typeof body !== 'object' || Array.isArray(body))
      return respond({ error: 'Check your message and try again.' }, 400);
    const data = body as Record<string, unknown>;
    if (typeof data.website === 'string' && data.website.trim())
      return respond({ error: 'Please use the email link to get in touch.' }, 400);
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const email = typeof data.email === 'string' ? data.email.trim() : '';
    const message = typeof data.message === 'string' ? data.message.trim() : '';
    if (
      name.length > 100 ||
      hasControlCharacters(name) ||
      email.length > 254 ||
      hasControlCharacters(email) ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ||
      !message ||
      message.length > 5000
    )
      return respond(
        { error: 'Enter a valid reply email and a message of up to 5,000 characters.' },
        400,
      );

    const text = [
      'A contribution idea from the Patternverse website',
      '',
      `Name: ${name || '(not provided)'}`,
      `Reply email: ${email}`,
      '',
      message,
    ].join('\n');
    const html = `<pre>${text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)}</pre>`;
    await env.EMAIL.send({
      from: { email: env.FROM_EMAIL, name: 'Patternverse contributions' },
      to: recipient,
      replyTo: email,
      subject: 'Contributing to Patternverse',
      text,
      html,
    });
    return respond({ sent: true });
  } catch {
    // Do not log message text, contact details, connection addresses, or provider errors.
    return respond({ error: unavailable }, 503);
  }
}

export default { fetch: handleContribution } satisfies ExportedHandler<Env>;
