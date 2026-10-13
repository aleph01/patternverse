import { describe, expect, it, vi } from 'vitest';
import { createMiraVoiceDispatch, type MiraVoiceDispatchPorts } from './voice-dispatch';
import { decodeVoiceIntent, parseVoiceCommand, type VoiceContext } from './voice-commands';

function fixture() {
  const patternActions = {
    searchPatterns: vi.fn<(query: string) => void>(),
    selectPattern: vi.fn<(id: string) => string>(() => 'Pattern selected.'),
    startSelection: vi.fn(async () => 'Exercise started.'),
    describeSelection: vi.fn(() => 'Selected pattern description.'),
  };
  const state: {
    surface: VoiceContext['surface'];
    draft: string;
    sending: boolean;
    patterns: typeof patternActions | undefined;
    reply: { id: string; text: string } | undefined;
  } = { surface: 'chat', draft: '', sending: false, patterns: patternActions, reply: undefined };
  const ports = {
    surface: () => state.surface,
    draft: () => state.draft,
    draftChanged: vi.fn((text: string) => {
      state.draft = text;
    }),
    sending: () => state.sending,
    send: vi.fn<() => Promise<void>>(async () => {}),
    patterns: () => state.patterns,
    openPatterns: vi.fn<() => Promise<boolean | undefined>>(async () => true),
    openModalities: vi.fn<(query: string) => Promise<void>>(async () => {}),
    searchModalities: vi.fn<(query: string) => void>(),
    selectModality: vi.fn<(id: string) => Promise<void>>(async () => {}),
    latestReply: () => state.reply,
    speakReply: vi.fn<(id: string, text: string) => boolean>(() => true),
    stopReading: vi.fn(),
    close: vi.fn(),
    openPanel: vi.fn<(panel: 'settings' | 'sessions') => Promise<void>>(async () => {}),
    stopVoiceControl: vi.fn(),
  } satisfies MiraVoiceDispatchPorts;
  return { state, ports, patternActions, execute: createMiraVoiceDispatch(ports) };
}

describe('Mira spoken-command dispatch', () => {
  it.each([
    ['', 'first thought', 'first thought'],
    ['earlier thought  ', 'next thought', 'earlier thought next thought'],
    ['  ', 'next thought', 'next thought'],
    ['earlier\nthought', 'next thought', 'earlier\nthought next thought'],
  ])('appends speech to draft %j without sending', async (before, text, expected) => {
    const f = fixture();
    f.state.draft = before;
    expect(await f.execute({ type: 'draft', text })).toBe('Draft updated · say “send” when ready.');
    expect(f.state.draft).toBe(expected);
    expect(f.ports.send).not.toHaveBeenCalled();
  });

  it('keeps the existing 30,000-character composer limit', async () => {
    const f = fixture();
    f.state.draft = 'a'.repeat(29999);
    await f.execute({ type: 'draft', text: 'more' });
    expect(f.state.draft).toBe(`${'a'.repeat(29999)} `);
    expect(f.state.draft.length).toBe(30000);
  });

  it.each(['settings', 'sessions', 'patterns', 'modalities', 'exercise'] as const)(
    'does not draft or send from %s',
    async (surface) => {
      const f = fixture();
      f.state.surface = surface;
      f.state.draft = 'Keep this draft';
      expect(await f.execute({ type: 'draft', text: 'unexpected speech' })).toBe(
        'Close this panel to draft a message.',
      );
      expect(await f.execute({ type: 'send' })).toBe(
        'Close this panel before sending your message.',
      );
      expect(f.ports.draftChanged).not.toHaveBeenCalled();
      expect(f.ports.send).not.toHaveBeenCalled();
      expect(f.state.draft).toBe('Keep this draft');
    },
  );

  it('reads live state rather than capturing the original surface, draft or busy state', async () => {
    const f = fixture();
    f.state.sending = true;
    f.state.draft = 'private draft';
    expect(await f.execute({ type: 'send' })).toBe('mira is still replying. Your draft is kept.');
    expect(f.ports.send).not.toHaveBeenCalled();
    f.state.sending = false;
    f.state.draft = ' \n ';
    expect(await f.execute({ type: 'send' })).toBe('Your message is empty.');
    expect(f.ports.send).not.toHaveBeenCalled();
    f.state.draft = 'ready to send';
    expect(await f.execute({ type: 'send' })).toBe('Sending your message…');
    expect(f.ports.send).toHaveBeenCalledOnce();
    expect(f.ports.draftChanged).not.toHaveBeenCalled();
  });

  it('starts sending without awaiting the reply or owning its lifecycle', async () => {
    const f = fixture();
    let finish!: () => void;
    f.ports.send.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    f.state.draft = 'ready';
    expect(await f.execute({ type: 'send' })).toBe('Sending your message…');
    finish();
  });

  it('waits for opening before using the current pattern component', async () => {
    const f = fixture();
    let finish!: (opened: boolean) => void;
    f.state.patterns = undefined;
    f.ports.openPatterns.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const dispatch = f.execute({ type: 'patterns', query: 'thought record' });
    expect(f.patternActions.searchPatterns).not.toHaveBeenCalled();
    f.state.patterns = f.patternActions;
    finish(true);
    expect(await dispatch).toBe('Choose a numbered result, then say “start”.');
    expect(f.patternActions.searchPatterns).toHaveBeenCalledWith('thought record');
    expect(f.patternActions.selectPattern).not.toHaveBeenCalled();
    expect(f.patternActions.startSelection).not.toHaveBeenCalled();
  });

  it.each([false, undefined])(
    'does not search if opening was superseded or unavailable (%s)',
    async (opened) => {
      const f = fixture();
      f.ports.openPatterns.mockResolvedValue(opened);
      await f.execute({ type: 'patterns', query: 'thought record' });
      expect(f.patternActions.searchPatterns).not.toHaveBeenCalled();
    },
  );

  it('opens the approach picker through its shared action with the query', async () => {
    const f = fixture();
    expect(await f.execute({ type: 'modalities', query: 'CBT' })).toBe(
      'Choose a numbered therapy approach.',
    );
    expect(f.ports.openModalities).toHaveBeenCalledWith('CBT');
    expect(f.ports.selectModality).not.toHaveBeenCalled();
  });

  it.each(['patterns', 'modalities'] as const)(
    'searches only the current %s selector',
    async (surface) => {
      const f = fixture();
      f.state.surface = surface;
      expect(await f.execute({ type: 'search', query: 'positive' })).toBe('Search updated.');
      expect(
        surface === 'patterns' ? f.patternActions.searchPatterns : f.ports.searchModalities,
      ).toHaveBeenCalledWith('positive');
      expect(
        surface === 'patterns' ? f.ports.searchModalities : f.patternActions.searchPatterns,
      ).not.toHaveBeenCalled();
      await f.execute({ type: 'search', query: '' });
      expect(
        surface === 'patterns' ? f.patternActions.searchPatterns : f.ports.searchModalities,
      ).toHaveBeenLastCalledWith('');
    },
  );

  it('does not search a selector that is closed', async () => {
    const f = fixture();
    await f.execute({ type: 'search', query: 'positive' });
    expect(f.patternActions.searchPatterns).not.toHaveBeenCalled();
    expect(f.ports.searchModalities).not.toHaveBeenCalled();
  });

  it('selection previews a pattern and forwards the existing picker validation feedback', async () => {
    const f = fixture();
    f.state.surface = 'patterns';
    expect(await f.execute({ type: 'select', id: 'technique:thought-record' })).toBe(
      'Pattern selected.',
    );
    expect(f.patternActions.selectPattern).toHaveBeenCalledWith('technique:thought-record');
    f.patternActions.selectPattern.mockReturnValue('That pattern is not available.');
    expect(await f.execute({ type: 'select', id: 'missing' })).toBe(
      'That pattern is not available.',
    );
    expect(f.patternActions.startSelection).not.toHaveBeenCalled();
    expect(f.ports.send).not.toHaveBeenCalled();
  });

  it('delegates approach selection to the same action used by the visible control', async () => {
    const f = fixture();
    f.state.surface = 'modalities';
    expect(await f.execute({ type: 'select', id: 'cbt' })).toBe('Therapy approach changed.');
    expect(f.ports.selectModality).toHaveBeenCalledWith('cbt');
    expect(f.patternActions.selectPattern).not.toHaveBeenCalled();
    f.state.surface = 'chat';
    expect(await f.execute({ type: 'modality', id: 'narm' })).toBe('Therapy approach changed.');
    expect(f.ports.selectModality).toHaveBeenLastCalledWith('narm');
  });

  it('keeps selection and explicit start feedback when the selector is closed or absent', async () => {
    const f = fixture();
    expect(await f.execute({ type: 'select', id: 'a' })).toBe('Open a selector first.');
    expect(await f.execute({ type: 'start' })).toBe('Open patterns and select one first.');
    f.state.surface = 'patterns';
    f.state.patterns = undefined;
    expect(await f.execute({ type: 'select', id: 'a' })).toBe('Open patterns first.');
    expect(await f.execute({ type: 'start' })).toBe('Select a pattern first.');
    expect(f.patternActions.startSelection).not.toHaveBeenCalled();
  });

  it('starts only through the existing guided selection action and returns its feedback', async () => {
    const f = fixture();
    f.state.surface = 'patterns';
    expect(await f.execute({ type: 'start' })).toBe('Exercise started.');
    expect(f.patternActions.startSelection).toHaveBeenCalledOnce();
    f.patternActions.startSelection.mockResolvedValue('Select an available pattern first.');
    expect(await f.execute({ type: 'start' })).toBe('Select an available pattern first.');
    expect(f.ports.send).not.toHaveBeenCalled();
  });

  it('uses the current pattern description, with the existing missing-component fallback', async () => {
    const f = fixture();
    expect(await f.execute({ type: 'describe' })).toBe('Selected pattern description.');
    f.state.patterns = undefined;
    expect(await f.execute({ type: 'describe' })).toBe('Select a pattern first.');
  });

  it('delegates reading only the latest assistant reply, without speech APIs or transcript access', async () => {
    const f = fixture();
    expect(await f.execute({ type: 'read' })).toBe('There is no reply to read yet.');
    expect(f.ports.speakReply).not.toHaveBeenCalled();
    f.state.reply = { id: 'reply-2', text: 'The latest assistant reply.' };
    expect(await f.execute({ type: 'read' })).toBe('Reading the latest reply.');
    expect(f.ports.speakReply).toHaveBeenCalledWith('reply-2', 'The latest assistant reply.');
    f.ports.speakReply.mockReturnValue(false);
    expect(await f.execute({ type: 'read' })).toBe(
      'Spoken replies are unavailable in this browser.',
    );
  });

  it('keeps stop-reading, close and stop-listening as distinct delegated actions', async () => {
    const f = fixture();
    expect(await f.execute({ type: 'stop-reading' })).toBe('Reading stopped.');
    expect(f.ports.stopReading).toHaveBeenCalledOnce();
    expect(f.ports.close).not.toHaveBeenCalled();
    expect(f.ports.stopVoiceControl).not.toHaveBeenCalled();
    expect(await f.execute({ type: 'close' })).toBe('Back to the conversation.');
    expect(f.ports.close).toHaveBeenCalledOnce();
    expect(await f.execute({ type: 'stop' })).toBe('Voice control stopped.');
    expect(f.ports.stopVoiceControl).toHaveBeenCalledOnce();
    expect(f.patternActions.startSelection).not.toHaveBeenCalled();
    expect(f.ports.send).not.toHaveBeenCalled();
  });

  it.each(['settings', 'sessions'] as const)(
    'opens %s using the shared panel action',
    async (panel) => {
      const f = fixture();
      expect(await f.execute({ type: panel })).toBe(
        `${panel === 'settings' ? 'Settings' : 'Previous sessions'} opened.`,
      );
      expect(f.ports.openPanel).toHaveBeenCalledWith(panel);
    },
  );

  it('passes a notice through without taking a UI action', async () => {
    const f = fixture();
    expect(await f.execute({ type: 'notice', text: 'That result is unavailable.' })).toBe(
      'That result is unavailable.',
    );
    for (const value of Object.values(f.ports)) {
      if (vi.isMockFunction(value)) expect(value).not.toHaveBeenCalled();
    }
    expect(f.patternActions.selectPattern).not.toHaveBeenCalled();
  });

  it('leaves action errors to the existing voice controller feedback boundary', async () => {
    const f = fixture();
    const error = new Error('Could not start the selected practice.');
    f.state.surface = 'patterns';
    f.patternActions.startSelection.mockRejectedValue(error);
    await expect(f.execute({ type: 'start' })).rejects.toBe(error);
  });

  it('uses the existing vocabulary: interpreted selection previews, and models cannot start or send', async () => {
    const f = fixture();
    f.state.surface = 'patterns';
    const context: VoiceContext = {
      surface: 'patterns',
      choices: [{ id: 'a', label: 'Thought Record' }],
      modalities: [],
      selectedPattern: false,
    };
    const selection = decodeVoiceIntent('{"type":"select","id":"a"}', context)!;
    await f.execute(selection);
    expect(f.patternActions.selectPattern).toHaveBeenCalledWith('a');
    expect(f.patternActions.startSelection).not.toHaveBeenCalled();
    expect(f.ports.send).not.toHaveBeenCalled();
    expect(decodeVoiceIntent('{"type":"start"}', context)).toBeNull();
    expect(decodeVoiceIntent('{"type":"send"}', context)).toBeNull();
    await f.execute(parseVoiceCommand('start', context)!);
    expect(f.patternActions.startSelection).toHaveBeenCalledOnce();
  });
});
