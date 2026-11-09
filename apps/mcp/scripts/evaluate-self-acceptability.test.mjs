import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  evaluateSelfAcceptability,
  scoreAcceptabilityCandidates,
} from './evaluate-self-acceptability.mjs';
const cases = JSON.parse(
  await readFile(
    new URL('../../../docs/self-acceptability/matching-evaluation.json', import.meta.url),
    'utf8',
  ),
);
const resource = JSON.parse(
  await readFile(
    new URL('../../../content/assets/libraries/self-acceptability.json', import.meta.url),
    'utf8',
  ),
);
const reply = (fixture) => ({
  entry: fixture.acceptable[0],
  basis: 'expressed',
  evidence: fixture.description,
  connection: 'The example preserves the reported subject and judgment.',
  unconfirmed_assumptions: [],
});
test('editorial scorer distinguishes mild/local and second-order meanings from broader alternatives', () => {
  const mild = cases.find((item) => item.id === 'slightly-messy-home');
  assert.equal(scoreAcceptabilityCandidates(mild, [reply(mild)], resource.records).passed, true);
  assert.equal(
    scoreAcceptabilityCandidates(mild, [{ ...reply(mild), entry: 'S0050' }], resource.records)
      .passed,
    false,
  );
  const meta = cases.find((item) => item.id === 'shame-about-parents-embarrassment');
  assert.equal(
    scoreAcceptabilityCandidates(meta, [{ ...reply(meta), entry: 'S0008-E02' }], resource.records)
      .passed,
    false,
  );
  assert.equal(
    scoreAcceptabilityCandidates(
      cases.find((item) => item.id === 'actual-wrongdoing'),
      [],
      resource.records,
    ).passed,
    true,
  );
});
test('all eight evaluation paths exercise the production runtime; injected replies are marked non-live', async () => {
  let calls = 0;
  const report = await evaluateSelfAcceptability(async (messages) => {
    calls++;
    const input = JSON.parse(messages[1].content);
    assert.equal(Object.hasOwn(input, 'acceptable'), false);
    if (!input.context.library) return 'What aspect of yourself feels unacceptable, if any?';
    assert.equal(input.context.library.length, 317);
    const fixture = cases.find((item) => item.description === input.context.description.situation);
    assert.ok(fixture);
    assert.equal(
      JSON.stringify(input.context).includes('What aspect of yourself feels unacceptable, if any?'),
      false,
    );
    return JSON.stringify(fixture.acceptable.length ? [reply(fixture)] : []);
  });
  assert.equal(report.live, false);
  assert.equal(report.passed, 8);
  assert.equal(report.total, 8);
  assert.equal(calls, 14);
  assert.ok(report.sizes.maxSavedBytes < 2 * 1024 * 1024);
  assert.ok(report.sizes.resourceBytes < 1024 * 1024);
  assert.equal(report.cases.find((item) => item.id === 'unspecified-global-feeling').questions, 1);
});
