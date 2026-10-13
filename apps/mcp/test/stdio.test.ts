import { afterAll, beforeAll, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { THERAPY_LIBRARY, REFRAMING_LIBRARY } from '@patternverse/workspace/public-practices';
import { readFile } from 'node:fs/promises';

const client = new Client({ name: 'patternverse-integration-test', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
  cwd: tmpdir(), // Startup must not depend on the host's working directory.
  stderr: 'pipe',
});
let stderr = '';
beforeAll(async () => {
  transport.stderr?.on('data', (data) => {
    stderr += String(data);
  });
  try {
    await client.connect(transport);
  } catch (error) {
    throw new Error(`MCP startup failed: ${stderr}`, { cause: error });
  }
}, 15000);
afterAll(async () => {
  await client.close();
});

it('negotiates MCP and advertises exactly three typed, read-only tools', async () => {
  const { tools } = await client.listTools();
  expect(tools.map((tool) => tool.name).sort()).toEqual([
    'get_pattern',
    'get_practice',
    'search_patterns',
  ]);
  for (const tool of tools) {
    expect(tool.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
    expect(tool.outputSchema).toBeDefined();
    expect(tool.inputSchema.additionalProperties).toBe(false);
  }
});

it('returns structured data and matching readable fallback content', async () => {
  const found = await client.callTool({
    name: 'search_patterns',
    arguments: { query: 'Cognitive Distortions', verse: 'therapy', limit: 3 },
  });
  expect(found.isError).not.toBe(true);
  expect(found.structuredContent).toMatchObject({ results: [{ id: 'cbt-thinking-patterns' }] });
  const article = await client.callTool({
    name: 'get_pattern',
    arguments: { id: 'cbt-thinking-patterns' },
  });
  expect(article.isError).not.toBe(true);
  const content = article.content[0];
  expect(content?.type).toBe('text');
  if (content?.type === 'text') expect(JSON.parse(content.text)).toEqual(article.structuredContent);
  expect(JSON.stringify(article.structuredContent)).toContain(
    'Precision is more useful than positivity',
  );
});

it('returns Rust-validated Pattern Language contracts and only required dependencies without execution', async () => {
  const decision = await client.callTool({
    name: 'get_practice',
    arguments: { id: 'define-the-decision-before-comparing-options' },
  });
  expect(decision.isError).not.toBe(true);
  expect(decision.structuredContent).toMatchObject({
    language: 'pattern-language',
    inputs: {},
    dependencies: [],
    execution: 'definition-only',
  });
  const cbt = await client.callTool({
    name: 'get_practice',
    arguments: { id: 'cbt-thinking-patterns' },
  });
  expect(cbt.isError).not.toBe(true);
  expect(cbt.structuredContent).toMatchObject({ dependencies: [] });
  expect(cbt.structuredContent).toMatchObject({ root: 'cbt.thinking-patterns' });
  const attached = await client.callTool({
    name: 'get_practice',
    arguments: { id: 'creative-reframing' },
  });
  expect(attached.isError).not.toBe(true);
  expect(attached.structuredContent).toMatchObject({ practice: { id: 'five-alternative-frames' } });
  const encoded = JSON.stringify(cbt);
  expect(encoded).not.toContain('"saved"');
  expect(encoded).not.toContain('"view"');
  expect(encoded).not.toContain('/Users/');
});

it('fails closed for invalid requests, path traversal, private sources, missing practice and unknown tools', async () => {
  for (const request of [
    { name: 'search_patterns', arguments: { limit: 51 } },
    { name: 'search_patterns', arguments: { offset: -1 } },
    { name: 'search_patterns', arguments: { query: 'x'.repeat(401) } },
    { name: 'get_pattern', arguments: { id: '../../secrets' } },
    { name: 'get_pattern', arguments: { id: 'cbt-thinking-patterns', sourceId: 'personal' } },
    { name: 'get_pattern', arguments: { id: 'missing-pattern' } },
    { name: 'get_pattern', arguments: { id: 'therapy' } },
    { name: 'get_practice', arguments: { id: 'abstract-factory' } },
    {
      name: 'get_practice',
      arguments: { id: 'cbt-thinking-patterns', saved: { answer: 'secret-answer' } },
    },
  ]) {
    const response = await client.callTool(request);
    expect(response.isError).toBe(true);
    expect(JSON.stringify(response)).not.toContain('secret-answer');
  }
  await expect(client.callTool({ name: 'start_practice', arguments: {} })).rejects.toThrow();
});

it('can retrieve every published authored practice through the existing core', async () => {
  const root = new URL('../../../', import.meta.url);
  const corpus = await loadAndCompileCorpus(
    {
      manifestPath: fileURLToPath(new URL('patternverse.yaml', root)),
      contentDirectory: fileURLToPath(new URL('content', root)),
      readonly: true,
    },
    { includeDrafts: false },
  );
  const authored = corpus.entities.filter(
    (entry) => entry.status === 'published' && entry.languagePracticeSource,
  );
  expect(authored.length).toBeGreaterThan(20);
  for (const entry of authored) {
    const response = await client.callTool({ name: 'get_practice', arguments: { id: entry.id } });
    expect(response.isError, entry.id).not.toBe(true);
    expect(response.structuredContent, entry.id).toMatchObject({
      source: entry.languagePracticeSource,
    });
  }
  expect(stderr).toBe('');
}, 15000);

it('retrieves every website catalog practice with identical source and validated transitive imports', async () => {
  const root = new URL('../../../', import.meta.url);
  for (const item of [...THERAPY_LIBRARY, ...REFRAMING_LIBRARY]) {
    const namespace = item.modality === 'cbt' ? 'therapy-patterns' : 'reframing-patterns';
    const source = await readFile(
      new URL(`packages/${namespace}/patterns/${item.id}.pattern.md`, root),
      'utf8',
    );
    const response = await client.callTool({ name: 'get_practice', arguments: { id: item.slug } });
    expect(response.isError, item.slug).not.toBe(true);
    expect(response.structuredContent, item.slug).toMatchObject({ source, root: item.id });
  }
  const result = await client.callTool({
    name: 'get_practice',
    arguments: { id: 'reframing-rapid-reframe' },
  });
  const definition = result.structuredContent as {
    dependencies: { name: string; source: string }[];
  };
  expect(definition.dependencies.length).toBeGreaterThan(7);
  expect(new Set(definition.dependencies.map((item) => item.name)).size).toBe(
    definition.dependencies.length,
  );
  expect(definition.dependencies.every((item) => item.name.startsWith('reframing.'))).toBe(true);
  expect(JSON.stringify(result)).not.toContain('"saved"');
}, 15000);
