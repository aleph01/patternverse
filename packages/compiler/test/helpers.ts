import type { PatternverseSource } from '@patternverse/schema';

import { parseMarkdownEntity, type ParsedEntity } from '../src/index.js';

export const markdown = (frontmatter: string, body = ''): string =>
  `---\n${frontmatter.trim()}\n---\n\n${body.trim()}\n`;

export const parseEntity = (
  frontmatter: string,
  body = '',
  sourceId = 'commons',
  sourcePath = `content/example.md`,
): ParsedEntity => {
  const result = parseMarkdownEntity(markdown(frontmatter, body), { sourceId, sourcePath });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (!result.entity || errors.length > 0) {
    throw new Error(`Fixture failed to parse: ${JSON.stringify(result.diagnostics)}`);
  }
  return result.entity;
};

export const source = (id: string, readonly = true): PatternverseSource => ({
  id,
  name: id === 'commons' ? 'Patternverse Commons' : id,
  readonly,
});
