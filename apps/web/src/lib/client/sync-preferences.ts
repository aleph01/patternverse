export const AUTO_SYNC_KEY = 'patternverse:dropbox:auto-sync:v1';
export const SYNC_PREFERENCES_CHANGED = 'patternverse:sync-preferences-changed';
export const DROPBOX_CONNECTION_CHANGED = 'patternverse:dropbox-connection-changed';

/** Device-only preference; never included in a Dropbox snapshot. Storage failure
 * disables unattended uploads rather than pretending the preference was saved.
 */
export function readAutomaticSync(): boolean {
  try {
    return localStorage.getItem(AUTO_SYNC_KEY) !== 'false';
  } catch {
    return false;
  }
}

export function saveAutomaticSync(enabled: boolean): void {
  localStorage.setItem(AUTO_SYNC_KEY, String(enabled));
  window.dispatchEvent(new Event(SYNC_PREFERENCES_CHANGED));
}
