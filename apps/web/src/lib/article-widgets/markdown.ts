import { ARTICLE_WIDGET_LANGUAGE, parseArticleWidget } from '@patternverse/compiler/article-widget';
import type { Paragraph, Root } from 'mdast';
import { SKIP, visit } from 'unist-util-visit';

/** Only this parsed fence creates a mount point; authored raw HTML remains disabled. */
export function remarkArticleWidgets() {
  return (tree: Root): void => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== ARTICLE_WIDGET_LANGUAGE || index === undefined || !parent) return;
      const widget = parseArticleWidget(node.value);
      if (!widget) return;
      const data: Paragraph['data'] = {
        hName: 'div',
        hProperties: { dataArticleWidget: JSON.stringify(widget) },
        hChildren: [
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [{ type: 'text', value: `${widget.title}: ${widget.fallback}` }],
          },
        ],
      };
      // Replacing the code node avoids the code handler's surrounding <pre>.
      parent.children.splice(index, 1, { type: 'paragraph', children: [], data });
      return [SKIP, index + 1];
    });
  };
}
