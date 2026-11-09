import { expect, it } from 'vitest';
import { loadWidgetSource } from '../assets';

it('loads the checked-in belief browser through the production asset loader', async () => {
  const source = await loadWidgetSource('identify-limiting-beliefs.html');
  expect(source).toContain('id="pv-belief-data"');
  expect(source).toContain('P0255');
});
