import type { PatternRef } from '@patternverse/companion-core';
import type { ChatRun, ExecutableLinks, NativeInvoke, NativePatternRuns } from './types.js';
import { decodeNativeRuns, isRecord, validRevision } from './wire.js';

export type * from './types.js';

/**
 * Adapt Patternverse identities to Mira's existing `session_pattern_run`
 * command. This is the native path; web availability remains a separate
 * capability decision rather than an implicit cloud or JavaScript fallback.
 */
export function createNativePatternRuns(
  native: NativeInvoke,
  links: ExecutableLinks,
): NativePatternRuns {
  const execute = async (
    sessionId: string,
    operation: Readonly<Record<string, unknown>>,
    resetToken?: string,
  ): Promise<readonly ChatRun[]> => {
    if (!sessionId.trim()) throw new Error('Session ID is required.');
    const raw = await native.invoke('session_pattern_run', {
      sessionId,
      resetToken: resetToken ?? null,
      operation,
    });
    return decodeNativeRuns(raw);
  };

  return {
    load: (sessionId, resetToken) => execute(sessionId, { action: 'load' }, resetToken),
    start: async (sessionId, pattern, inputs, anchorId, resetToken) => {
      const link = await links.resolve(pattern);
      if (!link || !samePattern(link.entity, pattern) || !validRevision(link.native)) {
        throw new Error('No executable revision is installed for this Patternverse pattern.');
      }
      return execute(
        sessionId,
        {
          action: 'start_library',
          reference: link.native,
          inputs,
          anchor_id: anchorId,
        },
        resetToken,
      );
    },
    apply: (sessionId, view, command, resetToken) => {
      if (
        command.run_id !== view.root_id &&
        !view.items.some(
          (item) =>
            isRecord(item) && isRecord(item.effect) && item.effect.run_id === command.run_id,
        )
      ) {
        throw new Error('Command run is not part of the loaded pattern view.');
      }
      return execute(
        sessionId,
        {
          action: 'apply',
          root_id: view.root_id,
          revision: view.revision,
          command,
        },
        resetToken,
      );
    },
  };
}

function samePattern(left: PatternRef, right: PatternRef): boolean {
  return (
    left.sourceId === right.sourceId &&
    left.entityId === right.entityId &&
    left.revision === right.revision
  );
}
