import { describe, expect, it } from 'vitest';

import { compileCorpus, entityRefKey } from '../src/index.js';
import { parseEntity, source } from './helpers.js';

const byId = <T extends { id: string; sourceId: string }>(
  values: readonly T[],
  sourceId: string,
  id: string,
): T => {
  const value = values.find((candidate) => candidate.sourceId === sourceId && candidate.id === id);
  if (!value) throw new Error(`Missing ${sourceId}:${id}`);
  return value;
};

describe('source-aware reference resolution', () => {
  it('uses personal, current source, Commons priority and honors explicit qualification', () => {
    const commonsShared = parseEntity(
      'id: shared\ntype: concept\ntitle: Commons Shared\nstatus: published',
      '',
      'commons',
    );
    const externalShared = parseEntity(
      'id: shared\ntype: concept\ntitle: External Shared\nstatus: published',
      '',
      'team-source',
    );
    const personalShared = parseEntity(
      'id: shared\ntype: concept\ntitle: Personal Shared\nstatus: draft',
      '',
      'personal',
    );
    const origin = parseEntity(
      'id: origin\ntype: pattern\ntitle: Origin\nstatus: published',
      'Default [[shared]]. Explicit [[commons:shared|Commons choice]].',
      'team-source',
    );

    const compiled = compileCorpus(
      [commonsShared, externalShared, personalShared, origin],
      [source('personal', false), source('team-source'), source('commons')],
    );
    const compiledOrigin = byId(compiled.entities, 'team-source', 'origin');

    expect(compiledOrigin.links.map((link) => link.target)).toEqual([
      { sourceId: 'personal', entityId: 'shared' },
      { sourceId: 'commons', entityId: 'shared' },
    ]);
    expect(compiledOrigin.links[1]?.resolvedLabel).toBe('Commons choice');
    expect(byId(compiled.entities, 'personal', 'shared').backlinks).toContainEqual({
      sourceId: 'team-source',
      entityId: 'origin',
    });
    expect(byId(compiled.entities, 'team-source', 'shared').backlinks).toEqual([]);
  });

  it('uses the current source when no personal entity shadows the target', () => {
    const current = parseEntity(
      'id: shared\ntype: concept\ntitle: Current\nstatus: published',
      '',
      'team-source',
    );
    const commons = parseEntity(
      'id: shared\ntype: concept\ntitle: Commons\nstatus: published',
      '',
      'commons',
    );
    const origin = parseEntity(
      'id: origin\ntype: pattern\ntitle: Origin\nstatus: published',
      'See [[shared]].',
      'team-source',
    );
    const compiled = compileCorpus(
      [current, commons, origin],
      [source('team-source'), source('commons')],
    );

    expect(byId(compiled.entities, 'team-source', 'origin').links[0]?.target).toEqual({
      sourceId: 'team-source',
      entityId: 'shared',
    });
  });
});

describe('relationship derivation and search documents', () => {
  const verse = parseEntity('id: creativity\ntype: verse\ntitle: Creativity\nstatus: published');
  const concept = parseEntity(
    'id: working-memory\ntype: concept\ntitle: Working Memory\nstatus: published',
  );
  const pattern = parseEntity(
    'id: creative-reframing\ntype: pattern\ntitle: Creative Reframing\nstatus: published\nverses: [creativity]',
    'Connect to [[working-memory]].',
  );
  const practice = parseEntity(
    'id: five-frames\ntype: practice\ntitle: Five Frames\nstatus: published\nverses: [creativity]\nimplements: [creative-reframing]',
  );
  const collection = parseEntity(
    'id: getting-unstuck\ntype: collection\ntitle: Getting Unstuck\nstatus: published\nverses: [creativity]\nitems: [five-frames, creative-reframing]',
  );
  const compiled = compileCorpus(
    [verse, concept, pattern, practice, collection],
    [source('commons')],
  );

  it('derives backlinks, ordered Collection membership, Verse membership, and Practice reverses', () => {
    expect(byId(compiled.entities, 'commons', 'working-memory').backlinks).toEqual([
      { sourceId: 'commons', entityId: 'creative-reframing' },
    ]);
    expect(byId(compiled.entities, 'commons', 'getting-unstuck').collectionItems).toEqual([
      { sourceId: 'commons', entityId: 'five-frames' },
      { sourceId: 'commons', entityId: 'creative-reframing' },
    ]);
    expect(byId(compiled.entities, 'commons', 'creative-reframing').collectionMemberships).toEqual([
      { sourceId: 'commons', entityId: 'getting-unstuck' },
    ]);
    expect(byId(compiled.entities, 'commons', 'creativity').verseMembers).toEqual([
      { sourceId: 'commons', entityId: 'creative-reframing' },
      { sourceId: 'commons', entityId: 'five-frames' },
      { sourceId: 'commons', entityId: 'getting-unstuck' },
    ]);
    expect(byId(compiled.entities, 'commons', 'creative-reframing').implementedByPractices).toEqual(
      [{ sourceId: 'commons', entityId: 'five-frames' }],
    );
  });

  it('generates source-aware lexical search documents with derived names', () => {
    const document = compiled.searchDocuments.find(
      (candidate) => candidate.id === 'commons:creative-reframing',
    );
    expect(document).toMatchObject({
      title: 'Creative Reframing',
      verseNames: ['Creativity'],
      collectionNames: ['Getting Unstuck'],
    });
  });
});

describe('Therapy content hierarchy', () => {
  it('derives Therapy, CBT, and Worry Exposure relationships from ordinary memberships', () => {
    const therapy = parseEntity('id: therapy\ntype: verse\ntitle: Therapy\nstatus: published');
    const worryExposure = parseEntity(
      'id: worry-exposure\ntype: pattern\ntitle: Worry Exposure\nstatus: published\nverses: [therapy]',
    );
    const cbt = parseEntity(
      'id: cbt\ntype: collection\ntitle: Cognitive Behavioral Therapy\nstatus: published\nverses: [therapy]\nitems: [worry-exposure]',
    );

    const compiled = compileCorpus([therapy, cbt, worryExposure], [source('commons')]);

    expect(compiled.diagnostics).toEqual([]);
    expect(byId(compiled.entities, 'commons', 'therapy').verseMembers).toEqual([
      { sourceId: 'commons', entityId: 'cbt' },
      { sourceId: 'commons', entityId: 'worry-exposure' },
    ]);
    expect(byId(compiled.entities, 'commons', 'cbt').collectionItems).toEqual([
      { sourceId: 'commons', entityId: 'worry-exposure' },
    ]);
    expect(byId(compiled.entities, 'commons', 'worry-exposure').collectionMemberships).toEqual([
      { sourceId: 'commons', entityId: 'cbt' },
    ]);
  });
});

describe('compiler validation', () => {
  it('detects Collection cycles', () => {
    const first = parseEntity(
      'id: first\ntype: collection\ntitle: First\nstatus: published\nitems: [second]',
    );
    const second = parseEntity(
      'id: second\ntype: collection\ntitle: Second\nstatus: published\nitems: [first]',
    );
    const result = compileCorpus([first, second], [source('commons')]);

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'collection-cycle',
        message: expect.stringContaining('commons:first'),
      }),
    );
  });

  it('reports broken references with a close ID suggestion', () => {
    const origin = parseEntity(
      'id: origin\ntype: pattern\ntitle: Origin\nstatus: published',
      'See [[externalise-working-memory]].',
    );
    const target = parseEntity(
      'id: externalize-working-memory\ntype: concept\ntitle: Externalize Working Memory\nstatus: published',
    );
    const result = compileCorpus([origin, target], [source('commons')]);

    expect(result.unresolvedReferences).toEqual([
      {
        from: { sourceId: 'commons', entityId: 'origin' },
        field: 'body',
        reference: 'externalise-working-memory',
      },
    ]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'unresolved-reference',
        suggestion: 'Did you mean "externalize-working-memory"?',
      }),
    );
  });

  it('detects duplicate IDs only within the same source', () => {
    const first = parseEntity(
      'id: duplicate\ntype: pattern\ntitle: First\nstatus: published',
      '',
      'commons',
      'content/patterns/first.md',
    );
    const second = parseEntity(
      'id: duplicate\ntype: concept\ntitle: Second\nstatus: published',
      '',
      'commons',
      'content/concepts/second.md',
    );
    const personal = parseEntity(
      'id: duplicate\ntype: concept\ntitle: Personal\nstatus: draft',
      '',
      'personal',
    );
    const result = compileCorpus(
      [first, second, personal],
      [source('commons'), source('personal', false)],
    );

    expect(
      result.diagnostics.filter((diagnostic) => diagnostic.code === 'duplicate-id'),
    ).toHaveLength(1);
  });

  it('rejects Verses in Collections and non-Patterns in implements', () => {
    const verse = parseEntity('id: creativity\ntype: verse\ntitle: Creativity\nstatus: published');
    const concept = parseEntity('id: idea\ntype: concept\ntitle: Idea\nstatus: published');
    const collection = parseEntity(
      'id: wrong-collection\ntype: collection\ntitle: Wrong Collection\nstatus: published\nitems: [creativity]',
    );
    const practice = parseEntity(
      'id: wrong-practice\ntype: practice\ntitle: Wrong Practice\nstatus: published\nimplements: [idea]',
    );
    const result = compileCorpus([verse, concept, collection, practice], [source('commons')]);

    expect(
      result.diagnostics.filter((diagnostic) => diagnostic.code === 'wrong-reference-type'),
    ).toHaveLength(2);
  });

  it('includes drafts in development and excludes them from production output', () => {
    const draft = parseEntity('id: draft-note\ntype: concept\ntitle: Draft Note\nstatus: draft');
    const published = parseEntity(
      'id: published-note\ntype: concept\ntitle: Published Note\nstatus: published',
    );

    expect(compileCorpus([draft, published], [source('commons')]).entities).toHaveLength(2);
    expect(
      compileCorpus([draft, published], [source('commons')], { includeDrafts: false }).entities.map(
        (entity) => entityRefKey(entity.ref),
      ),
    ).toEqual(['commons:published-note']);
  });
});
