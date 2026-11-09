export type CursorSettings = {
  shape: 'horizontal' | 'vertical';
  thickness: number;
  color: string | null;
};
export const defaultCursorSettings: CursorSettings = {
  shape: 'vertical',
  thickness: 1,
  color: null,
};
export const cursorSettingsKey = 'bearings-cursor-settings';

export function parseCursorSettings(raw: string | null): CursorSettings {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return { ...defaultCursorSettings };
    return {
      shape:
        value.shape === 'vertical' || value.shape === 'horizontal'
          ? value.shape
          : defaultCursorSettings.shape,
      thickness:
        Number.isInteger(value.thickness) && value.thickness >= 1 && value.thickness <= 6
          ? value.thickness
          : defaultCursorSettings.thickness,
      color:
        typeof value.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color) ? value.color : null,
    };
  } catch {
    return { ...defaultCursorSettings };
  }
}
