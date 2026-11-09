/** The accepted page data identifies the exact public corpus, independently of chunk names. */
export type LibrarySearchAsset = Readonly<{ path: string; sha256: string }>;

export const isLibrarySearchPath = (path: string): boolean =>
  /^\/library\/search\/[a-f0-9]{64}\.json$/.test(path);

export async function searchAssetDigest(bytes: ArrayBuffer): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
