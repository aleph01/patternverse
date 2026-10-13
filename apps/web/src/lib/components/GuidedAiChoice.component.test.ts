// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GuidedAiChoice from './GuidedAiChoice.svelte';
afterEach(cleanup);
describe('guided AI provider consent', () => {
  it('does not select a provider by default and explicitly discloses checkpoint processing', async () => {
    const onFree = vi.fn();
    const onOpenRouter = vi.fn();
    const view = render(GuidedAiChoice, { onFree, onOpenRouter });
    expect(view.getByText(/confirmed answers and progress/)).toBeTruthy();
    expect(onFree).not.toHaveBeenCalled();
    expect(onOpenRouter).not.toHaveBeenCalled();
    await fireEvent.click(view.getByRole('button', { name: 'Use free AI →' }));
    expect(onFree).toHaveBeenCalledOnce();
    expect(onOpenRouter).not.toHaveBeenCalled();
  });
});
