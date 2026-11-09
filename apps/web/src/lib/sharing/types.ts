export type SharedPattern = Readonly<{
  id: string;
  title: string;
  summary: string;
  category: string;
  usefulWhen?: string;
}>;

export type SharedPractice = Readonly<{
  id: string;
  type: 'pattern' | 'practice';
  title: string;
  summary: string;
  durationMinutes?: number;
}>;

export type PatternShare = Readonly<{
  pattern: SharedPattern;
  practices: readonly SharedPractice[];
}>;

const publicOrigin = 'https://patternverse.org';
export const patternShareUrl = (id: string): string =>
  `${publicOrigin}/pattern/${encodeURIComponent(id)}`;

export function embedCode(path: string, title: string, practice: boolean): string {
  const escape = (text: string) =>
    text
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  return `<iframe src="${escape(new URL(path, publicOrigin).href)}" title="${escape(title)}" width="100%" height="${practice ? 640 : 440}" style="border:0;max-width:680px" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>`;
}
