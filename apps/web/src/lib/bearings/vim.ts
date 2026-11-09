export type VimMode = 'normal' | 'insert';
export type VimStatus = { mode: VimMode; pending: string };
type Snapshot = { text: string; cursor: number };
export type VimRegister = { text: string; linewise: boolean };

/** A small text-only Vim buffer. Card commands and browser shortcuts belong to the UI. */
export class VimBuffer {
  mode: VimMode = 'normal';
  pending = '';
  cursor = 0;
  text: string;
  private count = '';
  private operator = '';
  private operatorCount = 1;
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private insertion: Snapshot | null = null;
  private column: number | null = null;
  private cachedText = '';
  private boundaries: number[] = [0];
  private segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  constructor(
    text: string,
    private register: VimRegister = { text: '', linewise: false },
  ) {
    this.text = text;
  }
  private snapshot(): Snapshot {
    return { text: this.text, cursor: this.cursor };
  }
  private remember(before: Snapshot) {
    if (before.text === this.text) return;
    this.undoStack.push(before);
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack = [];
  }
  reset(text: string) {
    this.text = text;
    this.undoStack = [];
    this.redoStack = [];
    this.insertion = null;
    this.column = null;
    this.clear();
  }
  clear() {
    this.pending = this.count = this.operator = '';
    this.operatorCount = 1;
  }
  setMode(mode: VimMode) {
    if (mode === this.mode) return;
    if (mode === 'insert') this.insertion = this.snapshot();
    else {
      this.finishInsertion();
      if (this.cursor > this.start()) this.cursor = this.previous(this.cursor);
      this.clamp();
    }
    this.mode = mode;
    this.column = null;
    this.clear();
  }
  finishInsertion() {
    if (this.insertion) this.remember(this.insertion);
    this.insertion = null;
  }
  input(text: string, cursor: number) {
    if (!this.insertion) this.insertion = this.snapshot();
    this.mode = 'insert';
    this.text = text;
    this.cursor = cursor;
    this.column = null;
  }
  private stops() {
    if (this.cachedText !== this.text) {
      this.boundaries = [...this.segmenter.segment(this.text)].map((part) => part.index);
      this.boundaries.push(this.text.length);
      this.cachedText = this.text;
    }
    return this.boundaries;
  }
  private previous(at: number) {
    const stops = this.stops();
    let lo = 0,
      hi = stops.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (stops[mid]! < at) lo = mid + 1;
      else hi = mid;
    }
    return stops[Math.max(0, lo - 1)]!;
  }
  private next(at: number) {
    const stops = this.stops();
    let lo = 0,
      hi = stops.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (stops[mid]! <= at) lo = mid + 1;
      else hi = mid;
    }
    return stops[Math.min(lo, stops.length - 1)]!;
  }
  private start(at = this.cursor) {
    return at <= 0 ? 0 : this.text.lastIndexOf('\n', at - 1) + 1;
  }
  private end(at = this.cursor) {
    const end = this.text.indexOf('\n', at);
    return end < 0 ? this.text.length : end;
  }
  private first(at = this.cursor) {
    const start = this.start(at);
    const offset = this.text.slice(start, this.end(at)).search(/\S/);
    return start + Math.max(0, offset);
  }
  private clamp() {
    this.cursor = Math.max(0, Math.min(this.cursor, this.text.length));
    if (this.cursor < this.text.length) this.cursor = this.previous(this.cursor + 1);
    const end = this.end();
    if (this.cursor === end && end > this.start()) this.cursor = this.previous(end);
  }
  private wordClass(at: number) {
    const char = this.text.slice(at, this.next(at));
    return /\s/.test(char) ? 0 : /[\p{L}\p{N}_]/u.test(char) ? 1 : 2;
  }
  private word(key: string, at: number) {
    if (key === 'b') {
      at = this.previous(at);
      while (at > 0 && this.wordClass(at) === 0) at = this.previous(at);
      while (at > 0 && this.wordClass(this.previous(at)) === this.wordClass(at))
        at = this.previous(at);
    } else if (key === 'w') {
      const kind = this.wordClass(at);
      while (at < this.text.length && this.wordClass(at) === kind) at = this.next(at);
      while (at < this.text.length && this.wordClass(at) === 0) at = this.next(at);
    } else {
      at = this.next(at);
      while (at < this.text.length && this.wordClass(at) === 0) at = this.next(at);
      while (
        this.next(at) < this.text.length &&
        this.wordClass(this.next(at)) === this.wordClass(at)
      )
        at = this.next(at);
    }
    return at;
  }
  private motion(key: string, count: number) {
    let at = this.cursor;
    if (['j', 'k', 'Enter'].includes(key)) {
      this.column ??= [...this.segmenter.segment(this.text.slice(this.start(), at))].length;
      for (let i = 0; i < count; i++) {
        if (key === 'k') {
          if (this.start(at) === 0) break;
          at = this.start(this.start(at) - 1);
        } else {
          const end = this.end(at);
          if (end === this.text.length) break;
          at = end + 1;
        }
      }
      const start = this.start(at),
        end = this.end(at);
      at = start;
      for (let i = 0; i < this.column && at < end; i++) at = this.next(at);
    } else {
      this.column = null;
      if (key === '0') at = this.start();
      else if (key === '^') at = this.first();
      else if (key === '$') at = this.end();
      else if (key === 'gg' || key === 'G') {
        if (key === 'G' && !this.count) at = this.text.length;
        else {
          at = 0;
          for (let i = 1; i < count && this.end(at) < this.text.length; i++) at = this.end(at) + 1;
        }
        at = this.first(at);
      } else
        for (let i = 0; i < count; i++) {
          if (key === 'h') at = Math.max(this.start(at), this.previous(at));
          else if (key === 'l') at = Math.min(this.end(at), this.next(at));
          else at = this.word(key, at);
        }
    }
    return at;
  }
  private replace(start: number, end: number, value: string, cursor = start) {
    if (this.text.length - (end - start) + value.length > 100000) return;
    const before = this.snapshot();
    this.text = this.text.slice(0, start) + value + this.text.slice(end);
    this.cursor = cursor;
    this.column = null;
    if (this.mode !== 'insert') this.remember(before);
  }
  private lines(count: number) {
    const start = this.start();
    let end = start;
    for (let i = 0; i < count; i++) {
      end = this.end(end);
      if (end === this.text.length) break;
      end++;
    }
    return { start, end };
  }
  private operate(key: string, count: number) {
    const op = this.operator;
    let start: number, end: number;
    const linewise = key === op;
    if (linewise) ({ start, end } = this.lines(count));
    else if (op === 'c' && key === 'w' && this.wordClass(this.cursor) !== 0) {
      // cw retains the space after the word, even for a one-grapheme word.
      start = end = this.cursor;
      for (let i = 0; i < count; i++) {
        if (i > 0) {
          end = this.next(end);
          while (end < this.text.length && this.wordClass(end) === 0) end = this.next(end);
        }
        while (
          this.next(end) < this.text.length &&
          this.wordClass(this.next(end)) === this.wordClass(end)
        )
          end = this.next(end);
      }
      end = this.next(end);
    } else {
      const target = this.motion(key, count);
      start = Math.min(this.cursor, target);
      end = Math.max(this.cursor, target);
      if (key === 'e') end = this.next(end);
    }
    this.register.text = this.text.slice(start, end);
    this.register.linewise = linewise;
    if (linewise && !this.register.text.endsWith('\n')) this.register.text += '\n';
    if (op !== 'y') {
      if (op === 'c') this.setMode('insert');
      if (op === 'c' && linewise) {
        if (this.text[end - 1] === '\n') end--;
        this.replace(start, end, '');
        return;
      }
      // A final line owns its preceding separator when it has no trailing newline.
      if (
        linewise &&
        end === this.text.length &&
        start > 0 &&
        (end === start || this.text[end - 1] !== '\n')
      )
        start--;
      this.replace(start, end, '');
    }
  }
  /** Returns false for keys that should retain their native/app behavior. */
  key(key: string, control = false): boolean {
    if (key === 'Escape' || (control && key === '[')) {
      if (this.mode === 'insert') {
        this.setMode('normal');
        return true;
      }
      if (this.pending) {
        this.clear();
        return true;
      }
      return false;
    }
    if (this.mode === 'insert') return false;
    if (control && key !== 'r') return false;
    this.clamp();
    const arrows: Record<string, string> = {
      ArrowLeft: 'h',
      ArrowDown: 'j',
      ArrowUp: 'k',
      ArrowRight: 'l',
      Backspace: 'h',
      Home: '0',
      End: '$',
    };
    key = arrows[key] ?? key;
    if (!control && /^\d$/.test(key) && (key !== '0' || this.count)) {
      this.count = (this.count + key).slice(0, 4);
      this.pending += key;
      return true;
    }
    const count = Math.min(9999, this.operatorCount * Number(this.count || 1));
    if (this.operator === 'g') {
      this.operator = '';
      if (key === 'g') {
        this.cursor = this.motion('gg', count);
        this.clamp();
      }
    } else if (this.operator) {
      if (key === this.operator || ['h', 'l', 'w', 'b', 'e', '0', '^', '$'].includes(key))
        this.operate(key, count);
    } else if (
      !control &&
      ['h', 'j', 'k', 'l', 'w', 'b', 'e', '0', '^', '$', 'G', 'Enter'].includes(key)
    ) {
      this.cursor = this.motion(key, count);
    } else if (!control && ['d', 'y', 'c', 'g'].includes(key)) {
      this.operator = key;
      this.operatorCount = count;
      this.count = '';
      this.pending += key;
      return true;
    } else if (!control && ['i', 'a', 'I', 'A', 'o', 'O'].includes(key)) {
      if (key === 'a' && this.cursor < this.end()) this.cursor = this.next(this.cursor);
      if (key === 'I') this.cursor = this.first();
      if (key === 'A') this.cursor = this.end();
      this.setMode('insert');
      if (key === 'o') {
        const at = this.end();
        this.replace(at, at, '\n', at + 1);
      }
      if (key === 'O') {
        const at = this.start();
        this.replace(at, at, '\n', at);
      }
    } else if (!control && ['x', 'X', 'Delete'].includes(key)) {
      let start = this.cursor,
        end = this.cursor;
      const backwards = key === 'X';
      for (let i = 0; i < count; i++) {
        if (backwards) start = Math.max(this.start(), this.previous(start));
        else end = Math.min(this.end(), this.next(end));
      }
      if (start !== end) {
        this.register.text = this.text.slice(start, end);
        this.register.linewise = false;
        this.replace(start, end, '');
      }
    } else if (!control && ['D', 'C'].includes(key)) {
      this.operator = key === 'D' ? 'd' : 'c';
      this.operate('$', count);
    } else if (!control && ['p', 'P'].includes(key) && this.register.text) {
      const value = this.register.text.repeat(
        Math.min(count, Math.ceil(100000 / this.register.text.length)),
      );
      if (this.register.linewise) {
        const at = key === 'P' ? this.start() : this.end();
        if (key === 'P') this.replace(at, at, value, at);
        else if (at === this.text.length) this.replace(at, at, '\n' + value.slice(0, -1), at + 1);
        else this.replace(at + 1, at + 1, value, at + 1);
      } else {
        const at = key === 'P' ? this.cursor : Math.min(this.end(), this.next(this.cursor));
        this.replace(at, at, value, at + value.length - 1);
      }
    } else if ((!control && key === 'u') || (control && key === 'r')) {
      const from = control ? this.redoStack : this.undoStack;
      const to = control ? this.undoStack : this.redoStack;
      const next = from.pop();
      if (next) {
        to.push(this.snapshot());
        this.text = next.text;
        this.cursor = next.cursor;
      }
    } else if (key.length > 1) return false;
    this.clear();
    if (this.mode === 'normal') this.clamp();
    return true;
  }
}
