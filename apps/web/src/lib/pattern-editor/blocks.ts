/** Source editing only. All grammar, typing, flow validation and execution stay in Rust. */
import {
  sourceSelection,
  type Paths,
  type SourceSpan,
  type SourceStatement,
  type Structure,
} from './types';

export interface SourcePatch {
  span: SourceSpan;
  replacement: string;
}
export const sliceSource = (source: string, span: SourceSpan): string => {
  const [start, end] = sourceSelection(source, span);
  return source.slice(start, end);
};
export const byteOffset = (source: string, position: number): number =>
  new TextEncoder().encode(source.slice(0, position)).length;

/** Atomic, UTF-8-aware splices preserve every byte outside explicitly edited ranges. */
export function patchSource(source: string, patches: readonly SourcePatch[]): string {
  const length = new TextEncoder().encode(source).length;
  const sorted = [...patches].sort((a, b) => b.span.start - a.span.start);
  let boundary = length;
  let result = source;
  for (const { span, replacement } of sorted) {
    if (span.start < 0 || span.end < span.start || span.end > boundary)
      throw new Error('Editing ranges overlap or are stale. Return to Source and try again.');
    const [start, end] = sourceSelection(source, span);
    // Reject a span inside a multi-byte character rather than rounding the edit.
    if (byteOffset(source, start) !== span.start || byteOffset(source, end) !== span.end)
      throw new Error('Editing range is not a character boundary.');
    result = result.slice(0, start) + replacement + result.slice(end);
    boundary = span.start;
  }
  return result;
}

export function freshName(source: string, base: string): string {
  // Collision avoidance is lexical, not a parser or validator. Rust checks the result.
  const occupied = new Set(source.match(/[A-Za-z_][A-Za-z0-9_-]*/g) ?? []);
  let name = base,
    count = 2;
  while (occupied.has(name)) name = `${base}_${count++}`;
  return name;
}

export const blockNames: Record<string, string> = {
  ask: 'Question',
  show: 'Text / summary',
  video: 'Video',
  image: 'Image',
  choose: 'Choice',
  rate: 'Rating',
  timer: 'Timer',
  '?match': 'Paths',
  '?branch': 'Paths',
};
export function editableStatement(statement: SourceStatement): boolean {
  return (
    Boolean(statement.body) &&
    ['ask', 'show', 'rate', 'choose', 'timer'].includes(statement.kind) &&
    !(statement.kind === 'show' && statement.argument) &&
    !(
      statement.kind === 'choose' &&
      (statement.argument || statement.attributes.some((a) => a.name === 'from'))
    )
  );
}
export function promptText(statement: SourceStatement): string {
  const lines = (statement.body?.value ?? '').split(/\r?\n/);
  const amounts = lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length);
  const indent = amounts.length ? Math.min(...amounts) : 0;
  return lines
    .map((l) => l.slice(Math.min(indent, l.length)))
    .join('\n')
    .trim();
}
export function promptPatch(statement: SourceStatement, text: string): SourcePatch {
  if (!statement.body) throw new Error('This block is editable in Source.');
  const indent = statement.body.value.match(/^[ \t]*/)?.[0] ?? '  ';
  const value = text
    .split('\n')
    .map((line) => (line ? indent + line : ''))
    .join('\n');
  return {
    span: statement.body.span,
    replacement: value + (statement.body.span.start === statement.body.span.end ? '\n' : ''),
  };
}

export type BlockKind = 'ask' | 'show' | 'choose' | 'rate' | 'timer' | 'video' | 'image';
export function newBlock(source: string, kind: BlockKind): string {
  const name = freshName(
    source,
    kind === 'ask'
      ? 'response'
      : kind === 'choose'
        ? 'choice'
        : kind === 'rate'
          ? 'rating'
          : 'pause',
  );
  switch (kind) {
    case 'ask':
      return `!ask ${name} {\n  Write your question here.\n}\n`;
    case 'image':
      return '!image {\n  :url "https://example.com/decision-tree.png"\n  :alt "A decision tree showing three possible next steps."\n  Explore this image.\n}\n';
    case 'video':
      return '!video {\n  :url "https://youtu.be/M7lc1UVf-VE"\n  Watch this video.\n}\n';
    case 'show':
      return '!show {\n  Write instructions or a summary here.\n}\n';
    case 'choose':
      return `!choose ${name} {\n  :option explore "Explore options"\n  :option plan "Make a plan"\n  :option unsure "Not sure yet"\n  What would help?\n}\n`;
    case 'rate':
      return `!rate ${name} 0..10 {\n  How clear is your next step?\n}\n`;
    case 'timer':
      return `!timer ${name} {\n  :duration 60\n  :adjustable false\n  :blocking true\n  Take a quiet pause.\n}\n`;
  }
}
export interface ResponseOption {
  name: string;
  title: string;
  type: unknown;
  choices: { value: string; label: string }[];
}
export function responseOptions(structure: Structure, before: number): ResponseOption[] {
  const names = new Set<string>();
  return [
    ...Object.entries(structure.inputs).map(([name, type]) => ({
      name,
      value_type: type,
      span: { start: 0, end: 0 },
    })),
    ...structure.bindings,
  ]
    .filter((binding) => {
      if (names.has(binding.name)) return false;
      names.add(binding.name);
      return true;
    })
    .filter(
      (binding) =>
        binding.span.end < before &&
        ['choice', 'number', 'text', 'boolean'].includes(String(binding.value_type)),
    )
    .map((binding) => {
      const statement = structure.source_statements?.find((s) => s.binding?.value === binding.name);
      const step = structure.steps.find((s) => s.binding === binding.name);
      return {
        name: binding.name,
        type: binding.value_type,
        title: step?.text?.split('\n').find((l) => l.trim()) ?? binding.name,
        choices:
          statement?.attributes
            .filter((a) => a.name === 'option' && a.args.length === 2)
            .map((a) => ({ value: a.args[0].value, label: a.args[1].value })) ?? [],
      };
    });
}
export function endInsertion(structure: Structure): SourceSpan | undefined {
  const paths = structure.paths ?? [];
  if (
    structure.source_statements?.some(
      (s) =>
        ['?match', '?branch'].includes(s.kind) &&
        !paths.some((p) => p.control.start === s.span.start),
    )
  )
    return undefined;
  const end = structure.source_statements?.findLast(
    (s) =>
      s.kind === 'jump' &&
      s.argument?.value === 'end' &&
      !paths.some((p) => s.span.start >= p.span.start && s.span.end <= p.span.end),
  );
  return end ? { start: end.span.start, end: end.span.start } : undefined;
}

/** Create ordinary language source; this format is not stored or executed as a second schema. */
export function newPaths(source: string, response: ResponseOption): string {
  const one = freshName(source, 'path_first');
  const two = freshName(source + ' ' + one, 'path_second');
  const otherwise = freshName(source + ' ' + one + ' ' + two, 'path_otherwise');
  const joined = freshName(source + ' ' + one + ' ' + two + ' ' + otherwise, 'after_paths');
  const ask1 = freshName(source, 'path_response');
  const ask2 = freshName(source + ' ' + ask1, 'path_response');
  const exact = response.type !== 'number';
  const cases = response.choices.slice(0, 2).map((c) => JSON.stringify(c.value));
  const defaults = response.type === 'boolean' ? ['true', 'false'] : ['"first"', '"second"'];
  const control = exact
    ? `?match ${response.name} {\n  :case ${cases[0] ?? defaults[0]} -> ${one}\n  :case ${cases[1] ?? defaults[1]} -> ${two}`
    : `?branch {\n  :when ${response.name} >= 8 -> ${one}\n  :when ${response.name} >= 4 -> ${two}`;
  return `${control}\n  :else -> ${otherwise}\n}\n${one}:\n!ask ${ask1} {\n  What options could you explore?\n}\n-> ${joined}\n${two}:\n!ask ${ask2} {\n  What is one small action you could take?\n}\n-> ${joined}\n${otherwise}:\n-> ${joined}\n${joined}:\n`;
}

export function addPath(source: string, paths: Paths, condition: string): string {
  const otherwise = paths.arms.at(-1)!;
  const target = freshName(source, 'path_case');
  return patchSource(source, [
    {
      span: { start: otherwise.attribute.start, end: otherwise.attribute.start },
      replacement: `:${paths.mode === 'match' ? 'case' : 'when'} ${condition} -> ${target}\n  `,
    },
    {
      span: { start: paths.span.end, end: paths.span.end },
      replacement: `\n${target}:\n-> ${paths.continuation ?? 'end'}\n`,
    },
  ]);
}
export function removePath(source: string, paths: Paths, index: number): string {
  const arm = paths.arms[index];
  if (index === paths.arms.length - 1) throw new Error('The Otherwise path is required.');
  return patchSource(source, [
    { span: arm.attribute, replacement: '' },
    { span: { start: arm.content.start, end: arm.terminal.end }, replacement: '' },
  ]);
}
export function moveRule(source: string, paths: Paths, index: number): string {
  if (index < 1 || index >= paths.arms.length - 1)
    throw new Error('Only non-default rules can be reordered.');
  const current = paths.arms[index].attribute,
    prior = paths.arms[index - 1].attribute;
  return patchSource(source, [
    { span: current, replacement: sliceSource(source, prior) },
    { span: prior, replacement: sliceSource(source, current) },
  ]);
}
