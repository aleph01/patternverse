import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const hash = (text) => createHash('sha256').update(text).digest('hex');

/** Score semantic recall separately from receipt validity. No reference answer is sent to the model. */
export function scoreBeliefCandidates(fixture, candidates) {
  const issues = [];
  const ids = candidates.map((item) => item.belief);
  if (fixture.acceptable.length ? !fixture.acceptable.some((id) => ids.includes(id)) : ids.length)
    issues.push(
      fixture.acceptable.length
        ? 'No acceptable candidate retrieved'
        : 'Invented a pattern for a bounded or uninformative description',
    );
  if (new Set(ids).size !== ids.length) issues.push('Repeated belief');
  for (const item of candidates) {
    if (
      !item.evidence?.trim() ||
      ![fixture.description, fixture.clarification ?? ''].some((text) =>
        text.includes(item.evidence),
      )
    )
      issues.push('Evidence is not an exact participant quote');
    if (!item.connection?.trim()) issues.push('Missing connection');
    if (!['expressed', 'hypothesis'].includes(item.basis)) issues.push('Unknown basis');
    if (
      !Array.isArray(item.unconfirmed_assumptions) ||
      item.unconfirmed_assumptions.length > 2 ||
      item.unconfirmed_assumptions.some((text) => !text.trim())
    )
      issues.push('Invalid unconfirmed assumptions');
    if (item.basis === 'hypothesis' && !item.unconfirmed_assumptions?.length)
      issues.push('Hypothesis hides its missing premise');
  }
  return { passed: issues.length === 0, issues };
}

/** Load the production compiler and provider adapter without maintaining another parser. */
export async function loadPracticeEvaluationAdapters() {
  const directory = await mkdtemp(join(tmpdir(), 'belief-eval-'));
  const outfile = join(directory, 'adapters.mjs');
  try {
    await build({
      stdin: {
        contents:
          'export { fulfillModelEffect } from "./packages/guided-ai/src/index.ts"; export { plainContext } from "./packages/guided-ai/src/structured.ts"; export { parseMarkdownEntity } from "./packages/compiler/src/index.ts";',
        resolveDir: root,
      },
      outfile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      banner: {
        js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
      },
    });
    return await import(pathToFileURL(outfile).href);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** Live, opt-in evaluation of the exact authored effects against the full catalogue. */
export async function evaluateBeliefs(
  requestText,
  { cases, model = 'injected-provider', live = false } = {},
) {
  const { fulfillModelEffect, plainContext, parseMarkdownEntity } =
    await loadPracticeEvaluationAdapters();
  const bridge = await import(
    pathToFileURL(join(root, 'apps/web/src/lib/mira/engine/pattern_wasm.js')).href
  );
  bridge.initSync({
    module: await readFile(join(root, 'apps/web/src/lib/mira/engine/pattern_wasm_bg.wasm')),
  });
  const markdown = await readFile(
    join(root, 'content/patterns/identify-limiting-beliefs.md'),
    'utf8',
  );
  const source = parseMarkdownEntity(markdown, {
    sourceId: 'commons',
    sourcePath: 'patterns/identify-limiting-beliefs.md',
  }).entity.languagePracticeSource;
  const resource = await readFile(
    join(root, 'content/assets/libraries/limiting-beliefs.json'),
    'utf8',
  );
  const data = { 'commons:limiting-beliefs': JSON.parse(resource) };
  const fixtures =
    cases ??
    JSON.parse(
      await readFile(join(root, 'docs/limiting-beliefs/matching-evaluation.json'), 'utf8'),
    );
  const call = (request) => JSON.parse(bridge.editor(JSON.stringify(request)));
  const results = [];
  for (const fixture of fixtures) {
    let run = call({ operation: 'start', source, data, root_id: `eval-${fixture.id}`, inputs: {} });
    const fulfill = (result) => {
      const effect = run.view.pending;
      run = call({
        operation: 'apply',
        saved: run.saved,
        expected_revision: run.view.revision,
        command: {
          run_id: effect.run_id,
          event: { Fulfill: { effect_id: effect.effect_id, result } },
        },
      });
    };
    fulfill({ kind: 'form', value: { situation: { type: 'text', value: fixture.description } } });
    if (fixture.clarification !== undefined) {
      // Position the retry effect. These setup receipts do not claim to evaluate the first matcher/question generator.
      fulfill({
        kind: 'generated',
        value: {
          type: 'list',
          value: {
            element_type: run.view.pending.request.payload.contract.returns.list,
            items: [],
          },
        },
      });
      fulfill({
        kind: 'generated',
        value: { type: 'text', value: 'What thought or meaning, if any, came to mind?' },
      });
      fulfill({ kind: 'form', value: { meaning: { type: 'text', value: fixture.clarification } } });
    }
    try {
      const receipt = await fulfillModelEffect(run.view.pending, requestText);
      fulfill(receipt); // Rust must accept the same receipt before it is scored.
      const candidates = plainContext(receipt.value);
      results.push({
        id: fixture.id,
        phase: fixture.clarification === undefined ? 'initial' : 'retry',
        candidates,
        ...scoreBeliefCandidates(fixture, candidates),
      });
    } catch (error) {
      results.push({
        id: fixture.id,
        passed: false,
        issues: [error instanceof Error ? error.message : 'Invalid model result'],
      });
    }
  }
  return {
    model,
    live,
    sourceSha256: hash(source),
    resourceSha256: hash(resource),
    cases: results,
    passed: results.filter((item) => item.passed).length,
    total: results.length,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  if (!key || !model) {
    console.error(
      'Set OPENROUTER_API_KEY and OPENROUTER_MODEL to run the live belief evaluation. No credentials are read from the workspace or browser.',
    );
    process.exitCode = 1;
  } else {
    const selected = process.argv.find((arg) => arg.startsWith('--case='))?.slice(7);
    let cases = JSON.parse(
      await readFile(join(root, 'docs/limiting-beliefs/matching-evaluation.json'), 'utf8'),
    );
    if (selected) cases = cases.filter((item) => item.id === selected);
    if (!cases.length) throw new Error('No evaluation cases selected.');
    const report = await evaluateBeliefs(
      async (messages) => {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(60_000),
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'X-OpenRouter-Title': 'Patternverse belief evaluation',
          },
          body: JSON.stringify({
            model,
            messages,
            stream: false,
            max_tokens: 2048,
            reasoning: { effort: 'low', exclude: true },
            provider: { zdr: true, data_collection: 'deny', allow_fallbacks: false },
          }),
        });
        const payload = await response.json();
        if (!response.ok || payload.error)
          throw new Error(`Evaluation provider failed (HTTP ${response.status}).`);
        const content = payload.choices?.[0]?.message?.content;
        return typeof content === 'string'
          ? content
          : Array.isArray(content)
            ? content
                .filter((part) => part?.type === 'text' && typeof part.text === 'string')
                .map((part) => part.text)
                .join('')
            : '';
      },
      { cases, model, live: true },
    );
    const destination = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6);
    if (destination) await writeFile(resolve(destination), JSON.stringify(report, null, 2) + '\n');
    for (const result of report.cases)
      console.log(
        `${result.passed ? 'PASS' : 'FAIL'} ${result.id}${result.issues.length ? `: ${result.issues.join('; ')}` : ''}`,
      );
    console.log(`${report.passed}/${report.total} cases passed.`);
    if (report.passed !== report.total) process.exitCode = 1;
  }
}
