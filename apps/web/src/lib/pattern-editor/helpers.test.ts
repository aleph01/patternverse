import { describe, expect, it } from 'vitest';
import { highlightSource } from './highlight';
import { sourceSelection } from './types';
import { starterPractice, legacyPracticeSource } from './source';

describe('practice source helpers', () => {
  it('keeps every source character in highlighting, including markup-like text', () => {
    const source =
      ':language 1\nanswer = !ask {\n<script>Café 🙂</script>\n}\n!show {{answer}}\n-> end';
    const tokens = highlightSource(source);
    expect(tokens.map((token) => token.text).join('')).toBe(source);
    expect(tokens.some((token) => token.kind === 'directive')).toBe(true);
  });
  it('maps diagnostic byte offsets across accents and emoji to DOM offsets', () => {
    const prefix = '# Café 🙂\n';
    const start = new TextEncoder().encode(prefix).length;
    expect(sourceSelection(prefix + 'invalid', { start, end: start + 7 })).toEqual([
      prefix.length,
      prefix.length + 7,
    ]);
  });
  it('creates canonical source and explicitly converts legacy timers and inputs', () => {
    expect(starterPractice('A "title"')).toContain(':title "A \\"title\\""');
    const source = legacyPracticeSource({
      title: 'Legacy',
      steps: [
        {
          id: 'step',
          blocks: [
            {
              id: 'text',
              type: 'text-input',
              label: 'What next?',
              multiline: true,
              required: true,
            },
            {
              id: 'time',
              type: 'timer',
              defaultDurationSeconds: 60,
              userAdjustable: true,
              persistent: true,
            },
          ],
        },
      ],
    });
    expect(source).toContain('step_step = !form');
    expect(source).toContain('!ask text');
    expect(source).toContain(':required true');
    expect(source).toContain(':persistent true');
    expect(source).toContain(':duration 60');
    expect(source).toContain(':blocking false');
    expect(source).toContain(':max 86400');
  });
});
