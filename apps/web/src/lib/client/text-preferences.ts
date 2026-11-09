export const FONT_SIZE_KEY = 'patternverse:font-size';
export type FontSize = 'small' | 'standard' | 'large';

export function readFontSize(): FontSize {
  try {
    const value = localStorage.getItem(FONT_SIZE_KEY);
    return value === 'small' || value === 'large' ? value : 'standard';
  } catch {
    return 'standard';
  }
}

export function applyFontSize(size: FontSize): void {
  document.documentElement.dataset.fontSize = size;
}

export function saveFontSize(size: FontSize): void {
  localStorage.setItem(FONT_SIZE_KEY, size);
  applyFontSize(size);
}

export function trackFontSize(): () => void {
  const refresh = () => applyFontSize(readFontSize());
  refresh();
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea === localStorage && (event.key === FONT_SIZE_KEY || event.key === null))
      refresh();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
