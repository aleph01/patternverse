import { z } from 'zod';

export const ARTICLE_VIDEO_LANGUAGE = 'patternverse-video';

const schema = z
  .object({
    url: z.string().url(),
    title: z.string().trim().min(1).max(160),
    start_seconds: z.number().int().min(0).default(0),
  })
  .strict();

/** Article videos use the existing player; arbitrary frames and autoplay stay unavailable. */
export function parseArticleVideo(source: string) {
  try {
    const result = schema.safeParse(JSON.parse(source));
    if (!result.success) return undefined;
    const input = result.data;
    const url = new URL(input.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;
    const youtube = ['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(url.hostname);
    const id =
      url.hostname === 'youtu.be'
        ? url.pathname.slice(1)
        : youtube && url.pathname === '/watch'
          ? url.searchParams.get('v')
          : youtube && /^\/(embed|shorts)\//.test(url.pathname)
            ? url.pathname.split('/')[2]
            : undefined;
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return undefined;
    return {
      url: input.url,
      provider: 'youtube' as const,
      id,
      title: input.title,
      start_seconds: input.start_seconds,
      end_seconds: null,
      autoplay: false,
      muted: false,
      loop_video: false,
      captions: null,
    };
  } catch {
    return undefined;
  }
}
