/** Source splices for local blocks. Rust validates the complete candidate before application. */
import { byteOffset, newBlock, patchSource, type BlockKind, type SourcePatch } from './blocks';
import { sourceSelection, type SourceStatement } from './types';

export function optionalQuestionPatches(
  source: string,
  statement: SourceStatement,
  optional: boolean,
): SourcePatch[] {
  const [start] = sourceSelection(source, statement.span);
  const end = source.indexOf('\n', start);
  const header = source.slice(start, end < 0 ? source.length : end);
  const next = header
    .replace(/\s*\[optional\]/, '')
    .replace(/!ask\b/, `!ask${optional ? ' [optional]' : ''}`);
  return [
    {
      span: { start: statement.span.start, end: byteOffset(source, start + header.length) },
      replacement: next,
    },
    ...statement.attributes
      .filter(
        (a) => a.name === 'required' && sourceSelection(source, a.span)[0] > start + header.length,
      )
      .map((a) => ({ span: a.span, replacement: '' })),
  ];
}

export function insertLocalBlock(
  source: string,
  container: SourceStatement,
  kind: BlockKind,
): string {
  const [start, end] = sourceSelection(source, container.span);
  const closeLine = source.lastIndexOf('\n', end - 2) + 1;
  const startLine = source.lastIndexOf('\n', start - 1) + 1;
  const indent = source.slice(startLine, start) + '  ';
  const text =
    newBlock(source, kind)
      .trimEnd()
      .split('\n')
      .map((line) => indent + line)
      .join('\n') + '\n';
  const position = byteOffset(source, closeLine);
  return patchSource(source, [{ span: { start: position, end: position }, replacement: text }]);
}

export function replaceLocalCondition(
  source: string,
  arm: SourceStatement,
  condition: string,
): string {
  if (!arm.argument || arm.kind === 'arm_else') return source;
  return patchSource(source, [{ span: arm.argument.span, replacement: condition }]);
}
