import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { evaluateBeliefs, scoreBeliefCandidates } from './evaluate-beliefs.mjs';

const cases = JSON.parse(
  await readFile(
    new URL('../../../docs/limiting-beliefs/matching-evaluation.json', import.meta.url),
    'utf8',
  ),
);
const example = cases.find((item) => item.id === 'food-guard-clarification');
const candidate = {
  belief: 'P0065',
  basis: 'hypothesis',
  evidence: 'I am letting my guard down',
  connection: 'Allowing an exception could feel like the start of losing wider control.',
  unconfirmed_assumptions: ['An exception is expected to weaken other standards too.'],
};
test('the scorer catches the original missed candidate, hidden premises, invented quotes and false positives', () => {
  assert.equal(scoreBeliefCandidates(example, []).passed, false);
  assert.equal(scoreBeliefCandidates(example, [candidate]).passed, true);
  for (const changed of [
    { ...candidate, unconfirmed_assumptions: [] },
    { ...candidate, evidence: 'All my standards will collapse' },
    { ...candidate, basis: 'certain' },
  ])
    assert.equal(scoreBeliefCandidates(example, [changed]).passed, false);
  const bounded = cases.find((item) => item.id === 'bounded-dietary-constraint');
  assert.equal(scoreBeliefCandidates(bounded, []).passed, true);
  assert.equal(scoreBeliefCandidates(bounded, [candidate]).passed, false);
});
test('evaluation plumbing uses the real retry effect and full cues; an injected reply is explicitly not a live quality result', async () => {
  let calls = 0;
  const report = await evaluateBeliefs(
    async (messages) => {
      calls++;
      const input = JSON.parse(messages[1].content);
      assert.equal(input.context.description.situation, example.description);
      assert.equal(input.context.clarification.meaning, example.clarification);
      assert.equal(input.context.beliefs.length, 185);
      assert.equal(
        input.context.beliefs.find((item) => item.id === 'P0065').recognition_cues.length,
        2,
      );
      assert.equal(Object.hasOwn(input, 'acceptable'), false);
      assert.equal(
        input.context.beliefs.every((item) => item.recognition_cues.length >= 2),
        true,
      );
      return JSON.stringify([candidate]);
    },
    { cases: [example] },
  );
  assert.equal(calls, 1);
  assert.equal(report.live, false);
  assert.equal(report.passed, 1);
  assert.equal(report.cases[0].phase, 'retry');
  assert.equal(report.sourceSha256.length, 64);
});
