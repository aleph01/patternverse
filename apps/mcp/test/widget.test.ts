import { beforeAll, expect, it } from 'vitest';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { readFile } from 'node:fs/promises';
import { createHttpEndpoint } from '../src/http.js';
import { libraryFromSnapshot } from '../src/snapshot.js';
import { INLINE_PRACTICE_ID, WIDGET_URI, WIDGET_MIME } from '../src/widget.js';
import worker from '../src/worker.js';

const url = 'https://patternverse.org/mcp';
const env = { MCP_RATE_LIMIT: { limit: async () => ({ success: true }) } };
let endpoint: ReturnType<typeof createHttpEndpoint>;
beforeAll(async () => {
  const snapshot = JSON.parse(
    await readFile(new URL('../dist/public-snapshot.json', import.meta.url), 'utf8'),
  );
  const widget = JSON.parse(
    await readFile(new URL('../dist/widget-resource.json', import.meta.url), 'utf8'),
  );
  endpoint = createHttpEndpoint(libraryFromSnapshot(snapshot), widget);
});

it.each(['2026-07-28', '2025-11-25'])(
  'exposes the inline resource and opener using %s without changing read-only tools',
  async (version) => {
    const client = new Client(
      { name: 'widget-test', version: '1' },
      {
        versionNegotiation: { mode: version === '2025-11-25' ? 'legacy' : { pin: '2026-07-28' } },
      },
    );
    await client.connect(
      new StreamableHTTPClientTransport(new URL(url), {
        fetch: async (input, init) => endpoint(new Request(input, init), env),
      }),
    );
    try {
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(4);
      expect(tools.find((tool) => tool.name === 'open_practice')?._meta).toMatchObject({
        ui: { resourceUri: WIDGET_URI },
      });
      expect(
        tools.filter((tool) => tool.name !== 'open_practice').every((tool) => !tool._meta?.ui),
      ).toBe(true);
      const resources = await client.listResources();
      expect(resources.resources).toMatchObject([{ uri: WIDGET_URI, mimeType: WIDGET_MIME }]);
      const resource = (await client.readResource({ uri: WIDGET_URI })).contents[0]!;
      expect(resource._meta).toMatchObject({
        ui: {
          csp: {
            connectDomains: ['https://patternverse.org'],
            resourceDomains: ['https://patternverse.org'],
          },
        },
        'openai/ui': { availableDisplayModes: ['inline'], preferredDisplayMode: 'inline' },
      });
      expect('text' in resource && resource.text).toContain(
        'https://patternverse.org/mcp/ui/assets/',
      );
      const result = await client.callTool({ name: 'open_practice', arguments: {} });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        id: INLINE_PRACTICE_ID,
        execution: 'widget-local',
      });
      expect(JSON.stringify(result)).not.toMatch(/"saved"|"source"|"view"/);
      for (const args of [
        { id: 'cbt-thinking-patterns' },
        { saved: 'private-sentinel' },
        { answers: 'private-sentinel' },
        { source: '!ask untrusted' },
      ]) {
        const invalid = await client.callTool({ name: 'open_practice', arguments: args });
        expect(invalid.isError).toBe(true);
        expect(JSON.stringify(invalid)).not.toContain('private-sentinel');
      }
    } finally {
      await client.close();
    }
  },
);

it('keeps asset CORS separate from MCP security and denies HTML, writes and path traversal', async () => {
  let calls = 0;
  const assets = {
    fetch: async () => {
      calls++;
      return new Response('public', { headers: { 'Content-Type': 'application/wasm' } });
    },
  };
  const environment = { ...env, WIDGET_ASSETS: assets };
  const asset = await worker.fetch(
    new Request('https://patternverse.org/mcp/ui/assets/pattern_wasm_bg-hash.wasm', {
      headers: { Origin: 'https://host-sandbox.example' },
    }),
    environment,
  );
  expect(asset.status).toBe(200);
  expect(asset.headers.get('Access-Control-Allow-Origin')).toBe('*');
  expect(asset.headers.get('Cache-Control')).toContain('immutable');
  for (const path of [
    '/mcp/ui/index.html',
    '/mcp/ui/assets/secret.json',
    '/mcp/ui/assets/../private',
    '/my',
  ]) {
    expect(
      (await worker.fetch(new Request(`https://patternverse.org${path}`), environment)).status,
    ).toBe(404);
  }
  expect(
    (
      await worker.fetch(
        new Request('https://patternverse.org/mcp/ui/assets/app-hash.js', { method: 'POST' }),
        environment,
      )
    ).status,
  ).toBe(405);
  expect(calls).toBe(1);
  expect(
    (
      await worker.fetch(
        new Request(url, {
          method: 'OPTIONS',
          headers: { Origin: 'https://host-sandbox.example' },
        }),
        environment,
      )
    ).status,
  ).toBe(403);
});

it('does not launch a widget built for a different content revision', async () => {
  const snapshot = JSON.parse(
    await readFile(new URL('../dist/public-snapshot.json', import.meta.url), 'utf8'),
  );
  const stale = createHttpEndpoint(libraryFromSnapshot(snapshot), {
    html: '<html></html>',
    revision: 'stale',
  });
  const response = await stale(
    new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'open_practice', arguments: {} },
      }),
    }),
    env,
  );
  const text = await response.text();
  expect(text).toContain('needs a rebuild');
});
