import { practiceDefinitionSchema, type PracticeDefinition } from '@patternverse/schema';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const PRACTICE_FENCE_PATTERN =
  /^```patternverse-practice[ \t]*\r?\n([\s\S]*?)^```[ \t]*(?:\r?\n|$)/gm;

type PracticeFence = {
  readonly start: number;
  readonly end: number;
  readonly yaml: string;
};

export type ParsedPracticeBody = {
  readonly articleBody: string;
  readonly practice?: PracticeDefinition;
  readonly errors: readonly string[];
};

const findFences = (body: string): readonly PracticeFence[] =>
  [...body.matchAll(PRACTICE_FENCE_PATTERN)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    yaml: match[1] ?? '',
  }));

const articleWithoutFence = (body: string, fence?: PracticeFence): string => {
  if (!fence) return body;
  const before = body.slice(0, fence.start);
  const after = body.slice(fence.end);

  if (!after) {
    if (before.endsWith('\r\n\r\n')) return before.slice(0, -4);
    if (before.endsWith('\n\n')) return before.slice(0, -2);
    if (before.endsWith('\r\n')) return before.slice(0, -2);
    if (before.endsWith('\n')) return before.slice(0, -1);
    return before;
  }

  if (!before) {
    if (after.startsWith('\r\n')) return after.slice(2);
    if (after.startsWith('\n')) return after.slice(1);
    return after;
  }

  if (before.endsWith('\r\n') && after.startsWith('\r\n')) {
    return `${before}${after.slice(2)}`;
  }
  if (before.endsWith('\n') && after.startsWith('\n')) {
    return `${before}${after.slice(1)}`;
  }
  return `${before}${after}`;
};

export const parsePracticeFromBody = (body: string): ParsedPracticeBody => {
  const fences = findFences(body);
  const first = fences[0];
  if (!first) return { articleBody: body, errors: [] };
  if (fences.length > 1) {
    return {
      articleBody: articleWithoutFence(body, first),
      errors: ['A Practice may contain at most one patternverse-practice block.'],
    };
  }

  try {
    const parsed = practiceDefinitionSchema.safeParse(parseYaml(first.yaml));
    if (!parsed.success) {
      return {
        articleBody: articleWithoutFence(body, first),
        errors: parsed.error.issues.map((issue) => {
          const field = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
          return `${field}${issue.message}`;
        }),
      };
    }
    return {
      articleBody: articleWithoutFence(body, first),
      practice: parsed.data,
      errors: [],
    };
  } catch (error) {
    return {
      articleBody: articleWithoutFence(body, first),
      errors: [error instanceof Error ? error.message : 'The Practice block is not valid YAML.'],
    };
  }
};

export const serializePracticeDefinition = (practice: PracticeDefinition): string =>
  stringifyYaml(practice, { lineWidth: 0 }).trimEnd();

export const upsertPracticeFence = (
  articleOrBody: string,
  practice: PracticeDefinition | undefined,
): string => {
  const fences = findFences(articleOrBody);
  const first = fences[0];
  if (!practice) return articleWithoutFence(articleOrBody, first);

  const fence = `\`\`\`patternverse-practice\n${serializePracticeDefinition(practice)}\n\`\`\``;
  if (first) {
    return `${articleOrBody.slice(0, first.start)}${fence}${articleOrBody.slice(first.end)}`;
  }
  if (!articleOrBody) return fence;
  const separator = articleOrBody.endsWith('\n') ? '\n' : '\n\n';
  return `${articleOrBody}${separator}${fence}`;
};
