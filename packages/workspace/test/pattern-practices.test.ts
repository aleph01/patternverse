import { afterEach, describe, expect, it } from 'vitest';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import type { RawPatternEntity, RawPracticeEntity } from '@patternverse/schema';
import { createIndexedDbWorkspace, type LocalWorkspace } from '../src/index.js';

const opened: LocalWorkspace[] = [];
const store = () => {
  const workspace = createIndexedDbWorkspace({
    indexedDB,
    IDBKeyRange,
    databaseName: `pattern-practices-${crypto.randomUUID()}`,
  });
  opened.push(workspace);
  return workspace;
};
const pattern: RawPatternEntity = {
  id: 'define-a-decision',
  type: 'pattern',
  title: 'Define a decision',
  status: 'draft',
  sourceId: 'personal',
  body: 'The article.',
  verses: ['decisions'],
};
const practice = (id: string, parents = [pattern.id]): RawPracticeEntity => ({
  id,
  type: 'practice',
  title: id,
  status: 'draft',
  sourceId: 'personal',
  body: `Questions for ${id}.`,
  implements: parents,
});
afterEach(() => opened.splice(0).forEach((workspace) => workspace.close()));

describe('saving a pattern and its practices atomically', () => {
  it('creates and reopens several independent practices without changing the article', async () => {
    const workspace = store();
    const exercises = [practice('quick-check'), practice('decision-brief')];
    const saved = await workspace.savePatternWithPractices({
      pattern,
      practices: exercises,
      originalPracticeIds: [],
      create: true,
    });
    expect(saved).toEqual([pattern, ...exercises]);
    expect(await workspace.getEntity(pattern.id)).toEqual(pattern);
    expect(await workspace.getEntity('quick-check')).toEqual(exercises[0]);
    expect(await workspace.getEntity('decision-brief')).toEqual(exercises[1]);
  });

  it('rejects colliding practice IDs without saving any part of the pattern', async () => {
    const workspace = store();
    const unrelated = practice('existing');
    await workspace.createEntity(unrelated);
    await expect(
      workspace.savePatternWithPractices({
        pattern,
        practices: [practice('new-check'), unrelated],
        originalPracticeIds: [],
        create: true,
      }),
    ).rejects.toThrow('practice ID already exists');
    expect(await workspace.getEntity(pattern.id)).toBeUndefined();
    expect(await workspace.getEntity('new-check')).toBeUndefined();
    expect(await workspace.getEntity('existing')).toEqual(unrelated);
  });

  it('unlinks a removed practice while preserving other parents, saved records, and annotations', async () => {
    const workspace = store();
    const shared = practice('shared-check', [pattern.id, 'another-pattern']);
    await workspace.savePatternWithPractices({
      pattern,
      practices: [shared],
      originalPracticeIds: [],
      create: true,
    });
    const ref = { sourceId: 'personal', entityId: shared.id };
    await workspace.setSavedEntry(ref, true);
    await workspace.setUsefulness(ref, 2);
    await workspace.savePatternWithPractices({
      pattern: { ...pattern, title: 'Updated title' },
      practices: [],
      originalPracticeIds: [shared.id],
      create: false,
    });
    expect(await workspace.getEntity(shared.id)).toEqual({
      ...shared,
      implements: ['another-pattern'],
    });
    expect(await workspace.getSavedEntry(ref)).toBeDefined();
    expect(await workspace.getUsefulness(ref)).toBe(2);
  });

  it('rejects changed attachments without overwriting a newer record or the parent', async () => {
    const workspace = store();
    const original = practice('quick-check');
    await workspace.savePatternWithPractices({
      pattern,
      practices: [original],
      originalPracticeIds: [],
      create: true,
    });
    await workspace.updateEntity(original.id, (entity) => ({
      ...entity,
      type: 'practice',
      implements: ['another-pattern'],
    }));
    await expect(
      workspace.savePatternWithPractices({
        pattern: { ...pattern, body: 'Must not be saved' },
        practices: [{ ...original, body: 'Must not overwrite' }],
        originalPracticeIds: [original.id],
        create: false,
      }),
    ).rejects.toThrow('changed or was removed');
    expect(await workspace.getEntity(pattern.id)).toEqual(pattern);
    expect(await workspace.getEntity(original.id)).toMatchObject({
      body: original.body,
      implements: ['another-pattern'],
    });
  });
});
