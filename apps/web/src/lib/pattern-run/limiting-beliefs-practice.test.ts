// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { compileCorpus, parseMarkdownEntity } from '@patternverse/compiler';
import { fulfillModelEffect } from '@patternverse/guided-ai';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import type { PatternRun } from '$lib/pattern-runtime/types';
import type { Inspection } from '$lib/pattern-editor/types';
import type { ShowView } from './show-view';
import { sourcePracticeNeedsAi } from './source-practice';
import { sourceRunData } from '$lib/server/practice-run';
import { patternPracticeOptions } from '$lib/practice-options';
import { formBlocks } from './form';
import library from '$lib/article-widgets/beliefs/library-v0.8.json';
const resource = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../../content/assets/libraries/limiting-beliefs.json'),
    'utf8',
  ),
);
const data = { 'commons:limiting-beliefs': resource };
const parsed = parseMarkdownEntity(
  readFileSync(
    resolve(process.cwd(), '../../content/patterns/identify-limiting-beliefs.md'),
    'utf8',
  ),
  { sourceId: 'commons', sourcePath: 'patterns/identify-limiting-beliefs.md' },
);
const pattern = parsed.entity!;
const source = pattern.languagePracticeSource!;
const execute = <T>(request: Record<string, unknown>): T =>
  JSON.parse(
    editor(
      JSON.stringify(
        ['start', 'inspect'].includes(String(request.operation)) ? { ...request, data } : request,
      ),
    ),
  ) as T;
const start = () =>
  execute<PatternRun>({ operation: 'start', source, root_id: 'belief-practice-test', inputs: {} });
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
const describeSituation = (run: PatternRun, value: string) =>
  fulfill(run, { kind: 'form', value: { situation: { type: 'text', value } } });
beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
describe('full-library belief matching', () => {
  it('declares its reference library and AI use at all practice entry points', () => {
    expect(parsed.diagnostics).toEqual([]);
    expect(pattern.libraries).toEqual([
      { id: 'limiting-beliefs', src: '../assets/libraries/limiting-beliefs.json' },
    ]);
    expect(sourcePracticeNeedsAi(pattern)).toBe(true);
    const compiled = compileCorpus([pattern], [{ id: 'commons', name: 'Commons', readonly: true }])
      .entities[0];
    expect(patternPracticeOptions(compiled, [])[0]).toMatchObject({
      needsAi: true,
      runPath: '/pattern/identify-limiting-beliefs/run',
    });
    expect(sourceRunData(compiled, '/pattern/identify-limiting-beliefs').needsAi).toBe(true);
    const inspection = execute<Inspection>({ operation: 'inspect', source });
    expect(inspection.diagnostics).toEqual([]);
    expect(inspection.structure!.steps.filter((step) => step.kind === 'generate')).toHaveLength(3);
    expect(inspection.structure!.steps.some((step) => ['choose', 'rate'].includes(step.kind))).toBe(
      false,
    );
  });
  it('requires one description and rejects blank text before model work', () => {
    const run = start();
    expect(run.view.pending!.request.kind).toBe('interaction.form');
    expect(formBlocks(run.view.pending!)).toHaveLength(1);
    expect(formBlocks(run.view.pending!)[0]).toMatchObject({
      type: 'ask',
      id: 'situation',
      required: true,
    });
    expect(() => describeSituation(run, ' ')).toThrow();
    expect(run.view.revision).toBe(0);
  });
  it.each([
    {
      reply: [
        {
          belief: 'P0001',
          basis: 'expressed',
          unconfirmed_assumptions: [],
          evidence: 'worth by how useful I am',
          connection: 'Your description explicitly links worth to usefulness.',
        },
      ],
    },
  ])(
    'uses all 185 records, validates structured matches and resolves canonical wording: %j',
    async ({ reply }) => {
      const description = 'I judge my worth by how useful I am.';
      const pending = describeSituation(start(), description);
      const request = vi.fn(async () => JSON.stringify(reply));
      const receipt = await fulfillModelEffect(pending.view.pending!, request);
      expect(request).toHaveBeenCalledTimes(1);
      const calls = request.mock.calls as unknown as [Array<{ role: string; content: string }>][];
      const input = JSON.parse(calls[0][0][1].content);
      expect(input.context.description.situation).toBe(description);
      expect(input.context.beliefs).toHaveLength(185);
      expect(input.context.beliefs.map((entry: { id: string }) => entry.id)).toEqual(
        library.beliefs.map((belief) => belief.id),
      );
      for (const belief of library.beliefs) {
        const record = input.context.beliefs.find(
          (entry: { id: string }) => entry.id === belief.id,
        );
        expect(record).toMatchObject(belief);
      }
      const done = fulfill(pending, receipt);
      expect(new TextEncoder().encode(JSON.stringify(done.saved)).byteLength).toBeLessThan(
        2 * 1024 * 1024,
      );
      expect(done.view.status).toBe('Completed');
      expect(done.view.pending).toBeNull();
      expect(done.view.outputs.matches).toMatchObject({
        type: 'list',
        value: { items: expect.any(Array) },
      });
      expect(
        done.view.items.filter((item) => item.effect.request.kind.startsWith('interaction.')),
      ).toHaveLength(1);
      const shown = done.view.items
        .filter((item) => item.effect.request.kind === 'content.show')
        .at(-1)!;
      const view = shown.effect.request.payload.view as ShowView;
      expect(view.panels[0].items).toHaveLength(1);
      expect(view.panels[0].items[0].label).toBe(
        library.beliefs.find((b) => b.id === 'P0001')!.statement,
      );
      expect(view.panels[0].items[0].fields.connection).toBe(reply[0].connection);
      expect(JSON.stringify(done.saved).length).toBeLessThan(8 * 1024 * 1024);
    },
  );
  it.each([
    { answer: 'My worth depends on being useful.', matches: true },
    { answer: 'I am unsure what it meant.', matches: false },
    { answer: '', matches: false },
  ])(
    'asks one neutral clarification and retries once with both answers: %j',
    async ({ answer, matches }) => {
      const description = 'I was eating chocolate and feeling a bit bad about myself.';
      let run = describeSituation(start(), description);
      run = fulfill(run, await fulfillModelEffect(run.view.pending!, async () => '[]'));
      expect(run.view.pending!.request.kind).toBe('agent.generate');
      expect(run.view.pending!.request.payload.contract).toMatchObject({ returns: 'text' });
      expect(run.view.pending!.request.payload.context).not.toHaveProperty('beliefs');
      expect(run.view.outputs).toEqual({});
      run = execute<PatternRun>({ operation: 'restore', source, saved: run.saved });
      const question = 'What were you telling yourself about eating the chocolate?';
      run = fulfill(run, await fulfillModelEffect(run.view.pending!, async () => question));
      expect(run.view.pending!.request.kind).toBe('interaction.form');
      expect(formBlocks(run.view.pending!)).toHaveLength(1);
      expect(formBlocks(run.view.pending!)[0]).toMatchObject({
        type: 'ask',
        id: 'meaning',
        required: false,
        prompt: question,
      });
      run = fulfill(run, { kind: 'form', value: { meaning: { type: 'text', value: answer } } });
      expect(run.view.pending!.request.kind).toBe('agent.generate');
      run = execute<PatternRun>({ operation: 'restore', source, saved: run.saved });
      const request = vi.fn(async () =>
        JSON.stringify(
          matches
            ? [
                {
                  belief: 'P0001',
                  basis: 'expressed',
                  unconfirmed_assumptions: [],
                  evidence: answer,
                  connection: 'Your clarification links worth to usefulness.',
                },
              ]
            : [],
        ),
      );
      const result = await fulfillModelEffect(run.view.pending!, request);
      const messages = request.mock.calls as unknown as [Array<{ content: string }>][];
      const input = JSON.parse(messages[0][0][1].content);
      expect(input.context.description.situation).toBe(description);
      expect(input.context.clarification.meaning).toBe(answer);
      expect(input.context.beliefs).toHaveLength(185);
      expect(JSON.stringify(input.context)).not.toContain(question);
      expect(new TextEncoder().encode(JSON.stringify(run.saved)).byteLength).toBeLessThan(
        2 * 1024 * 1024,
      );
      run = fulfill(run, result);
      expect(run.view.status).toBe('Completed');
      expect(run.view.pending).toBeNull();
      expect(run.view.outputs.matches).toMatchObject({
        type: 'list',
        value: { items: matches ? [expect.anything()] : [] },
      });
      expect(
        run.view.items.filter(({ effect }) => effect.request.kind.startsWith('interaction.')),
      ).toHaveLength(2);
      const shown = run.view.items
        .filter(({ effect }) => effect.request.kind === 'content.show')
        .at(-1)!;
      if (matches) {
        expect((shown.effect.request.payload.view as ShowView).panels[0].items[0].label).toBe(
          'My worth depends on how useful I am.',
        );
      } else {
        expect(shown.effect.request.payload.markdown).toContain(
          'No useful library connection emerged from what you shared.',
        );
      }
      expect(
        execute<PatternRun>({ operation: 'restore', source, saved: run.saved }).view.outputs,
      ).toEqual(run.view.outputs);
    },
  );
  it('rejects unknown references and surplus fields without advancing the pending run', async () => {
    const run = describeSituation(start(), 'I judge my worth by usefulness.');
    for (const reply of [
      [
        {
          belief: 'P0065',
          basis: 'certain',
          evidence: 'worth',
          connection: 'x',
          unconfirmed_assumptions: [],
        },
      ],
      [{ belief: 'made-up', evidence: 'worth', connection: 'x' }],
      [
        {
          belief: 'P0001',
          basis: 'expressed',
          unconfirmed_assumptions: [],
          evidence: 'worth',
          connection: 'x',
          statement: 'Invented replacement',
        },
      ],
    ]) {
      await expect(
        fulfillModelEffect(run.view.pending!, async () => JSON.stringify(reply)),
      ).rejects.toThrow();
    }
    expect(run.view.pending!.request.kind).toBe('agent.generate');
  });
  it('keeps a plausible library hypothesis and visibly preserves its unconfirmed premise', async () => {
    const run = describeSituation(
      start(),
      'I feel guilty about this exception and like I am letting my guard down.',
    );
    const assumptions = ['Allowing this exception is expected to weaken other standards too.'];
    const done = fulfill(
      run,
      await fulfillModelEffect(run.view.pending!, async () =>
        JSON.stringify([
          {
            belief: 'P0065',
            basis: 'hypothesis',
            evidence: 'letting my guard down',
            connection: 'This could connect an exception with a feared wider loss of control.',
            unconfirmed_assumptions: assumptions,
          },
        ]),
      ),
    );
    expect(done.view.status).toBe('Completed');
    const shown = done.view.items
      .filter(({ effect }) => effect.request.kind === 'content.show')
      .at(-1)!;
    const row = (shown.effect.request.payload.view as ShowView).panels[0].items[0];
    expect(row.label).toBe('If I relax one standard, all my standards will collapse.');
    expect(row.fields.basis).toBe('hypothesis');
    expect(row.fields.unconfirmed_assumptions).toBe(assumptions[0]);
  });
  it('revises the original description while retaining its resolved library', async () => {
    const original = start();
    let run = describeSituation(original, 'Original context');
    run = fulfill(run, await fulfillModelEffect(run.view.pending!, async () => '[]'));
    const reopened = execute<PatternRun>({
      operation: 'rewind',
      saved: run.saved,
      expected_revision: run.view.revision,
      run_id: original.view.pending!.run_id,
      effect_id: original.view.pending!.effect_id,
    });
    const changed = describeSituation(reopened, 'Revised description with additional context');
    const context = changed.view.pending!.request.payload.context as Record<string, unknown>;
    expect(JSON.stringify(context.description)).toContain('Revised description');
    expect(JSON.stringify(context.description)).not.toContain('Original context');
    expect(JSON.stringify(context.beliefs)).toContain('P0255');
    expect(changed.view.outputs).toEqual({});
  });
});
