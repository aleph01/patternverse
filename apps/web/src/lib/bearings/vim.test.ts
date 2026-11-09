import { describe, expect, it } from 'vitest';
import { VimBuffer, type VimRegister } from './vim';

function keys(buffer: VimBuffer, sequence: string) {
  for (const key of sequence) expect(buffer.key(key)).toBe(true);
}

describe('basic Vim writing', () => {
  it('moves by grapheme, word, line and counted document positions', () => {
    const buffer = new VimBuffer('one two three\n👩🏽‍💻 café!\nlast');
    keys(buffer, '2w');
    expect(buffer.cursor).toBe(8);
    keys(buffer, 'b');
    expect(buffer.cursor).toBe(4);
    keys(buffer, 'e');
    expect(buffer.cursor).toBe(6);
    keys(buffer, '0j0');
    expect(buffer.cursor).toBe(14);
    keys(buffer, 'l');
    expect(buffer.cursor).toBe(21); // An emoji sequence is one character.
    keys(buffer, 'h');
    expect(buffer.cursor).toBe(14);
    keys(buffer, 'l');
    buffer.key('Backspace');
    expect(buffer.cursor).toBe(14);
    expect(buffer.text).toContain('👩🏽‍💻 café!');
    keys(buffer, 'G');
    expect(buffer.cursor).toBe(28);
    keys(buffer, 'gg');
    expect(buffer.cursor).toBe(0);
    keys(buffer, '2G');
    expect(buffer.cursor).toBe(14);
  });

  it('retains the target column across short lines and handles empty lines', () => {
    const buffer = new VimBuffer('abcdef\nx\nabcdef\n\n');
    keys(buffer, '4lj');
    expect(buffer.cursor).toBe(7);
    keys(buffer, 'j');
    expect(buffer.cursor).toBe(13);
    keys(buffer, 'G');
    expect(buffer.cursor).toBe(buffer.text.length);
    keys(buffer, 'k0');
    expect(buffer.cursor).toBe(16);
    const empty = new VimBuffer('\ntext');
    keys(empty, '0h');
    expect(empty.cursor).toBe(0);
  });

  it('groups an Insert session into one undo, with redo', () => {
    const buffer = new VimBuffer('hello');
    keys(buffer, 'A');
    expect(buffer.cursor).toBe(5);
    expect(buffer.mode).toBe('insert');
    buffer.input('hello there', 11);
    buffer.key('Escape');
    expect(buffer.cursor).toBe(10);
    expect(buffer.mode).toBe('normal');
    keys(buffer, 'u');
    expect(buffer.text).toBe('hello');
    buffer.key('r', true);
    expect(buffer.text).toBe('hello there');
    expect(buffer.key('Escape')).toBe(false);
  });

  it('deletes, changes and yanks counted words and complete lines', () => {
    const buffer = new VimBuffer('one two three\nnext\nlast');
    keys(buffer, '2dw');
    expect(buffer.text).toBe('three\nnext\nlast');
    keys(buffer, 'u');
    keys(buffer, 'd2w');
    expect(buffer.text).toBe('three\nnext\nlast');
    keys(buffer, '2dd');
    expect(buffer.text).toBe('last');
    keys(buffer, 'uGdd');
    expect(buffer.text).toBe('three\nnext');
    keys(buffer, 'uggcc');
    expect(buffer.text).toBe('\nnext\nlast');
    expect(buffer.mode).toBe('insert');
    buffer.input('new\nnext\nlast', 3);
    buffer.key('Escape');
    keys(buffer, 'u');
    expect(buffer.text).toBe('three\nnext\nlast');
  });

  it('opens lines as an undoable Insert transaction', () => {
    const buffer = new VimBuffer('first\nlast');
    keys(buffer, 'o');
    expect(buffer.text).toBe('first\n\nlast');
    expect(buffer.cursor).toBe(6);
    buffer.input('first\nmiddle\nlast', 12);
    buffer.key('Escape');
    keys(buffer, 'uO');
    expect(buffer.text).toBe('\nfirst\nlast');
    buffer.key('Escape');
    keys(buffer, 'u');
    expect(buffer.text).toBe('first\nlast');
  });

  it('shares yanked text between cells without changing the source', () => {
    const register: VimRegister = { text: '', linewise: false };
    const source = new VimBuffer('first\nlast', register);
    keys(source, 'Gyy');
    expect(source.text).toBe('first\nlast');
    const target = new VimBuffer('other', register);
    keys(target, 'p');
    expect(target.text).toBe('other\nlast');
    keys(target, 'uP');
    expect(target.text).toBe('last\nother');
    const words = new VimBuffer('alpha beta', register);
    keys(words, 'ywp');
    expect(words.text).toBe('aalpha lpha beta');
  });

  it('preserves graphemes while deleting and changing, and clears pending commands', () => {
    const buffer = new VimBuffer('👩🏽‍💻 café');
    keys(buffer, 'x');
    expect(buffer.text).toBe(' café');
    keys(buffer, 'u');
    keys(buffer, 'd');
    expect(buffer.pending).toBe('d');
    expect(buffer.key('Escape')).toBe(true);
    expect(buffer.text).toBe('👩🏽‍💻 café');
    keys(buffer, 'cw');
    expect(buffer.mode).toBe('insert');
    expect(buffer.text).toBe(' café');
    buffer.input('hello café', 5);
    buffer.key('Escape');
    keys(buffer, 'u');
    expect(buffer.text).toBe('👩🏽‍💻 café');
  });

  it('leaves native keys in Insert mode and never exceeds the cell length limit', () => {
    const buffer = new VimBuffer('x'.repeat(100000));
    keys(buffer, 'yyp');
    expect(buffer.text).toHaveLength(100000);
    keys(buffer, 'i');
    expect(buffer.key('Enter')).toBe(false);
    expect(buffer.key('ArrowRight')).toBe(false);
    expect(buffer.key('a')).toBe(false);
  });
  it('deletes the final blank line and clears history when a cell is replaced', () => {
    const buffer = new VimBuffer('first\n');
    keys(buffer, 'Gdd');
    expect(buffer.text).toBe('first');
    buffer.reset('replacement');
    keys(buffer, 'u');
    expect(buffer.text).toBe('replacement');
  });
});
