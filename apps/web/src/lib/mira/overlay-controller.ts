export type MiraOverlay = 'chat' | 'settings' | 'sessions' | 'patterns' | 'modalities';
export type MiraOpenOverlay = Exclude<MiraOverlay, 'chat'>;

interface OverlayPorts<FocusTarget> {
  changed: (overlay: MiraOverlay) => void;
  activeFocus: () => FocusTarget | null;
  afterRender: () => Promise<void>;
  focusOverlay: (overlay: MiraOpenOverlay) => void;
  restoreFocus: (target: FocusTarget) => void;
}

/** One visible surface; no practice, session, persistence, or browser semantics. */
export function createMiraOverlays<FocusTarget>(ports: OverlayPorts<FocusTarget>) {
  let current: MiraOverlay = 'chat';
  let returnFocus: FocusTarget | null = null;
  let revision = 0;
  let disposed = false;

  async function open(overlay: MiraOpenOverlay, trigger?: FocusTarget) {
    if (disposed || current === overlay) return false;
    if (trigger !== undefined) returnFocus = trigger;
    else if (current === 'chat') returnFocus = ports.activeFocus();
    const opening = ++revision;
    current = overlay;
    ports.changed(current);
    await ports.afterRender();
    if (disposed || opening !== revision) return false;
    ports.focusOverlay(overlay);
    return true;
  }

  function close(expected?: MiraOpenOverlay) {
    if (disposed || current === 'chat' || (expected && current !== expected)) return;
    const closing = ++revision;
    const target = returnFocus;
    returnFocus = null;
    current = 'chat';
    ports.changed(current);
    void ports.afterRender().then(() => {
      if (!disposed && closing === revision && target !== null) ports.restoreFocus(target);
    });
  }

  return {
    open,
    close,
    dispose: () => {
      disposed = true;
      revision += 1;
      returnFocus = null;
    },
  };
}
