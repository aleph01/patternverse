// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { parseMarkdownEntity } from '@patternverse/compiler';
import { fulfillModelEffect } from '@patternverse/guided-ai';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import type { PatternRun } from '$lib/pattern-runtime/types';
import type { Inspection } from '$lib/pattern-editor/types';
import type { ShowView } from './show-view';
import { formBlocks } from './form';
import { sourcePracticeNeedsAi } from './source-practice';
import { resumeSourceRun } from '$lib/pattern-runtime/source';

vi.mock('$lib/pattern-runtime/wasm', () => ({
  executePatternRequest: async (_transport: string, request: Record<string, unknown>) =>
    JSON.parse(editor(JSON.stringify(request))),
}));

const root = resolve(process.cwd(), '../..');
const resource = JSON.parse(
  readFileSync(resolve(root, 'content/assets/libraries/self-acceptability.json'), 'utf8'),
);
const data = { 'commons:self-acceptability': resource };
const parsed = parseMarkdownEntity(
  readFileSync(resolve(root, 'content/patterns/explore-what-feels-wrong.md'), 'utf8'),
  { sourceId: 'commons', sourcePath: 'patterns/explore-what-feels-wrong.md' },
);
const pattern = parsed.entity!;
const source = pattern.languagePracticeSource!;
const execute = <T>(request: Record<string, unknown>): T =>
  JSON.parse(
    editor(
      JSON.stringify(
        ['start', 'inspect'].includes(String(request.operation)) ? { data, ...request } : request,
      ),
    ),
  ) as T;
const start = () =>
  execute<PatternRun>({ operation: 'start', source, root_id: 'acceptability-test', inputs: {} });
const fulfill = (run: PatternRun, result: unknown) =>
  execute<PatternRun>({
    operation: 'apply',
    saved: run.saved,
    expected_revision: run.view.revision,
    command: {
      run_id: run.view.pending!.run_id,
      event: { Fulfill: { effect_id: run.view.pending!.effect_id, result } },
    },
  });
const describeSituation = (value: string) =>
  fulfill(start(), { kind: 'form', value: { situation: { type: 'text', value } } });

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

describe('self-acceptability catalogue practice', () => {
  it('compiles the full authored practice and starts with one required description before any AI', () => {
    expect(parsed.diagnostics).toEqual([]);
    expect(sourcePracticeNeedsAi(pattern)).toBe(true);
    expect(execute<Inspection>({ operation: 'inspect', source }).diagnostics).toEqual([]);
    const run = start();
    expect(run.view.pending!.request.kind).toBe('interaction.form');
    expect(formBlocks(run.view.pending!)).toMatchObject([{ id: 'situation', required: true }]);
    expect(() => describeSituation(' ')).toThrow();
  });

  it('sends all canonical entries and renders a tentative connection using canonical wording', async () => {
    const run = describeSituation('I feel ashamed of needing reassurance.');
    const request = vi.fn(async () =>
      JSON.stringify([
        {
          entry: 'S0025',
          basis: 'hypothesis',
          evidence: 'needing reassurance',
          connection: 'You may be judging your need for reassurance as excessive.',
          unconfirmed_assumptions: [
            'Whether too needy is the label you give yourself remains unconfirmed.',
          ],
        },
      ]),
    );
    const receipt = await fulfillModelEffect(run.view.pending!, request);
    const messages = request.mock.calls as unknown as [Array<{ content: string }>][];
    expect(JSON.parse(messages[0][0][1].content).context.library).toEqual(resource.records);
    const done = fulfill(run, receipt);
    expect(done.view.status).toBe('Completed');
    const shown = done.view.items
      .filter((item) => item.effect.request.kind === 'content.show')
      .at(-1)!;
    const card = (shown.effect.request.payload.view as ShowView).panels[0].items[0];
    expect(card.label).toBe('Needing reassurance makes me too needy.');
    expect(card.fields.basis).toBe('hypothesis');
    expect(card.fields.unconfirmed_assumptions).toBeDefined();
    expect(JSON.stringify(done.saved).length).toBeLessThan(2 * 1024 * 1024);
    expect(
      execute<PatternRun>({ operation: 'restore', source, saved: done.saved }).view.outputs,
    ).toEqual(done.view.outputs);
  });

  it.each(['I feel bad for wanting time alone.', ''])(
    'asks one optional question, retries with participant answers only and allows no match: %j',
    async (answer) => {
      const description = 'There is something wrong with me but I cannot name it.';
      let run = describeSituation(description);
      run = fulfill(run, await fulfillModelEffect(run.view.pending!, async () => '[]'));
      const question = 'What aspect of yourself feels unacceptable, if you can name one?';
      run = fulfill(run, await fulfillModelEffect(run.view.pending!, async () => question));
      expect(formBlocks(run.view.pending!)).toMatchObject([
        { id: 'meaning', required: false, prompt: question },
      ]);
      run = fulfill(run, { kind: 'form', value: { meaning: { type: 'text', value: answer } } });
      const request = vi.fn(async () => '[]');
      run = fulfill(run, await fulfillModelEffect(run.view.pending!, request));
      const messages = request.mock.calls as unknown as [Array<{ content: string }>][];
      const context = JSON.parse(messages[0][0][1].content).context;
      expect(context.description.situation).toBe(description);
      expect(context.clarification.meaning).toBe(answer);
      expect(context.library).toEqual(resource.records);
      expect(JSON.stringify(context)).not.toContain(question);
      expect(run.view.status).toBe('Completed');
      expect(run.view.pending).toBeNull();
      expect(
        run.view.items.filter((item) => item.effect.request.kind === 'interaction.form'),
      ).toHaveLength(2);
      expect(JSON.stringify(run.view)).toContain('you do not need to choose a flaw');
      expect(JSON.stringify(run.saved).length).toBeLessThan(2 * 1024 * 1024);
    },
  );

  it('rejects invented IDs and extra inferred-consequence fields without advancing', async () => {
    const run = describeSituation('I feel bad for needing reassurance.');
    const valid = {
      entry: 'S0025',
      basis: 'hypothesis',
      evidence: 'needing reassurance',
      connection: 'A possible judgment about needing connection.',
      unconfirmed_assumptions: ['Whether you call this too needy.'],
    };
    for (const value of [
      { ...valid, entry: 'S9999' },
      { ...valid, consequence: 'People will leave.' },
    ]) {
      await expect(
        fulfillModelEffect(run.view.pending!, async () => JSON.stringify([value])),
      ).rejects.toThrow();
      expect(run.view.pending!.request.kind).toBe('agent.generate');
    }
  });

  it('restores a 0.1 run using its frozen 63-entry library while new runs use all 317 examples', async () => {
    const legacyData = JSON.parse(
      readFileSync(resolve(root, 'docs/self-acceptability/history/library-v0.1.json'), 'utf8'),
    );
    const legacySource = parseMarkdownEntity(
      readFileSync(resolve(root, 'docs/self-acceptability/history/article-v0.1.md'), 'utf8'),
      { sourceId: 'commons', sourcePath: 'patterns/explore-what-feels-wrong.md' },
    ).entity!.languagePracticeSource!;
    let legacy = execute<PatternRun>({
      operation: 'start',
      source: legacySource,
      data: { 'commons:self-acceptability': legacyData },
      root_id: 'legacy-acceptability',
      inputs: {},
    });
    legacy = fulfill(legacy, {
      kind: 'form',
      value: { situation: { type: 'text', value: 'Needing reassurance makes me too needy.' } },
    });
    // An explicit handoff requires the exact source, while history resumes the
    // source and catalogue already frozen in the checkpoint.
    expect(() =>
      execute<PatternRun>({ operation: 'restore', source, saved: legacy.saved }),
    ).toThrow();
    const restored = await resumeSourceRun(JSON.stringify(legacy.saved));
    const inspectContext = vi.fn(async () =>
      JSON.stringify([
        {
          entry: 'S0025',
          basis: 'expressed',
          evidence: 'Needing reassurance makes me too needy.',
          connection: 'You name the need and judgment directly.',
          unconfirmed_assumptions: [],
        },
      ]),
    );
    const receipt = await fulfillModelEffect(restored.view.pending!, inspectContext);
    const calls = inspectContext.mock.calls as unknown as [Array<{ content: string }>][];
    expect(JSON.parse(calls[0][0][1].content).context.library).toEqual(legacyData.records);
    expect(fulfill(restored, receipt).view.status).toBe('Completed');
    const tampered = structuredClone(legacy.saved) as unknown as {
      manager: { snapshot: { sources: Record<string, string> } };
    };
    const rootName = Object.keys(tampered.manager.snapshot.sources)[0];
    tampered.manager.snapshot.sources[rootName] += '\n!show {\nTampered\n}';
    await expect(resumeSourceRun(JSON.stringify(tampered))).rejects.toBeDefined();
    expect(resource.records).toHaveLength(317);
    const fresh = describeSituation('I am embarrassed about my slightly messy home.');
    const freshRequest = vi.fn(async () =>
      JSON.stringify([
        {
          entry: 'S0050-E02',
          basis: 'expressed',
          evidence: 'embarrassed about my slightly messy home',
          connection: 'This names mild embarrassment about slight messiness.',
          unconfirmed_assumptions: [],
        },
      ]),
    );
    const done = fulfill(fresh, await fulfillModelEffect(fresh.view.pending!, freshRequest));
    const shown = done.view.items
      .filter((item) => item.effect.request.kind === 'content.show')
      .at(-1)!;
    expect((shown.effect.request.payload.view as ShowView).panels[0].items[0].label).toBe(
      'My home is slightly messy, and I feel embarrassed about it.',
    );
    expect(new TextEncoder().encode(JSON.stringify(done.saved)).byteLength).toBeLessThan(
      2 * 1024 * 1024,
    );
  });
});
