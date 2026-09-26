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
