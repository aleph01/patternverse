export type DownloadOptions = Readonly<{ revokeAfterMs?: number }>;

/** Browser-only, user-initiated transfer. No storage, upload, or host bridge calls. */
export function downloadBlob(blob: Blob, filename: string, options: DownloadOptions = {}): void {
  const url = URL.createObjectURL(blob);
  let link: HTMLAnchorElement | undefined;
  try {
    link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    // Leave the URL available while the browser starts reading the file.
    window.setTimeout(() => URL.revokeObjectURL(url), options.revokeAfterMs ?? 1000);
  } catch (cause) {
    // A failed preparation/click must not leave private content in a live object URL.
    URL.revokeObjectURL(url);
    throw cause;
  } finally {
    link?.remove();
  }
}

/** Formats and filenames are chosen by the feature, not the browser adapter. */
export function downloadText(
  content: string,
  filename: string,
  type = 'application/json',
  options?: DownloadOptions,
): void {
  downloadBlob(new Blob([content], { type }), filename, options);
}
