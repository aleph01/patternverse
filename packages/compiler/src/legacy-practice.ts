import { practiceDefinitionSchema, type PracticeDefinition } from '@patternverse/schema';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { ZodError } from 'zod';
import { articleWithoutFence, type PracticeFenceRange } from './practice-fences.js';

type LegacyPracticeParseResult =
  | { readonly success: true; readonly practice: PracticeDefinition }
  | { readonly success: false; readonly kind: 'schema'; readonly error: ZodError }
  | { readonly success: false; readonly kind: 'yaml'; readonly message: string };

/** One import validator; callers retain their own diagnostic/presentation format. */
export const parseLegacyPracticeYaml = (yaml: string): LegacyPracticeParseResult => {
  try {
    const parsed = practiceDefinitionSchema.safeParse(parseYaml(yaml));
    return parsed.success
      ? { success: true, practice: parsed.data }
      : { success: false, kind: 'schema', error: parsed.error };
  } catch (error) {
    return {
      success: false,
      kind: 'yaml',
      message: error instanceof Error ? error.message : 'The Practice block is not valid YAML.',
    };
  }
};

const PRACTICE_FENCE_PATTERN =
  /^```patternverse-practice[ \t]*\r?\n([\s\S]*?)^```[ \t]*(?:\r?\n|$)/gm;

type LegacyPracticeFence = PracticeFenceRange & { readonly yaml: string };

export type ParsedPracticeBody = {
  readonly articleBody: string;
  readonly practice?: PracticeDefinition;
  readonly errors: readonly string[];
};

const findFences = (body: string): readonly LegacyPracticeFence[] =>
  [...body.matchAll(PRACTICE_FENCE_PATTERN)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    yaml: match[1] ?? '',
  }));

/** Compatibility reader for old records and the migration script, not a runtime. */
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
  const parsed = parseLegacyPracticeYaml(first.yaml);
  return {
    articleBody: articleWithoutFence(body, first),
    ...(parsed.success ? { practice: parsed.practice } : {}),
    errors: parsed.success
      ? []
      : parsed.kind === 'yaml'
        ? [parsed.message]
        : parsed.error.issues.map((issue) => {
            const field = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
            return `${field}${issue.message}`;
          }),
  };
};

/** @deprecated Compatibility serialization only. New authoring writes Pattern Language. */
export const serializePracticeDefinition = (practice: PracticeDefinition): string =>
  stringifyYaml(practice, { lineWidth: 0 }).trimEnd();

/** @deprecated Preserve/remove old import fences; never use for new practice authoring. */
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

/** Import-only compatibility boundary. This translates data, never executes it. */
export function legacyPracticeSource(practice: PracticeDefinition): string {
  const literal = (text: string): string =>
    text
      .split('\n')
      .map(
        (line) =>
          (/^\s*(?:[!?~:]|->|[A-Za-z_][\w-]*\s*=|})/.test(line) ? '\\' : '') +
          line.replaceAll('{{', '\\{{'),
      )
      .join('\n');
  // Numeric entity IDs need a prefix to become language identifiers. Underscores
  // cannot occur in legacy IDs, so this mapping cannot collide with authored IDs.
  const fieldName = (id: string) => (/^\d/.test(id) ? `field_${id}` : id);
  const persistentTimers = practice.steps.flatMap((step) =>
    step.blocks.filter((block) => block.type === 'timer' && block.persistent),
  );
  const lines = [':language 1', `:title ${JSON.stringify(practice.title)}`, ''];
  for (const [index, step] of practice.steps.entries()) {
    lines.push(`step_${step.id} = !form {`);
    if (step.title) lines.push(`  :title ${JSON.stringify(step.title)}`);
    if (index === 0 && practice.introduction)
      lines.push(`  !show {\n${literal(practice.introduction)}\n  }`);
    // The old worksheet showed persistent timers from the beginning of the run,
    // even when authored in a later step. Preserve that with first-form controls.
    const blocks = [
      ...(index === 0 ? persistentTimers : []),
      ...step.blocks.filter((block) => block.type !== 'timer' || !block.persistent),
    ];
    if (!blocks.length)
      lines.push(`  !show {\n${literal(step.title ?? 'Continue when you are ready.')}\n  }`);
    for (const block of blocks) {
      if (block.type === 'markdown') lines.push(`  !show {\n${literal(block.content)}\n  }`);
      else if (block.type === 'text-input')
        lines.push(
          `  !ask ${fieldName(block.id)} {\n    :required ${block.required}\n    :multiline ${block.multiline}\n${block.placeholder !== undefined ? `    :placeholder ${JSON.stringify(block.placeholder)}\n` : ''}${literal(block.label)}\n  }`,
        );
      else
        lines.push(
          `  !timer ${fieldName(block.id)} {\n    :duration ${block.defaultDurationSeconds}\n    :adjustable ${block.userAdjustable}\n${block.userAdjustable ? '    :min 1\n    :max 86400\n' : ''}    :blocking false\n    :persistent ${block.persistent ?? false}\n${literal(block.label ?? 'Take a pause.')}\n  }`,
        );
    }
    lines.push('}', '');
  }
  return lines.join('\n') + '\n-> end\n';
}
