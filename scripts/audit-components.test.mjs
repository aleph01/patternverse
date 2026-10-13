import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { exitCode, formatReport, summarize } from './audit-components.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: resolve(root, 'eslint.components.config.js'),
});
const qualityRules = new Set([
  'max-lines',
  'max-lines-per-function',
  'complexity',
  'max-depth',
  'max-statements',
  'max-params',
  'svelte/max-lines-per-block',
]);

async function qualityFindings(source, extension = 'svelte') {
  const [result] = await eslint.lintText(source, {
    filePath: `apps/web/src/lib/audit-fixture.${extension}`,
  });
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  return result.messages.filter((message) => qualityRules.has(message.ruleId));
}

test('parses a small typed Svelte component without quality warnings', async () => {
  assert.deepEqual(
    await qualityFindings('<script lang="ts">\nlet count: number = 0;\n</script>\n<p>{count}</p>'),
    [],
  );
});

test('distinguishes oversized Svelte script, template and style blocks', async () => {
  const fixtures = [
    [
      '<script>',
      `<script>\nlet count = 0;\n${'count += 1;\n'.repeat(201)}</script>\n<p>{count}</p>`,
    ],
    ['template', '<p>Example</p>\n'.repeat(251)],
    ['<style>', `<p>Example</p>\n<style>\n${'.unused { color: red; }\n'.repeat(301)}</style>`],
  ];
  for (const [block, source] of fixtures) {
    const findings = await qualityFindings(source);
    const blockFindings = findings.filter(
      (finding) => finding.ruleId === 'svelte/max-lines-per-block',
    );
    assert.equal(blockFindings.length, 1);
    assert.ok(blockFindings[0].message.startsWith(`${block} block`));
    assert.equal(blockFindings[0].severity, 1);
    assert.ok(!findings.some((finding) => finding.ruleId === 'max-lines'));
  }
});

test('flags total Svelte size separately from block sizes', async () => {
  const findings = await qualityFindings('<p>Example</p>\n'.repeat(601));
  assert.ok(findings.some((finding) => finding.ruleId === 'max-lines'));
});

test('checks function size and statements inside Svelte scripts', async () => {
  const source = `<script lang="ts">\nfunction long(value: number) {\n${'value += 1;\n'.repeat(61)}return value;\n}\n</script>\n<p>{long(0)}</p>`;
  const findings = await qualityFindings(source);
  assert.ok(findings.some((finding) => finding.ruleId === 'max-lines-per-function'));
  assert.ok(findings.some((finding) => finding.ruleId === 'max-statements'));
});

test('checks branching, nesting, and parameters in Svelte and TypeScript', async () => {
  const fn = `function complex(a: number, b: number, c: number, d: number, e: number, f: number) {\n${'if (a) a += 1;\n'.repeat(13)}\nif (b) { if (c) { if (d) { if (e) { if (f) { a += 1; } } } } }\nreturn a;\n}`;
  for (const [extension, source] of [
    ['svelte', `<script lang="ts">\n${fn}\n</script>\n<p>{complex(1, 2, 3, 4, 5, 6)}</p>`],
    ['ts', `export ${fn}`],
  ]) {
    const findings = await qualityFindings(source, extension);
    for (const rule of ['complexity', 'max-depth', 'max-params']) {
      assert.ok(
        findings.some((finding) => finding.ruleId === rule),
        `${extension}: ${rule}`,
      );
    }
  }
});

test('flags long supporting modules and ignores blank/comment-only padding', async () => {
  const source = Array.from(
    { length: 401 },
    (_, index) => `export const value${index} = ${index};`,
  ).join('\n');
  assert.ok(
    (await qualityFindings(source, 'ts')).some((finding) => finding.ruleId === 'max-lines'),
  );
  const padding = '\n// Explanation\n'.repeat(650);
  assert.deepEqual(await qualityFindings(`${padding}export const value = 1;`, 'ts'), []);
  assert.deepEqual(
    await qualityFindings(
      `<script>\n${padding}let value = 1;\n</script>\n<!-- explanation -->\n<p>{value}</p>`,
    ),
    [],
  );
});

test('excludes tests, declarations, generated output and vendored runtime', async () => {
  for (const path of [
    'apps/web/src/lib/example.component.test.ts',
    'apps/web/src/lib/example.spec.svelte',
    'packages/schema/src/example.d.ts',
    'apps/web/src/lib/fixtures/example.ts',
    'apps/web/src/lib/mira/engine/pattern_wasm.js',
    'apps/web/build/example.js',
    'packages/schema/dist/example.js',
  ]) {
    assert.equal(await eslint.calculateConfigForFile(resolve(root, path)), undefined, path);
  }
});

test('normal lint configuration does not enforce audit thresholds', async () => {
  const regular = new ESLint({ cwd: root, overrideConfigFile: resolve(root, 'eslint.config.js') });
  const config = await regular.calculateConfigForFile(
    resolve(root, 'apps/web/src/lib/example.svelte'),
  );
  for (const rule of qualityRules)
    assert.ok(!config.rules[rule] || config.rules[rule][0] === 0, rule);
});

test('report groups locations, ranks distinct signals, and omits source content', () => {
  const message = (ruleId, severity = 1) => ({
    ruleId,
    severity,
    line: 2,
    column: 3,
    message: 'Review this',
  });
  const report = summarize([
    { filePath: resolve(root, 'clean.ts'), messages: [] },
    { filePath: resolve(root, 'large.svelte'), messages: Array(5).fill(message('max-lines')) },
    {
      filePath: resolve(root, 'mixed.svelte'),
      messages: [message('complexity'), message('max-depth')],
      source: 'not exported',
    },
    { filePath: resolve(root, 'broken.svelte'), messages: [message(null, 2)] },
  ]);
  assert.equal(report.scannedFiles, 4);
  assert.equal(report.flaggedFiles, 3);
  assert.equal(report.warnings, 7);
  assert.equal(report.errors, 1);
  assert.equal(report.files[0].path, 'mixed.svelte');
  assert.equal(report.files[2].findings[0].rule, 'parse-error');
  assert.ok(!JSON.stringify(report).includes('not exported'));
  assert.match(formatReport(report), /2:3 \[complexity\]/);
  assert.match(formatReport(report), /1 more/);
  assert.ok(!formatReport(report, true).includes('1 more'));
});

test('concise report caps files; full report and JSON retain all findings', () => {
  const report = summarize(
    Array.from({ length: 21 }, (_, index) => ({
      filePath: resolve(root, `file${index}.ts`),
      messages: [{ line: 1, column: 1, ruleId: 'max-lines', severity: 1, message: 'Long' }],
    })),
  );
  assert.match(formatReport(report), /1 more flagged files/);
  assert.ok(!formatReport(report, true).includes('more flagged files'));
  assert.equal(JSON.parse(JSON.stringify(report)).files.length, 21);
});

test('warnings are advisory by default; strict mode and errors fail', () => {
  assert.equal(exitCode({ errors: 0, warnings: 1 }), 0);
  assert.equal(exitCode({ errors: 0, warnings: 1 }, true), 1);
  assert.equal(exitCode({ errors: 1, warnings: 0 }), 1);
  assert.equal(exitCode({ errors: 0, warnings: 0 }, true), 0);
  assert.match(
    formatReport({ scannedFiles: 1, flaggedFiles: 0, warnings: 0, errors: 0, files: [] }),
    /No findings/,
  );
});

test('CLI offers help and rejects unsupported options', () => {
  const script = resolve(root, 'scripts/audit-components.mjs');
  const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--strict/);
  const unknown = spawnSync(process.execPath, [script, '--unknown'], { encoding: 'utf8' });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /Unknown option/);
});
