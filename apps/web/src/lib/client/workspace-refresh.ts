/** Shared lifecycle for asynchronous view reads. Newer reads win; disposed views
 * and views with an active edit must never receive an older storage snapshot.
 * This owns no records or UI state and does not change persistence semantics.
 */
export function createWorkspaceRefresh<T>(options: {
  read: () => Promise<T>;
  apply: (value: T) => void;
  failed: (error: unknown) => void;
  settled?: () => void;
  canRefresh?: () => boolean;
}) {
  let active = true;
  let generation = 0;
  let deferred = false;
  const allowed = () => active && (options.canRefresh?.() ?? true);
  async function refresh(afterOwnWrite = false): Promise<void> {
    // A component can explicitly refresh after its own confirmed save even
    // while its busy flag is still set. Background invalidations cannot.
    const canApply = () => active && (afterOwnWrite || allowed());
    const current = ++generation;
    if (!canApply()) {
      deferred = active;
      return;
    }
    deferred = false;
    try {
      const value = await options.read();
      if (current === generation && canApply()) options.apply(value);
    } catch (error) {
      if (current === generation && canApply()) options.failed(error);
    } finally {
      if (active && current === generation && !canApply()) deferred = true;
      if (current === generation && canApply()) options.settled?.();
    }
  }
  return {
    refresh,
    /** Called when an editor/drag/save becomes idle; do not lose invalidations
     * received while protecting its draft. Reads remain explicitly view-owned. */
    resume: async () => {
      if (deferred && allowed()) await refresh();
    },
    dispose() {
      active = false;
      deferred = false;
      generation += 1;
    },
  };
}
