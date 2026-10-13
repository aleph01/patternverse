// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MiraComposer from './MiraComposer.svelte';

afterEach(cleanup);
const worry = {
  sourceId: 'commons',
  id: 'worry',
  type: 'pattern',
  title: 'Worry Time',
  summary: 'Explore recurring worries',
};
const sleep = {
  ...worry,
  id: 'sleep',
  title: 'Rewrite the Nightmare',
  summary: 'Rehearse a different ending',
};
function props() {
  return {
    draft: '',
    interim: '',
    desktop: false,
    dictationPhase: 'idle' as const,
    voiceControlPhase: 'off' as const,
    sending: false,
    voiceEnabled: false,
    patternsEnabled: true,
    approachName: 'NARM',
    mentionPatterns: [worry, sleep],
    therapyCollections: [
      {
        sourceId: 'commons',
        id: 'cbt',
        title: 'CBT',
        items: [{ sourceId: 'commons', entityId: 'worry' }],
      },
      {
        sourceId: 'commons',
        id: 'dreams',
        title: 'Sleep and Nightmares',
        items: [{ sourceId: 'commons', entityId: 'sleep' }],
      },
    ],
    onDraftChange: vi.fn(),
    onDraftPatternsChange: vi.fn(),
    onSend: vi.fn(),
    onPatterns: vi.fn(),
    onApproach: vi.fn(),
    onDictation: vi.fn(),
    onVoiceControl: vi.fn(),
  };
}
async function type(input: HTMLTextAreaElement, value: string, caret = value.length) {
  input.value = value;
  input.setSelectionRange(caret, caret);
  await fireEvent.input(input);
}
describe('Mira pattern mentions', () => {
  it('opens @ suggestions, filters from the caret, and selects without sending or changing approach', async () => {
    const p = props();
    render(MiraComposer, p);
    const input = screen.getByLabelText('Message mira') as HTMLTextAreaElement;
    await type(input, 'Before @worry after', 13);
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1);
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(p.onDraftChange).toHaveBeenLastCalledWith('Before  after');
    expect(p.onDraftPatternsChange).toHaveBeenCalledWith([expect.objectContaining(worry)]);
    expect(p.onSend).not.toHaveBeenCalled();
    expect(p.onApproach).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });
  it('supports arrows, no-results Enter and Escape while preserving normal typing', async () => {
    const p = props();
    render(MiraComposer, p);
    const input = screen.getByLabelText('Message mira') as HTMLTextAreaElement;
    await type(input, '@');
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(p.onDraftPatternsChange).toHaveBeenLastCalledWith([expect.objectContaining(sleep)]);
    await type(input, '@missing');
    expect(screen.getByRole('status').textContent).toContain('No matching patterns');
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(p.onSend).not.toHaveBeenCalled();
    await fireEvent.keyDown(input, { key: 'Escape' });
    await fireEvent.keyUp(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.value).toBe('@missing');
    await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(p.onSend).not.toHaveBeenCalled();
  });
  it('filters collections and removes selected chips without changing draft text', async () => {
    const p = props();
    const view = render(MiraComposer, p);
    const input = screen.getByLabelText('Message mira') as HTMLTextAreaElement;
    await type(input, '@');
    await fireEvent.change(screen.getByLabelText('Therapy collection'), {
      target: { value: 'commons:dreams' },
    });
    expect(
      screen.getAllByRole('option').filter((item) => item.getAttribute('aria-selected') !== null),
    ).toHaveLength(1);
    await fireEvent.click(screen.getByRole('button', { name: /Rewrite the Nightmare/ }));
    await view.rerender({ ...p, draft: 'My message', draftPatterns: [sleep] });
    await fireEvent.click(
      screen.getByRole('button', { name: 'Remove Rewrite the Nightmare from draft' }),
    );
    expect(p.onDraftPatternsChange).toHaveBeenLastCalledWith([]);
    expect(input.value).toBe('My message');
  });
  it('does not capture emails or interim dictation and offers a button entry point', async () => {
    const p = props();
    const view = render(MiraComposer, p);
    const input = screen.getByLabelText('Message mira') as HTMLTextAreaElement;
    await type(input, 'hello@example.com');
    expect(screen.queryByRole('listbox')).toBeNull();
    await view.rerender({ ...p, draft: 'hello@example.com', interim: 'spoken @worry' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Mention a Therapy pattern' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    cleanup();
    render(MiraComposer, p);
    await fireEvent.click(screen.getByRole('button', { name: 'Mention a Therapy pattern' }));
    expect(p.onDraftChange).toHaveBeenLastCalledWith('@');
  });
  it('allows a chip-only message and excludes duplicate selections', async () => {
    const p = props();
    render(MiraComposer, { ...p, draftPatterns: [worry] });
    expect(
      (screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled,
    ).toBe(false);
    const input = screen.getByLabelText('Message mira') as HTMLTextAreaElement;
    await type(input, '@');
    expect(
      within(screen.getByRole('listbox')).queryByRole('button', { name: /Worry Time/ }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: /Rewrite the Nightmare/ })).toBeTruthy();
  });
});
