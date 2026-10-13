import { patchSource, promptPatch, promptText, type SourcePatch } from './blocks';
import type { SourceStatement } from './types';

export interface ImageDraft {
  url: string;
  alt: string;
  title: string;
  prompt: string;
}
export function imageDraft(statement: SourceStatement): ImageDraft {
  const attr = (key: string) =>
    statement.attributes.find((a) => a.name === key)?.args[0]?.value ?? '';
  return {
    url: attr('url'),
    alt: attr('alt'),
    title: attr('title'),
    prompt: promptText(statement),
  };
}

/** Update only edited fields, retaining an explicit decorative :alt "". */
export function editImageFields(
  source: string,
  statement: SourceStatement,
  original: ImageDraft,
  draft: ImageDraft,
): string {
  const patches: SourcePatch[] = [];
  const added: string[] = [];
  for (const key of ['url', 'alt', 'title'] as const) {
    if (draft[key] === original[key]) continue;
    const attribute = statement.attributes.find((a) => a.name === key);
    const replacement =
      key === 'title' && draft.title === '' ? '' : `:${key} ${JSON.stringify(draft[key])}`;
    if (attribute) patches.push({ span: attribute.span, replacement });
    else if (replacement) added.push(replacement);
  }
  if (added.length) {
    const last = statement.attributes.at(-1);
    if (!last) throw new Error('An image block needs its source URL. Edit it in Source.');
    patches.push({
      span: { start: last.span.end, end: last.span.end },
      replacement: '\n  ' + added.join('\n  '),
    });
  }
  if (draft.prompt !== original.prompt) patches.push(promptPatch(statement, draft.prompt));
  return patchSource(source, patches);
}
