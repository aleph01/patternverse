import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import { inspectSource } from './bridge';
import { imageDraft, editImageFields } from './image-fields';
import { startSourceRun, restoreSourceRun, serializeSourceRun } from '$lib/pattern-runtime/source';
import { worksheetSteps } from '$lib/pattern-run/view';
import { isPatternImage } from '$lib/pattern-run/image';
import { commandSnippets, attributeSuggestions } from './completion/catalog';
import { completions } from './completion';
import { newBlock } from './blocks';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
const source =
  ':language 1\n!image {\n  :url "https://example.com/image.png"\n  :alt "Three possible next steps."\n  <!-- Preserve this comment. -->\n  Follow **each branch**.\n}\nanswer = !ask {\nWhat stood out?\n}\n-> end';

describe('image authoring and browser execution', () => {
  it('edits alternatives and titles while preserving surrounding source and explicit empty alt', async () => {
    const statement = (await inspectSource(source)).structure!.source_statements!.find(
      (s) => s.kind === 'image',
    )!;
    const original = imageDraft(statement);
    const edited = editImageFields(source, statement, original, {
      ...original,
      alt: '',
      title: 'Options',
    });
    expect(edited).toContain(':alt ""');
    expect(edited).toContain(':title "Options"');
    expect(edited).toContain('<!-- Preserve this comment. -->');
    expect((await inspectSource(edited)).structure).toBeTruthy();
    expect(editImageFields(source, statement, original, original)).toBe(source);
  });
  it('runs and restores nonblocking images through the actual engine', async () => {
    const run = await startSourceRun(source);
    const effect = run.view.items[0].effect;
    expect(effect.request.kind).toBe('content.image');
    expect(effect.request.payload.image).toMatchObject({
      alt: 'Three possible next steps.',
      title: null,
    });
    expect(isPatternImage(effect.request.payload.image)).toBe(true);
    expect(run.view.pending?.request.kind).toBe('interaction.ask');
    expect(worksheetSteps(run.view)[0].number).toBe(0);
    expect((await restoreSourceRun(source, serializeSourceRun(run))).view.items).toEqual(
      run.view.items,
    );
  });
  it('offers source and block templates without binding suggestions inside guidance', async () => {
    expect(commandSnippets(false).some((c) => c.label === '!image')).toBe(true);
    expect(commandSnippets(true).some((c) => c.label === '!image')).toBe(false);
    expect(attributeSuggestions('image', false).map((c) => c.label)).toEqual([
      ':url',
      ':alt',
      ':title',
    ]);
    expect(
      (await inspectSource(':language 1\n' + newBlock('', 'image') + '\n-> end')).structure,
    ).toBeTruthy();
    const prose = '!image {\n:url "https://example.com/image.png"\n:alt "Image"\nFollow ';
    expect(completions(prose, prose.length).items).toEqual([]);
  });
  it('rejects malformed image payloads before rendering', () => {
    for (const value of [
      null,
      {},
      { url: 'javascript:alert(1)', alt: 'Image', title: null },
      { url: 'https://example.com/image.png', title: null },
    ])
      expect(isPatternImage(value)).toBe(false);
  });
});
