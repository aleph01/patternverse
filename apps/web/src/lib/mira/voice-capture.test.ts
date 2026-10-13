import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import source from '../../../static/voice-capture.js?raw';

it('flushes the worklet tail exactly once before acknowledging that capture is complete', () => {
  const messages: (Float32Array | string)[] = [];
  let Processor: new () => {
    process(inputs: Float32Array[][]): boolean;
    port: { onmessage(event: { data: string }): void };
  };
  runInNewContext(source, {
    AudioWorkletProcessor: class {
      port = { postMessage: (data: Float32Array | string) => messages.push(data) };
    },
    registerProcessor: (_name: string, constructor: typeof Processor) => {
      Processor = constructor;
    },
    Float32Array,
  });
  const capture = new Processor!();
  capture.process([[new Float32Array(1024).fill(0.25)]]);
  capture.process([[new Float32Array([0.5, -0.5])]]);
  capture.port.onmessage({ data: 'flush' });
  expect((messages[0] as Float32Array).length).toBe(1024);
  expect(Array.from(messages[1] as Float32Array)).toEqual([0.5, -0.5]);
  expect(messages[2]).toBe('flushed');
  capture.port.onmessage({ data: 'flush' });
  expect(messages.slice(3)).toEqual(['flushed']);
});
