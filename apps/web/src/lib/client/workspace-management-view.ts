import type { RawEntity, SavedLibraryEntry } from '@patternverse/workspace';
import type { EntitySummary } from '$lib/server/commons';
import {
  structureDependents,
  validVerseIds,
  type PersonalStructure,
} from '$lib/structure-management';

export type WorkspaceContentTab = 'verse' | 'collection' | 'pattern' | 'saved';

/** A derived management view, using the existing private-first bare-ID relationship policy. */
export function workspaceManagementView(options: {
  personal: readonly RawEntity[];
  commons: readonly EntitySummary[];
  saved: readonly SavedLibraryEntry[];
  tab: WorkspaceContentTab;
  managingId: string;
}) {
  const { personal, commons, saved, tab, managingId } = options;
  const localIds = new Set(personal.map((entry) => entry.id));
  const verseIds = validVerseIds(personal, commons);
  const verses = [...personal, ...commons.filter((entry) => !localIds.has(entry.id))].filter(
    (entry) => entry.type === 'verse',
  );
  const managing = personal.find(
    (entry): entry is PersonalStructure =>
      entry.id === managingId && (entry.type === 'verse' || entry.type === 'collection'),
  );
  const members = managing ? structureDependents(personal, managing) : [];
  const memberIds = new Set(members.map((entry) => entry.id));
  const tabs = [
    { id: 'verse', label: 'Verses' },
    { id: 'collection', label: 'Collections' },
    { id: 'pattern', label: 'Patterns' },
    { id: 'saved', label: 'Saved from Explore' },
  ] as const;

  return {
    verseIds,
    verses,
    managing,
    members,
    visible: personal.filter((entry) => matchesTab(entry, tab)),
    tabs: tabs.map((entry) => ({
      ...entry,
      count:
        entry.id === 'saved'
          ? saved.length
          : personal.filter((entity) => matchesTab(entity, entry.id)).length,
    })),
    unassigned: personal.filter(
      (entry) =>
        (entry.type === 'pattern' || entry.type === 'collection') &&
        (!entry.verses?.length || entry.verses.some((id) => !verseIds.has(id))),
    ),
    available: personal.filter((entry) => entry.type !== 'verse' && !memberIds.has(entry.id)),
    savedArticles: saved.map((savedEntry) => ({
      savedEntry,
      entity: (savedEntry.ref.sourceId === 'personal' ? personal : commons).find(
        (entry) =>
          entry.id === savedEntry.ref.entityId && entry.sourceId === savedEntry.ref.sourceId,
      ),
    })),
  };
}

function matchesTab(entry: RawEntity, tab: WorkspaceContentTab) {
  return tab === 'pattern'
    ? entry.type !== 'verse' && entry.type !== 'collection'
    : entry.type === tab;
}
