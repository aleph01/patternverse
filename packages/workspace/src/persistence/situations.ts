import { situationContent, orderSituations, type Situation } from '../situations.js';
import type { LocalWorkspace } from '../api.js';
import type { PersistenceContext } from './context.js';
export function createSituationOperations(
  context: PersistenceContext,
): Pick<
  LocalWorkspace,
  'listSituations' | 'createSituation' | 'updateSituation' | 'moveSituation'
> {
  const { database, metadata, now } = context;
  const listSituations: LocalWorkspace['listSituations'] = async () => {
    const workspace = await metadata();
    return orderSituations(
      await database.situations.where('workspaceId').equals(workspace.id).toArray(),
    );
  };
  const createSituation: LocalWorkspace['createSituation'] = async (title) => {
    const content = situationContent(title, '');
    const workspace = await metadata();
    return database.transaction('rw', database.situations, async () => {
      const entries = await listSituations();
      const timestamp = now();
      const entry: Situation = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        ...content,
        position: entries.length ? Math.max(...entries.map((s) => s.position)) + 1 : 0,
        revision: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await database.situations.add(entry);
      return entry;
    });
  };
  const updateSituation: LocalWorkspace['updateSituation'] = async (id, content, revision) => {
    const parsed = situationContent(content.title, content.context);
    const workspace = await metadata();
    return database.transaction('rw', database.situations, async () => {
      const entry = await database.situations.get(id);
      if (!entry || entry.workspaceId !== workspace.id) throw new Error('Situation not found.');
      if (entry.revision !== revision)
        throw new Error(
          'This notebook changed in another window. Copy your text before reopening it.',
        );
      const next = { ...entry, ...parsed, revision: revision + 1, updatedAt: now() };
      await database.situations.put(next);
      return next;
    });
  };
  const moveSituation: LocalWorkspace['moveSituation'] = async (id, beforeId) => {
    await metadata();
    return database.transaction('rw', database.situations, async () => {
      const entries = await listSituations();
      const entry = entries.find((s) => s.id === id);
      if (!entry) throw new Error('Situation not found.');
      if (beforeId === id) return entries;
      const rest = entries.filter((s) => s.id !== id);
      const at = beforeId === null ? rest.length : rest.findIndex((s) => s.id === beforeId);
      if (at < 0) throw new Error('The queue changed. Try moving the situation again.');
      rest.splice(at, 0, entry);
      const ordered = rest.map((situation, position) => ({ ...situation, position }));
      await database.situations.bulkPut(
        ordered.filter(
          (s) => entries.find((original) => original.id === s.id)?.position !== s.position,
        ),
      );
      return ordered;
    });
  };

  return { listSituations, createSituation, updateSituation, moveSituation };
}
