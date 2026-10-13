import {
  entityIdSchema,
  entityMetadataSchema,
  rawEntitySchema,
  type Entity,
  type PracticeDefinition,
} from '@patternverse/schema';
import type { Code, Root, Text } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { parse as parseYaml } from 'yaml';

import { diagnosticsFromZodError } from './diagnostics.js';
import { legacyPracticeSource, parseLegacyPracticeYaml } from './legacy-practice.js';
import type {
  AuthoredWikiLink,
  CompilerDiagnostic,
  ParseEntityOptions,
  ParseEntityResult,
} from './types.js';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const WIKI_LINK_PATTERN = /\[\[([^\]\n]+)\]\]/g;

const allowedFieldsByType = {
  pattern: new Set([
    'id',
    'type',
    'title',
    'summary',
    'status',
    'aliases',
    'tags',
    'verses',
    'attribution',
    'copied_from',
  ]),
  concept: new Set([
    'id',
    'type',
    'title',
    'summary',
    'status',
    'aliases',
    'tags',
    'verses',
    'attribution',
    'copied_from',
  ]),
  practice: new Set([
    'id',
    'type',
    'title',
    'summary',
    'status',
    'aliases',
    'tags',
    'verses',
    'attribution',
    'copied_from',
    'implements',
    'duration_minutes',
  ]),
  collection: new Set([
    'id',
    'type',
    'title',
    'summary',
    'status',
    'aliases',
    'tags',
    'verses',
    'attribution',
    'copied_from',
    'items',
  ]),
  verse: new Set([
    'id',
    'type',
    'title',
    'summary',
    'status',
    'aliases',
    'tags',
    'attribution',
    'copied_from',
  ]),
} satisfies Record<string, ReadonlySet<string>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stripUnknownTopLevelFields = (value: unknown): unknown => {
  if (!isRecord(value) || typeof value.type !== 'string' || !(value.type in allowedFieldsByType)) {
    return value;
  }

  const allowed = allowedFieldsByType[value.type as keyof typeof allowedFieldsByType];
  return Object.fromEntries(Object.entries(value).filter(([key]) => allowed.has(key)));
};

const lineForMatch = (node: Text, matchIndex: number): number | undefined => {
  if (!node.position?.start.line) return undefined;
  return node.position.start.line + node.value.slice(0, matchIndex).split('\n').length - 1;
};

export const parseWikiTarget = (
  rawTarget: string,
  line?: number,
): { readonly link?: AuthoredWikiLink; readonly diagnostic?: CompilerDiagnostic } => {
  const [targetPart, ...labelParts] = rawTarget.split('|');
  const target = targetPart?.trim() ?? '';
  const label = labelParts.length > 0 ? labelParts.join('|').trim() : undefined;
  const separatorIndex = target.indexOf(':');
  const sourceId = separatorIndex >= 0 ? target.slice(0, separatorIndex) : undefined;
  const entityId = separatorIndex >= 0 ? target.slice(separatorIndex + 1) : target;

  if (
    !entityIdSchema.safeParse(entityId).success ||
    (sourceId !== undefined && !entityIdSchema.safeParse(sourceId).success) ||
    (labelParts.length > 0 && !label)
  ) {
    return {
      diagnostic: {
        code: 'invalid-wiki-link',
        severity: 'error',
        line,
        reference: rawTarget,
        message:
          'Wiki links must use [[entity-id]], [[entity-id|label]], or [[source-id:entity-id]].',
      },
    };
  }

  return {
    link: {
      raw: `[[${rawTarget}]]`,
      entityId,
      ...(sourceId ? { sourceId } : {}),
      ...(label ? { label } : {}),
      ...(line ? { line } : {}),
    },
  };
};

const parseBody = (
  body: string,
  entity: Entity,
  sourcePath: string,
): {
  readonly wikiLinks: readonly AuthoredWikiLink[];
  readonly practice?: PracticeDefinition;
  readonly languagePracticeSource?: string;
  readonly diagnostics: readonly CompilerDiagnostic[];
} => {
  const tree = unified().use(remarkParse).parse(body) as Root;
  const wikiLinks: AuthoredWikiLink[] = [];
  const diagnostics: CompilerDiagnostic[] = [];
  const practiceBlocks: Code[] = [];

  visit(tree, 'text', (node: Text) => {
    for (const match of node.value.matchAll(WIKI_LINK_PATTERN)) {
      const parsed = parseWikiTarget(match[1] ?? '', lineForMatch(node, match.index ?? 0));
      if (parsed.link) wikiLinks.push(parsed.link);
      if (parsed.diagnostic) diagnostics.push({ ...parsed.diagnostic, file: sourcePath });
    }
  });

  visit(tree, 'code', (node: Code) => {
    if (node.lang === 'patternverse-practice' || node.lang === 'patternverse-language')
      practiceBlocks.push(node);
  });

  if (practiceBlocks.length > 1) {
    diagnostics.push({
      code: 'multiple-practice-blocks',
      severity: 'error',
      file: sourcePath,
      entity: { sourceId: '', entityId: entity.id },
      message:
        'A Pattern or Practice may contain at most one practice block (structured or Pattern Language).',
    });
  }

  const supportsPractice = entity.type === 'pattern' || entity.type === 'practice';
  if (practiceBlocks.length > 0 && !supportsPractice) {
    diagnostics.push({
      code: 'practice-block-on-non-practice',
      severity: 'error',
      file: sourcePath,
      line: practiceBlocks[0]?.position?.start.line,
      message: 'Only Pattern or Practice entities may contain a practice block.',
    });
  }

  const block = practiceBlocks[0];
  if (!block || !supportsPractice) return { wikiLinks, diagnostics };

  if (block.lang === 'patternverse-language') {
    if (!block.value.trim() || new TextEncoder().encode(block.value).length > 65536) {
      diagnostics.push({
        code: 'invalid-practice-block',
        severity: 'error',
        file: sourcePath,
        message: 'Pattern Language practice must contain source within 64 KiB.',
      });
      return { wikiLinks, diagnostics };
    }
    return { wikiLinks, languagePracticeSource: block.value, diagnostics };
  }

  const result = parseLegacyPracticeYaml(block.value);
  if (!result.success) {
    if (result.kind === 'schema') {
      return {
        wikiLinks,
        diagnostics: [
          ...diagnostics,
          ...diagnosticsFromZodError(result.error, {
            file: sourcePath,
            prefix: 'practice',
          }).map((diagnostic) => ({ ...diagnostic, line: block.position?.start.line })),
        ],
      };
    }

    return {
      wikiLinks,
      diagnostics: [
        ...diagnostics,
        {
          code: 'invalid-practice-block',
          severity: 'error',
          file: sourcePath,
          line: block.position?.start.line,
          message: result.message,
        },
      ],
    };
  }
  return {
    wikiLinks,
    practice: result.practice,
    languagePracticeSource: legacyPracticeSource(result.practice),
    diagnostics,
  };
};

export const parseMarkdownEntity = (
  markdown: string,
  options: ParseEntityOptions,
): ParseEntityResult => {
  const frontmatterMatch = markdown.match(FRONTMATTER_PATTERN);
  if (!frontmatterMatch) {
    return {
      diagnostics: [
        {
          code: 'missing-frontmatter',
          severity: 'error',
          file: options.sourcePath,
          message: 'Entity Markdown must begin with YAML frontmatter delimited by ---.',
        },
      ],
    };
  }

  let frontmatterValue: unknown;
  try {
    frontmatterValue = parseYaml(frontmatterMatch[1] ?? '');
  } catch (error) {
    return {
      diagnostics: [
        {
          code: 'invalid-frontmatter',
          severity: 'error',
          file: options.sourcePath,
          message: error instanceof Error ? error.message : 'Frontmatter is not valid YAML.',
        },
      ],
    };
  }

  const initialMetadataResult = entityMetadataSchema.safeParse(frontmatterValue);
  const unknownFieldSeverity =
    options.unknownFieldPolicy === 'warning' &&
    isRecord(frontmatterValue) &&
    frontmatterValue.status === 'draft'
      ? 'warning'
      : 'error';
  const initialDiagnostics = initialMetadataResult.success
    ? []
    : diagnosticsFromZodError(initialMetadataResult.error, {
        file: options.sourcePath,
        prefix: 'entity',
        unknownFieldSeverity,
      });

  const metadataResult =
    unknownFieldSeverity === 'warning'
      ? entityMetadataSchema.safeParse(stripUnknownTopLevelFields(frontmatterValue))
      : initialMetadataResult;
  const fatalMetadataDiagnostics = initialDiagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );

  if (!metadataResult.success || fatalMetadataDiagnostics.length > 0) {
    return { diagnostics: initialDiagnostics };
  }

  const body = markdown.slice(frontmatterMatch[0].length).trim();
  const rawEntityResult = rawEntitySchema.safeParse({
    ...metadataResult.data,
    body,
    sourceId: options.sourceId,
    sourcePath: options.sourcePath,
  });

  if (!rawEntityResult.success) {
    return {
      diagnostics: [
        ...initialDiagnostics,
        ...diagnosticsFromZodError(rawEntityResult.error, {
          file: options.sourcePath,
          prefix: 'entity',
        }),
      ],
    };
  }

  const bodyResult = parseBody(body, metadataResult.data, options.sourcePath);
  return {
    entity: {
      ...rawEntityResult.data,
      wikiLinks: bodyResult.wikiLinks,
      ...(bodyResult.practice ? { practice: bodyResult.practice } : {}),
      ...(bodyResult.languagePracticeSource
        ? { languagePracticeSource: bodyResult.languagePracticeSource }
        : {}),
    },
    diagnostics: [...initialDiagnostics, ...bodyResult.diagnostics].map((diagnostic) => ({
      ...diagnostic,
      ...(diagnostic.entity
        ? { entity: { sourceId: options.sourceId, entityId: diagnostic.entity.entityId } }
        : {}),
    })),
  };
};
