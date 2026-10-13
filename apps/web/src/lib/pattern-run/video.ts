/** Host playback configuration emitted and validated by the Rust compiler. */
export interface PatternVideo {
  url: string;
  provider: 'youtube' | 'vimeo' | 'dailymotion' | 'file';
  id: string | null;
  title: string | null;
  start_seconds: number;
  end_seconds: number | null;
  autoplay: boolean;
  muted: boolean;
  loop_video: boolean;
  captions: string | null;
}

export function isPatternVideo(value: unknown): value is PatternVideo {
  if (!value || typeof value !== 'object') return false;
  const v = value as PatternVideo;
  return (
    typeof v.url === 'string' &&
    v.url.startsWith('https://') &&
    ['youtube', 'vimeo', 'dailymotion', 'file'].includes(v.provider) &&
    (v.id === null || typeof v.id === 'string') &&
    (v.title === null || typeof v.title === 'string') &&
    Number.isInteger(v.start_seconds) &&
    v.start_seconds >= 0 &&
    (v.end_seconds === null ||
      (Number.isInteger(v.end_seconds) && v.end_seconds > v.start_seconds)) &&
    ['autoplay', 'muted', 'loop_video'].every(
      (key) => typeof v[key as keyof PatternVideo] === 'boolean',
    ) &&
    (v.captions === null || typeof v.captions === 'string')
  );
}

/** All SDKs share this small lifecycle contract; no playback state enters the run journal. */
export interface VideoPlayer {
  play(): Promise<void> | void;
  pause(): Promise<void> | void;
  seek(seconds: number): Promise<unknown> | void;
  destroy(): Promise<void> | void;
}

export function clipPosition(video: PatternVideo, seconds: number): 'start' | 'end' | null {
  if (seconds < video.start_seconds) return 'start';
  if (video.end_seconds !== null && seconds >= video.end_seconds) return 'end';
  return null;
}

/** A requested excerpt that cannot exist is visible as a playback error. */
export function checkVideoDuration(video: PatternVideo, duration: number): void {
  if (!Number.isFinite(duration) || duration <= 0) return;
  if (
    video.start_seconds >= duration ||
    (video.end_seconds !== null && video.end_seconds > duration)
  )
    throw new Error('The selected excerpt is outside this video’s duration.');
}

export function vimeoSource(video: PatternVideo): string {
  const source = new URL(video.url);
  const result = new URL(`https://vimeo.com/${video.id}`);
  const hash = source.searchParams.get('h') ?? source.pathname.split('/').filter(Boolean)[1];
  if (hash && hash !== video.id && /^[a-zA-Z0-9]+$/.test(hash)) result.pathname += `/${hash}`;
  return result.href;
}

/** Vimeo's initial timestamp fragment avoids setCurrentTime starting playback on load. */
export function vimeoEmbedSource(video: PatternVideo): string {
  const share = new URL(vimeoSource(video));
  const result = new URL(`https://player.vimeo.com/video/${video.id}`);
  const hash = share.pathname.split('/').filter(Boolean)[1];
  if (hash) result.searchParams.set('h', hash);
  result.searchParams.set('autoplay', '0');
  result.searchParams.set('muted', String(Number(video.muted)));
  result.searchParams.set('loop', '0');
  result.hash = `t=${video.start_seconds}s`;
  return result.href;
}

export function youtubeSource(video: PatternVideo, origin: string): string {
  const source = new URL(`https://www.youtube-nocookie.com/embed/${video.id}`);
  source.searchParams.set('enablejsapi', '1');
  source.searchParams.set('origin', origin);
  source.searchParams.set('playsinline', '1');
  source.searchParams.set('start', String(video.start_seconds));
  if (video.end_seconds !== null) source.searchParams.set('end', String(video.end_seconds));
  if (video.captions) {
    source.searchParams.set('cc_load_policy', '1');
    source.searchParams.set('cc_lang_pref', video.captions);
  }
  return source.href;
}
