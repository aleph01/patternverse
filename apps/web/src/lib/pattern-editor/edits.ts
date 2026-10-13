/** Form-to-source edits only. The language engine remains the parser and validator. */
import { formatTimerMinutes, timerSecondsFromMinutes } from '$lib/pattern-run/timer';
import {
  addPath,
  newBlock,
  patchSource,
  promptPatch,
  promptText,
  type BlockKind,
  type ResponseOption,
  type SourcePatch,
} from './blocks';
import type { Paths, SourceAttribute, SourceStatement } from './types';

export interface BlockFieldsDraft {
  prompt: string;
  range: string;
  options: { value: string; label: string }[];
  duration: string | number;
  adjustable: boolean;
  blocking: boolean;
  sticky: boolean;
  min: string | number;
  max: string | number;
}

export function blockFieldsDraft(statement: SourceStatement): BlockFieldsDraft {
  const attr = (name: string, fallback: string) =>
    statement.attributes.find((a) => a.name === name)?.args[0]?.value ?? fallback;
  return {
    prompt: promptText(statement),
    range: statement.argument?.value ?? '0..10',
    options: statement.attributes
      .filter((a) => a.name === 'option')
      .map((a) => ({ value: a.args[0].value, label: a.args[1].value })),
    duration: formatTimerMinutes(Number(attr('duration', '60'))),
    adjustable: attr('adjustable', 'false') === 'true',
    blocking: attr('blocking', 'true') === 'true',
    sticky: attr('sticky', 'true') === 'true',
    min: formatTimerMinutes(Number(attr('min', '30'))),
    max: formatTimerMinutes(Number(attr('max', '300'))),
  };
}

/** Edit attributes individually so intervening comments and other attributes survive. */
function attributePatches(
  statement: SourceStatement,
  attributes: SourceAttribute[],
  replacements: string[],
  original: string[] = [],
): SourcePatch[] {
  const patches = attributes.flatMap((a, index) =>
    replacements[index] !== undefined && replacements[index] === original[index]
      ? []
      : [{ span: a.span, replacement: replacements[index] ?? '' }],
  );
  const extra = replacements.slice(attributes.length);
  if (extra.length) {
    const last = attributes.at(-1);
    const position = last?.span.end ?? statement.body?.span.start;
    if (position === undefined) throw new Error('This block is editable in Source.');
    patches.push({
      span: { start: position, end: position },
      replacement: last ? '\n  ' + extra.join('\n  ') : extra.join('\n  ') + '\n  ',
    });
  }
  return patches;
}

export type BlockEdit = { source: string; error?: never } | { source?: never; error: string };

export function editBlockFields(
  source: string,
  statement: SourceStatement,
  original: BlockFieldsDraft,
  draft: BlockFieldsDraft,
): BlockEdit {
  const patches: SourcePatch[] = [];
  if (draft.prompt !== original.prompt) patches.push(promptPatch(statement, draft.prompt));
  if (statement.kind === 'rate' && statement.argument && draft.range !== original.range)
    patches.push({ span: statement.argument.span, replacement: draft.range });
  if (
    statement.kind === 'choose' &&
    JSON.stringify(draft.options) !== JSON.stringify(original.options)
  )
    patches.push(
      ...attributePatches(
        statement,
        statement.attributes.filter((a) => a.name === 'option'),
        draft.options.map((o) => `:option ${o.value} ${JSON.stringify(o.label)}`),
        original.options.map((o) => `:option ${o.value} ${JSON.stringify(o.label)}`),
      ),
    );
  const timerFields = ['duration', 'adjustable', 'blocking', 'sticky', 'min', 'max'] as const;
  if (
    statement.kind === 'timer' &&
    timerFields.some((key) => String(draft[key]) !== String(original[key]))
  ) {
    const seconds = timerSecondsFromMinutes(draft.duration);
    const minimum = timerSecondsFromMinutes(draft.min);
    const maximum = timerSecondsFromMinutes(draft.max);
    if (
      seconds === null ||
      (draft.adjustable &&
        (minimum === null || maximum === null || minimum > seconds || maximum < seconds))
    )
      return {
        error:
          'Enter valid minutes (up to 1440), with the duration inside its minimum and maximum.',
      };
    const values: Record<string, string> = {
      duration: String(seconds),
      adjustable: String(draft.adjustable),
      blocking: String(draft.blocking),
      sticky: String(draft.sticky),
      ...(draft.adjustable ? { min: String(minimum), max: String(maximum) } : {}),
    };
    const managed = new Set<string>(timerFields);
    const attributes = statement.attributes.filter((a) => managed.has(a.name));
    // Keep existing ordering; persistence and any future attributes are not timer controls.
    for (const attr of attributes) {
      if (attr.name in values && attr.args[0]?.value === values[attr.name]) continue;
      patches.push({
        span: attr.span,
        replacement: attr.name in values ? `:${attr.name} ${values[attr.name]}` : '',
      });
    }
    const missing = Object.entries(values)
      .filter(([name]) => !attributes.some((a) => a.name === name))
      .map(([name, value]) => `:${name} ${value}`);
    patches.push(...attributePatches(statement, [], missing));
  }
  return { source: patchSource(source, patches) };
}

export interface PathCaseDraft {
  value: string;
  operator: string;
  number: string;
  destination: string;
}
export interface PathsDraft {
  response: string;
  cases: PathCaseDraft[];
}
export function pathsDraft(paths: Paths): PathsDraft {
  return {
    response: paths.response ?? '',
    cases: paths.arms.map((arm) => ({
      value: arm.value,
      operator: arm.rule?.operator ?? '>=',
      number: String(arm.rule?.value ?? 4),
      destination: arm.destination,
    })),
  };
}

/** Authoring defaults when switching the response, not execution or branching semantics. */
export function pathCasesForResponse(
  cases: PathCaseDraft[],
  response: ResponseOption,
): PathCaseDraft[] {
  return cases.map((item, index) =>
    index === cases.length - 1
      ? { ...item }
      : {
          ...item,
          value:
            response.choices[index]?.value ??
            (response.type === 'boolean'
              ? String(index === 0)
              : response.type === 'number'
                ? String(index)
                : `case ${index + 1}`),
          number: String(index === 0 ? 8 : 4),
        },
  );
}

export function editPaths(
  source: string,
  paths: Paths,
  draft: PathsDraft,
  current: ResponseOption | undefined,
): string {
  const exact = current ? current.type !== 'number' : paths.mode === 'match';
  const literal = (value: string) =>
    current?.type === 'number' || current?.type === 'boolean' ? value : JSON.stringify(value);
  const attributes = paths.arms.map((arm, index) =>
    index === paths.arms.length - 1
      ? `  :else -> ${arm.target}`
      : exact
        ? `  :case ${literal(draft.cases[index].value)} -> ${arm.target}`
        : `  :when ${arm.rule || current?.type === 'number' ? `${draft.response} ${draft.cases[index].operator} ${draft.cases[index].number}` : draft.cases[index].value} -> ${arm.target}`,
  );
  const original = pathsDraft(paths);
  const controlChanged =
    exact !== (paths.mode === 'match') ||
    draft.response !== original.response ||
    draft.cases.slice(0, -1).some((item, index) => {
      const before = original.cases[index];
      return exact
        ? item.value !== before.value
        : paths.arms[index].rule || current?.type === 'number'
          ? item.operator !== before.operator || item.number !== before.number
          : item.value !== before.value;
    });
  return patchSource(source, [
    ...(controlChanged
      ? [
          {
            span: paths.control,
            replacement: `?${exact ? 'match' : 'branch'}${exact ? ` ${draft.response}` : ''} {\n${attributes.join('\n')}\n}`,
          },
        ]
      : []),
    ...paths.arms.flatMap((arm, index) =>
      draft.cases[index].destination === arm.destination
        ? []
        : [{ span: arm.terminal, replacement: `-> ${draft.cases[index].destination}` }],
    ),
  ]);
}

export function addPathCase(
  source: string,
  paths: Paths,
  cases: PathCaseDraft[],
  current: ResponseOption | undefined,
): string {
  const option = current?.choices.find((o) => !cases.slice(0, -1).some((c) => c.value === o.value));
  const condition =
    paths.mode === 'match'
      ? option
        ? JSON.stringify(option.value)
        : current?.type === 'boolean'
          ? !cases.slice(0, -1).some((c) => c.value === 'true')
            ? 'true'
            : 'false'
          : current?.type === 'number'
            ? String(cases.length)
            : JSON.stringify(`New case ${cases.length}`)
      : `${paths.response ?? 'rating'} < 4`;
  return addPath(source, paths, condition);
}

export function insertPathBlock(
  source: string,
  paths: Paths,
  index: number,
  kind: BlockKind,
): string {
  const position = paths.arms[index].terminal.start;
  return patchSource(source, [
    { span: { start: position, end: position }, replacement: newBlock(source, kind) + '\n' },
  ]);
}
