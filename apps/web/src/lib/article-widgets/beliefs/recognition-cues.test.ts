import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import library from './library-v0.8.json';
import cues from './recognition-cues.json';

describe('editorial recognition cues', () => {
  it('covers every stable ID and exports cues without altering canonical meanings', () => {
    const resource = JSON.parse(
      readFileSync(
        resolve(process.cwd(), '../../content/assets/libraries/limiting-beliefs.json'),
        'utf8',
      ),
    );
    expect(Object.keys(cues).sort()).toEqual(library.beliefs.map(({ id }) => id).sort());
    expect(resource.record_type.record.recognition_cues).toEqual({ list: 'text' });
    expect(resource.records).toHaveLength(185);
    for (const belief of library.beliefs) {
      const record = resource.records.find((item: { id: string }) => item.id === belief.id);
      expect(record).toMatchObject(belief);
      expect(record.recognition_cues).toEqual(cues[belief.id as keyof typeof cues]);
      expect(record.recognition_cues).toHaveLength(2);
      expect(new Set(record.recognition_cues).size).toBe(2);
    }
  });
});
