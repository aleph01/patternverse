// Deliberately synthetic fixtures: tests of orchestration, never evidence of editorial quality.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type Executor } from './executor.js';
import { json } from './store.js';

const scores = {
  usefulness: 4.5,
  reusability: 4.5,
  distinctiveness: 4.5,
  teachability: 4.5,
  grounding: 4.5,
  coverage: 4.5,
};
export const mockExecutor: Executor = async ({ stage, pattern, context, config, attemptDir }) => {
  const sourceIds = ['fixture-manual', 'fixture-guide'];
  const sources = sourceIds.map((id, i) => ({
    id,
    url: `https://example.com/editorial-fixture-${i}`,
    title: `Synthetic fixture source ${i}`,
    publisher: 'Test fixture — not checked evidence',
    accessed_at: new Date().toISOString().slice(0, 10),
    findings: ['Synthetic supporting observation for state-machine tests.'],
    limitations: 'Not researched; never publish mock output.',
  }));
  const research = {
    scope: `Synthetic test of ${context.domain}`,
    concepts: ['Variable isolation'],
    problems: ['Uncontrolled variation'],
    techniques: ['Compare one change'],
    subdomains: ['Capture', 'Review'],
    sources,
    claims: [{ claim: 'Fixture claim only', source_ids: sourceIds, qualification: 'Synthetic' }],
    gaps: ['Every factual claim needs real research'],
  };
  const target = Number(context.target);
  const candidates = Array.from({ length: target * config.candidate_multiplier }, (_, i) => ({
    id: `${context.collection_id}-fixture-${i + 1}`,
    title: `Synthetic Pattern ${i + 1}`,
    problem: 'A recognizable synthetic test situation',
    mechanism: `Isolate fixture variable ${i + 1}`,
    subdomain: i % 2 ? 'Capture' : 'Review',
    scores,
    source_ids: sourceIds,
    disposition: 'keep',
    merge_into: null,
    reason: 'Synthetic candidate to exercise selection',
    existing_overlap: [],
  }));
  const selected = candidates.slice(0, target).map((c) => c.id);
  const paragraph = `In this synthetic example, a photographer compares two frames of a cup near a window. The first frame includes a bright distraction. Moving slightly changes its overlap with the subject. The comparison makes one relationship easier to see, while changing several settings at once would obscure which decision mattered. The example demonstrates the pipeline's artifact handling rather than researched guidance. A fixed viewpoint may be required for a series, so movement is a choice with costs. A second comparison records the original and changed frame before judging whether either serves the intended picture. This fixture must never become published editorial content.`;
  let body = `## Synthetic fixture: ${pattern}\n\n`;
  while (body.split(/\s+/).length < config.min_article_words + 20) body += `${paragraph}\n\n`;
  const values: Record<string, unknown> = {
    'domain-research': research,
    research,
    discovery: {
      candidates,
      gaps: ['Synthetic coverage only'],
      coverage_notes: 'Mock outputs are not editorial recommendations',
    },
    design: {
      title: 'Synthetic collection',
      rationale: 'Test artifact, not publishable',
      selected,
      count_rationale: 'Test target',
      groups: [{ id: `${context.collection_id}-group`, title: 'Test group', items: selected }],
      progression: selected,
      relationships: selected.slice(1).map((id) => ({
        from: id,
        to: selected[0],
        kind: 'complement',
        rationale: 'Synthetic relation',
      })),
      deferred: candidates.slice(target).map((c) => ({ id: c.id, reason: 'Outside mock target' })),
      gaps: ['Real research needed'],
      terminology: [{ term: 'fixture', meaning: 'Synthetic test artifact' }],
    },
    outline: {
      thesis: 'Compare one deliberate change',
      mechanism: 'Controlled observation',
      sections: Array.from({ length: 4 }, (_, i) => ({
        heading: `Section ${i}`,
        purpose: 'Explain fixture',
        examples: ['Cup comparison'],
      })),
      limitations: ['Synthetic'],
      claim_source_ids: sourceIds,
    },
    draft: { title: `Synthetic ${pattern}`, body, source_ids: sourceIds, change_notes: [] },
    revision: {
      title: `Synthetic ${pattern}`,
      body,
      source_ids: sourceIds,
      change_notes: ['Synthetic bounded revision'],
    },
    critique: {
      verdict: 'pass',
      scores,
      issues: [],
      strengths: ['Synthetic success'],
      coverage_notes: 'No real review performed',
    },
    'plan-review': {
      verdict: 'pass',
      scores,
      issues: [],
      strengths: ['Synthetic success'],
      coverage_notes: 'No real review performed',
    },
    factcheck: {
      verdict: 'pass',
      claims: [
        {
          claim: 'Fixture claim only',
          status: 'qualified',
          source_ids: sourceIds,
          verification: 'Synthetic assertion',
          correction: null,
        },
      ],
      sources: [],
      limitations: ['No factual checking in mock mode'],
    },
    enrichment: {
      short_description: 'Synthetic fixture for pipeline tests',
      use_when: ['Testing interruption', 'Testing validation'],
      goals: ['Exercise state transitions'],
      mechanisms: ['Deterministic fixture'],
      tags: ['synthetic', 'do-not-publish'],
      difficulty: 'beginner',
      estimated_practice_time: null,
      prerequisites: [],
      not_ideal_when: ['Publishing real editorial content'],
      example_user_queries: Array.from(
        { length: 8 },
        (_, i) => `How can I compare synthetic situation ${i + 1} clearly?`,
      ),
      related_patterns: selected.filter((id) => id !== pattern).slice(0, 2),
      practice: null,
      simulation: null,
      visual: { type: 'none', rationale: 'Synthetic fixture needs no graphic', brief: null },
    },
    audit: {
      verdict: 'pass',
      summary: 'Synthetic lifecycle passed; not an editorial assessment',
      findings: [],
      priorities: ['Use real research before editorial acceptance'],
      limitations: ['Mock outputs are not publishable'],
    },
  };
  const output = values[stage];
  await writeFile(join(attemptDir, 'response.json'), json(output), { flag: 'wx' });
  await writeFile(
    join(attemptDir, 'events.jsonl'),
    `${JSON.stringify({ type: 'mock.completed', stage, tokens: 0 })}\n`,
    { flag: 'wx' },
  );
  await writeFile(join(attemptDir, 'stderr.log'), '', { flag: 'wx' });
  return { output, tokens: 0 };
};
