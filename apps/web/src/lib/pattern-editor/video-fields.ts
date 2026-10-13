import { patchSource, promptPatch, promptText, type SourcePatch } from './blocks';
import type { SourceStatement } from './types';

export const videoTextFields = ['url', 'title', 'start', 'end', 'captions'] as const;
export const videoBooleanFields = ['autoplay', 'muted', 'loop'] as const;
export type VideoDraft = Record<(typeof videoTextFields)[number], string> &
  Record<(typeof videoBooleanFields)[number], boolean> & { prompt: string };

export function videoDraft(statement: SourceStatement): VideoDraft {
  const attr = (key: string) => statement.attributes.find((a) => a.name === key)?.args[0]?.value;
  return {
    url: attr('url') ?? '',
    title: attr('title') ?? '',
    start: attr('start') ?? '',
    end: attr('end') ?? '',
    captions: attr('captions') ?? '',
    autoplay: attr('autoplay') === 'true',
    muted: attr('muted') === 'true',
    loop: attr('loop') === 'true',
    prompt: promptText(statement),
  };
}

/** Preserve untouched attributes, comments, quote styles, and surrounding source. */
export function editVideoFields(
  source: string,
  statement: SourceStatement,
  original: VideoDraft,
  draft: VideoDraft,
): string {
  const patches: SourcePatch[] = [];
  const added: string[] = [];
  for (const key of [...videoTextFields, ...videoBooleanFields]) {
    if (draft[key] === original[key]) continue;
    const attribute = statement.attributes.find((a) => a.name === key);
    const value = draft[key];
    const encoded =
      typeof value === 'boolean'
        ? String(value)
        : (key === 'start' || key === 'end') && /^\d+$/.test(value)
          ? value
          : JSON.stringify(value);
    const replacement = value === '' && key !== 'url' ? '' : `:${key} ${encoded}`;
    if (attribute) patches.push({ span: attribute.span, replacement });
    else if (replacement) added.push(replacement);
  }
  if (added.length) {
    const last = statement.attributes.at(-1);
    if (!last) throw new Error('A video block needs its source URL. Edit it in Source.');
    patches.push({
      span: { start: last.span.end, end: last.span.end },
      replacement: '\n  ' + added.join('\n  '),
    });
  }
  if (draft.prompt !== original.prompt) patches.push(promptPatch(statement, draft.prompt));
  return patchSource(source, patches);
}
