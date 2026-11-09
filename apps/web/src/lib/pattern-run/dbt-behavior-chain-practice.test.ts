// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseMarkdownEntity } from '@patternverse/compiler';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import type { PatternRun } from '$lib/pattern-runtime/types';
import type { Inspection } from '$lib/pattern-editor/types';
import { formBlocks, type FormAnswers } from './form';
import { findPatternGraphic, isPatternGraphic } from '$lib/illustrations/pattern-graphics';

const article = readFileSync(
  resolve(process.cwd(), '../../content/patterns/dbt-behavior-chain.md'),
  'utf8',
);
const parsed = parseMarkdownEntity(article, {
  sourceId: 'commons',
  sourcePath: 'patterns/dbt-behavior-chain.md',
});
const source = parsed.entity!.languagePracticeSource!;
const execute = <T>(request: Record<string, unknown>): T =>
  JSON.parse(editor(JSON.stringify(request))) as T;
const start = () =>
  execute<PatternRun>({ operation: 'start', source, root_id: 'chain-test', inputs: {} });
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
function choose(run: PatternRun, value: string) {
  expect(run.view.pending!.request.kind).toBe('interaction.choose');
  const options = run.view.pending!.request.payload.options as { value: string; label: string }[];
  expect(options.some((option) => option.value === value)).toBe(true);
  return reply(run, 'selected', value);
}
function form(run: PatternRun, entries: Record<string, string> = {}) {
  expect(run.view.pending!.request.kind).toBe('interaction.form');
  const answers: FormAnswers = {};
  for (const block of formBlocks(run.view.pending!)) {
    if (block.type === 'ask') {
      expect(block.required).toBe(false);
      answers[block.id] = { type: 'text', value: entries[block.id] ?? '' };
    } else if (block.type === 'select') {
      answers[block.id] = {
        type: 'choice',
        value:
          block.options.find((option) => option.value === entries[block.id]) ?? block.options[0],
      };
    }
  }
  return reply(run, 'form', answers);
}
function shows(run: PatternRun) {
  return run.view.items
    .filter((item) => item.effect.request.kind === 'content.show')
    .map((item) => JSON.stringify(item.effect.request.payload))
    .join('\n');
}
function chain(route = 'own', withLinks = false) {
  let run = choose(start(), route);
  run = form(run, route === 'own' ? { behavior: 'I closed the shared document.' } : {});
  run = form(run);
  run = form(run);
  if (withLinks) {
    run = choose(run, 'add');
    run = reply(run, 'text', 'Thought: I cannot handle another revision.');
    run = choose(run, 'add');
    run = reply(run, 'text', 'Gap: the exact order is uncertain.');
  }
  run = choose(run, 'finish');
  run = form(run, { immediate: 'The task was briefly out of sight.', later: 'Not known yet.' });
  return run;
}
function solutions(run: PatternRun, repair = 'no', rehearsal = 'skip') {
  run = form(run, { direction: 'continue', correction: 'The order remains uncertain.' });
  run = form(run, { cue: 'I reach for the close button', action: 'pause and save a note' });
  run = form(run);
  run = choose(run, repair);
  if (repair === 'yes') run = reply(run, 'text', 'Check whether a collaborator needs the file.');
  run = form(run, { rehearsal });
  if (rehearsal === 'try') run = reply(run, 'text', 'I said my alternative sentence silently.');
  return run;
}

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

describe('Behavior Chain and Solution Analysis practice', () => {
  it('has a DBT collection entry and an authored graphic matching its summary', () => {
    const collection = parseMarkdownEntity(
      readFileSync(resolve(process.cwd(), '../../content/collections/dbt.md'), 'utf8'),
      { sourceId: 'commons', sourcePath: 'collections/dbt.md' },
    );
    expect(collection.diagnostics).toEqual([]);
    if (collection.entity?.type !== 'collection') throw new Error('Expected the DBT collection');
    expect(collection.entity.items).toContain('dbt-behavior-chain');
    const graphic = findPatternGraphic('dbt-behavior-chain');
    expect(isPatternGraphic(graphic)).toBe(true);
    expect(graphic!.mechanism).toBe(parsed.entity!.summary);
  });

  it('compiles against the real runtime with optional disclosure and no model calls', () => {
    expect(parsed.diagnostics).toEqual([]);
    expect(execute<Inspection>({ operation: 'inspect', source }).diagnostics).toEqual([]);
    expect(source).not.toMatch(/!agent|!turn|!use/);
    if (parsed.entity?.type !== 'pattern') throw new Error('Expected the behavior chain pattern');
    expect(parsed.entity.verses).toContain('therapy');
  });

  it.each(['own', 'private', 'example'])(
    'completes the %s route with skipped personal fields',
    (route) => {
      let run = solutions(chain(route));
      run = form(run, { noticed: 'Nothing changed.', direction: 'continue' });
      run = form(run);
      expect(run.view.status).toBe('Completed');
      const content = shows(run);
      expect(content).toContain('Nothing changed.');
      expect(content).toContain('No repair identified.');
      expect(content).toContain('Rehearsal skipped.');
      expect(content).toContain('You can leave the reminder unfinished.');
      if (route === 'example') {
        expect(content).toContain('Your notes on the fictional example');
      } else {
        expect(content).not.toContain('Your notes on the fictional example');
        expect(content).not.toContain("You think, “They don't notice how much I'm doing.”");
      }
    },
  );

  it.each(['yes', 'no', 'unsure'])(
    'preserves links and the %s repair decision through a complete plan',
    (repair) => {
      let run = solutions(chain('own', true), repair, 'try');
      run = form(run, { noticed: "I'm not sure.", direction: 'continue' });
      run = form(run, {
        next: 'Practise before opening the document tomorrow.',
        cue: 'the impulse to close the document',
        action: 'saving one note before deciding',
      });
      expect(run.view.status).toBe('Completed');
      const content = shows(run);
      expect(content).toContain('Gap: the exact order is uncertain.');
      expect(content).toContain('I closed the shared document.');
      expect(content).toContain('I said my alternative sentence silently.');
      expect(content).toContain(
        'When I notice the impulse to close the document, I can try saving one note before deciding.',
      );
      expect(content).toContain(
        repair === 'yes'
          ? 'Check whether a collaborator needs the file.'
          : repair === 'no'
            ? 'No repair identified.'
            : 'Repair remains uncertain.',
      );
    },
  );

  it('can finish before inquiry or after the chain without inventing a plan', () => {
    const early = choose(start(), 'finish');
    expect(early.view.status).toBe('Completed');
    expect(shows(early)).toContain('There is no chain or plan to summarize.');
    const mapped = form(chain(), {
      direction: 'finish',
      correction: 'I need to check the timing.',
    });
    expect(mapped.view.status).toBe('Completed');
    expect(shows(mapped)).toContain('I need to check the timing.');
    expect(shows(mapped)).not.toContain('Your working account and possible plan');
  });

  it.each(['stop', 'uncomfortable'])(
    'finishes from reflection when the reader selects %s',
    (direction) => {
      const run = form(solutions(chain()), { direction, noticed: 'I want to leave this open.' });
      expect(run.view.status).toBe('Completed');
      expect(shows(run)).toContain('I want to leave this open.');
      expect(shows(run)).not.toContain('Your reminder');
      if (direction === 'uncomfortable')
        expect(shows(run)).toContain('notice your present surroundings');
    },
  );

  it('pauses and resumes the exact pending step, then accepts an unfinished reminder', () => {
    const run = chain('private', true);
    const paused = action(run, 'Pause');
    expect(paused.view.status).toBe('Paused');
    let resumed = action(paused, 'Resume');
    expect(resumed.view.pending!.effect_id).toBe(run.view.pending!.effect_id);
    resumed = solutions(resumed);
    resumed = form(resumed, { direction: 'continue' });
    resumed = form(resumed, { cue: 'jaw tension' });
    expect(resumed.view.status).toBe('Completed');
    expect(shows(resumed)).toContain('Reminder fragments you entered');
    expect(shows(resumed)).not.toContain('When I notice jaw tension, I can try');
  });
});
