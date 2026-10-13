/** Minimal browser speech boundary; recognition support varies across installed PWAs. */
export type BrowserDictation = Readonly<{
  stop: () => void;
  cancel: () => void;
}>;

type SpeechResult = ArrayLike<{ readonly transcript: string }> & { readonly isFinal: boolean };
type SpeechEvent = Readonly<{ readonly results: ArrayLike<SpeechResult> }>;
type SpeechError = Readonly<{ readonly error: string }>;
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: SpeechError) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export type VoiceListener = Readonly<{
  /** Cancel listening immediately and discard any unfinished utterance. */
  stop: () => void;
  /** Stop capture while allowing the current utterance to finish transcribing. */
  finish?: () => Promise<void>;
}>;
export type VoiceListeningCallbacks = Readonly<{
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onError: (message: string) => void;
}>;

/** Keep recognition alive across browser end events; dispatch each final result exactly once. */
export function startBrowserVoiceControl(
  browser: SpeechWindow,
  callbacks: VoiceListeningCallbacks,
): VoiceListener {
  const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  if (!Constructor)
    throw new Error('Voice control is unavailable in this browser. You can still type.');
  let listening = true;
  let recognition: Recognition | undefined;
  let restart: ReturnType<typeof setTimeout> | undefined;
  let rapidEnds = 0;
  const stop = () => {
    listening = false;
    clearTimeout(restart);
    recognition?.abort();
  };
  const fail = (message: string) => {
    stop();
    callbacks.onError(message);
  };
  const begin = () => {
    if (!listening) return;
    const current = new Constructor();
    recognition = current;
    const delivered = new Set<number>();
    const started = Date.now();
    current.lang = browser.navigator.language || 'en-US';
    current.continuous = true;
    current.interimResults = true;
    current.onresult = ({ results }) => {
      if (!listening || recognition !== current) return;
      const interim: string[] = [];
      Array.from(results).forEach((result, index) => {
        const text = result[0]?.transcript.trim() ?? '';
        if (result.isFinal && !delivered.has(index)) {
          delivered.add(index);
          if (text && listening) callbacks.onFinal(text);
        } else if (!result.isFinal) interim.push(text);
      });
      if (listening) callbacks.onInterim(interim.join(' '));
    };
    current.onerror = ({ error }) => {
      if (listening && recognition === current && error !== 'no-speech')
        fail(speechErrorMessage(error));
    };
    current.onend = () => {
      if (!listening || recognition !== current) return;
      rapidEnds = Date.now() - started < 1000 ? rapidEnds + 1 : 0;
      if (rapidEnds >= 3) {
        fail('The browser stopped listening. Tap voice control to resume.');
        return;
      }
      restart = setTimeout(begin, 250);
    };
    try {
      current.start();
    } catch {
      fail('Voice control could not resume. Tap it again to listen.');
    }
  };
  begin();
  return { stop };
}

/** Stream interim and final transcription into the composer without sending it. */
export function startBrowserDictation(
  browser: SpeechWindow,
  callbacks: Readonly<{
    onText: (text: string) => void;
    onEnd: () => void;
    onError: (message: string) => void;
  }>,
): BrowserDictation {
  const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  if (!Constructor) throw new Error('Speech recognition is unavailable in this browser.');
  const recognition = new Constructor();
  recognition.lang = browser.navigator.language || 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results, (result) => result[0]?.transcript.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    callbacks.onText(transcript);
  };
  recognition.onerror = (event) => {
    if (event.error !== 'aborted') callbacks.onError(speechErrorMessage(event.error));
  };
  recognition.onend = callbacks.onEnd;
  recognition.start();
  return { stop: () => recognition.stop(), cancel: () => recognition.abort() };
}

function speechErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone or speech recognition access was denied. Check Safari settings.';
    case 'no-speech':
      return 'No speech was detected. Try dictating again.';
    case 'audio-capture':
      return 'The microphone could not be opened.';
    case 'network':
      return 'Speech recognition could not connect. You can still type your message.';
    default:
      return 'Dictation stopped unexpectedly. You can try again or type your message.';
  }
}
