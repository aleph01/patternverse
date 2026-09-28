export type SpeechSegment = Readonly<{
  startedAt: number;
  speechAt: number | null;
  lastVoiceAt: number;
  voicedFrames: number;
}>;
export const newSpeechSegment = (now: number): SpeechSegment => ({
  startedAt: now,
  speechAt: null,
  lastVoiceAt: now,
  voicedFrames: 0,
});

/** Detect utterance boundaries from microphone energy; cap recordings during both speech and silence. */
export function advanceSpeechSegment(state: SpeechSegment, rms: number, now: number) {
  const voiced = rms >= 0.015;
  const next = voiced
    ? {
        ...state,
        speechAt: state.speechAt ?? now,
        lastVoiceAt: now,
        voicedFrames: state.voicedFrames + 1,
      }
    : state;
  return {
    state: next,
    cut:
      now - state.startedAt >= 20_000 || (next.speechAt !== null && now - next.lastVoiceAt >= 900),
    transcribe: next.voicedFrames >= 4,
  };
}
