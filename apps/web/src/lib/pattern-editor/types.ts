export interface SourceSpan {
  start: number;
  end: number;
}
export interface BindingInspection {
  name: string;
  slot: number;
  value_type: unknown;
  span: SourceSpan;
}
export interface StructureStep {
  kind: string;
  binding: string | null;
  dependency: string | null;
  targets: number[];
  span: SourceSpan;
  locals: BindingInspection[];
  children: StructureStep[];
  text?: string;
  edges?: { target: number; label: string }[];
}
export interface SourceField {
  value: string;
  span: SourceSpan;
}
export interface SourceAttribute {
  name: string;
  span: SourceSpan;
  args: SourceField[];
  raw: string;
}
export interface SourceStatement {
  kind: string;
  span: SourceSpan;
  binding: SourceField | null;
  argument: SourceField | null;
  body: SourceField | null;
  attributes: SourceAttribute[];
}
export interface PathArm {
  attribute: SourceSpan;
  value: string;
  rule: { response: string; operator: string; value: number } | null;
  target: string;
  content: SourceSpan;
  terminal: SourceSpan;
  destination: string;
}
export interface Paths {
  control: SourceSpan;
  span: SourceSpan;
  mode: 'match' | 'branch';
  response: string | null;
  arms: PathArm[];
  continuation: string | null;
  continuation_span: SourceSpan | null;
}
export interface Structure {
  title: string | null;
  revision: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  bindings: BindingInspection[];
  steps: StructureStep[];
  source_statements?: SourceStatement[];
  paths?: Paths[];
  dependencies: Record<string, string>;
}
export interface CompletionLibraryEntry {
  name: string;
  title: string;
  import_reference?: string;
}
export interface SourceDiagnostic {
  severity: 'Error' | 'Warning';
  message: string;
  primary: SourceSpan;
  help?: string | null;
}
export interface Inspection {
  diagnostics: SourceDiagnostic[];
  structure: Structure | null;
}

/** Mira's byte-to-DOM selection conversion, preserving accents and surrogate pairs. */
export function sourceSelection(source: string, span: SourceSpan): [number, number] {
  const bytes = new TextEncoder().encode(source);
  const decoder = new TextDecoder();
  return [
    decoder.decode(bytes.slice(0, span.start)).length,
    decoder.decode(bytes.slice(0, span.end)).length,
  ];
}
