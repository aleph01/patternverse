import { describe, expect, it } from 'vitest';
import {
  parseMarkdownEntity,
  parseLanguagePracticeFromBody,
  upsertLanguagePracticeFence,
} from '../src/index.js';
import { markdown } from './helpers.js';

describe('portable Pattern Language practice', () => {
  const source = ':language 1\nanswer = !ask {\nQuestion?\n}\n-> end';
  it('preserves article and source through insertion, replacement and removal', () => {
    const article = '# Article\n\n\nKeep  spacing.';
    const body = upsertLanguagePracticeFence(article, source);
    expect(parseLanguagePracticeFromBody(body)).toEqual({
      articleBody: article,
      source,
      errors: [],
    });
    expect(
      parseLanguagePracticeFromBody(upsertLanguagePracticeFence(body, source + '\n')).source,
    ).toBe(source);
    expect(upsertLanguagePracticeFence(body, undefined)).toBe(article);
    expect(parseLanguagePracticeFromBody(body + '\n\n' + body).errors).toHaveLength(1);
    expect(parseLanguagePracticeFromBody('```patternverse-language\n\n```').errors).toHaveLength(1);
  });
  it('attaches source only to Pattern or Practice records and prevents mixed duplicates', () => {
    const header = 'id: language-practice\ntype: pattern\ntitle: Language practice\nstatus: draft';
    const options = { sourceId: 'personal', sourcePath: 'patterns/language-practice.md' };
    const body = upsertLanguagePracticeFence('Article.', source);
    expect(
      parseMarkdownEntity(markdown(header, body), options).entity?.languagePracticeSource,
    ).toBe(source);
    expect(
      parseMarkdownEntity(markdown(header.replace('type: pattern', 'type: concept'), body), options)
        .diagnostics,
    ).toContainEqual(expect.objectContaining({ code: 'practice-block-on-non-practice' }));
    expect(
      parseMarkdownEntity(
        markdown(header, body + '\n\n```patternverse-practice\ntitle: Other\nsteps: []\n```'),
        options,
      ).diagnostics,
    ).toContainEqual(expect.objectContaining({ code: 'multiple-practice-blocks' }));
  });
});
