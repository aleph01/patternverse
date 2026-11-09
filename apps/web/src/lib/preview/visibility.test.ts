import { expect, it } from 'vitest';
import { filterReleaseItems, isReleaseVisible, type ReleaseVisibility } from './visibility';

it('filters arbitrary content using the shared public/preview policy without mutating it', () => {
  const items: { title: string; visibility?: ReleaseVisibility }[] = [
    { title: 'Existing content' },
    { title: 'Public content', visibility: 'public' },
    { title: 'New content', visibility: 'preview' },
  ];
  const classify = (item: (typeof items)[number]) => item.visibility;
  expect(filterReleaseItems(items, classify).map((item) => item.title)).toEqual([
    'Existing content',
    'Public content',
  ]);
  expect(filterReleaseItems(items, classify, true)).toEqual(items);
  expect(items).toHaveLength(3);
  expect(isReleaseVisible('preview')).toBe(false);
  expect(isReleaseVisible('public', false)).toBe(true);
});
