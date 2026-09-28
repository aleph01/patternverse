import { recordedBlobToWhisperWav } from './audio';
import { requestNativeMicrophone, transcribeLocally } from './native';
import { advanceSpeechSegment, newSpeechSegment } from './voice-segmentation';
import type { VoiceListener, VoiceListeningCallbacks } from './browser-voice';

/** Capture bounded utterances continuously and serialize them through the bundled Whisper worker. */
export async function startNativeVoiceControl(
  callbacks: VoiceListeningCallbacks,
): Promise<VoiceListener> {
  await requestNativeMicrophone();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    video: false,
  });
  let context: AudioContext | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let recorder: MediaRecorder | undefined;
  let stopped = false;
  let queued = 0;
  let work = Promise.resolve();
  const transcription = new AbortController();
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    transcription.abort();
    if (recorder?.state === 'recording') recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
    void context?.close().catch(() => undefined);
  };
  const fail = (cause: unknown) => {
    stop();
    callbacks.onError(
      cause instanceof Error ? cause.message : 'Local voice control stopped. Try again.',
    );
  };
  try {
    context = new AudioContext();
    await context.resume();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    let segment = newSpeechSegment(performance.now());
    const begin = () => {
      if (stopped) return;
      segment = newSpeechSegment(performance.now());
      const current = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder = current;
      const chunks: Blob[] = [];
      current.ondataavailable = ({ data }) => {
        if (data.size) chunks.push(data);
      };
      current.onerror = () =>
        fail(new Error('The microphone recording stopped. Try voice control again.'));
      current.onstop = () => {
        if (stopped) return;
        const completed = segment;
        const blob = new Blob(chunks, { type: current.mimeType });
        begin();
        if (completed.voicedFrames < 4 || completed.speechAt === null) return;
        if (++queued > 3) {
          fail(
            new Error(
              'Speech is arriving faster than local transcription. Restart voice control and leave a little more time between phrases.',
            ),
          );
          return;
        }
        const from = Math.max(0, (completed.speechAt - completed.startedAt) / 1000 - 0.25);
        work = work
          .then(async () => {
            if (stopped) return;
            callbacks.onInterim('Transcribing locally…');
            const wav = await recordedBlobToWhisperWav(blob, from);
            if (stopped) return;
            const text = await transcribeLocally(wav, transcription.signal);
            if (!stopped) {
              callbacks.onInterim('');
              if (text) callbacks.onFinal(text);
            }
          })
          .catch((cause) => {
            if (!stopped) fail(cause);
          })
          .finally(() => {
            queued -= 1;
          });
      };
      current.start();
    };
    begin();
    timer = setInterval(() => {
      if (stopped || recorder?.state !== 'recording') return;
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(
        samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length,
      );
      const next = advanceSpeechSegment(segment, rms, performance.now());
      segment = next.state;
      if (next.cut) recorder.stop();
    }, 60);
    stream.getAudioTracks().forEach((track) =>
      track.addEventListener('ended', () => {
        if (!stopped)
          fail(new Error('Microphone access ended. Restart voice control to continue.'));
      }),
    );
    return { stop };
  } catch (cause) {
    stop();
    throw cause;
  }
}
