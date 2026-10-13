import { parsePracticeRun, type SavedPracticeRun } from '../practice-history.js';
import type { LocalWorkspace } from '../api.js';
import type { PersistenceContext } from './context.js';
export function createPracticeRunOperations(
  context: PersistenceContext,
): Pick<
  LocalWorkspace,
  | 'getPracticeRun'
  | 'savePracticeRun'
  | 'listPracticeRuns'
  | 'renamePracticeRun'
  | 'deletePracticeRun'
> {
  const { database, metadata, now } = context;
  const getPracticeRun: LocalWorkspace['getPracticeRun'] = async (id) => {
    const workspace = await metadata();
    const run = await database.practiceRuns.get(id);
    return run?.workspaceId === workspace.id ? run : undefined;
  };
  const savePracticeRun: LocalWorkspace['savePracticeRun'] = async (value) => {
    const input = parsePracticeRun(value);
    const workspace = await metadata();
    return database.transaction('rw', database.practiceRuns, async () => {
      const existing = await database.practiceRuns.get(input.id);
      if (
        existing &&
        (existing.workspaceId !== workspace.id ||
          existing.patternRef.sourceId !== input.patternRef.sourceId ||
          existing.patternRef.entityId !== input.patternRef.entityId)
      )
        throw new Error('This saved run belongs to a different practice or workspace.');
      if (existing && input.revision < existing.revision)
        throw new Error('This practice changed elsewhere. Reopen its saved run before continuing.');
      if (
        existing &&
        input.revision === existing.revision &&
        (existing.checkpoint !== input.checkpoint ||
          JSON.stringify(existing.responses) !== JSON.stringify(input.responses) ||
          existing.status !== input.status)
      )
        throw new Error('This practice changed elsewhere. Reopen its saved run before continuing.');
      const saved: SavedPracticeRun = {
        ...input,
        title: existing?.title ?? input.title,
        origin: existing?.origin ?? input.origin,
        workspaceId: workspace.id,
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
      };
      await database.practiceRuns.put(saved);
      return saved;
    });
  };
  const listPracticeRuns: LocalWorkspace['listPracticeRuns'] = async () => {
    const workspace = await metadata();
    return (
      await database.practiceRuns.where('workspaceId').equals(workspace.id).sortBy('updatedAt')
    ).reverse();
  };
  const renamePracticeRun: LocalWorkspace['renamePracticeRun'] = async (id, value) => {
    const title = value.trim();
    if (!title || title.length > 120)
      throw new Error('Enter a run name between 1 and 120 characters.');
    const workspace = await metadata();
    await database.transaction('rw', database.practiceRuns, async () => {
      const run = await database.practiceRuns.get(id);
      if (!run || run.workspaceId !== workspace.id) throw new Error('Saved practice not found.');
      await database.practiceRuns.update(id, { title });
    });
  };
  const deletePracticeRun: LocalWorkspace['deletePracticeRun'] = async (id) => {
    const workspace = await metadata();
    await database.transaction('rw', database.practiceRuns, async () => {
      const run = await database.practiceRuns.get(id);
      if (run?.workspaceId === workspace.id) await database.practiceRuns.delete(id);
    });
  };

  return {
    getPracticeRun,
    savePracticeRun,
    listPracticeRuns,
    renamePracticeRun,
    deletePracticeRun,
  };
}
