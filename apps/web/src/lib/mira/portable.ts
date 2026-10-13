import { transition } from '@patternverse/companion-core';
import type { PrivateMiraStore } from './private-store';
import { validateGuidedSaved } from './guided';
import { readPortableArchive } from './portable-format';

export { exportPortableArchive, readPortableArchive } from './portable-format';

/** Merge a user-selected archive without overwriting existing sessions or prompts. */
export async function importPortableArchive(
  store: PrivateMiraStore,
  raw: string,
  passphrase: string,
  cryptography: Crypto = crypto,
  validateRun: (saved: unknown) => Promise<void> = validateGuidedSaved,
): Promise<number> {
  const payload = await readPortableArchive(raw, passphrase, cryptography);
  await Promise.all(payload.runs.map((run) => validateRun(run.saved)));
  const existing = await store.list();
  const ids = new Set(existing.map((session) => session.id));
  const importedIds = new Map<string, string>();
  const imports = payload.sessions.map((session) => {
    let id = session.id;
    while (ids.has(id)) id = cryptography.randomUUID();
    ids.add(id);
    importedIds.set(session.id, id);
    const unique = id === session.id ? session : { ...session, id };
    return unique.pendingReplyId
      ? transition(unique, {
          type: 'reply-failed',
          replyId: unique.pendingReplyId,
          at: new Date().toISOString(),
        }).session
      : unique;
  });
  for (const session of imports) await store.save(session);
  for (const run of payload.runs) {
    const id = importedIds.get(run.sessionId);
    if (!id) throw new Error('The archive contains an unmatched guided exercise.');
    await store.saveRun(id, run.saved, null);
  }
  const settings = await store.loadSettings();
  await store.saveSettings({
    ...settings,
    promptOverrides: { ...payload.promptOverrides, ...settings.promptOverrides },
  });
  return imports.length;
}
