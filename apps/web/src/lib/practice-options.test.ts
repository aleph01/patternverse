// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { compileCorpus, parseMarkdownEntity } from '@patternverse/compiler';
import { patternPracticeOptions } from './practice-options';

const source = ':language 1\nanswer = !ask {\nQuestion?\n}\n-> end';
const document = (header: string, body: string) =>
  parseMarkdownEntity(`---\n${header}\nstatus: published\n---\n\n${body}`, {
    sourceId: 'commons',
    sourcePath: 'fixture.md',
  }).entity!;

describe('all practices for a pattern', () => {
  it('includes the embedded exercise and every linked practice with its own identity and source', () => {
    const entities = [
      document(
        'id: decision\ntype: pattern\ntitle: Define the decision',
        `Article.\n\n\`\`\`patternverse-language\n${source}\n\`\`\``,
      ),
      document(
        'id: quick-check\ntype: practice\ntitle: Quick check\nimplements: [decision]\nduration_minutes: 2',
        `\`\`\`patternverse-language\n${source.replace('Question?', 'Quick question?')}\n\`\`\``,
      ),
      document(
        'id: brief\ntype: practice\ntitle: Decision brief\nimplements: [decision]',
        'An exercise described in prose.',
      ),
    ];
    const corpus = compileCorpus(entities, [{ id: 'commons', name: 'Commons', readonly: true }]);
    const pattern = corpus.entities.find((entity) => entity.id === 'decision')!;
    const related = pattern.implementedByPractices.map((ref) =>
      corpus.entities.find((entity) => entity.id === ref.entityId)!,
    );
    const options = patternPracticeOptions(pattern, related);
    expect(options.map((option) => option.ref.entityId)).toEqual([
      'decision',
      'brief',
      'quick-check',
    ]);
    expect(options[0].runPath).toBe('/pattern/decision/run');
    expect(options[1].runPath).toBeUndefined();
    expect(options[2]).toMatchObject({
      runPath: '/practice/quick-check/run',
      durationMinutes: 2,
      worksheetDefinition: { source: source.replace('Question?', 'Quick question?') },
    });
  });
});
