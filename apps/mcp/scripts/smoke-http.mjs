import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

// Explicit opt-in URL; this script only reads public tools, never deploys or changes billing.
const endpoint = new URL(process.argv[2] ?? 'http://127.0.0.1:8788/mcp');
const inspector = process.argv[3];
let socket;
let command;
if (inspector) {
  const targets = await fetch(new URL('/json', inspector)).then((response) => response.json());
  const debuggerUrl = new URL(targets[0].webSocketDebuggerUrl);
  debuggerUrl.hostname = 'localhost';
  socket = new WebSocket(debuggerUrl, { headers: { Origin: 'http://localhost' } });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Local profiler connection failed')), {
      once: true,
    });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const call = pending.get(message.id);
    if (call) {
      pending.delete(message.id);
      if (message.error) call.reject(new Error(message.error.message));
      else call.resolve(message.result);
    }
  });
  command = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  await command('Profiler.enable');
  await command('Profiler.setSamplingInterval', { interval: 100 });
}
const client = new Client({ name: 'patternverse-http-smoke', version: '1.0.0' });
try {
  await client.connect(new StreamableHTTPClientTransport(endpoint));
  const tools = (await client.listTools()).tools;
  assert.deepEqual(
    tools.map((tool) => tool.name),
    ['search_patterns', 'get_pattern', 'get_practice', 'open_practice'],
  );
  assert(tools.every((tool) => tool.annotations.readOnlyHint && !tool.annotations.destructiveHint));
  const opener = await client.callTool({ name: 'open_practice', arguments: {} });
  assert.notEqual(opener.isError, true);
  assert.equal(opener.structuredContent.execution, 'widget-local');
  const uri = tools.find((tool) => tool.name === 'open_practice')._meta.ui.resourceUri;
  const resource = (await client.readResource({ uri })).contents[0];
  assert.equal(resource.mimeType, 'text/html;profile=mcp-app');
  const assetUrls = [
    ...resource.text.matchAll(
      /(?:src|href)="(https:\/\/patternverse\.org\/mcp\/ui\/assets\/[^"<>]+)"/g,
    ),
  ].map((match) => match[1]);
  assert(assetUrls.length >= 2);
  for (const url of assetUrls) {
    const response = await fetch(url, { headers: { Origin: 'null' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.match(response.headers.get('cache-control'), /immutable/);
    if (url.endsWith('.js')) {
      const script = await response.text();
      const wasmPath = script.match(/(?:\.\/)?(pattern_wasm_bg-[\w-]+\.wasm)/)?.[1];
      assert(wasmPath, 'Widget bundle references its shared language engine');
      const wasm = await fetch(new URL(wasmPath, url), { headers: { Origin: 'null' } });
      assert.equal(wasm.status, 200);
      assert.match(wasm.headers.get('content-type'), /application\/wasm/);
      assert.equal(wasm.headers.get('access-control-allow-origin'), '*');
    }
  }
  console.log(
    'Inline opener, UI resource and hosted JS/CSS/WASM assets passed. Actual host rendering requires a separate UI test.',
  );
  const cases = [
    ['browse', { name: 'search_patterns', arguments: {} }],
    [
      'search',
      { name: 'search_patterns', arguments: { query: 'Cognitive Distortions', verse: 'therapy' } },
    ],
    ['article', { name: 'get_pattern', arguments: { id: 'cbt-thinking-patterns' } }],
    ['practice', { name: 'get_practice', arguments: { id: 'cbt-thinking-patterns' } }],
    ['dependency closure', { name: 'get_practice', arguments: { id: 'reframing-rapid-reframe' } }],
  ];
  for (const [label, args] of cases) {
    const times = [];
    const runs = inspector ? 10 : 1;
    if (command) await command('Profiler.start');
    for (let iteration = 0; iteration < runs; iteration++) {
      const start = performance.now();
      const result = await client.callTool(args);
      assert.notEqual(result.isError, true, JSON.stringify(result));
      assert(result.structuredContent);
      times.push(performance.now() - start);
    }
    let cpu = '';
    if (command) {
      const { profile } = await command('Profiler.stop');
      const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
      const micros = profile.samples.reduce((sum, id, index) => {
        const name = nodes.get(id)?.callFrame.functionName;
        return ['(idle)', '(program)', '(root)'].includes(name)
          ? sum
          : sum + profile.timeDeltas[index];
      }, 0);
      cpu = `, sampled active CPU ≈ ${(micros / 1000 / runs).toFixed(2)} ms/request`;
    }
    console.log(
      `${label}: HTTP passed, mean local wall time ${(times.reduce((sum, ms) => sum + ms, 0) / runs).toFixed(2)} ms${cpu}`,
    );
  }
  const missing = await client.callTool({
    name: 'get_pattern',
    arguments: { id: 'private-sentinel' },
  });
  assert.equal(missing.isError, true);
  console.log(
    'Public-only guard passed. Local sampled CPU is diagnostic, not production billing evidence.',
  );
} finally {
  await client.close();
  if (command) await command('Profiler.disable');
  socket?.close();
}
// Node's inspector WebSocket can wait indefinitely for the proxy's close reply.
if (inspector) process.exit(0);
