import type { z } from 'zod';

import type { CompilerDiagnostic } from './types.js';

const fieldPath = (path: readonly PropertyKey[]): string | undefined =>
  path.length > 0 ? path.map(String).join('.') : undefined;

export const diagnosticsFromZodError = (
  error: z.ZodError,
  input: {
    readonly file?: string;
    readonly prefix: 'manifest' | 'entity' | 'practice';
    readonly unknownFieldSeverity?: 'error' | 'warning';
  },
): readonly CompilerDiagnostic[] =>
  error.issues.reduce<CompilerDiagnostic[]>((diagnostics, issue) => {
    if (issue.code === 'unrecognized_keys') {
      return [
        ...diagnostics,
        ...issue.keys.map((key) => ({
          code: 'unknown-field' as const,
          severity: input.unknownFieldSeverity ?? ('error' as const),
          file: input.file,
          field: key,
          message: `Unknown ${input.prefix} field "${key}". Patternverse does not silently accept schema extensions.`,
        })),
      ];
    }

    return [
      ...diagnostics,
      {
        code:
          input.prefix === 'manifest'
            ? ('invalid-manifest' as const)
            : input.prefix === 'practice'
              ? ('invalid-practice-block' as const)
              : ('invalid-entity' as const),
        severity: 'error' as const,
        file: input.file,
        field: fieldPath(issue.path),
        message: issue.message,
      },
    ];
  }, []);

export const formatDiagnostic = (diagnostic: CompilerDiagnostic): string => {
  const location = [diagnostic.file, diagnostic.line ? `line ${diagnostic.line}` : undefined]
    .filter(Boolean)
    .join(':');
  const context = [
    diagnostic.entity
      ? `Entity: ${diagnostic.entity.sourceId}:${diagnostic.entity.entityId}`
      : undefined,
    diagnostic.field ? `Field: ${diagnostic.field}` : undefined,
    diagnostic.reference ? `Reference: ${diagnostic.reference}` : undefined,
  ].filter(Boolean);
  const suggestion = diagnostic.suggestion ? `\n  Suggestion: ${diagnostic.suggestion}` : '';

  return `${diagnostic.severity.toUpperCase()} ${diagnostic.code}${location ? `\n${location}` : ''}${context.length > 0 ? `\n${context.join('\n')}` : ''}\n  ${diagnostic.message}${suggestion}`;
};

export const hasErrors = (diagnostics: readonly CompilerDiagnostic[]): boolean =>
  diagnostics.some((diagnostic) => diagnostic.severity === 'error');
