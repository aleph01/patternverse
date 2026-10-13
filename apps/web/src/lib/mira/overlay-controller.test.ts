import { describe, expect, it, vi } from 'vitest';
import { createMiraOverlays, type MiraOpenOverlay, type MiraOverlay } from './overlay-controller';

function fixture() {
  const changed = vi.fn<(overlay: MiraOverlay) => void>();
  const activeFocus = vi.fn(() => 'composer');
  const afterRender = vi.fn(async () => {});
  const focusOverlay = vi.fn<(overlay: MiraOpenOverlay) => void>();
  const restoreFocus = vi.fn<(target: string) => void>();
  const ports = { changed, activeFocus, afterRender, focusOverlay, restoreFocus };
  return { ...ports, controller: createMiraOverlays(ports) };
}

describe('Mira overlay coordination', () => {
  it.each(['settings', 'sessions', 'patterns', 'modalities'] as const)(
    'opens %s and returns to its explicit trigger',
    async (overlay) => {
      const f = fixture();
      expect(await f.controller.open(overlay, 'trigger')).toBe(true);
      expect(f.changed).toHaveBeenLastCalledWith(overlay);
      expect(f.focusOverlay).toHaveBeenLastCalledWith(overlay);
      f.controller.close(overlay);
      await Promise.resolve();
      expect(f.changed).toHaveBeenLastCalledWith('chat');
      expect(f.restoreFocus).toHaveBeenCalledWith('trigger');
    },
  );

  it('switches surfaces exclusively and keeps the original trigger for voice/keyboard actions', async () => {
    const f = fixture();
    await f.controller.open('patterns');
    await f.controller.open('modalities');
    await f.controller.open('settings');
    expect(f.changed.mock.calls).toEqual([['patterns'], ['modalities'], ['settings']]);
    expect(f.activeFocus).toHaveBeenCalledTimes(1);
    expect(f.restoreFocus).not.toHaveBeenCalled();
    f.controller.close();
    await Promise.resolve();
    expect(f.restoreFocus).toHaveBeenCalledWith('composer');
  });

  it('uses a new explicit trigger when switching via another visible control', async () => {
    const f = fixture();
    await f.controller.open('patterns', 'patterns-button');
    await f.controller.open('settings', 'settings-button');
    f.controller.close();
    await Promise.resolve();
    expect(f.restoreFocus).toHaveBeenCalledWith('settings-button');
  });

  it('opening an already-open surface does not toggle it or replace its trigger', async () => {
    const f = fixture();
    await f.controller.open('settings', 'first');
    expect(await f.controller.open('settings', 'second')).toBe(false);
    expect(f.changed).toHaveBeenCalledTimes(1);
    f.controller.close();
    await Promise.resolve();
    expect(f.restoreFocus).toHaveBeenCalledWith('first');
  });

  it('ignores a late selector close after another surface is opened', async () => {
    const f = fixture();
    await f.controller.open('patterns');
    await f.controller.open('sessions');
    f.controller.close('patterns');
    expect(f.changed).toHaveBeenLastCalledWith('sessions');
    expect(f.restoreFocus).not.toHaveBeenCalled();
  });

  it('does not focus an obsolete open after a newer surface is selected', async () => {
    const f = fixture();
    let finish!: () => void;
    f.afterRender.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    const old = f.controller.open('patterns');
    await f.controller.open('settings');
    finish();
    expect(await old).toBe(false);
    expect(f.focusOverlay.mock.calls).toEqual([['settings']]);
  });

  it('does not steal focus from a newer surface while completing a close', async () => {
    const f = fixture();
    await f.controller.open('patterns');
    let finish!: () => void;
    f.afterRender.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    f.controller.close();
    await f.controller.open('modalities');
    finish();
    await Promise.resolve();
    expect(f.restoreFocus).not.toHaveBeenCalled();
    expect(f.focusOverlay).toHaveBeenLastCalledWith('modalities');
  });

  it('ignores pending focus work and future actions after disposal', async () => {
    const f = fixture();
    const opening = f.controller.open('patterns');
    f.controller.dispose();
    expect(await opening).toBe(false);
    await f.controller.open('settings');
    f.controller.close();
    expect(f.changed.mock.calls).toEqual([['patterns']]);
    expect(f.focusOverlay).not.toHaveBeenCalled();
    expect(f.restoreFocus).not.toHaveBeenCalled();
  });

  it('also cancels pending return focus on disposal', async () => {
    const f = fixture();
    await f.controller.open('settings');
    f.controller.close();
    f.controller.dispose();
    await Promise.resolve();
    expect(f.restoreFocus).not.toHaveBeenCalled();
  });

  it('closing chat is a no-op and missing focus is valid', async () => {
    const f = fixture();
    f.controller.close();
    expect(f.changed).not.toHaveBeenCalled();
    const ports = { ...f, activeFocus: () => null };
    const controller = createMiraOverlays(ports);
    await controller.open('settings');
    controller.close();
    await Promise.resolve();
    expect(f.restoreFocus).not.toHaveBeenCalled();
  });
});
