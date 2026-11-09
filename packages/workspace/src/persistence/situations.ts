import {
  situationContent,
  orderSituations,
  parseSituationPriority,
  type Situation,
} from '../situations.js';
import type { LocalWorkspace } from '../api.js';
import type { PersistenceContext } from './context.js';
import { parseBearingsNotebook } from '../bearings.js';
import {
  canonicalConnection,
  parseMapPosition,
  parseSituationLinks,
  validateSituationGraph,
} from '../situation-graph.js';
export function createSituationOperations(
  context: PersistenceContext,
): Pick<
  LocalWorkspace,
  | 'listSituations'
  | 'createSituation'
  | 'updateSituation'
  | 'deleteSituation'
  | 'moveSituation'
  | 'changeSituationConnection'
  | 'positionSituationOnMap'
> {
  const { database, metadata, now } = context;
  const listSituations: LocalWorkspace['listSituations'] = async () => {
    const workspace = await metadata();
    return orderSituations(
      await database.situations.where('workspaceId').equals(workspace.id).toArray(),
    );
  };
  const createSituation: LocalWorkspace['createSituation'] = async (title, parent, mapPosition) => {
    const content = situationContent(title, '');
    const position = mapPosition === undefined ? undefined : parseMapPosition(mapPosition);
    const workspace = await metadata();
    return database.transaction('rw', database.situations, async () => {
      const entries = await listSituations();
      if (parent) {
        const current = entries.find((s) => s.id === parent.id);
        if (!current) throw new Error('The containing situation was removed.');
        if (current.revision !== parent.revision)
          throw new Error(
            'This situation changed in another window. Refresh the map before adding a subproblem.',
          );
      }
      const timestamp = now();
      const entry: Situation = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        ...content,
        position: entries.length ? Math.max(...entries.map((s) => s.position)) + 1 : 0,
        revision: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...(parent ? { connections: [{ targetId: parent.id, kind: 'part-of' as const }] } : {}),
        ...(position ? { mapPosition: position } : {}),
      };
      await database.situations.add(entry);
      return entry;
    });
  };
  const updateSituation: LocalWorkspace['updateSituation'] = async (id, content, revision) => {
    const parsed = situationContent(content.title, content.context);
    const notebook =
      content.notebook === undefined ? {} : { notebook: parseBearingsNotebook(content.notebook) };
    const priority =
      content.priority === undefined || content.priority === null
        ? content.priority
        : parseSituationPriority(content.priority);
    const workspace = await metadata();
    return database.transaction('rw', database.situations, async () => {
      const entry = await database.situations.get(id);
      if (!entry || entry.workspaceId !== workspace.id) throw new Error('Situation not found.');
      if (entry.revision !== revision)
        throw new Error(
          'This notebook changed in another window. Copy your text before reopening it.',
        );
      const next = { ...entry, ...parsed, ...notebook, revision: revision + 1, updatedAt: now() };
      if (priority === null) delete next.priority;
      else if (priority !== undefined) next.priority = priority;
      await database.situations.put(next);
      return next;
    });
  };
  const deleteSituation: LocalWorkspace['deleteSituation'] = async (id, revision) => {
    const workspace = await metadata();
    await database.transaction('rw', database.situations, async () => {
      const entry = await database.situations.get(id);
      if (!entry || entry.workspaceId !== workspace.id) throw new Error('Situation not found.');
      if (entry.revision !== revision)
        throw new Error('This situation changed in another window. Reopen it before deleting.');
      await database.situations.delete(id);
      for (const other of await listSituations()) {
        if (!other.connections?.some((link) => link.targetId === id)) continue;
        await database.situations.put({
          ...other,
          connections: other.connections.filter((link) => link.targetId !== id),
          revision: other.revision + 1,
          updatedAt: now(),
        });
      }
    });
  };

  const changeSituationConnection: LocalWorkspace['changeSituationConnection'] = async (change) => {
    if (!change || (!change.previous && !change.next))
      throw new Error('Choose a connection to change.');
    const previous = change.previous
      ? {
          sourceId: change.previous.sourceId,
          ...parseSituationLinks([change.previous], change.previous.sourceId)[0]!,
        }
      : null;
    const next = change.next ? canonicalConnection(change.next) : null;
    if (previous) canonicalConnection(previous);
    const workspace = await metadata();
    return database.transaction('rw', database.situations, async () => {
      const entries = await listSituations();
      const required = new Set(
        [previous?.sourceId, previous?.targetId, next?.sourceId, next?.targetId].filter(
          (id): id is string => !!id,
        ),
      );
      for (const id of required) {
        const current = entries.find((s) => s.id === id),
          expected = change.expected.find((s) => s.id === id);
        if (!current || current.workspaceId !== workspace.id)
          throw new Error('A connected situation was removed. Refresh the map.');
        if (!expected || current.revision !== expected.revision)
          throw new Error('This map changed in another window. Refresh the map before saving.');
      }
      if (
        previous &&
        !entries
          .find((s) => s.id === previous.sourceId)
          ?.connections?.some(
            (link) => link.targetId === previous.targetId && link.kind === previous.kind,
          )
      )
        throw new Error('This connection changed. Refresh the map before saving.');
      const changed = new Set<string>();
      const result = entries.map((s) => {
        let links = [...(s.connections ?? [])];
        if (previous?.sourceId === s.id) {
          links = links.filter(
            (link) => !(link.targetId === previous.targetId && link.kind === previous.kind),
          );
          changed.add(s.id);
        }
        if (next?.sourceId === s.id) {
          links.push({ targetId: next.targetId, kind: next.kind });
          changed.add(s.id);
        }
        return changed.has(s.id)
          ? {
              ...s,
              connections: parseSituationLinks(links, s.id),
              revision: s.revision + 1,
              updatedAt: now(),
            }
          : s;
      });
      validateSituationGraph(result);
      await database.situations.bulkPut(result.filter((s) => changed.has(s.id)));
      return result;
    });
  };
  const positionSituationOnMap: LocalWorkspace['positionSituationOnMap'] = async (
    id,
    position,
    revision,
  ) => {
    const parsed = position === null ? null : parseMapPosition(position);
    const workspace = await metadata();
    return database.transaction('rw', database.situations, async () => {
      const entry = await database.situations.get(id);
      if (!entry || entry.workspaceId !== workspace.id) throw new Error('Situation not found.');
      if (entry.revision !== revision)
        throw new Error(
          'This situation changed in another window. Refresh the map before moving it.',
        );
      const next = { ...entry, revision: revision + 1, updatedAt: now() };
      if (parsed) next.mapPosition = parsed;
      else delete next.mapPosition;
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

  return {
    listSituations,
    createSituation,
    updateSituation,
    deleteSituation,
    moveSituation,
    changeSituationConnection,
    positionSituationOnMap,
  };
}
