import { describe, expect, it } from 'vitest';
import { defaultCursorSettings, parseCursorSettings } from './cursor-settings';

describe('saved writing cursor preferences', () => {
  it('restores valid preferences and falls back safely for corrupt or out-of-range values', () => {
    const settings = { shape: 'vertical', thickness: 6, color: '#007a4d' };
    expect(parseCursorSettings(JSON.stringify(settings))).toEqual(settings);
    expect(parseCursorSettings(null)).toEqual(defaultCursorSettings);
    expect(parseCursorSettings('{broken')).toEqual(defaultCursorSettings);
    expect(
      parseCursorSettings(
        JSON.stringify({ shape: 'unknown', thickness: 100, color: 'url(example)' }),
      ),
    ).toEqual(defaultCursorSettings);
    expect(
      parseCursorSettings(JSON.stringify({ shape: 'vertical', thickness: -2, color: '#2563eb' })),
    ).toEqual({ ...settings, thickness: defaultCursorSettings.thickness, color: '#2563eb' });
  });
});
