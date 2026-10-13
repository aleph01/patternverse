import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { RootContent, Root } from 'mdast';
import { executePatternRequest } from '$lib/pattern-runtime/wasm';

export type Worksheet = {
  title: string;
  markdown: string;
  fidelity: 'complete' | 'adapted' | 'partial';
  notices: string[];
};
export type WorksheetDefinition = { source: string } | { techniqueId: string };
export type WorksheetAvailability = { available: boolean; reason?: string };

export function worksheetDefinitionKey(definition: WorksheetDefinition): string {
  return 'source' in definition
    ? `source:${definition.source}`
    : `catalog:${definition.techniqueId}`;
}
const availability = new Map<string, Promise<WorksheetAvailability>>();

/** The shared core admits the complete pinned definition; UI never guesses from source text. */
export function inspectWorksheet(definition: WorksheetDefinition): Promise<WorksheetAvailability> {
  const key = worksheetDefinitionKey(definition);
  const cached = availability.get(key);
  if (cached) return cached;
  const request = executePatternRequest('source', {
    operation: 'worksheet_availability',
    ...('source' in definition
      ? { source: definition.source }
      : { technique_id: definition.techniqueId }),
  }).then((result) => result as WorksheetAvailability);
  if (availability.size >= 32) availability.delete(availability.keys().next().value!);
  availability.set(key, request);
  void request.catch(() => {
    if (availability.get(key) === request) availability.delete(key);
  });
  return request;
}

/** Only a definition crosses the core boundary. Never accept run state or answers. */
export async function exportWorksheet(definition: WorksheetDefinition): Promise<Worksheet> {
  const result = (await executePatternRequest('source', {
    operation: 'worksheet',
    ...('source' in definition
      ? { source: definition.source }
      : { technique_id: definition.techniqueId }),
  })) as Worksheet;
  return result;
}

/** Formatting projection only: uses the Markdown parser, not Pattern Language semantics. */
export function worksheetPlainText(markdown: string): string {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root;
  function text(node: Root | RootContent): string {
    switch (node.type) {
      case 'root':
        return node.children.map(text).join('\n\n');
      case 'text':
      case 'inlineCode':
      case 'code':
        return node.value;
      case 'html':
        return ''; // Match the safe preview: HTML is not executable content.
      case 'break':
        return '\n';
      case 'thematicBreak':
        return '────────────────';
      case 'image':
        return node.alt ?? '';
      case 'link':
        return `${node.children.map(text).join('')}${node.url.startsWith('https://') ? ` (${node.url})` : ''}`;
      case 'list':
        return node.children
          .map((item, index) => {
            const marker =
              item.checked === true
                ? '☑'
                : item.checked === false
                  ? '☐'
                  : node.ordered
                    ? `${(node.start ?? 1) + index}.`
                    : '•';
            return `${marker} ${item.children.map(text).join('\n').replace(/\n/g, '\n  ')}`;
          })
          .join('\n');
      case 'table':
        return node.children
          .map((row) => row.children.map((cell) => cell.children.map(text).join('')).join(' — '))
          .join('\n');
      case 'blockquote':
        return node.children.map(text).join('\n\n');
      default:
        return 'children' in node
          ? node.children.map((child) => text(child as RootContent)).join('')
          : '';
    }
  }
  return `${text(tree).trim()}\n`;
}

export function worksheetFilename(title: string, format: 'md' | 'txt'): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'pattern';
  return `${slug}-worksheet.${format}`;
}
