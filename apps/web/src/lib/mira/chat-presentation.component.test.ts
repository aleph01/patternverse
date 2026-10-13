// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@patternverse/companion-core';
import MiraComposer from './MiraComposer.svelte';
import MiraSessionHeading from './MiraSessionHeading.svelte';
import MiraTranscript from './MiraTranscript.svelte';

afterEach(cleanup);

function composerProps() {
  return {
    draft: 'A private draft',
    interim: '',
    desktop: false,
    dictationPhase: 'idle' as const,
    voiceControlPhase: 'off' as const,
    sending: false,
    voiceEnabled: true,
    patternsEnabled: true,
    approachName: 'CBT',
    onDraftChange: vi.fn(),
    onSend: vi.fn(),
    onPatterns: vi.fn(),
    onApproach: vi.fn(),
    onDictation: vi.fn(),
    onVoiceControl: vi.fn(),
  };
}

describe('Mira composer presentation', () => {
  it('delegates draft edits without sending or owning conversation state', async () => {
    const props = composerProps();
    render(MiraComposer, props);
    const input = screen.getByRole('textbox', { name: 'Message mira' });
    await fireEvent.input(input, { target: { value: 'Changed draft' } });
    expect(props.onDraftChange).toHaveBeenCalledWith('Changed draft');
    expect(props.onSend).not.toHaveBeenCalled();
    expect(input.getAttribute('maxlength')).toBe('30000');
  });

  it('submits on Enter but leaves Shift+Enter available for newlines', async () => {
    const props = composerProps();
    render(MiraComposer, props);
    const input = screen.getByRole('textbox');
    expect(await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })).toBe(true);
    expect(props.onSend).not.toHaveBeenCalled();
    expect(await fireEvent.keyDown(input, { key: 'Enter' })).toBe(false);
    expect(props.onSend).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(props.onSend).toHaveBeenCalledTimes(2);
  });

  it.each([{ draft: '  ' }, { sending: true }])('disables the send button for %j', (override) => {
    render(MiraComposer, { ...composerProps(), ...override });
    expect(
      (screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('passes the actual selector buttons to host focus coordination', async () => {
    const props = composerProps();
    render(MiraComposer, props);
    const patterns = screen.getByRole('button', { name: 'Choose a pattern or practice' });
    const approach = screen.getByRole('button', { name: 'Choose therapy approach' });
    await fireEvent.click(patterns);
    await fireEvent.click(approach);
    expect(props.onPatterns).toHaveBeenCalledWith(patterns);
    expect(props.onApproach).toHaveBeenCalledWith(approach);
    expect(patterns.getAttribute('aria-keyshortcuts')).toBe('Shift+Space');
  });

  it('shows interim voice text without publishing it as a draft', async () => {
    const props = composerProps();
    const view = render(MiraComposer, { ...props, draft: 'Typed  ', interim: 'spoken words' });
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(input.value).toBe('Typed spoken words');
    expect(input.readOnly).toBe(true);
    expect(props.onDraftChange).not.toHaveBeenCalled();
    expect(props.onSend).not.toHaveBeenCalled();
    await view.rerender({ ...props, draft: 'Typed  ', interim: '' });
    expect(input.value).toBe('Typed  ');
    expect(input.readOnly).toBe(false);
  });

  it('locks browser dictation input and retains local desktop transcription behavior', async () => {
    const props = composerProps();
    const view = render(MiraComposer, { ...props, dictationPhase: 'transcribing' });
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(input.readOnly).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('Finishing dictation…');
    expect(
      (screen.getByRole('button', { name: 'Start voice input' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Start voice control' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await view.rerender({ ...props, desktop: true, dictationPhase: 'transcribing' });
    expect(input.readOnly).toBe(false);
    expect(screen.getByRole('status').textContent).toBe('Transcribing locally…');
  });

  it('delegates dictation and voice control and reflects their mutually exclusive states', async () => {
    const props = composerProps();
    const view = render(MiraComposer, props);
    await fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Start voice control' }));
    expect(props.onDictation).toHaveBeenCalledTimes(1);
    expect(props.onVoiceControl).toHaveBeenCalledTimes(1);
    await view.rerender({ ...props, dictationPhase: 'recording' });
    expect(
      screen.getByRole('button', { name: 'Stop dictation' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByRole('status').textContent).toBe('● Recording…');
    await view.rerender({ ...props, voiceControlPhase: 'reading' });
    expect(
      screen.getByRole('button', { name: 'Stop voice control' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      (screen.getByRole('button', { name: 'Start voice input' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('respects release features while retaining the approach and send controls', () => {
    render(MiraComposer, { ...composerProps(), voiceEnabled: false, patternsEnabled: false });
    expect(screen.queryByRole('button', { name: 'Choose a pattern or practice' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start voice input' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start voice control' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Choose therapy approach' }).textContent).toBe('CBT');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeTruthy();
  });
});

function transcriptProps() {
  const messages: readonly Message[] = [
    {
      id: 'user',
      role: 'user',
      text: '<script>private</script>',
      createdAt: '2026-10-11T10:00:00Z',
    },
    {
      id: 'reply',
      role: 'assistant',
      text: 'A thoughtful reply.',
      createdAt: '2026-10-11T10:00:01Z',
    },
  ];
  return {
    messages,
    pending: false,
    streamingText: '',
    retryAvailable: false,
    voiceEnabled: true,
    speakingId: null as string | null,
    onToggleSpeech: vi.fn(),
    onRetry: vi.fn(),
  };
}

describe('Mira transcript presentation', () => {
  it('renders messages as escaped text with the existing roles and styling hooks', () => {
    const view = render(MiraTranscript, transcriptProps());
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(view.container.querySelector('article.from-user')?.textContent).toContain('You');
    expect(screen.getByText('<script>private</script>')).toBeTruthy();
    expect(view.container.querySelector('script')).toBeNull();
    expect(view.container.querySelector('.mira-messages')?.getAttribute('aria-live')).toBe(
      'polite',
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('delegates read-aloud and displays the current playback action', async () => {
    const props = transcriptProps();
    const view = render(MiraTranscript, props);
    await fireEvent.click(screen.getByRole('button', { name: 'Play spoken reply' }));
    expect(props.onToggleSpeech).toHaveBeenCalledWith('reply', 'A thoughtful reply.');
    await view.rerender({ ...props, speakingId: 'reply' });
    await fireEvent.click(screen.getByRole('button', { name: 'Stop spoken reply' }));
    expect(props.onToggleSpeech).toHaveBeenCalledTimes(2);
    await view.rerender({ ...props, voiceEnabled: false });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows welcome, waiting, then streamed text without offering partial speech', async () => {
    const props = { ...transcriptProps(), messages: [], pending: true };
    const view = render(MiraTranscript, props);
    expect(screen.getByText('What would you like to explore?')).toBeTruthy();
    expect(screen.getByRole('status', { name: 'mira is preparing a reply' })).toBeTruthy();
    await view.rerender({ ...props, streamingText: 'Partial response' });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Partial response')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(view.container.querySelector('.mira-stream-cursor')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    await view.rerender({ ...props, pending: false, streamingText: 'Partial response' });
    expect(screen.queryByText('Partial response')).toBeNull();
  });

  it('only offers retry when the host supplies availability, delegating the action', async () => {
    const props = transcriptProps();
    const view = render(MiraTranscript, props);
    expect(screen.queryByRole('button', { name: 'Retry reply' })).toBeNull();
    await view.rerender({ ...props, retryAvailable: true });
    await fireEvent.click(screen.getByRole('button', { name: 'Retry reply' }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    expect(props.messages).toHaveLength(2);
  });
});

function headingProps() {
  return {
    title: 'Private reflection',
    approachName: 'CBT',
    renaming: false,
    renameDraft: 'Private reflection',
    onRename: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };
}

describe('Mira session heading presentation', () => {
  it('renders title and approach and delegates starting a rename', async () => {
    const props = headingProps();
    render(MiraSessionHeading, props);
    expect(screen.getByRole('heading', { name: 'Private reflection' })).toBeTruthy();
    expect(screen.getByText('CBT')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Rename session' }));
    expect(props.onRename).toHaveBeenCalledTimes(1);
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('edits the rename draft and delegates save without changing the session title itself', async () => {
    const props = { ...headingProps(), renaming: true };
    render(MiraSessionHeading, props);
    await fireEvent.input(screen.getByRole('textbox', { name: 'Session name' }), {
      target: { value: 'New title' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save session name' }));
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.title).toBe('Private reflection');
  });

  it('disables blank rename submission and delegates Escape and cancel', async () => {
    const props = { ...headingProps(), renaming: true, renameDraft: ' ' };
    render(MiraSessionHeading, props);
    expect(
      (screen.getByRole('button', { name: 'Save session name' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    const input = screen.getByRole('textbox', { name: 'Session name' });
    expect(input.getAttribute('maxlength')).toBe('120');
    await fireEvent.keyDown(input, { key: 'Escape' });
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel rename' }));
    expect(props.onCancel).toHaveBeenCalledTimes(2);
    expect(props.onSave).not.toHaveBeenCalled();
  });
});
