const TARGET_SAMPLE_RATE = 16_000;

export function encodeWhisperWav(
  channels: readonly Float32Array[],
  sourceSampleRate: number,
): Uint8Array {
  if (channels.length === 0 || channels[0]!.length === 0 || sourceSampleRate <= 0) {
    throw new Error('VOICE_AUDIO_EMPTY');
  }
  const sourceLength = Math.min(...channels.map((channel) => channel.length));
  const outputLength = Math.max(
    1,
    Math.round((sourceLength * TARGET_SAMPLE_RATE) / sourceSampleRate),
  );
  const bytes = new Uint8Array(44 + outputLength * 2);
  const view = new DataView(bytes.buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + outputLength * 2, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, outputLength * 2, true);

  for (let index = 0; index < outputLength; index += 1) {
    const sourcePosition = (index * sourceSampleRate) / TARGET_SAMPLE_RATE;
    const before = Math.min(Math.floor(sourcePosition), sourceLength - 1);
    const after = Math.min(before + 1, sourceLength - 1);
    const fraction = sourcePosition - before;
    let sample = 0;
    for (const channel of channels) {
      sample += channel[before]! + (channel[after]! - channel[before]!) * fraction;
    }
    sample = Math.max(-1, Math.min(1, sample / channels.length));
    view.setInt16(
      44 + index * 2,
      sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff),
      true,
    );
  }
  return bytes;
}

export async function recordedBlobToWhisperWav(blob: Blob): Promise<Uint8Array> {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) throw new Error('VOICE_AUDIO_DECODER_UNAVAILABLE');
  const context = new AudioContextClass();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) =>
      decoded.getChannelData(index),
    );
    return encodeWhisperWav(channels, decoded.sampleRate);
  } finally {
    await context.close().catch(() => undefined);
  }
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
