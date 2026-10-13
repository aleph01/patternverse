import type { EntityRef } from '@patternverse/schema';
import { getLocalWorkspace } from './workspace';

export async function setLibrarySaved(ref: EntityRef, saved: boolean): Promise<void> {
  await (await getLocalWorkspace()).setSavedEntry(ref, saved);
  // Notify only after a successful write. Other visible library projections refresh from storage.
}
