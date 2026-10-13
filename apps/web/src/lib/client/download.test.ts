// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { downloadBlob, downloadText } from './download';
import { downloadPracticeFile } from './practice-export';

const createObjectURL = vi.fn<(blob: Blob) => string>();
const revokeObjectURL = vi.fn();
let clicks: { filename: string; href: string; attached: boolean; hidden: boolean | string }[];

beforeEach(() => {
  clicks = [];
  createObjectURL
    .mockReset()
    .mockImplementation(() => `blob:fixture-${createObjectURL.mock.calls.length}`);
  revokeObjectURL.mockReset();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicks.push({
      filename: this.download,
      href: this.href,
      attached: this.isConnected,
      hidden: this.hidden,
    });
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function bytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

function ignoreCleanupTimer() {
  const timer = setTimeout(() => {}, 0);
  clearTimeout(timer);
  vi.spyOn(window, 'setTimeout').mockReturnValue(timer);
}

it('attaches only a temporary anchor, preserves the blob and filename, and defers cleanup', () => {
  vi.useFakeTimers();
  const blob = new Blob(['fixture'], { type: 'text/plain' });
  downloadBlob(blob, 'reflection — today.txt');
  expect(createObjectURL).toHaveBeenCalledExactlyOnceWith(blob);
  expect(clicks).toEqual([
    { filename: 'reflection — today.txt', href: 'blob:fixture-1', attached: true, hidden: true },
  ]);
  expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  expect(revokeObjectURL).not.toHaveBeenCalled();
  vi.advanceTimersByTime(999);
  expect(revokeObjectURL).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:fixture-1');
  expect(vi.getTimerCount()).toBe(0);
});

it('retains the Mira archive delay and cleans up concurrent downloads independently', () => {
  vi.useFakeTimers();
  downloadText('first', 'first.json');
  downloadText('encrypted', 'mira.json', 'application/json', { revokeAfterMs: 60_000 });
  vi.advanceTimersByTime(1000);
  expect(revokeObjectURL.mock.calls).toEqual([['blob:fixture-1']]);
  vi.advanceTimersByTime(58_999);
  expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1);
  expect(revokeObjectURL.mock.calls).toEqual([['blob:fixture-1'], ['blob:fixture-2']]);
  expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
});

it.each([
  ['application/json', '{"answer":"Grüße 🌱"}', 'responses.json'],
  ['text/plain;charset=utf-8', '# A thought\n\n**Your answer**\n', 'worksheet.md'],
  ['text/plain;charset=utf-8', 'A thought\nYour answer: __________\n', 'worksheet.txt'],
  ['image/svg+xml;charset=utf-8', '<svg><title>Überblick</title></svg>', 'illustration.svg'],
])(
  'preserves %s content as UTF-8 without changing serialization',
  async (type, content, filename) => {
    ignoreCleanupTimer();
    downloadText(content, filename, type);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe(type);
    expect(Array.from(await bytes(blob))).toEqual(Array.from(new TextEncoder().encode(content)));
    expect(clicks[0].filename).toBe(filename);
  },
);

it('passes binary CBOR through without text conversion or copying unrelated buffer bytes', async () => {
  ignoreCleanupTimer();
  const buffer = Uint8Array.from([99, 0xa1, 0x61, 0x78, 0, 255, 99]);
  const payload = buffer.subarray(1, 6);
  const blob = new Blob([payload], { type: 'application/cbor' });
  downloadBlob(blob, 'patternverse-workspace.cbor');
  expect(createObjectURL.mock.calls[0][0]).toBe(blob);
  expect(await bytes(blob)).toEqual(payload);
  expect(clicks[0].filename).toBe('patternverse-workspace.cbor');
});

it('keeps the practice-specific API as an alias with the same JSON default', () => {
  vi.useFakeTimers();
  expect(downloadPracticeFile).toBe(downloadText);
  downloadPracticeFile('{"fixture":true}', 'patternverse-practice-responses.json');
  expect(createObjectURL.mock.calls[0][0].type).toBe('application/json');
  vi.runAllTimers();
  expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:fixture-1');
});

it.each(['create', 'append', 'click', 'schedule'] as const)(
  'releases the URL and removes its anchor if %s fails',
  (stage) => {
    vi.useFakeTimers();
    const failure = new Error(`Failed ${stage}`);
    const fail = () => {
      throw failure;
    };
    if (stage === 'create') vi.spyOn(document, 'createElement').mockImplementationOnce(fail);
    if (stage === 'append') vi.spyOn(document.body, 'append').mockImplementationOnce(fail);
    if (stage === 'click')
      vi.mocked(HTMLAnchorElement.prototype.click).mockImplementationOnce(fail);
    if (stage === 'schedule') vi.spyOn(window, 'setTimeout').mockImplementationOnce(fail);
    expect(() => downloadText('private fixture', 'fixture.json')).toThrow(failure);
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:fixture-1');
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  },
);

it('does not create an anchor or schedule cleanup when object-URL creation fails', () => {
  vi.useFakeTimers();
  createObjectURL.mockImplementationOnce(() => {
    throw new Error('No object URLs');
  });
  expect(() => downloadText('fixture', 'fixture.json')).toThrow('No object URLs');
  expect(clicks).toEqual([]);
  expect(revokeObjectURL).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
