// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseMarkdownEntity } from '@patternverse/compiler';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import type { PatternRun, PatternEffect } from '$lib/pattern-runtime/types';
import type { Inspection } from '$lib/pattern-editor/types';
import { findPatternGraphic, isPatternGraphic } from '$lib/illustrations/pattern-graphics';
import { formBlocks, type FormAnswers } from './form';

const slugs = [
  'stop',
  'check-the-facts',
  'dear-man',
  'wise-mind',
  'cope-ahead',
  'opposite-action',
  'self-soothe',
  'identify-describe-emotions',
  'pros-and-cons',
  'validation',
  'radical-acceptance',
] as const;
type Slug = (typeof slugs)[number];
const root = resolve(process.cwd(), '../..');
const records = Object.fromEntries(
  slugs.map((slug) => {
    const article = readFileSync(resolve(root, `content/patterns/dbt-${slug}.md`), 'utf8');
    const parsed = parseMarkdownEntity(article, {
      sourceId: 'commons',
      sourcePath: `patterns/dbt-${slug}.md`,
    });
    return [slug, { article, parsed, source: parsed.entity!.languagePracticeSource! }];
  }),
);
const execute = <T>(request: Record<string, unknown>): T =>
  JSON.parse(editor(JSON.stringify(request))) as T;
const start = (slug: Slug) =>
  execute<PatternRun>({
    operation: 'start',
    source: records[slug].source,
    root_id: `dbt-${slug}-test`,
    inputs: {},
  });
function action(run: PatternRun, event: unknown) {
  return execute<PatternRun>({
    operation: 'apply',
    saved: run.saved,
    expected_revision: run.view.revision,
    command: { run_id: run.view.root_id, event },
  });
}
function reply(run: PatternRun, kind: string, value: unknown) {
  return action(run, {
    Fulfill: { effect_id: run.view.pending!.effect_id, result: { kind, value } },
  });
}
type Policy = {
  route?: 'own' | 'private' | 'example' | 'finish';
  checkpoint?: 'continue' | 'finish';
  reflection?: 'continue' | 'finish' | 'uncomfortable';
  timed?: boolean;
  sense?: 'sight' | 'hearing' | 'smell' | 'taste' | 'touch' | 'less';
  sensoryFit?: 'comfort' | 'neutral' | 'unpleasant' | 'unsure';
  secondTrial?: boolean;
  oppositeFit?: 'appropriate' | 'helpful' | 'unsafe' | 'unsure';
  trial?: 'now' | 'rehearse' | 'later';
  acceptanceFit?: 'manageable' | 'uncertain' | 'unsafe';
  factsFit?: 'fits' | 'partly' | 'not_fit' | 'unsure';
  fearedOutcome?: 'brief' | 'skip';
  rehearsal?: 'image' | 'words' | 'skip';
  validationMode?: 'self' | 'other';
  wording?: 'fits' | 'revise' | 'unsure';
  objective?: 'request' | 'refusal';
  skipActivities?: boolean;
  answers?: Record<string, string>;
};
function selection(effect: PatternEffect, policy: Policy) {
  const options = effect.request.payload.options as { value: string; label: string }[];
  const ids = options.map((option) => option.value);
  const prompt = String(effect.request.payload.prompt);
  let selected: string;
  if (ids.includes('private')) selected = policy.route ?? 'own';
  else if (ids.includes('uncomfortable')) selected = policy.reflection ?? 'continue';
  else if (ids.includes('continue') && ids.includes('finish'))
    selected = policy.checkpoint ?? 'continue';
  else if (ids.includes('timed')) selected = policy.timed ? 'timed' : 'untimed';
  else if (ids.includes('sight')) selected = policy.sense ?? 'sight';
  else if (ids.includes('comfort')) selected = policy.sensoryFit ?? 'neutral';
  else if (ids.includes('appropriate')) selected = policy.oppositeFit ?? 'appropriate';
  else if (ids.includes('manageable')) selected = policy.acceptanceFit ?? 'manageable';
  else if (ids.includes('partly')) selected = policy.factsFit ?? 'unsure';
  else if (ids.includes('brief')) selected = policy.fearedOutcome ?? 'skip';
  else if (ids.includes('image')) selected = policy.rehearsal ?? 'words';
  else if (ids.includes('other')) selected = policy.validationMode ?? 'self';
  else if (ids.includes('revise')) selected = policy.wording ?? 'fits';
  else if (ids.includes('refusal')) selected = policy.objective ?? 'request';
  else if (ids.includes('now')) selected = policy.trial ?? 'later';
  else if (prompt.includes('one more sensory')) selected = policy.secondTrial ? 'try' : 'skip';
  else if (ids.includes('try') && ids.includes('skip'))
    selected = policy.skipActivities ? 'skip' : 'try';
  else throw new Error(`Unexpected choice in DBT practice: ${prompt}`);
  expect(ids, prompt).toContain(selected);
  return selected;
}
function advance(run: PatternRun, policy: Policy) {
  const pending = run.view.pending!;
  switch (pending.request.kind) {
    case 'interaction.choose':
      return reply(run, 'selected', selection(pending, policy));
    case 'interaction.ask':
      return reply(run, 'text', policy.answers?.standalone ?? '');
    case 'interaction.form': {
      const values: FormAnswers = {};
      for (const block of formBlocks(pending)) {
        if (block.type === 'show') continue;
        expect(block.type).toBe('ask');
        if (block.type !== 'ask') throw new Error('Unexpected form field');
        expect(block.required, block.prompt).toBe(false);
        values[block.id] = { type: 'text', value: policy.answers?.[block.id] ?? '' };
      }
      return reply(run, 'form', values);
    }
    case 'interaction.timer': {
      const timer = pending.request.payload.timer as { duration_seconds: number };
      return reply(run, 'timer', {
        duration_seconds: timer.duration_seconds,
        elapsed_seconds: timer.duration_seconds,
        completed: true,
      });
    }
    default:
      throw new Error(`Unexpected effect, including any model request: ${pending.request.kind}`);
  }
}
function drive(slug: Slug, policy: Policy = {}, until?: (run: PatternRun) => boolean) {
  let run = start(slug);
  for (let step = 0; step < 100 && run.view.pending; step++) {
    if (until?.(run)) return run;
    run = advance(run, policy);
  }
  expect(run.view.status).toBe('Completed');
  return run;
}
const displays = (run: PatternRun) =>
  run.view.items
    .filter((item) => item.effect.request.kind === 'content.show')
    .map((item) => String(item.effect.request.payload.markdown ?? ''));
const summary = (run: PatternRun) =>
  displays(run).findLast((text) => text.startsWith('You took time to consider the practice.'))!;

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

describe('DBT skills collection', () => {
  it('has twelve published entries, all with practices and deliberate matching graphics', () => {
    const collection = parseMarkdownEntity(
      readFileSync(resolve(root, 'content/collections/dbt.md'), 'utf8'),
      { sourceId: 'commons', sourcePath: 'collections/dbt.md' },
    );
    expect(collection.diagnostics).toEqual([]);
    if (collection.entity?.type !== 'collection') throw new Error('Expected DBT collection');
    expect(collection.entity.items).toHaveLength(12);
    expect(new Set(collection.entity.items).size).toBe(12);
    for (const slug of slugs) {
      const { article, parsed, source } = records[slug];
      expect(collection.entity.items).toContain(`dbt-${slug}`);
      expect(parsed.diagnostics, slug).toEqual([]);
      if (parsed.entity?.type !== 'pattern') throw new Error('Expected pattern');
      expect(parsed.entity.status).toBe('published');
      expect(parsed.entity.verses).toContain('therapy');
      expect(source).not.toMatch(/!agent|!turn|!use/);
      expect(execute<Inspection>({ operation: 'inspect', source }).diagnostics, slug).toEqual([]);
      const graphic = findPatternGraphic(`dbt-${slug}`);
      expect(isPatternGraphic(graphic), slug).toBe(true);
      expect(graphic!.mechanism).toBe(parsed.entity.summary);
      const body = article.split('---', 3)[2].split('## Sources')[0];
      const words = body.trim().split(/\s+/).length;
      expect(words, slug).toBeGreaterThanOrEqual(800);
      expect(words, slug).toBeLessThanOrEqual(1200);
      for (const heading of [
        'A familiar moment',
        'Understand the skill',
        'When to use it',
        'How to practice',
        'See it in action',
        'Try it yourself',
        'When it feels difficult',
        'Bring it into daily life',
      ]) {
        expect(body, slug).toContain(`## ${heading}`);
      }
    }
  });

  for (const route of ['own', 'private', 'example'] as const) {
    it.each(slugs)(
      'completes %s using the ' + route + ' route without personal disclosure',
      (slug) => {
        const run = drive(slug, { route });
        expect(summary(run)).toBeDefined();
        expect(displays(run).join('\n')).toContain('Blank entries remain unreported');
      },
    );
  }

  it.each(slugs)('can finish %s before inquiry and at the review point', (slug) => {
    const before = drive(slug, { route: 'finish' });
    expect(displays(before).join('\n')).toContain('There are no personal responses or outcomes');
    const atReview = drive(slug, { checkpoint: 'finish' });
    expect(displays(atReview).join('\n')).toContain('Your entered notes are above.');
    expect(summary(atReview)).toBeUndefined();
  });

  it.each(['stop', 'validation', 'self-soothe'] as const)(
    'preserves a reader’s wish to finish or stop %s after reflection',
    (slug) => {
      for (const reflection of ['finish', 'uncomfortable'] as const) {
        const run = drive(slug, { reflection, answers: { noticed: 'Nothing changed.' } });
        const text = displays(run).join('\n');
        expect(text).toContain('Nothing changed.');
        expect(summary(run)).toBeUndefined();
        expect(text).not.toContain('**Your reminder**');
        if (reflection === 'uncomfortable')
          expect(text).toContain('notice your present surroundings');
      }
    },
  );

  it.each(['helpful', 'unsafe', 'unsure'] as const)(
    'redirects Opposite Action when the assessment is %s',
    (oppositeFit) => {
      const run = drive('opposite-action', { oppositeFit });
      const text = displays(run).join('\n');
      expect(text).toContain('No opposite action or improvement is assumed.');
      expect(summary(run)).toBeUndefined();
      expect(
        run.view.items.some(
          (item) => item.effect.request.payload.title === 'C. Choose a concrete opposite action',
        ),
      ).toBe(false);
    },
  );

  it.each(['uncertain', 'unsafe'] as const)(
    'does not request acceptance of a fact assessed as %s',
    (acceptanceFit) => {
      const run = drive('radical-acceptance', { acceptanceFit });
      expect(summary(run)).toBeUndefined();
      expect(displays(run).join('\n')).not.toContain('**Your reminder**');
    },
  );

  it.each(['sight', 'hearing', 'smell', 'taste', 'touch', 'less'] as const)(
    'guides the %s sensory activity and permits a second trial after an unpleasant one',
    (sense) => {
      const run = drive('self-soothe', { sense, secondTrial: true, sensoryFit: 'unpleasant' });
      const text = displays(run).join('\n');
      expect(text).toContain('Stop that sensory experiment and set it aside.');
      expect(text).toContain('**Second sensory trial**');
      expect(summary(run)).toContain('Unpleasant or too much');
      expect(summary(run)).not.toContain('Your notes on the fictional example');
    },
  );

  it.each(['image', 'words', 'skip'] as const)(
    'supports Cope Ahead rehearsal mode %s',
    (rehearsal) => {
      const run = drive('cope-ahead', { rehearsal });
      expect(summary(run)).toContain('Rehearsal mode selected:');
      if (rehearsal === 'skip') expect(summary(run)).toContain('Rehearsal skipped');
      else expect(summary(run)).toContain('Rehearsal report:');
    },
  );

  it.each(['wise-mind', 'cope-ahead', 'self-soothe', 'radical-acceptance'] as const)(
    'keeps the %s timed activity optional and supports pause and resume while pending',
    (slug) => {
      const policy = { timed: true };
      let run = drive(
        slug,
        policy,
        (current) => current.view.pending?.request.kind === 'interaction.timer',
      );
      const pendingId = run.view.pending!.effect_id;
      const timer = run.view.pending!.request.payload.timer as { duration_seconds: number };
      expect(() =>
        reply(run, 'timer', {
          duration_seconds: timer.duration_seconds,
          elapsed_seconds: 0,
          completed: false,
        }),
      ).toThrow();
      run = action(run, 'Pause');
      expect(run.view.status).toBe('Paused');
      run = action(run, 'Resume');
      expect(run.view.pending!.effect_id).toBe(pendingId);
      for (let steps = 0; steps < 100 && run.view.pending; steps++) run = advance(run, policy);
      expect(run.view.status).toBe('Completed');
    },
  );

  it('retains participant wording in a DEAR MAN refusal script without assuming it was sent', () => {
    const run = drive('dear-man', {
      objective: 'refusal',
      answers: {
        words: 'I cannot cover Saturday.',
        sentence: 'Saturday is unavailable.',
        noticed: 'Still nervous.',
      },
    });
    expect(summary(run)).toContain('I cannot cover Saturday.');
    expect(summary(run)).toContain('Saturday is unavailable.');
    expect(summary(run)).toContain('Still nervous.');
    expect(summary(run)).toContain('Nothing has been sent');
  });

  it.each(['fits', 'partly', 'not_fit', 'unsure'] as const)(
    'preserves the %s fact assessment and skips feared-outcome disclosure',
    (factsFit) => {
      const run = drive('check-the-facts', {
        factsFit,
        fearedOutcome: 'skip',
        answers: {
          revised: 'The subject of the meeting remains unknown.',
          noticed: 'Nothing changed.',
        },
      });
      expect(summary(run)).toContain('The subject of the meeting remains unknown.');
      expect(summary(run)).toContain('Nothing changed.');
      expect(summary(run)).not.toContain('I’m going to be dismissed.');
    },
  );

  it('allows brief feared-outcome work and leaves the response as participant data', () => {
    const run = drive('check-the-facts', {
      fearedOutcome: 'brief',
      answers: { outcome: 'Difficult feedback', support: 'Ask for specifics and seek advice.' },
    });
    expect(summary(run)).toContain('Difficult feedback');
    expect(summary(run)).toContain('Ask for specifics and seek advice.');
  });

  it.each(['fits', 'revise', 'unsure'] as const)(
    'supports the %s validation wording decision without inventing a response from the other person',
    (wording) => {
      const run = drive('validation', {
        validationMode: 'other',
        wording,
        answers: {
          statement: 'You said you felt let down.',
          standalone: 'The lack of warning matters.',
          question: 'Have I understood?',
        },
      });
      expect(summary(run)).toContain(
        wording === 'revise' ? 'The lack of warning matters.' : 'You said you felt let down.',
      );
      expect(summary(run)).toContain('Have I understood?');
      expect(summary(run)).not.toContain('They confirmed');
    },
  );

  it('keeps reminder fragments unfinished and does not reinterpret literal entered text', () => {
    const run = drive('stop', {
      answers: {
        cue: 'the urge to send',
        choice: '{{not_a_binding}}\n:case fake\nI will wait.',
        noticed: 'I’m not sure.',
      },
    });
    expect(summary(run)).toContain('{{not_a_binding}}');
    expect(displays(run).at(-1)).toContain('Your reminder fragments');
    expect(displays(run).at(-1)).not.toContain('When I notice the urge to send, I can try');
  });
});
