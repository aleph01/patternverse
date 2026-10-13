import type { Structure, StructureStep } from '../types';
import type { CheckedSource } from './types';

/** Use compiler types only when all text before the edited line is still identical. */
export function checkedNames(source: string, position: number, checked?: CheckedSource) {
  const names = new Map<string, unknown>();
  const start = source.lastIndexOf('\n', position - 1) + 1;
  if (!checked || checked.source.slice(0, start) !== source.slice(0, start)) return names;
  const offset = new TextEncoder().encode(source.slice(0, position)).length;
  for (const [name, type] of Object.entries(checked.structure.inputs)) names.set(name, type);
  function visit(steps: StructureStep[], bindings: Structure['bindings']) {
    for (const binding of bindings) {
      const step = steps.find((step) => step.binding === binding.name);
      if (binding.span.end <= offset && (!step || step.span.end <= offset))
        names.set(binding.name, binding.value_type);
    }
    for (const step of steps)
      if (step.span.start < offset && step.span.end >= offset) visit(step.children, step.locals);
  }
  visit(checked.structure.steps, checked.structure.bindings);
  return names;
}

/** Extract only compiler-projected structural fields, never infer them from user text. */
export function recordFields(type: unknown): Record<string, unknown> | undefined {
  if (type === 'choice') return { value: 'text', label: 'text' };
  if (
    type &&
    typeof type === 'object' &&
    'record' in type &&
    type.record &&
    typeof type.record === 'object'
  )
    return type.record as Record<string, unknown>;
}
/** Extract compiler-projected closed enum variants for case completion. */
export function enumVariants(type: unknown): string[] | undefined {
  if (
    type &&
    typeof type === 'object' &&
    'enum' in type &&
    type.enum &&
    typeof type.enum === 'object' &&
    'variants' in type.enum &&
    Array.isArray(type.enum.variants)
  )
    return type.enum.variants.filter((v) => typeof v === 'string');
}
