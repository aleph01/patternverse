// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GuidedAiConnection from './GuidedAiConnection.svelte';

afterEach(cleanup);

describe('guided AI connection notice', () => {
  it('offers sign-in in a separate tab, not a key input', async () => {
    const onCheck = vi.fn();
    render(GuidedAiConnection, { onCheck });
    const link = screen.getByRole('link', { name: 'Connect with OpenRouter ↗' });
    expect(link.getAttribute('href')).toBe('/auth/openrouter/connect');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.queryByRole('textbox')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
    expect(onCheck).toHaveBeenCalledOnce();
  });

  it('offers explicit OpenRouter or waiting when the future free allowance is exhausted', () => {
    render(GuidedAiConnection, { reason: 'free-limit', onCheck: vi.fn() });
    expect(screen.getByRole('heading', { name: 'Free AI limit reached for today.' })).toBeTruthy();
    expect(screen.getByText(/wait until the free allowance resets/)).toBeTruthy();
    expect(screen.getByText(/Nothing switches automatically/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Connect with OpenRouter ↗' })).toBeTruthy();
  });

  it('distinguishes OpenRouter credit exhaustion from the free allowance', () => {
    render(GuidedAiConnection, { reason: 'credits', onCheck: vi.fn() });
    expect(
      screen.getByRole('heading', { name: 'Your OpenRouter limit has been reached.' }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Manage OpenRouter credits ↗' })).toBeTruthy();
    expect(screen.queryByText('Free AI limit reached for today.')).toBeNull();
  });
});
