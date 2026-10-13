import { beforeAll, expect, it } from 'vitest';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { readFile } from 'node:fs/promises';
import { createHttpEndpoint, type HttpEnvironment } from '../src/http.js';
import { libraryFromSnapshot, type PublicSnapshot } from '../src/snapshot.js';
import { loadPublicLibrary } from '../src/corpus.js';
import type { PublicLibrary } from '../src/library.js';

let snapshot: PublicSnapshot;
let library: PublicLibrary;
let endpoint: ReturnType<typeof createHttpEndpoint>;
const env: HttpEnvironment = { MCP_RATE_LIMIT: { limit: async () => ({ success: true }) } };
const url = 'https://patternverse.org/mcp';
beforeAll(async () => {
  snapshot = JSON.parse(
    await readFile(new URL('../dist/public-snapshot.json', import.meta.url), 'utf8'),
  );
  library = libraryFromSnapshot(snapshot);
  endpoint = createHttpEndpoint(library);
});
const request = (body: unknown, headers?: Record<string, string>) =>
  new Request(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
// Legacy 2025 traffic is important for existing ChatGPT/other MCP hosts.
const rpc = (method: string, params = {}, id = 1) => ({ jsonrpc: '2.0', id, method, params });
async function legacy(method: string, params = {}) {
  const response = await endpoint(request(rpc(method, params)), env);
  expect(response.status).toBe(200);
  const body = await response.text();
  // SDK's stateless legacy transport uses SSE; modern traffic uses JSON.
  return JSON.parse(body.startsWith('event:') ? body.split('data: ')[1]!.split('\n')[0]! : body);
}

it('serves the SDK HTTP client with the same tools, articles, and validated definitions', async () => {
  const client = new Client(
    { name: 'http-test', version: '1' },
    {
      versionNegotiation: { mode: { pin: '2026-07-28' } },
    },
  );
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    fetch: async (input, init) => endpoint(new Request(input, init), env),
  });
  try {
    await client.connect(transport);
    expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual([
      'search_patterns',
      'get_pattern',
      'get_practice',
    ]);
    for (const [name, args, expected] of [
      [
        'search_patterns',
        { query: 'cognitive distortions', verse: 'therapy' },
        library.searchPatterns({ query: 'cognitive distortions', verse: 'therapy' }),
      ],
      ['get_pattern', { id: 'cbt-thinking-patterns' }, library.getPattern('cbt-thinking-patterns')],
      [
        'get_practice',
        { id: 'cbt-thinking-patterns' },
        library.getPractice('cbt-thinking-patterns'),
      ],
    ] as const) {
      const result = await client.callTool({ name, arguments: args });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toEqual(expected);
    }
  } finally {
    await client.close();
  }
});

it('supports the 2025 stateless handshake and leaves no session to resume', async () => {
  const initialized = await legacy('initialize', {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'legacy', version: '1' },
  });
  expect(initialized.result.protocolVersion).toBe('2025-11-25');
  expect(initialized.result.serverInfo.name).toBe('patternverse');
  expect((await legacy('tools/list')).result.tools).toHaveLength(3);
  const notification = await endpoint(
    request({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    env,
  );
  expect(notification.status).toBe(202);
  for (const method of ['GET', 'DELETE']) {
    expect((await endpoint(new Request(url, { method }), env)).status).toBe(405);
  }
});

it('precomputes exactly the same results as the existing library without a new language implementation', async () => {
  const original = await loadPublicLibrary((bundle) => snapshot.definitions[bundle.root]!);
  for (const entry of snapshot.corpus.entities.filter((entry) => entry.type === 'pattern')) {
    expect(library.getPattern(entry.id)).toEqual(original.getPattern(entry.id));
    for (const practice of original.getPattern(entry.id).pattern.practices)
      expect(library.getPractice(entry.id, 'commons', practice.id)).toEqual(
        original.getPractice(entry.id, 'commons', practice.id),
      );
  }
  expect(JSON.stringify(snapshot)).not.toContain('sourcePath');
  expect(JSON.stringify(snapshot)).not.toContain('/Users/');
  expect(Object.keys(snapshot.definitions).length).toBeGreaterThan(0);
  // An altered source cannot reuse a trusted validation result.
  const changed = structuredClone(snapshot);
  changed.dependencySources['cbt.thinking-patterns'] = '!invalid';
  expect(() => libraryFromSnapshot(changed).getPractice('cbt-thinking-patterns')).toThrow(
    'could not be validated',
  );
});

it('keeps concurrent requests and errors isolated and never exposes personal runs', async () => {
  const results = await Promise.all(
    ['cbt-thinking-patterns', 'abstract-factory'].map((id) =>
      legacy('tools/call', { name: 'get_pattern', arguments: { id } }),
    ),
  );
  expect(results.map((result) => result.result.structuredContent.pattern.id)).toEqual([
    'cbt-thinking-patterns',
    'abstract-factory',
  ]);
  for (const args of [
    { id: 'private-sentinel' },
    { id: 'cbt-thinking-patterns', sourceId: 'personal' },
    { id: 'cbt-thinking-patterns', saved: true },
  ]) {
    const result = await legacy('tools/call', { name: 'get_pattern', arguments: args });
    expect(result.error || result.result.isError).toBeTruthy();
    expect(JSON.stringify(result)).not.toMatch(/sourcePath|\/Users\/|stack/);
  }
});

it('rejects oversized bodies and invalid media types before tool execution', async () => {
  expect(
    (await endpoint(request(rpc('tools/list', { oversized: 'x'.repeat(20000) })), env)).status,
  ).toBe(413);
  const chunked = new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('x'.repeat(20000)));
        controller.close();
      },
    }),
    duplex: 'half',
  } as RequestInit);
  expect((await endpoint(chunked, env)).status).toBe(413);
  expect((await endpoint(new Request(url, { method: 'POST', body: '{}' }), env)).status).toBe(415);
  expect(
    (
      await endpoint(
        new Request(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
          },
          body: '{bad',
        }),
        env,
      )
    ).status,
  ).toBeGreaterThanOrEqual(400);
});

it('bounds expensive search phrases without implementing different search semantics', async () => {
  const result = await legacy('tools/call', {
    name: 'search_patterns',
    arguments: { query: 'a '.repeat(200) },
  });
  expect(result.result.isError).toBe(true);
  expect(JSON.stringify(result.result.content)).toContain('16 searchable terms');
  expect(
    (
      await legacy('tools/call', {
        name: 'search_patterns',
        arguments: { query: 'Cognitive Distortions', limit: 50 },
      })
    ).result.isError,
  ).not.toBe(true);
});

it('limits requests, fails closed if the limiter is unavailable, and validates hosts/origins/routes', async () => {
  const limited = await endpoint(request(rpc('tools/list')), {
    MCP_RATE_LIMIT: { limit: async () => ({ success: false }) },
  });
  expect(limited.status).toBe(429);
  expect(limited.headers.get('Retry-After')).toBe('60');
  expect(
    (
      await endpoint(request(rpc('tools/list')), {
        MCP_RATE_LIMIT: {
          limit: async () => {
            throw new Error('secret');
          },
        },
      })
    ).status,
  ).toBe(503);
  expect(
    (await endpoint(request(rpc('tools/list'), { Origin: 'https://evil.example' }), env)).status,
  ).toBe(403);
  expect((await endpoint(new Request('https://evil.example/mcp'), env)).status).toBe(403);
  expect((await endpoint(new Request('https://patternverse.org/library'), env)).status).toBe(404);
  const preflight = await endpoint(
    new Request(url, { method: 'OPTIONS', headers: { Origin: 'https://chatgpt.com' } }),
    env,
  );
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('https://chatgpt.com');
  expect(preflight.headers.get('Cache-Control')).toBe('no-store');
});
