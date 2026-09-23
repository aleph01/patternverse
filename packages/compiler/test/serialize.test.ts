import { describe, expect, it } from 'vitest';

import { parseMarkdownEntity, serializeEntity } from '../src/index.js';
import { parseEntity } from './helpers.js';

describe('portable Markdown serialization', () => {
  it('round-trips authored fields and body without compiler-derived relationships', () => {
    const original = parseEntity(
      `
id: five-frames
type: practice
title: Five Frames
summary: Generate alternatives.
status: draft
aliases: [Alternative Frames]
verses: [creativity]
implements: [creative-reframing]
duration_minutes: 10`,
      'Instructions with [[creative-reframing|a useful label]].',
      'personal',
    );
    if (original.type !== 'practice') throw new Error('Expected a Practice fixture.');
    const serialized = serializeEntity(original);
    const roundTrip = parseMarkdownEntity(serialized, {
      sourceId: 'personal',
      sourcePath: 'practices/five-frames.md',
    });

    expect(serialized).not.toContain('backlinks');
    expect(serialized).not.toContain('wikiLinks');
    expect(roundTrip.diagnostics).toEqual([]);
    expect(roundTrip.entity).toMatchObject({
      id: original.id,
      type: original.type,
      title: original.title,
      summary: original.summary,
      status: original.status,
      aliases: original.aliases,
      verses: original.verses,
      implements: original.implements,
      duration_minutes: original.duration_minutes,
      body: original.body,
    });
  });

  it('serializes an empty body without adding unofficial fields', () => {
    const entity = parseEntity(
      'id: empty\ntype: concept\ntitle: Empty\nstatus: draft',
      '',
      'personal',
    );
    expect(serializeEntity(entity)).toBe(
      '---\nid: empty\ntype: concept\ntitle: Empty\nstatus: draft\n---\n',
    );
  });
});
