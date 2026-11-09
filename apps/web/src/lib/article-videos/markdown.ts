import { ARTICLE_VIDEO_LANGUAGE, parseArticleVideo } from '@patternverse/compiler/article-video';
import type { Paragraph, Root } from 'mdast';
import { SKIP, visit } from 'unist-util-visit';

/** A validated fence produces an inert mount point and a readable source link. */
export function remarkArticleVideos() {
  return (tree: Root): void => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== ARTICLE_VIDEO_LANGUAGE || index === undefined || !parent) return;
      const video = parseArticleVideo(node.value);
      if (!video) return;
      const data: Paragraph['data'] = {
        hName: 'div',
        hProperties: {
          dataArticleVideo: JSON.stringify({
            url: video.url,
            title: video.title,
            start_seconds: video.start_seconds,
          }),
        },
        hChildren: [
          {
            type: 'element',
            tagName: 'a',
            properties: { href: video.url },
            children: [{ type: 'text', value: video.title }],
          },
        ],
      };
      parent.children.splice(index, 1, { type: 'paragraph', children: [], data });
      return [SKIP, index + 1];
    });
  };
}
