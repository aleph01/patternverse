import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPracticeEvaluationAdapters } from './evaluate-beliefs.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const bytes = (value) => Buffer.byteLength(JSON.stringify(value));
const hash = (value) => createHash('sha256').update(value).digest('hex');

export function scoreAcceptabilityCandidates(fixture, candidates, records) {
  const issues = [];
  const ids = candidates.map((candidate) => candidate.entry);
  if (fixture.acceptable.length ? !fixture.acceptable.some((id) => ids.includes(id)) : ids.length)
    issues.push(
      fixture.acceptable.length
        ? 'Missing a sufficiently specific example'
        : 'Suggested a self-judgment without a supported in-scope meaning',
    );
  if (new Set(ids).size !== ids.length) issues.push('Repeated example');
  for (const candidate of candidates) {
    const record = records.find((record) => record.id === candidate.entry);
    if (!record) issues.push('Unknown example');
    if (fixture.forbidden.includes(candidate.entry))
      issues.push('Selected a contradicted or overgeneralized example');
    if (fixture.maxScope === 'local' && record?.scope === 'global')
      issues.push('Broadened a local concern into a global judgment');
    if (
      !candidate.evidence?.trim() ||
      ![fixture.description, fixture.clarification ?? ''].some((text) =>
        text.includes(candidate.evidence),
      )
    )
      issues.push('Evidence is not an exact participant quote');
    if (!candidate.connection?.trim()) issues.push('Missing connection');
    if (!['expressed', 'hypothesis'].includes(candidate.basis)) issues.push('Unknown basis');
    if (
      !Array.isArray(candidate.unconfirmed_assumptions) ||
      candidate.unconfirmed_assumptions.length > 2 ||
      candidate.unconfirmed_assumptions.some((text) => !text.trim())
    )
      issues.push('Invalid unconfirmed assumptions');
    if (candidate.basis === 'hypothesis' && !candidate.unconfirmed_assumptions?.length)
      issues.push('Hypothesis hides an added premise');
  }
  return { passed: issues.length === 0, issues };
}

/** Runs the authored practice end to end. Injected responses are plumbing checks, not semantic evidence. */
export async function evaluateSelfAcceptability(
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
    join(root, 'content/patterns/explore-what-feels-wrong.md'),
    'utf8',
  );
  const source = parseMarkdownEntity(markdown, {
    sourceId: 'commons',
    sourcePath: 'patterns/explore-what-feels-wrong.md',
  }).entity.languagePracticeSource;
  const resourceText = await readFile(
    join(root, 'content/assets/libraries/self-acceptability.json'),
    'utf8',
  );
  const resource = JSON.parse(resourceText);
  const fixtures =
    cases ??
    JSON.parse(
      await readFile(join(root, 'docs/self-acceptability/matching-evaluation.json'), 'utf8'),
    );
  const call = (request) => JSON.parse(bridge.editor(JSON.stringify(request)));
  const results = [];
  const sizes = {
    resourceBytes: Buffer.byteLength(resourceText),
    maxSavedBytes: 0,
    maxMessagesBytes: 0,
  };
  for (const fixture of fixtures) {
    let run = call({
      operation: 'start',
      source,
      data: { 'commons:self-acceptability': resource },
      root_id: `eval-${fixture.id}`,
      inputs: {},
    });
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
      sizes.maxSavedBytes = Math.max(sizes.maxSavedBytes, bytes(run.saved));
      if (bytes(run.saved) > 2 * 1024 * 1024)
        throw new Error('Saved run exceeds browser checkpoint limit');
    };
    let candidates = [],
      questions = 0,
      modelCalls = 0;
    try {
      fulfill({ kind: 'form', value: { situation: { type: 'text', value: fixture.description } } });
      while (run.view.pending) {
        if (run.view.pending.request.kind === 'interaction.form') {
          fulfill({
            kind: 'form',
            value: { meaning: { type: 'text', value: fixture.clarification ?? '' } },
          });
          continue;
        }
        if (run.view.pending.request.kind !== 'agent.generate' || ++modelCalls > 3)
          throw new Error('Unexpected practice effect or extra interview loop');
        const receipt = await fulfillModelEffect(run.view.pending, async (messages) => {
          sizes.maxMessagesBytes = Math.max(sizes.maxMessagesBytes, bytes(messages));
          return requestText(messages);
        });
        const value = plainContext(receipt.value);
        if (Array.isArray(value)) candidates = value;
        else questions++;
        fulfill(receipt);
      }
      results.push({
        id: fixture.id,
        candidates,
        questions,
        modelCalls,
        ...scoreAcceptabilityCandidates(fixture, candidates, resource.records),
      });
    } catch (error) {
      results.push({
        id: fixture.id,
        passed: false,
        issues: [error instanceof Error ? error.message : 'Invalid evaluation result'],
      });
    }
  }
  return {
    model,
    live,
    sourceSha256: hash(source),
    resourceSha256: hash(resourceText),
    sizes,
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
      'Set OPENROUTER_API_KEY and OPENROUTER_MODEL to opt into live evaluation. No credentials are read from browser or workspace storage.',
    );
    process.exitCode = 1;
  } else {
    const selected = process.argv.find((arg) => arg.startsWith('--case='))?.slice(7);
    const fixtures = JSON.parse(
      await readFile(join(root, 'docs/self-acceptability/matching-evaluation.json'), 'utf8'),
    );
    const cases = selected ? fixtures.filter((item) => item.id === selected) : fixtures;
    if (!cases.length) throw new Error('No matching evaluation cases');
    const report = await evaluateSelfAcceptability(
      async (messages) => {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(60_000),
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'X-OpenRouter-Title': 'Patternverse recognition evaluation',
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
          throw new Error(`Provider failed (HTTP ${response.status})`);
        const content = payload.choices?.[0]?.message?.content;
        return typeof content === 'string'
          ? content
          : Array.isArray(content)
            ? content
                .filter((part) => part?.type === 'text')
                .map((part) => part.text)
                .join('')
            : '';
      },
      { cases, model, live: true },
    );
    const destination = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6);
    if (destination) await writeFile(resolve(destination), JSON.stringify(report, null, 2) + '\n');
    for (const item of report.cases)
      console.log(
        `${item.passed ? 'PASS' : 'FAIL'} ${item.id}${item.issues.length ? `: ${item.issues.join('; ')}` : ''}`,
      );
    console.log(`${report.passed}/${report.total} cases passed.`);
    if (report.passed !== report.total) process.exitCode = 1;
  }
}
