import { describe, expect, it, vi } from 'vitest';
import { startBrowserDictation } from './browser-voice';

describe('browser dictation', () => {
  it('streams interim text and lets the user stop without sending', () => {
    const recognition = {
      lang: '',
      continuous: false,
      interimResults: false,
      onresult: null as null | ((event: { results: ArrayLike<[{ transcript: string }]> }) => void),
      onerror: null,
      onend: null as null | (() => void),
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
    };
    const onText = vi.fn();
    const onEnd = vi.fn();
    const dictation = startBrowserDictation(
      {
        navigator: { language: 'en-GB' },
        webkitSpeechRecognition: class {
          constructor() {
            return recognition;
          }
        },
      } as unknown as Window,
      { onText, onEnd, onError: vi.fn() },
    );

    expect(recognition.start).toHaveBeenCalledOnce();
    expect(recognition.interimResults).toBe(true);
    expect(recognition.lang).toBe('en-GB');
    recognition.onresult?.({ results: [[{ transcript: 'What I feel' }]] });
    expect(onText).toHaveBeenCalledWith('What I feel');
    dictation.stop();
    expect(recognition.stop).toHaveBeenCalledOnce();
    recognition.onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
