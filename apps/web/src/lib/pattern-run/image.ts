/** Literal display configuration emitted by the Rust language engine. */
export interface PatternImage {
  url: string;
  alt: string;
  title: string | null;
}

export function isPatternImage(value: unknown): value is PatternImage {
  if (!value || typeof value !== 'object') return false;
  const image = value as PatternImage;
  if (
    typeof image.url !== 'string' ||
    typeof image.alt !== 'string' ||
    (image.title !== null && typeof image.title !== 'string')
  )
    return false;
  try {
    const url = new URL(image.url);
    return (
      url.protocol === 'https:' &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port
    );
  } catch {
    return false;
  }
}
