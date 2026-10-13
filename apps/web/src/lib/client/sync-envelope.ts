/** Shared encryption for the deployed v1 adapter and the not-yet-enabled v2 snapshot. */
export type SyncEnvelope<V extends 1 | 2 = 1 | 2> = Readonly<{
  version: V;
  salt: string;
  iv: string;
  data: string;
}>;
export const MAX_SYNC_DOCUMENT_BYTES = 8 * 1024 * 1024;
const ITERATIONS = 600_000;
const encoder = new TextEncoder();
const associatedData = (version: 1 | 2, salt: string): Uint8Array<ArrayBuffer> =>
  encoder.encode(version === 1 ? 'patternverse-sync-v1' : `patternverse-sync-v2:${salt}`);

export const randomSyncBytes = (size: number): Uint8Array<ArrayBuffer> =>
  crypto.getRandomValues(new Uint8Array(new ArrayBuffer(size)));

export function syncBase64(value: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < value.length; offset += 8192)
    binary += String.fromCharCode(...value.slice(offset, offset + 8192));
  return btoa(binary);
}

export function syncUnbase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function deriveSyncKey(phrase: string, salt: string): Promise<CryptoKey> {
  if (phrase.length < 12) throw new Error('Use a sync phrase of at least 12 characters.');
  const saltBytes = syncUnbase64(salt);
  if (saltBytes.byteLength !== 16) throw new Error('Invalid sync salt.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(phrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function sealSyncDocument<V extends 1 | 2>(
  bytes: Uint8Array,
  key: CryptoKey,
  salt: string,
  version: V,
): Promise<SyncEnvelope<V>> {
  if (bytes.byteLength > MAX_SYNC_DOCUMENT_BYTES) throw new Error('The sync archive exceeds 8 MB.');
  if (syncUnbase64(salt).byteLength !== 16) throw new Error('Invalid sync salt.');
  const iv = randomSyncBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: associatedData(version, salt) },
    key,
    new Uint8Array(bytes),
  );
  return { version, salt, iv: syncBase64(iv), data: syncBase64(new Uint8Array(ciphertext)) };
}

export async function openSyncDocument(
  envelope: SyncEnvelope,
  key: CryptoKey,
): Promise<Uint8Array> {
  try {
    if (
      (envelope.version !== 1 && envelope.version !== 2) ||
      typeof envelope.data !== 'string' ||
      envelope.data.length > Math.ceil((MAX_SYNC_DOCUMENT_BYTES + 16) / 3) * 4 ||
      syncUnbase64(envelope.salt).byteLength !== 16
    )
      throw new Error('Invalid sync envelope.');
    const iv = syncUnbase64(envelope.iv);
    const ciphertext = syncUnbase64(envelope.data);
    if (iv.byteLength !== 12 || ciphertext.byteLength > MAX_SYNC_DOCUMENT_BYTES + 16)
      throw new Error('Invalid sync envelope.');
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: associatedData(envelope.version, envelope.salt) },
      key,
      ciphertext,
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new Error('The sync phrase did not unlock the Dropbox data, or the archive is damaged.');
  }
}
