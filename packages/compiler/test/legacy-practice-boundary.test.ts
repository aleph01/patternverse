import { describe, expect, it } from 'vitest';
import type { PracticeDefinition } from '@patternverse/schema';
import * as compiler from '../src/index.js';
import * as practiceApi from '../src/practice.js';
import * as legacy from '../src/legacy-practice.js';
import { markdown } from './helpers.js';

const practice: PracticeDefinition = {
  title: 'Legacy import',
  steps: [{ id: 'first', blocks: [{ id: 'text', type: 'markdown', content: 'Keep this.' }] }],
};
const header = 'id: legacy-import\ntype: pattern\ntitle: Legacy import\nstatus: draft';
const options = { sourceId: 'personal', sourcePath: 'patterns/legacy-import.md' };
const fence = (yaml: string) => `\`\`\`patternverse-practice\n${yaml}\n\`\`\``;

describe('import-only legacy practice boundary', () => {
  it('keeps old public exports as aliases of the single implementation', () => {
    for (const name of [
      'legacyPracticeSource',
      'parsePracticeFromBody',
      'serializePracticeDefinition',
      'upsertPracticeFence',
    ] as const) {
      expect(compiler[name]).toBe(legacy[name]);
      expect(practiceApi[name]).toBe(legacy[name]);
    }
  });

  it('uses the same validated data for corpus conversion and editor import', () => {
    const yaml = legacy.serializePracticeDefinition(practice);
    const body = `Article.\n\n${fence(yaml)}`;
    const imported = practiceApi.parsePracticeFromBody(body);
    const compiled = compiler.parseMarkdownEntity(markdown(header, body), options);
    expect(imported).toEqual({ articleBody: 'Article.', practice, errors: [] });
    expect(compiled.diagnostics).toEqual([]);
    expect(compiled.entity?.practice).toEqual(imported.practice);
    expect(compiled.entity?.languagePracticeSource).toBe(legacy.legacyPracticeSource(practice));
    expect(compiled.entity?.body.trim()).toBe(body);
  });

  it.each([
    ['broken syntax', 'title: [broken', 'yaml'],
    ['missing fields', 'title: Missing', 'schema'],
    ['unknown fields', legacy.serializePracticeDefinition(practice) + '\ninvented: true', 'schema'],
    ['empty steps', 'title: Empty\nsteps: []', 'schema'],
  ])('preserves rejection and diagnostic context for %s', (_name, yaml, kind) => {
    const result = legacy.parseLegacyPracticeYaml(yaml);
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Invalid legacy data was accepted.');
    expect(result.kind).toBe(kind);
    const body = `Keep this article.\n\n${fence(yaml)}`;
    const imported = practiceApi.parsePracticeFromBody(body);
    const compiled = compiler.parseMarkdownEntity(markdown(header, body), options);
    expect(imported.articleBody).toBe('Keep this article.');
    expect(imported.practice).toBeUndefined();
    expect(imported.errors.length).toBeGreaterThan(0);
    // The reader preserves malformed authored content with errors; it must not
    // manufacture an executable definition or silently discard the original.
    expect(compiled.entity?.body.trim()).toBe(body);
    expect(compiled.entity?.practice).toBeUndefined();
    expect(compiled.entity?.languagePracticeSource).toBeUndefined();
    expect(compiled.diagnostics.length).toBeGreaterThan(0);
    expect(
      compiled.diagnostics.every((d) => d.file === options.sourcePath && d.line !== undefined),
    ).toBe(true);
    if (result.kind === 'yaml') {
      // Editable fence offsets include the trailing newline; Remark's code
      // value does not. Preserve each caller's existing YAML error location.
      const editableResult = legacy.parseLegacyPracticeYaml(yaml + '\n');
      if (editableResult.success || editableResult.kind !== 'yaml')
        throw new Error('Malformed editable YAML was accepted.');
      expect(imported.errors).toEqual([editableResult.message]);
      expect(compiled.diagnostics[0]?.message).toBe(result.message);
    } else {
      expect(imported.errors).toEqual(
        result.error.issues.map(
          (issue) => `${issue.path.length ? `${issue.path.join('.')}: ` : ''}${issue.message}`,
        ),
      );
      expect(compiled.diagnostics).toEqual(
        compiler
          .diagnosticsFromZodError(result.error, { file: options.sourcePath, prefix: 'practice' })
          .map((diagnostic) => ({ ...diagnostic, line: compiled.diagnostics[0]?.line })),
      );
    }
  });

  it.each(['\n', '\r\n'])(
    'keeps article slicing and repeated parsing stable with %j',
    (newline) => {
      for (const format of ['patternverse-practice', 'patternverse-language']) {
        const payload =
          format === 'patternverse-practice'
            ? legacy.serializePracticeDefinition(practice)
            : ':language 1\n-> end';
        const block = `\`\`\`${format}\n${payload}\n\`\`\``.replaceAll('\n', newline);
        const parse =
          format === 'patternverse-practice'
            ? practiceApi.parsePracticeFromBody
            : practiceApi.parseLanguagePracticeFromBody;
        for (const [body, article] of [
          [block, ''],
          [`${block}${newline}${newline}After.`, 'After.'],
          [`Before.${newline}${newline}${block}`, 'Before.'],
          [
            `Before.${newline}${newline}${block}${newline}${newline}After.`,
            `Before.${newline}${newline}After.`,
          ],
        ]) {
          expect(parse(body!).articleBody).toBe(article);
          expect(parse(body!).errors).toEqual([]);
          expect(parse(body!).articleBody).toBe(article);
        }
      }
    },
  );

  it('retains duplicate-fence behavior instead of silently choosing a valid replacement', () => {
    const body = practiceApi.upsertPracticeFence('Article.', practice);
    const duplicate = body + '\n\n' + fence(legacy.serializePracticeDefinition(practice));
    const imported = practiceApi.parsePracticeFromBody(duplicate);
    expect(imported.practice).toBeUndefined();
    expect(imported.articleBody).toContain('patternverse-practice');
    expect(imported.errors).toEqual([
      'A Practice may contain at most one patternverse-practice block.',
    ]);
    expect(
      compiler.parseMarkdownEntity(markdown(header, duplicate), options).diagnostics,
    ).toContainEqual(expect.objectContaining({ code: 'multiple-practice-blocks' }));
  });
});
