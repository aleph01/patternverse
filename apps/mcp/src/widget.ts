import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import type { PublicLibrary } from './library.js';

export const INLINE_PRACTICE_ID = 'define-the-decision-before-comparing-options';
export const WIDGET_URI = 'ui://patternverse/define-the-decision/v1.html';
export const WIDGET_MIME = 'text/html;profile=mcp-app';
export type PracticeWidget = { html: string; revision: string };
const inputSchema = z
  .object({ id: z.literal(INLINE_PRACTICE_ID).default(INLINE_PRACTICE_ID) })
  .strict();
const outputSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal(INLINE_PRACTICE_ID),
  title: z.string(),
  revision: z.string(),
  url: z.string().url(),
  execution: z.literal('widget-local'),
  privacy: z.string(),
  fallback: z.string(),
});

/** Presentation/host adapter only. The server never accepts responses or runs a practice. */
export function registerPracticeWidget(
  server: McpServer,
  library: PublicLibrary,
  widget: PracticeWidget,
) {
  server.registerResource(
    'decision-practice',
    WIDGET_URI,
    {
      title: 'Define the Decision',
      mimeType: WIDGET_MIME,
    },
    async () => ({
      contents: [
        {
          uri: WIDGET_URI,
          mimeType: WIDGET_MIME,
          text: widget.html,
          _meta: {
            ui: {
              prefersBorder: true,
              csp: {
                connectDomains: ['https://patternverse.org'],
                resourceDomains: ['https://patternverse.org'],
              },
            },
            'openai/ui': { availableDisplayModes: ['inline'], preferredDisplayMode: 'inline' },
            'openai/widgetDescription':
              'An ephemeral decision worksheet. Answers stay inside the widget and are not sent to the model or server.',
          },
        },
      ],
    }),
  );
  server.registerTool(
    'open_practice',
    {
      title: 'Define the Decision',
      description:
        'Open Define the Decision as an interactive inline worksheet. This first release supports only define-the-decision-before-comparing-options. Runs locally inside a supported MCP Apps host, without AI, saving or answer sharing. For other practices use get_practice or the website. No user answers accepted.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: WIDGET_URI, visibility: ['model'] },
        'openai/outputTemplate': WIDGET_URI,
      },
    },
    async () => {
      const definition = library.getPractice(INLINE_PRACTICE_ID);
      if (definition.revision !== widget.revision || definition.dependencies.length) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'This widget needs a rebuild. Use the public practice link instead.',
            },
          ],
        };
      }
      const data = {
        schemaVersion: 1 as const,
        id: INLINE_PRACTICE_ID,
        title: 'Define the Decision',
        revision: definition.revision,
        url: definition.entry.url,
        execution: 'widget-local' as const,
        privacy:
          'Answers remain in memory inside this open widget. Nothing is saved or sent to the model or MCP server. Closing or restarting clears the run.',
        fallback: `If inline UI is unavailable, open ${definition.entry.url} to use the worksheet, or retrieve its definition with get_practice.`,
      };
      return {
        structuredContent: data,
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
