// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { emptyBearingsNotebook } from '@patternverse/workspace';
import {
  aiPrefix,
  aiSources,
  aiMessages,
  parseAiPreferences,
  parsePrompts,
  parseAiReply,
  insertAiComment,
  undoAiComment,
} from './ai';
import { updateCell } from './notebook';
import { renderMarkdownPreview } from '$lib/client/markdown-preview';
const doc = {
  ...emptyBearingsNotebook('chapter'),
  chapters: [
    {
      id: 'chapter',
      title: 'Beginning',
      collapsed: false,
      cells: [
        { id: 'root', kind: 'answer' as const, text: 'I want creative work.' },
        { id: 'child', parentId: 'root', kind: 'note' as const, text: 'Try mentoring.' },
        { id: 'target', parentId: 'root', kind: 'answer' as const, text: '' },
        { id: 'other', kind: 'answer' as const, text: 'An unrelated branch.' },
      ],
    },
  ],
};
describe('Bearings AI input and private context', () => {
  it('includes the branch exercise and the questions attached to answer cells', () => {
    const root = doc.chapters[0]!.cells[0]!;
    const sources = aiSources(
      {
        ...doc,
        chapters: [
          {
            ...doc.chapters[0]!,
            cells: [
              {
                ...root,
                kind: 'pattern',
                text: '',
                pattern: {
                  sourceId: 'commons',
                  entityId: 'decision',
                  title: 'Decision',
                  summary: 'Clarify the choice',
                },
                practice: {
                  ref: { sourceId: 'commons', entityId: 'exercise' },
                  title: 'Define the decision',
                  source: 'Ask which options matter.',
                  status: 'in-progress',
                },
              },
              {
                id: 'answer',
                parentId: 'root',
                kind: 'answer',
                prompt: 'What matters?',
                text: 'Time to create.',
              },
            ],
          },
        ],
      },
      'answer',
      'branch',
    );
    expect(sources.map((source) => source.id)).toEqual(['root', 'answer']);
    expect(sources[0]!.text).toContain('Ask which options matter.');
    expect(sources[1]!.text).toContain('What matters?');
  });
  it('recognizes only complete tilde prefixes', () => {
    expect(['~', '~+', '~++'].map(aiPrefix)).toEqual(['cell', 'branch', 'situation']);
    for (const value of ['~~', '~+++', 'text ~', '~\n', ' ~', ''])
      expect(aiPrefix(value)).toBeNull();
  });
  it('selects cell, branch or situation text without reaching outside the document', () => {
    expect(aiSources(doc, 'target', 'cell')).toEqual([]);
    expect(aiSources(doc, 'child', 'cell').map((x) => x.id)).toEqual(['child']);
    expect(aiSources(doc, 'target', 'branch').map((x) => x.id)).toEqual(['root', 'child']);
    expect(aiSources(doc, 'target', 'situation').map((x) => x.id)).toEqual([
      'root',
      'child',
      'other',
    ]);
  });
  it('validates saved prompts without losing malformed records silently', () => {
    const prompt = { id: 'p', name: 'Reflection', body: 'Help me reflect.', pinned: true };
    expect(parsePrompts(JSON.stringify([prompt]))).toEqual([prompt]);
    expect(() => parsePrompts(JSON.stringify([prompt, prompt]))).toThrow();
    expect(() => parsePrompts('bad')).toThrow();
    expect(() => parsePrompts(JSON.stringify([{ ...prompt, body: '' }]))).toThrow();
    expect(parsePrompts(null)).toEqual([]);
    expect(
      parseAiPreferences('{"enabled":false,"style":"Ask one question","model":"my/model"}'),
    ).toEqual({ enabled: false, style: 'Ask one question', model: 'my/model' });
  });
  it('bounds context and validates source references before accepting a reply', () => {
    const sources = aiSources(doc, 'target', 'branch');
    expect(JSON.parse(aiMessages('Help', sources, 'Concise')[1].content).notes).toHaveLength(2);
    expect(parseAiReply('{"text":"Try mentoring.","sourceIds":["child"]}', sources)).toEqual({
      text: 'Try mentoring.',
      sourceIds: ['child'],
    });
    expect(() => parseAiReply('{"text":"Invented","sourceIds":["unknown"]}', sources)).toThrow();
    expect(() =>
      aiMessages('Help', [{ ...sources[0]!, text: 'x'.repeat(64001) }], 'Concise'),
    ).toThrow('too long');
  });
  it('inserts accepted replies as comments and never undoes later user edits', () => {
    const next = insertAiComment(doc, 'target', 'An editable suggestion.', 'reply');
    expect(next.chapters[0]!.cells.find((x) => x.id === 'reply')).toEqual({
      id: 'reply',
      kind: 'note',
      text: 'An editable suggestion.',
      parentId: 'root',
    });
    expect(
      undoAiComment(next, 'reply', 'An editable suggestion.')!.chapters[0]!.cells,
    ).toHaveLength(4);
    expect(
      undoAiComment(
        updateCell(next, 'reply', { text: 'My own edit' }),
        'reply',
        'An editable suggestion.',
      ),
    ).toBeNull();
  });
  it('keeps tildes literal in notebook previews without changing article Markdown', async () => {
    expect(await renderMarkdownPreview('~~literal~~ **bold**', { strikethrough: false })).toContain(
      '~~literal~~ <strong>bold</strong>',
    );
    expect(await renderMarkdownPreview('~~article~~')).toContain('<del>article</del>');
  });
});
