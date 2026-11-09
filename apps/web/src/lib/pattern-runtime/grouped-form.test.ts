import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, expect, it } from 'vitest';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import { startSourceRun, applySourceAction, restoreSourceRun, serializeSourceRun } from './source';
import { practiceSnapshot } from '$lib/pattern-run/history';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

const source = `:language 1
:output assessment
:output score
assessment = !form {
  :title "Assess an initiative"
  name = !ask {
    Initiative?
  }
  impact = !rate -2.5..5 {
    Impact?
  }
  evidence = !choose {
    Evidence?
    - observed: "Observed results"
    - assumed: "Assumption"
  }
  dependencies = !choose [multi, min=0, max=2] {
    Dependencies?
    - design: "Design"
    - engineering: "Engineering"
  }
}
score = assessment.impact * 2
-> end
`;
const fields = {
  name: { type: 'text', value: 'Onboarding' },
  impact: { type: 'number', value: 0 },
  evidence: { type: 'choice', value: { value: 'observed', label: 'Observed results' } },
  dependencies: {
    type: 'list',
    value: {
      element_type: 'choice',
      items: [
        { type: 'choice', value: { value: 'engineering', label: 'Engineering' } },
        { type: 'choice', value: { value: 'design', label: 'Design' } },
      ],
    },
  },
};

it('runs mixed forms through the shipped Rust browser engine with one atomic receipt and replay', async () => {
  const run = await startSourceRun(source);
  expect(run.view.pending!.request.kind).toBe('interaction.form');
  const before = serializeSourceRun(run);
  const effect = run.view.pending!;
  const event = (value: unknown) => ({
    Fulfill: { effect_id: effect.effect_id, result: { kind: 'form', value } },
  });
  for (const invalid of [
    { ...fields, impact: { type: 'number', value: 6 } },
    { ...fields, evidence: { type: 'choice', value: { value: 'unknown', label: 'Unknown' } } },
    {
      ...fields,
      dependencies: {
        type: 'list',
        value: { element_type: 'choice', items: [fields.evidence, fields.evidence] },
      },
    },
  ])
    await expect(applySourceAction(run, event(invalid), effect.run_id)).rejects.toBeDefined();
  expect(serializeSourceRun(run)).toBe(before);
  const restored = await restoreSourceRun(source, before);
  const done = await applySourceAction(restored, event(fields), effect.run_id);
  expect(done.view.status).toBe('Completed');
  expect(done.view.revision).toBe(1);
  expect(done.view.outputs.score).toEqual({ type: 'number', value: 0 });
  expect(
    done.view.items.filter(
      (item) => item.effect.request.kind === 'interaction.form' && item.result !== null,
    ),
  ).toHaveLength(1);
  expect(await restoreSourceRun(source, serializeSourceRun(done))).toEqual(done);
  const history = practiceSnapshot(done, {
    patternRef: { sourceId: 'commons', entityId: 'test' },
    patternTitle: 'Test',
    patternType: 'pattern',
    verseIds: [],
  });
  expect(history.responses.map(({ answer }) => answer)).toEqual([
    'Onboarding',
    '0',
    'Observed results',
    'Design, Engineering',
  ]);
});
