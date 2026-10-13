import { articleWithoutFence } from './practice-fences.js';

// Keep both existing package entry points compatible without mixing legacy YAML
// validation/serialization into the canonical Pattern Language authoring path.
export {
  legacyPracticeSource,
  parsePracticeFromBody,
  serializePracticeDefinition,
  upsertPracticeFence,
  type ParsedPracticeBody,
} from './legacy-practice.js';

const LANGUAGE_FENCE_PATTERN =
  /^(`{3,})patternverse-language[ \t]*\r?\n([\s\S]*?)^\1[ \t]*(?:\r?\n|$)/gm;

/** Portable executable source stays distinct from illustrative `pattern` code blocks. */
export const parseLanguagePracticeFromBody = (
  body: string,
): {
  articleBody: string;
  source?: string;
  errors: readonly string[];
} => {
  const matches = [...body.matchAll(LANGUAGE_FENCE_PATTERN)];
  const first = matches[0];
  if (!first) return { articleBody: body, errors: [] };
  const source = (first[2] ?? '').replace(/\r?\n$/, '');
  const fence = { start: first.index, end: first.index + first[0].length };
  const errors =
    matches.length > 1
      ? ['Only one Pattern Language practice is allowed.']
      : !source.trim()
        ? ['Practice source cannot be empty.']
        : new TextEncoder().encode(source).length > 65536
          ? ['Practice source exceeds 64 KiB.']
          : [];
  return { articleBody: articleWithoutFence(body, fence), source, errors };
};

export const upsertLanguagePracticeFence = (body: string, source: string | undefined): string => {
  const parsed = parseLanguagePracticeFromBody(body);
  if (source === undefined) return parsed.articleBody;
  const longest = Math.max(2, ...[...source.matchAll(/^`+/gm)].map((match) => match[0].length));
  const fence = '`'.repeat(longest + 1);
  return `${parsed.articleBody}${parsed.articleBody ? '\n\n' : ''}${fence}patternverse-language\n${source.replace(/\n$/, '')}\n${fence}`;
};
