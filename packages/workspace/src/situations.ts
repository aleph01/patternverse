import { parseBearingsNotebook, type BearingsNotebook } from './bearings.js';
import {
  parseMapPosition,
  parseSituationLinks,
  type SituationLink,
  type SituationMapPosition,
} from './situation-graph.js';

/** Private queue entries, separate from published patterns and practice runs. */
export type SituationPriority = 1 | 2 | 3 | 4 | 5;
export type Situation = Readonly<{
  id: string;
  workspaceId: string;
  title: string;
  context: string;
  position: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
  notebook?: BearingsNotebook;
  connections?: readonly SituationLink[];
  mapPosition?: SituationMapPosition;
  priority?: SituationPriority;
}>;
export function parseSituationPriority(value: unknown): SituationPriority {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 5)
    throw new Error('Choose a priority from 1 to 5 (5 is highest).');
  return value as SituationPriority;
}
export function situationContent(title: string, context: string) {
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 180)
    throw new Error('Give your situation a title between 1 and 180 characters.');
  if (typeof context !== 'string' || context.length > 100000)
    throw new Error('Situation context must be shorter than 100,000 characters.');
  return { title: title.trim(), context };
}
export function parseSituation(value: unknown): Situation {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid situation.');
  const row = value as Record<string, unknown>;
  const text = (key: string) => {
    const result = row[key];
    if (typeof result !== 'string' || !result.trim() || result.length > 120)
      throw new Error('Invalid situation metadata.');
    return result;
  };
  const timestamp = (key: string) => {
    const result = text(key);
    if (!Number.isFinite(Date.parse(result))) throw new Error('Invalid situation date.');
    return result;
  };
  if (
    !Number.isSafeInteger(row.position) ||
    Number(row.position) < 0 ||
    !Number.isSafeInteger(row.revision) ||
    Number(row.revision) < 0
  )
    throw new Error('Invalid situation order or revision.');
  return {
    id: text('id'),
    workspaceId: text('workspaceId'),
    ...situationContent(row.title as string, row.context as string),
    position: Number(row.position),
    revision: Number(row.revision),
    createdAt: timestamp('createdAt'),
    updatedAt: timestamp('updatedAt'),
    ...(row.notebook === undefined ? {} : { notebook: parseBearingsNotebook(row.notebook) }),
    ...(row.connections === undefined
      ? {}
      : { connections: parseSituationLinks(row.connections, text('id')) }),
    ...(row.mapPosition === undefined ? {} : { mapPosition: parseMapPosition(row.mapPosition) }),
    ...(row.priority === undefined ? {} : { priority: parseSituationPriority(row.priority) }),
  };
}
export const orderSituations = (items: readonly Situation[]): Situation[] =>
  [...items].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
