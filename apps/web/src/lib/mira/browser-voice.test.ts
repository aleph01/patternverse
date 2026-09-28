import { describe, expect, it, vi } from 'vitest';
import { startBrowserDictation, startBrowserVoiceControl } from './browser-voice';

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

describe('persistent browser voice control', () => {
  it('dispatches only final results once, resumes after end, and cancels restart on stop', () => {
    vi.useFakeTimers();
    class Recognition {
      static instances: Recognition[] = [];
      lang = '';
      continuous = false;
      interimResults = false;
      onresult:
        | null
        | ((event: { results: (Array<{ transcript: string }> & { isFinal: boolean })[] }) => void) =
        null;
      onerror = null;
      onend: null | (() => void) = null;
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
      constructor() {
        Recognition.instances.push(this);
      }
    }
    const onFinal = vi.fn();
    const onInterim = vi.fn();
    const onError = vi.fn();
    try {
      const control = startBrowserVoiceControl(
        { navigator: { language: 'en' }, SpeechRecognition: Recognition } as unknown as Window,
        { onFinal, onInterim, onError },
      );
      const first = Recognition.instances[0]!;
      const partial = Object.assign([{ transcript: 'send' }], { isFinal: false });
      first.onresult?.({ results: [partial] });
      expect(onFinal).not.toHaveBeenCalled();
      const final = Object.assign([{ transcript: 'send' }], { isFinal: true });
      first.onresult?.({ results: [final] });
      first.onresult?.({ results: [final] });
      expect(onFinal).toHaveBeenCalledExactlyOnceWith('send');
      vi.advanceTimersByTime(1200);
      first.onend?.();
      vi.advanceTimersByTime(250);
      expect(Recognition.instances).toHaveLength(2);
      Recognition.instances[1]!.onend?.();
      control.stop();
      vi.advanceTimersByTime(1000);
      expect(Recognition.instances).toHaveLength(2);
      expect(Recognition.instances[1]!.abort).toHaveBeenCalledOnce();
      first.onresult?.({ results: [final, final] });
      expect(onFinal).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});
