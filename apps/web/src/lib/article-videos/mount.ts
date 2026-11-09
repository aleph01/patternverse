import { mount, unmount } from 'svelte';
import { parseArticleVideo } from '@patternverse/compiler/article-video';
import PatternVideo from '$lib/components/PatternVideo.svelte';

/** Use the shared player and dispose its frames and SDK listeners on article navigation. */
export function articleVideos(element: HTMLElement, html: string) {
  let previous = html;
  let mounted: ReturnType<typeof mount>[] = [];
  const dispose = () => {
    for (const component of mounted) void unmount(component);
    mounted = [];
  };
  const render = () => {
    for (const target of element.querySelectorAll<HTMLElement>('[data-article-video]')) {
      const video = parseArticleVideo(target.dataset.articleVideo ?? '');
      if (!video) continue;
      target.replaceChildren();
      mounted.push(mount(PatternVideo, { target, props: { video } }));
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
