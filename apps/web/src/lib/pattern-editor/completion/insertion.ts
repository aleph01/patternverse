import type { Completion, CompletionSet } from './types';

/** Replace one completion range and restore indentation without altering unrelated source. */
export function applyCompletion(source: string, set: CompletionSet, completion: Completion) {
  const indentation =
    source.slice(source.lastIndexOf('\n', set.from - 1) + 1, set.from).match(/^\s*/)?.[0] ?? '';
  const marked = completion.insert.replace(/\n/g, '\n' + indentation);
  const marker = marked.indexOf('¦');
  const text = marked.replace('¦', '');
  return {
    source: source.slice(0, set.from) + text + source.slice(set.to),
    caret: set.from + (marker < 0 ? text.length : marker),
  };
}
