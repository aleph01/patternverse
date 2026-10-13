import type { Situation } from '@patternverse/workspace';

export type SituationDrag = {
  id: string;
  row: HTMLLIElement;
  pointer: number;
  startY: number;
  initialTop: number;
  offset: number;
  started: boolean;
  original: readonly Situation[];
};

/** Pointer/keyboard presentation only. Persisted ordering remains a workspace
 * operation; cancelling a preview never writes. Browser effects are explicit ports.
 */
export function createSituationDrag(ports: {
  list: () => HTMLOListElement;
  entries: () => readonly Situation[];
  blocked: () => boolean;
  reordered: (entries: readonly Situation[]) => void;
  changed: (drag: SituationDrag | null) => void;
  persist: (id: string, beforeId: string | null) => Promise<void>;
  layout: () => Promise<void>;
  requestFrame: (callback: () => void) => number;
  cancelFrame: (frame: number) => void;
  viewportHeight: () => number;
  scroll: (delta: number) => void;
}) {
  let drag: SituationDrag | null = null;
  let disposed = false;
  let scrollFrame = 0;
  let dragY = 0;
  const publish = () => {
    if (!disposed) ports.changed(drag ? { ...drag } : null);
  };
  const stopScroll = () => {
    if (scrollFrame) ports.cancelFrame(scrollFrame);
    scrollFrame = 0;
  };
  async function updateDrag(clientY: number) {
    const current = drag;
    if (!current || disposed) return;
    const list = ports.list();
    const others = [...list.children].filter((row) => row !== current.row) as HTMLLIElement[];
    let target = 0;
    for (const row of others) {
      const center =
        list.getBoundingClientRect().top + row.offsetTop - list.offsetTop + row.offsetHeight / 2;
      if (clientY > center) target++;
    }
    const entries = ports.entries();
    const from = entries.findIndex((entry) => entry.id === current.id);
    if (from < 0) {
      await finish(true);
      return;
    }
    if (target !== from) {
      const next = [...entries];
      const [entry] = next.splice(from, 1);
      next.splice(Math.min(target, next.length), 0, entry);
      ports.reordered(next);
      await ports.layout();
    }
    if (disposed || drag !== current) return;
    const layoutTop = current.row.getBoundingClientRect().top - current.offset;
    current.offset = clientY - current.startY + current.initialTop - layoutTop;
    publish();
  }
  function scrollDrag() {
    scrollFrame = 0;
    if (disposed || !drag?.started) return;
    const delta = dragY < 72 ? -10 : dragY > ports.viewportHeight() - 72 ? 10 : 0;
    if (!delta) return;
    ports.scroll(delta);
    void updateDrag(dragY);
    scrollFrame = ports.requestFrame(scrollDrag);
  }
  async function finish(cancelled = false, pointer?: number) {
    const current = drag;
    if (!current || (pointer !== undefined && pointer !== current.pointer)) return;
    drag = null;
    stopScroll();
    const list = ports.list();
    if (list.hasPointerCapture(current.pointer)) list.releasePointerCapture(current.pointer);
    if (cancelled || !current.started) {
      if (!disposed) ports.reordered(current.original);
      publish();
      return;
    }
    const entries = ports.entries();
    const at = entries.findIndex((entry) => entry.id === current.id);
    const changedOrder = entries.some((entry, index) => entry.id !== current.original[index]?.id);
    // Start persistence before releasing the view's drag guard, so deferred
    // background reads cannot replace the preview in the handoff to its busy guard.
    const saving =
      at >= 0 && changedOrder && !disposed
        ? ports.persist(current.id, entries[at + 1]?.id ?? null)
        : undefined;
    publish();
    await saving;
  }
  return {
    down(event: PointerEvent, entry: Situation) {
      if (disposed || event.button !== 0 || ports.blocked() || drag) return;
      const row = (event.currentTarget as HTMLButtonElement).closest('li');
      if (!row || !ports.entries().some((item) => item.id === entry.id)) return;
      drag = {
        id: entry.id,
        row,
        pointer: event.pointerId,
        startY: event.clientY,
        initialTop: row.getBoundingClientRect().top,
        offset: 0,
        started: false,
        original: [...ports.entries()],
      };
      try {
        ports.list().setPointerCapture(event.pointerId);
      } catch {
        drag = null;
      }
      publish();
    },
    move(event: PointerEvent) {
      if (disposed || !drag || event.pointerId !== drag.pointer) return;
      if (!drag.started && Math.abs(event.clientY - drag.startY) < 5) return;
      event.preventDefault();
      dragY = event.clientY;
      drag.started = true;
      publish();
      if (!scrollFrame) scrollFrame = ports.requestFrame(scrollDrag);
      void updateDrag(event.clientY);
    },
    finish,
    key(event: KeyboardEvent, id: string) {
      if (disposed) return;
      if (event.key === 'Escape' && drag) {
        event.preventDefault();
        void finish(true);
        return;
      }
      if (!['ArrowUp', 'ArrowDown'].includes(event.key) || ports.blocked() || drag) return;
      event.preventDefault();
      const entries = ports.entries();
      const index = entries.findIndex((entry) => entry.id === id);
      const target = index + (event.key === 'ArrowUp' ? -1 : 1);
      if (index < 0 || target < 0 || target >= entries.length) return;
      const rest = entries.filter((entry) => entry.id !== id);
      void ports.persist(id, rest[target]?.id ?? null);
    },
    dispose() {
      if (disposed) return;
      // Release capture and frames, but never commit the preview on navigation.
      disposed = true;
      void finish(true);
      stopScroll();
    },
  };
}
