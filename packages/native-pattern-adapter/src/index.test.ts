import { describe, expect, it, vi } from 'vitest';
import { createNativePatternRuns, type ExecutableLinks, type NativeInvoke } from './index.js';

const pattern = { sourceId: 'commons', entityId: 'abc-diary' };
const reference = { artifact_id: 'mira-abc-diary', revision_id: 'snapshot-1' };
const link = { entity: pattern, native: reference };
const nativeRun = {
  pilot: null,
  library: { reference, title: 'ABC diary' },
  anchor_id: null,
  view: {
    root_id: 'root-1',
    revision: 2,
    status: 'Waiting',
    pending: { effect_id: 'effect-1', run_id: 'root-1', request: { kind: 'interaction.ask' } },
    items: [],
  },
} as const;

function harness(resolved = link, response: unknown = [nativeRun]) {
  const invoke = vi.fn(async () => response);
  const native: NativeInvoke = { invoke };
  const links: ExecutableLinks = { resolve: async () => resolved };
  return { runs: createNativePatternRuns(native, links), invoke };
}

describe('native Pattern Markdown adapter', () => {
  it('loads encrypted session runs through the existing Rust command', async () => {
    const { runs, invoke } = harness();
    expect(await runs.load('session-1', 'reset-1')).toHaveLength(1);
    expect(invoke).toHaveBeenCalledWith('session_pattern_run', {
      sessionId: 'session-1',
      resetToken: 'reset-1',
      operation: { action: 'load' },
    });
  });

  it('starts only an explicitly linked immutable executable revision', async () => {
    const { runs, invoke } = harness();
    await runs.start('session-1', pattern, { situation: { type: 'text', value: 'At work' } }, null);
    expect(invoke).toHaveBeenCalledWith('session_pattern_run', {
      sessionId: 'session-1',
      resetToken: null,
      operation: {
        action: 'start_library',
        reference,
        inputs: { situation: { type: 'text', value: 'At work' } },
        anchor_id: null,
      },
    });
  });

  it('does not launch a similarly named pattern from another source', async () => {
    const { runs, invoke } = harness();
    await expect(
      runs.start('session-1', { sourceId: 'personal', entityId: 'abc-diary' }, {}, null),
    ).rejects.toThrow('No executable revision');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('applies an exact run revision without interpreting the event in TypeScript', async () => {
    const { runs, invoke } = harness();
    const [run] = await runs.load('session-1');
    if (!run) throw new Error('Expected run');
    await runs.apply('session-1', run.view, { run_id: 'root-1', event: 'Pause' });
    expect(invoke).toHaveBeenLastCalledWith('session_pattern_run', {
      sessionId: 'session-1',
      resetToken: null,
      operation: {
        action: 'apply',
        root_id: 'root-1',
        revision: 2,
        command: { run_id: 'root-1', event: 'Pause' },
      },
    });
  });

  it('rejects a malformed native response instead of presenting an uncertain run', async () => {
    const { runs } = harness(link, [
      { ...nativeRun, view: { ...nativeRun.view, revision: 'two' } },
    ]);
    await expect(runs.load('session-1')).rejects.toThrow('Invalid native pattern view.');
  });

  it('rejects commands for an unrelated run before calling Rust', async () => {
    const { runs, invoke } = harness();
    expect(() =>
      runs.apply('session-1', nativeRun.view, { run_id: 'other', event: 'Cancel' }),
    ).toThrow('not part of the loaded pattern view');
    expect(invoke).not.toHaveBeenCalled();
  });
});
