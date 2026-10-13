export const LIBRARY_LAYOUT_KEY = 'patternverse:library-layout';
export const LIBRARY_PAGE_SIZE_KEY = 'patternverse:library-page-size';
export type LibraryPreferences = { layout: 'cards' | 'list'; pageSize: 20 | 50 };

export function readLibraryPreferences(): LibraryPreferences {
  try {
    return {
      layout: localStorage.getItem(LIBRARY_LAYOUT_KEY) === 'list' ? 'list' : 'cards',
      pageSize: localStorage.getItem(LIBRARY_PAGE_SIZE_KEY) === '50' ? 50 : 20,
    };
  } catch {
    return { layout: 'cards', pageSize: 20 };
  }
}

export function saveLibraryPreferences(preferences: LibraryPreferences) {
  localStorage.setItem(LIBRARY_LAYOUT_KEY, preferences.layout);
  localStorage.setItem(LIBRARY_PAGE_SIZE_KEY, String(preferences.pageSize));
}
