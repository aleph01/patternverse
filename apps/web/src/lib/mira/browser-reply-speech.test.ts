import { describe, expect, it, vi } from 'vitest';
import { createBrowserReplySpeech } from './browser-reply-speech';

function fixture(language = 'de-DE') {
  class Utterance {
    lang = '';
    rate = 1;
    onend: SpeechSynthesisUtterance['onend'] = null;
    onerror: SpeechSynthesisUtterance['onerror'] = null;
    constructor(public text: string) {}
  }
  const synthesis = {
    cancel: vi.fn(),
    speak: vi.fn<(utterance: SpeechSynthesisUtterance) => void>(),
  };
  const host = {
    speechSynthesis: synthesis,
    SpeechSynthesisUtterance: Utterance as unknown as typeof SpeechSynthesisUtterance,
    navigator: { language },
  };
  return { host, synthesis, speech: createBrowserReplySpeech(host)! };
}

describe('browser reply speech adapter', () => {
  it('retains reply text, device language and the existing read-aloud rate', () => {
    const f = fixture();
    f.speech.speak('A complete reply.', { ended: vi.fn(), failed: vi.fn() });
    expect(f.synthesis.speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'A complete reply.', lang: 'de-DE', rate: 0.96 }),
    );
    f.speech.cancel();
    expect(f.synthesis.cancel).toHaveBeenCalledOnce();
  });

  it('falls back to en-US when the device language is empty or unavailable', () => {
    const f = fixture('');
    f.speech.speak('Reply', { ended: vi.fn(), failed: vi.fn() });
    expect(f.synthesis.speak).toHaveBeenLastCalledWith(expect.objectContaining({ lang: 'en-US' }));
    const speech = createBrowserReplySpeech({ ...f.host, navigator: undefined })!;
    speech.speak('Reply', { ended: vi.fn(), failed: vi.fn() });
    expect(f.synthesis.speak).toHaveBeenLastCalledWith(expect.objectContaining({ lang: 'en-US' }));
  });

  it('maps end and device errors without reinterpreting them', () => {
    const f = fixture();
    const callbacks = { ended: vi.fn(), failed: vi.fn() };
    f.speech.speak('Reply', callbacks);
    const utterance = f.synthesis.speak.mock.calls[0]![0];
    utterance.onend?.({} as SpeechSynthesisEvent);
    utterance.onerror?.({ error: 'interrupted' } as SpeechSynthesisErrorEvent);
    expect(callbacks.ended).toHaveBeenCalledOnce();
    expect(callbacks.failed).toHaveBeenCalledWith('interrupted');
  });

  it('does not require browser globals and reports unsupported hosts through its return value', () => {
    const f = fixture();
    expect(createBrowserReplySpeech({})).toBeUndefined();
    expect(createBrowserReplySpeech({ speechSynthesis: f.synthesis })).toBeUndefined();
    expect(
      createBrowserReplySpeech({ SpeechSynthesisUtterance: f.host.SpeechSynthesisUtterance }),
    ).toBeUndefined();
  });
});
