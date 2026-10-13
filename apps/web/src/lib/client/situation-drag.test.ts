// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import type { Situation } from '@patternverse/workspace';
import { createSituationDrag, type SituationDrag } from './situation-drag';

function fixture(count = 3) {
  let entries: readonly Situation[] = Array.from({ length: count }, (_, n) => ({
    id: String(n),
    title: String(n),
    context: '',
    position: n,
    revision: 0,
    workspaceId: 'private',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }));
  const original = entries;
  const list = document.createElement('ol');
  document.body.append(list);
  let blocked = false;
  let drag: SituationDrag | null = null;
  let frameId = 0;
  const frames = new Map<number, () => void>();
  const rows = new Map(
    entries.map((entry) => {
      const row = document.createElement('li'),
        handle = document.createElement('button');
      row.append(handle);
      Object.defineProperty(row, 'offsetTop', {
        get: () => entries.findIndex((s) => s.id === entry.id) * 100,
      });
      Object.defineProperty(row, 'offsetHeight', { value: 100 });
      row.getBoundingClientRect = () =>
        ({
          top:
            entries.findIndex((s) => s.id === entry.id) * 100 +
            (drag?.id === entry.id ? drag.offset : 0),
        }) as DOMRect;
      list.append(row);
      return [entry.id, row] as const;
    }),
  );
  const capture = new Set<number>();
  list.setPointerCapture = vi.fn((pointer) => {
    capture.add(pointer);
  });
  list.hasPointerCapture = (pointer) => capture.has(pointer);
  list.releasePointerCapture = vi.fn((pointer) => {
    capture.delete(pointer);
  });
  const ports = {
    list: () => list,
    entries: () => entries,
    blocked: () => blocked,
    reordered: vi.fn((next: readonly Situation[]) => {
      entries = next;
      for (const entry of next) list.append(rows.get(entry.id)!);
    }),
    changed: vi.fn((next: SituationDrag | null) => {
      drag = next;
    }),
    persist: vi.fn(async (id: string, beforeId: string | null) => {
      void id;
      void beforeId;
    }),
    layout: vi.fn(async () => {}),
    requestFrame: vi.fn((callback: () => void) => {
      frames.set(++frameId, callback);
      return frameId;
    }),
    cancelFrame: vi.fn((id: number) => {
      frames.delete(id);
    }),
    viewportHeight: () => 800,
    scroll: vi.fn(),
  };
  const controller = createSituationDrag(ports);
  const pointer = (id: string, y: number, pointerId = 1, button = 0) =>
    ({
      currentTarget: rows.get(id)!.firstChild,
      clientY: y,
      pointerId,
      button,
      preventDefault: vi.fn(),
    }) as unknown as PointerEvent;
  const key = (key: string) => new KeyboardEvent('keydown', { key, cancelable: true });
  return {
    controller,
    ports,
    original,
    list,
    pointer,
    key,
    get entries() {
      return entries;
    },
    get drag() {
      return drag;
    },
    block: (value: boolean) => {
      blocked = value;
    },
    frame: () => {
      const [id, callback] = frames.entries().next().value!;
      frames.delete(id);
      callback();
    },
    get frames() {
      return frames.size;
    },
  };
}
afterEach(() => {
  document.body.replaceChildren();
});

it('does no browser work on creation, and ignores blocked/non-primary/missing drags', () => {
  const f = fixture();
  expect(f.ports.changed).not.toHaveBeenCalled();
  f.block(true);
  f.controller.down(f.pointer('0', 0), f.entries[0]);
  f.block(false);
  f.controller.down(f.pointer('0', 0, 1, 2), f.entries[0]);
  f.controller.down(f.pointer('0', 0), { ...f.entries[0], id: 'missing' });
  expect(f.list.setPointerCapture).not.toHaveBeenCalled();
  expect(f.drag).toBeNull();
});
it('keeps a click/under-threshold movement from writing or starting a scroll', async () => {
  const f = fixture();
  f.controller.down(f.pointer('0', 30), f.entries[0]);
  f.controller.move(f.pointer('0', 34));
  expect(f.drag?.started).toBe(false);
  expect(f.frames).toBe(0);
  await f.controller.finish(false, 1);
  expect(f.entries).toEqual(f.original);
  expect(f.ports.persist).not.toHaveBeenCalled();
  expect(f.list.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1);
});
it('ignores events from other pointers and a second drag', async () => {
  const f = fixture();
  f.controller.down(f.pointer('0', 30), f.entries[0]);
  f.controller.down(f.pointer('1', 130, 2), f.entries[1]);
  f.controller.move(f.pointer('0', 280, 2));
  await f.controller.finish(true, 2);
  expect(f.drag?.id).toBe('0');
  expect(f.drag?.started).toBe(false);
  expect(f.list.setPointerCapture).toHaveBeenCalledOnce();
  await f.controller.finish(true, 1);
});
it('previews reorder and persists only one final move with the following ID', async () => {
  const f = fixture();
  f.controller.down(f.pointer('0', 30), f.entries[0]);
  const event = f.pointer('0', 210);
  f.controller.move(event);
  await Promise.resolve();
  expect(event.preventDefault).toHaveBeenCalledOnce();
  expect(f.entries.map((s) => s.id)).toEqual(['1', '0', '2']);
  expect(f.ports.persist).not.toHaveBeenCalled();
  await f.controller.finish(false, 1);
  await f.controller.finish(false, 1);
  expect(f.ports.persist).toHaveBeenCalledExactlyOnceWith('0', '2');
  expect(f.drag).toBeNull();
  expect(f.frames).toBe(0);
});
it('passes null when moving to the end and no write when returned to the original order', async () => {
  const f = fixture();
  f.controller.down(f.pointer('0', 30), f.entries[0]);
  f.controller.move(f.pointer('0', 310));
  await Promise.resolve();
  await f.controller.finish();
  expect(f.ports.persist).toHaveBeenCalledExactlyOnceWith('0', null);
  const g = fixture();
  g.controller.down(g.pointer('0', 30), g.entries[0]);
  g.controller.move(g.pointer('0', 210));
  await Promise.resolve();
  g.controller.move(g.pointer('0', 30));
  await Promise.resolve();
  await g.controller.finish();
  expect(g.entries).toEqual(g.original);
  expect(g.ports.persist).not.toHaveBeenCalled();
});
it.each(['cancel', 'Escape', 'lost capture'])(
  'cancels %s without writing or retaining capture/scroll',
  async (reason) => {
    const f = fixture();
    f.controller.down(f.pointer('0', 30), f.entries[0]);
    f.controller.move(f.pointer('0', 310));
    await Promise.resolve();
    if (reason === 'Escape') {
      const event = f.key('Escape');
      f.controller.key(event, '0');
      expect(event.defaultPrevented).toBe(true);
    } else await f.controller.finish(true, 1);
    expect(f.entries).toEqual(f.original);
    expect(f.drag).toBeNull();
    expect(f.frames).toBe(0);
    expect(f.list.hasPointerCapture(1)).toBe(false);
    expect(f.ports.persist).not.toHaveBeenCalled();
  },
);
it('ignores a delayed layout after cancellation instead of reviving the dragged row', async () => {
  const f = fixture();
  let release = () => {};
  f.ports.layout.mockImplementationOnce(
    () =>
      new Promise<void>((yes) => {
        release = yes;
      }),
  );
  f.controller.down(f.pointer('0', 30), f.entries[0]);
  f.controller.move(f.pointer('0', 210));
  await f.controller.finish(true);
  f.ports.changed.mockClear();
  release();
  await Promise.resolve();
  expect(f.ports.changed).not.toHaveBeenCalled();
  expect(f.entries).toEqual(f.original);
});
it.each([20, 790])('scrolls near the %s edge in frames, then stops on cancellation', async (y) => {
  const f = fixture();
  f.controller.down(f.pointer('0', 100), f.entries[0]);
  f.controller.move(f.pointer('0', y));
  f.frame();
  expect(f.ports.scroll).toHaveBeenCalledExactlyOnceWith(y < 72 ? -10 : 10);
  expect(f.frames).toBe(1);
  await f.controller.finish(true);
  expect(f.frames).toBe(0);
});
it('does not scroll in the center of the viewport', async () => {
  const f = fixture();
  f.controller.down(f.pointer('0', 30), f.entries[0]);
  f.controller.move(f.pointer('0', 350));
  f.frame();
  expect(f.ports.scroll).not.toHaveBeenCalled();
  expect(f.frames).toBe(0);
  await f.controller.finish(true);
});
it('cleans up frames/capture on unmount without writing or publishing a late preview', async () => {
  const f = fixture();
  let release = () => {};
  f.ports.layout.mockImplementationOnce(
    () =>
      new Promise<void>((yes) => {
        release = yes;
      }),
  );
  f.controller.down(f.pointer('0', 30), f.entries[0]);
  f.controller.move(f.pointer('0', 790));
  f.ports.changed.mockClear();
  f.ports.reordered.mockClear();
  f.controller.dispose();
  f.controller.dispose();
  release();
  await Promise.resolve();
  f.controller.down(f.pointer('1', 130), f.entries[1]);
  f.controller.key(f.key('ArrowDown'), '0');
  expect(f.frames).toBe(0);
  expect(f.list.releasePointerCapture).toHaveBeenCalledOnce();
  expect(f.ports.persist).not.toHaveBeenCalled();
  expect(f.ports.changed).not.toHaveBeenCalled();
  expect(f.ports.reordered).not.toHaveBeenCalled();
});
it('abandons failed pointer capture without blocking other actions', () => {
  const f = fixture();
  vi.mocked(f.list.setPointerCapture).mockImplementationOnce(() => {
    throw new Error('Inactive pointer');
  });
  f.controller.down(f.pointer('0', 30), f.entries[0]);
  expect(f.drag).toBeNull();
  f.controller.key(f.key('ArrowDown'), '0');
  expect(f.ports.persist).toHaveBeenCalledExactlyOnceWith('0', '2');
});
it('uses accessible arrow moves, respects queue boundaries/guards, and ignores missing IDs', () => {
  const f = fixture();
  f.controller.key(f.key('ArrowUp'), '0');
  f.controller.key(f.key('ArrowDown'), '2');
  f.controller.key(f.key('ArrowDown'), 'missing');
  f.controller.key(f.key('Enter'), '1');
  f.block(true);
  f.controller.key(f.key('ArrowUp'), '1');
  expect(f.ports.persist).not.toHaveBeenCalled();
  f.block(false);
  f.controller.key(f.key('ArrowUp'), '1');
  f.controller.key(f.key('ArrowDown'), '1');
  expect(f.ports.persist.mock.calls).toEqual([
    ['1', '0'],
    ['1', null],
  ]);
});
it('keeps all entries exactly once and restores original order across 100 generated cancelled drags', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.integer({ min: 0, max: 900 }), { minLength: 1, maxLength: 20 }),
      async (positions) => {
        const f = fixture(7);
        f.controller.down(f.pointer('2', 230), f.entries[2]);
        for (const y of positions) {
          f.controller.move(f.pointer('2', y));
          await Promise.resolve();
          expect(new Set(f.entries.map((s) => s.id)).size).toBe(7);
          expect(f.entries.map((s) => s.id).sort()).toEqual(f.original.map((s) => s.id).sort());
        }
        await f.controller.finish(true);
        expect(f.entries).toEqual(f.original);
        expect(f.ports.persist).not.toHaveBeenCalled();
        expect(f.frames).toBe(0);
        f.list.remove();
      },
    ),
    { numRuns: 100 },
  );
});
