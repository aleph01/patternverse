import type { ReplySpeech } from './reply-playback';

interface SpeechHost {
  speechSynthesis?: Pick<SpeechSynthesis, 'cancel' | 'speak'>;
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
  navigator?: Pick<Navigator, 'language'>;
}

/** Browser-only speech adapter; no provider requests, persistence or microphone ownership. */
export function createBrowserReplySpeech(host: SpeechHost): ReplySpeech | undefined {
  const synthesis = host.speechSynthesis;
  const Utterance = host.SpeechSynthesisUtterance;
  if (!synthesis || !Utterance) return undefined;
  return {
    cancel: () => synthesis.cancel(),
    speak: (text, callbacks) => {
      const utterance = new Utterance(text);
      utterance.lang = host.navigator?.language || 'en-US';
      utterance.rate = 0.96;
      utterance.onend = () => callbacks.ended();
      utterance.onerror = (event) => callbacks.failed(event.error);
      synthesis.speak(utterance);
    },
  };
}
