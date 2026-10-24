import { expect, it } from 'vitest';
import type { RawEntity, SavedLibraryEntry } from '@patternverse/workspace';
import type { EntitySummary } from '$lib/server/commons';
import { workspaceManagementView } from './workspace-management-view';

const base = { sourceId: 'personal', status: 'draft', body: '' } as const;
const verse: RawEntity = { ...base, id: 'home', type: 'verse', title: 'My home' };
const pattern: RawEntity = {
  ...base,
  id: 'same',
  type: 'pattern',
  title: 'Mine',
  verses: ['home'],
};
const commons: EntitySummary[] = [
  {
    id: 'home',
    sourceId: 'commons',
    type: 'verse',
    title: 'Public home',
    summary: '',
    status: 'published',
    url: '/verse/home',
  },
  {
    id: 'same',
    sourceId: 'commons',
    type: 'pattern',
    title: 'Public pattern',
    summary: '',
    status: 'published',
    url: '/pattern/same',
  },
];

it('keeps private verse precedence, repair notices and member availability consistent', () => {
  const orphan: RawEntity = { ...pattern, id: 'orphan', verses: ['missing'] };
  const personal = [verse, pattern, orphan];
  const before = structuredClone(personal);
  const view = workspaceManagementView({
    personal,
    commons,
    saved: [],
    tab: 'pattern',
    managingId: 'home',
  });
  expect(view.verses).toEqual([verse]);
  expect(view.visible).toEqual([pattern, orphan]);
  expect(view.members).toEqual([pattern]);
  expect(view.available).toEqual([orphan]);
  expect(view.unassigned).toEqual([orphan]);
  expect(view.tabs.map((tab) => tab.count)).toEqual([1, 0, 2, 0]);
  expect(personal).toEqual(before);
});

it('resolves saved references by source, keeping missing entries removable', () => {
  const saved: SavedLibraryEntry[] = ['personal', 'commons', 'missing'].map((sourceId) => ({
    ref: { sourceId, entityId: 'same' },
    createdAt: '2026-10-24',
    workspaceId: 'mine',
  }));
  const view = workspaceManagementView({
    personal: [pattern],
    commons,
    saved,
    tab: 'saved',
    managingId: '',
  });
  expect(view.savedArticles.map((entry) => entry.entity?.title)).toEqual([
    'Mine',
    'Public pattern',
    undefined,
  ]);
  expect(view.tabs[3].count).toBe(3);
});

it('keeps legacy concepts in the patterns tab and shadows public verses with private non-verses', () => {
  const concept: RawEntity = {
    ...base,
    id: 'home',
    type: 'concept',
    title: 'Legacy concept',
    verses: ['missing'],
  };
  const view = workspaceManagementView({
    personal: [concept, pattern],
    commons,
    saved: [],
    tab: 'pattern',
    managingId: 'same',
  });
  expect(view.visible).toEqual([concept, pattern]);
  expect(view.verseIds.has('home')).toBe(false);
  expect(view.verses).toEqual([]);
  expect(view.managing).toBeUndefined();
});
