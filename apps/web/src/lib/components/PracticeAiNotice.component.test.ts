// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticeAiNotice from './PracticeAiNotice.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
const originals = Object.fromEntries(
  ['showModal', 'close'].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, key),
  ]),
);
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    },
  });
});
afterEach(() => {
  cleanup();
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});

describe('practice AI notice', () => {
  it('offers connection upfront as an informational action, without checking or submitting anything', () => {
    const onCheck = vi.fn();
    render(PracticeAiNotice, { connected: false, onCheck });
    expect(screen.getByText('OpenRouter not connected')).toBeTruthy();
    expect(screen.getByText(/You can start now and connect when needed/)).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Connect with OpenRouter ↗' });
    expect(link.getAttribute('href')).toBe('/auth/openrouter/connect');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(onCheck).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([
    { props: { connected: true }, status: 'OpenRouter connected' },
    { props: { desktop: true }, status: 'Uses your local model' },
    { props: { provider: 'free' as const, connected: false }, status: 'Using free AI' },
    { props: { embedded: true }, status: 'AI unavailable in this embed' },
    { props: { checking: true }, status: 'Checking connection…' },
  ])('accurately describes %s and avoids an irrelevant connection prompt', ({ props, status }) => {
    render(PracticeAiNotice, { ...props, onCheck: vi.fn() });
    expect(
      within(screen.getByRole('complementary', { name: 'AI-assisted practice' })).getByText(status),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Connect with OpenRouter ↗' })).toBeNull();
  });

  it('opens explanations and refreshes status only by explicit action, then closes the native dialog', async () => {
    const onCheck = vi.fn();
    render(PracticeAiNotice, {
      connected: false,
      reason: 'AI suggests possible library beliefs.',
      onCheck,
    });
    const trigger = screen.getByRole('button', { name: 'About AI' });
    await fireEvent.click(trigger);
    const panel = screen.getByRole('dialog', { name: 'About AI in this practice' });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(within(panel).getByText('AI suggests possible library beliefs.')).toBeTruthy();
    expect(within(panel).getByText('What is OpenRouter?')).toBeTruthy();
    expect(within(panel).getByText('Does it cost anything?')).toBeTruthy();
    expect(within(panel).getByText('What gets sent?')).toBeTruthy();
    expect(onCheck).not.toHaveBeenCalled();
    await fireEvent.click(within(panel).getByRole('button', { name: 'Check connection' }));
    expect(onCheck).toHaveBeenCalledOnce();
    await fireEvent.click(within(panel).getByRole('button', { name: 'Close AI information' }));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
