// Adapted from Mira’s local Pattern editor. Rust remains the language authority.
import type { CompletionLibraryEntry } from './types';
import { contextAt, isProseScope } from './completion/context';
import { checkedNames, recordFields, enumVariants } from './completion/inspection';
import {
  commandSnippets,
  attributeSuggestions,
  parameterSuggestions,
  pureFunctionSuggestions,
} from './completion/catalog';
import { item, type Completion, type CompletionSet, type CheckedSource } from './completion/types';

// Stable public boundary for source-editor consumers.
export type { Completion, CompletionSet, CheckedSource } from './completion/types';
export { applyCompletion } from './completion/insertion';

/** Offer local templates and in-scope names; Rust remains the sole language authority. */
export function completions(
  source: string,
  position: number,
  checked?: CheckedSource,
  entries: readonly CompletionLibraryEntry[] = [],
): CompletionSet {
  const before = source.slice(0, position),
    line = before.slice(before.lastIndexOf('\n') + 1);
  const token = line.match(/[\w!?~:.-]*$/)?.[0] ?? '';
  const from = position - token.length;
  const suffix = source.slice(position).match(/^[\w.-]*/)?.[0] ?? '';
  const context = contextAt(source, position);
  const scope = context.scopes.at(-1)!;
  const names = new Map([
    ...context.names,
    ...(context.scopes.some((scope) => scope.kind === 'flow')
      ? []
      : checkedNames(source, position, checked)),
  ]);
  let options: Completion[] = [];
  const ref = line.lastIndexOf('{{') > line.lastIndexOf('}}');
  if (/^\s*:import\s+$/.test(line)) {
    options = entries
      .filter((entry) => entry.import_reference)
      .map((entry) =>
        item(
          entry.name,
          `${JSON.stringify(entry.import_reference)} as helper`,
          `Pinned import · ${entry.title}`,
        ),
      );
  } else if (/\?~\s*[\w-]*$/.test(line)) {
    options = [...context.classifiers].map(([name, type]) =>
      item(name, name, `Classifier → ${type}`),
    );
  } else if (/!use\s+[\w.-]*$/.test(line)) {
    options = [
      ...context.imports.map((name) => item(name, name, 'Pinned pattern alias')),
      ...context.flows.map((name) => item(name, name, 'Local flow')),
    ];
  } else if (/on user\.message\s*->\s*[\w-]*$/.test(line)) {
    options = context.flows.map((name) => item(name, name, 'Active-pattern message handler'));
  } else if (/->\s*[\w-]*$/.test(line) && !/^\s*fn\b/.test(line)) {
    options = [...source.matchAll(/^([A-Za-z_][\w-]*):\s*$/gm)].map((m) =>
      item(m[1]!, m[1]!, 'Branch label'),
    );
    options.push(item('end', 'end', 'Finish the pattern'));
    if (context.scopes.some((s) => s.kind === 'each' || s.kind === 'collect'))
      options.push(item('yield', 'yield ¦value', "Return this iteration's value"));
    if (context.scopes.some((s) => s.kind === 'loop'))
      options.push(
        item('repeat', 'repeat ¦value', 'Next loop state'),
        item('break', 'break', 'Leave loop'),
      );
    if (context.scopes.some((s) => s.kind === 'refine'))
      options.push(item('propose', 'propose ¦wording', 'Return wording for review'));
  } else if (/^\s*:case\s+[\w.]*$/.test(line)) {
    const [name, ...fields] = (scope.subject ?? '').split('.');
    let type = names.get(name!);
    for (const field of fields) type = recordFields(type)?.[field];
    const variants = typeof type === 'string' ? context.enums.get(type) : enumVariants(type);
    const prefix = token.includes('.') ? token.slice(0, token.lastIndexOf('.') + 1) : '';
    options = (variants ?? []).map((variant) =>
      item(prefix + variant, prefix + variant, 'Enum case'),
    );
  } else if (/!(choose|rank|refine)(?:\s+[\w-]+)?\s*\[[^\]]*$/.test(line)) {
    const kind = line.match(/!(choose|rank|refine)\b/)![1];
    const supplied = line
      .slice(line.lastIndexOf('[') + 1)
      .split(',')
      .slice(0, -1)
      .map((value) => value.trim().split('=')[0]);
    options = parameterSuggestions(kind, supplied);
  } else if (ref || !isProseScope(scope.kind) || /^\s*[:!?]/.test(line)) {
    // Do not intrude in ordinary quoted text, comments, or prose. Interpolations are an exception.
    const unquoted = line.replace(/"(?:\\.|[^"\\])*"/g, '""');
    if (!ref && (line.trimStart().startsWith('#') || (unquoted.match(/"/g)?.length ?? 0) % 2 === 1))
      return { from, to: position, items: [] };
    if (token.includes('.')) {
      const [root, ...fields] = token.split('.');
      const partial = fields.pop() ?? '';
      let type = names.get(root!);
      for (const field of fields) type = recordFields(type)?.[field];
      const prefix = [root, ...fields].join('.') + '.';
      options =
        !ref && context.enums.has(root!) && fields.length === 0
          ? context.enums
              .get(root!)!
              .map((variant) => item(prefix + variant, prefix + variant, 'Enum variant'))
          : Object.keys(recordFields(type) ?? {})
              .filter((field) => field.startsWith(partial))
              .map((field) => item(prefix + field, prefix + field, 'Record field'));
    } else if (token.startsWith(':')) {
      options = attributeSuggestions(
        scope.kind,
        context.scopes.some((s) => s.kind === 'form'),
      );
    } else {
      options = [...names.keys()].map((name) =>
        item(name, name, 'Binding · compiler checks availability'),
      );
      if (!ref) {
        const bound = /^\s*[\w-]+\s*=/.test(line);
        options.push(...commandSnippets(bound));
        options.push(...pureFunctionSuggestions(/\|>\s*\w*$/.test(line)));
        options.push(
          ...context.helpers.map((name) => item(name, `${name}(¦)`, 'Declared pure helper')),
        );
        options.push(
          ...[...context.enums.keys()].map((name) => item(name, name + '.', 'Enum type')),
        );
        if (/\|>\s*\w*$/.test(line))
          options.push(
            ...['select', 'filter', 'rank'].map((name) =>
              item(name, `${name} ~ ¦Criteria`, 'AI suggestion · not participant choice'),
            ),
          );
      }
    }
  }
  const seen = new Set<string>();
  return {
    from,
    to: position + suffix.length,
    items: options
      .filter((option) => {
        if (!option.label.toLowerCase().startsWith(token.toLowerCase()) || seen.has(option.insert))
          return false;
        seen.add(option.insert);
        return true;
      })
      .slice(0, 30),
  };
}
