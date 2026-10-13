// @vitest-environment node
import { expect, it, vi } from 'vitest';

it('can be imported without a browser and allocates no object URLs until called', async () => {
  expect(typeof document).toBe('undefined');
  expect(typeof window).toBe('undefined');
  const create = vi.spyOn(URL, 'createObjectURL');
  try {
    const helper = await import('./download');
    const compatibility = await import('./practice-export');
    expect(typeof helper.downloadBlob).toBe('function');
    expect(compatibility.downloadPracticeFile).toBe(helper.downloadText);
    expect(create).not.toHaveBeenCalled();
  } finally {
    create.mockRestore();
  }
});
