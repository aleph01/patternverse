import { mount, unmount } from 'svelte';
import { parseArticleWidget } from '@patternverse/compiler/article-widget';
import ArticleWidget from './ArticleWidget.svelte';

/** Mount after Markdown DOM updates, and dispose every instance on replacement/navigation. */
export function articleWidgets(element: HTMLElement, html: string) {
  let previous = html;
  let mounted: ReturnType<typeof mount>[] = [];
  const dispose = () => {
    for (const component of mounted) void unmount(component);
    mounted = [];
  };
  const render = () => {
    for (const target of element.querySelectorAll<HTMLElement>('[data-article-widget]')) {
      const widget = parseArticleWidget(target.dataset.articleWidget ?? '');
      if (!widget) continue;
      target.replaceChildren();
      mounted.push(mount(ArticleWidget, { target, props: { widget } }));
    }
  };
  render();
  return {
    update(next: string) {
      if (next === previous) return;
      previous = next;
      dispose();
      render();
    },
    destroy: dispose,
  };
}
