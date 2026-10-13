import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { inspectSource } from './bridge';
import { editVideoFields, videoDraft } from './video-fields';
import { startSourceRun, restoreSourceRun, serializeSourceRun } from '$lib/pattern-runtime/source';
import { commandSnippets, attributeSuggestions } from './completion/catalog';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

const source =
  ':language 1\n!video {\n  :url "https://youtu.be/M7lc1UVf-VE"\n  :start 10\n  :end "0:30"\n  <!-- Preserve this comment. -->\n  Watch this excerpt.\n}\nanswer = !ask {\nWhat stood out?\n}\n-> end';

describe('video authoring and browser engine', () => {
  it('edits selected options without rewriting comments or untouched timestamp styles', async () => {
    const structure = (await inspectSource(source)).structure!;
    const statement = structure.source_statements!.find((s) => s.kind === 'video')!;
    const original = videoDraft(statement);
    const edited = editVideoFields(source, statement, original, {
      ...original,
      end: '0:45',
      title: 'Introduction',
      muted: true,
    });
    expect(edited).toContain(':start 10');
    expect(edited).toContain('<!-- Preserve this comment. -->');
    expect(edited).toContain(':end "0:45"');
    expect(edited).toContain(':muted true');
    expect((await inspectSource(edited)).structure).toBeTruthy();
    expect(editVideoFields(source, statement, original, original)).toBe(source);
  });
  it('runs and restores video content through the actual browser engine', async () => {
    const run = await startSourceRun(source);
    expect(run.view.items[0].effect.request.kind).toBe('content.video');
    expect(run.view.items[0].effect.request.payload.video).toMatchObject({
      provider: 'youtube',
      start_seconds: 10,
      end_seconds: 30,
    });
    expect(run.view.pending?.request.kind).toBe('interaction.ask');
    const restored = await restoreSourceRun(source, serializeSourceRun(run));
    expect(restored.view.items).toEqual(run.view.items);
  });
  it('offers video commands only without a binding and completes their attributes', () => {
    expect(commandSnippets(false).some((c) => c.label === '!video')).toBe(true);
    expect(commandSnippets(true).some((c) => c.label === '!video')).toBe(false);
    expect(attributeSuggestions('video', false).map((c) => c.label)).toEqual([
      ':url',
      ':title',
      ':start',
      ':end',
      ':autoplay',
      ':muted',
      ':loop',
      ':captions',
    ]);
  });
});
