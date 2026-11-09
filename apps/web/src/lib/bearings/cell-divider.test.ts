import { describe, expect, it } from 'vitest';
import { cellDivider } from './cell-divider';

describe('splitting writing at a Markdown divider', () => {
  it('removes the divider line while retaining writing and intentional whitespace on both sides', () => {
    const text = 'Opening  \n\n---\n\nClosing  ';
    expect(cellDivider(text, text.indexOf('---') + 3)).toEqual({
      before: 'Opening  \n',
      after: '\nClosing  ',
    });
    expect(cellDivider('Opening\n---', 11)).toEqual({ before: 'Opening', after: '' });
    expect(cellDivider('---', 3)).toEqual({ before: '', after: '' });
    expect(cellDivider('  ----  \nNext', 6)).toEqual({ before: '', after: 'Next' });
  });
  it('leaves inline dashes, lists, indented code and selected text alone', () => {
    for (const text of ['Opening --- here', '- item', '    ---', '\t---', '--']) {
      expect(cellDivider(text, text.length)).toBeNull();
    }
    expect(cellDivider('---', 0, 3)).toBeNull();
  });
  it('respects backtick and tilde fences, including longer fences and closing rules', () => {
    for (const text of ['```markdown\n---', '~~~\n---', '````\n```\n---', '~~~\n```\n---']) {
      expect(cellDivider(text, text.length)).toBeNull();
    }
    const text = '```markdown\n---\n```\n---\nAfter';
    expect(cellDivider(text, text.lastIndexOf('---') + 3)).toEqual({
      before: '```markdown\n---\n```',
      after: 'After',
    });
  });
});
