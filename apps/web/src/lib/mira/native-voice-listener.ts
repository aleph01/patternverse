import { base } from '$app/paths';
import { encodeWhisperWav } from './audio';
import { requestNativeMicrophone, transcribeLocally } from './native';
import { advanceSpeechSegment, newSpeechSegment } from './voice-segmentation';
import type { VoiceListener, VoiceListeningCallbacks } from './browser-voice';

type Snapshot = { id: number; final: boolean; wav: Uint8Array };
type NativeVoiceOptions = Readonly<{ previewIntervalMs?: number }>;

/** Capture PCM continuously; revise a live preview while preserving ordered final utterances. */
export async function startNativeVoiceControl(
  callbacks: VoiceListeningCallbacks,
  options: NativeVoiceOptions = {},
): Promise<VoiceListener> {
  await requestNativeMicrophone();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    video: false,
  });
  let context: AudioContext | undefined;
  let capture: AudioWorkletNode | undefined;
  let cancelled = false;
  let finishing = false;
  let released = false;
  let id = 0;
  let frames: Float32Array[] = [];
  let segment = newSpeechSegment(performance.now());
  let lastPreview = segment.startedAt;
  const finals: Snapshot[] = [];
  let preview: Snapshot | undefined;
  const transcription = new AbortController();
  let drainPromise: Promise<void> | undefined;
  let finishPromise: Promise<void> | undefined;
  const previewIntervalMs = options.previewIntervalMs ?? 1500;

  /** Release capture independently from cancelling queued transcription. */
  const releaseCapture = () => {
    if (released) return;
    released = true;
    if (capture) {
      capture.port.onmessage = null;
      capture.disconnect();
    }
    stream.getTracks().forEach((track) => track.stop());
    void context?.close().catch(() => undefined);
  };
  const stop = () => {
    if (cancelled) return;
    cancelled = true;
    transcription.abort();
    releaseCapture();
    frames = [];
    finals.length = 0;
    preview = undefined;
  };
  const fail = (cause: unknown) => {
    stop();
    callbacks.onError(
      cause instanceof Error ? cause.message : 'Local voice control stopped. Try again.',
    );
  };

  /** Prioritize completed phrases; replace pending previews instead of building a backlog. */
  function drain(): Promise<void> {
    if (drainPromise) return drainPromise;
    drainPromise = (async () => {
      if (cancelled) return;
      try {
        while (!cancelled) {
          const job = finals.shift() ?? preview;
          if (!job) break;
          if (job === preview) preview = undefined;
          const text = await transcribeLocally(job.wav, transcription.signal);
          if (cancelled) break;
          if (job.final) {
            callbacks.onInterim('');
            if (text) callbacks.onFinal(text);
          } else if (job.id === id) callbacks.onInterim(text);
        }
      } catch (cause) {
        if (!cancelled) fail(cause);
      } finally {
        drainPromise = undefined;
      }
    })();
    return drainPromise;
  }

  /** Snapshot only the voiced region, retaining a short lead-in for the first consonant. */
  function snapshot(final: boolean): Snapshot {
    const samples = new Float32Array(frames.reduce((sum, frame) => sum + frame.length, 0));
    let offset = 0;
    for (const frame of frames) {
      samples.set(frame, offset);
      offset += frame.length;
    }
    const from = Math.max(
      0,
      Math.floor(((segment.speechAt! - segment.startedAt) / 1000 - 0.25) * context!.sampleRate),
    );
    return { id, final, wav: encodeWhisperWav([samples.subarray(from)], context!.sampleRate) };
  }

  /** End capture and commit any speech still in progress before resolving. */
  function finish(): Promise<void> {
    if (finishPromise) return finishPromise;
    if (cancelled) return Promise.resolve();
    finishing = true;
    releaseCapture();
    const hasSpeech = segment.speechAt !== null && segment.voicedFrames >= 4;
    if (hasSpeech) finals.push(snapshot(true));
    preview = undefined;
    id += 1;
    frames = [];
    callbacks.onInterim('');
    finishPromise = drain();
    return finishPromise;
  }

  try {
    context = new AudioContext();
    await context.resume();
    await context.audioWorklet.addModule(base + '/voice-capture.js');
    capture = new AudioWorkletNode(context, 'voice-capture');
    capture.onprocessorerror = () =>
      fail(new Error('Audio capture stopped. Restart voice control to continue.'));
    context.createMediaStreamSource(stream).connect(capture);
    // The processor emits silence; connecting it keeps capture scheduled without microphone feedback.
    capture.connect(context.destination);
    segment = newSpeechSegment(performance.now());
    lastPreview = segment.startedAt;
    capture.port.onmessage = ({ data }: MessageEvent<Float32Array>) => {
      if (cancelled || finishing) return;
      frames.push(data);
      const now = performance.now();
      const rms = Math.sqrt(data.reduce((sum, sample) => sum + sample * sample, 0) / data.length);
      const next = advanceSpeechSegment(segment, rms, now);
      segment = next.state;
      if (next.cut) {
        if (next.transcribe && segment.speechAt !== null) finals.push(snapshot(true));
        preview = undefined;
        id += 1;
        frames = [];
        segment = newSpeechSegment(now);
        lastPreview = now;
        if (finals.length > 3) {
          fail(new Error('Local transcription is falling behind. Try shorter phrases.'));
          return;
        }
        void drain();
      } else if (next.transcribe && now - lastPreview >= previewIntervalMs) {
        preview = snapshot(false);
        lastPreview = now;
        void drain();
      }
    };
    stream.getAudioTracks().forEach((track) =>
      track.addEventListener('ended', () => {
        if (!cancelled && !finishing)
          fail(new Error('Microphone access ended. Restart voice control to continue.'));
      }),
    );
    return { stop, finish };
  } catch (cause) {
    stop();
    throw cause;
  }
}
