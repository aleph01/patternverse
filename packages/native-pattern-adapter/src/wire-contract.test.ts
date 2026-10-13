import { describe, expect, it, vi } from 'vitest';
import { createNativePatternRuns, type RunStatus } from './index.js';

const reference = { artifact_id: 'artifact-1', revision_id: 'revision-1' };
const pattern = { sourceId: 'commons', entityId: 'check-in', revision: 'article-1' };
const response = () => ({
  pilot: null,
  library: { reference, title: 'Check in' },
  anchor_id: null,
  view: {
    root_id: 'root-1',
    revision: 2,
    status: 'Waiting',
    pending: { effect_id: 'effect-1', run_id: 'child-1', request: { kind: 'interaction.ask' } },
    items: [{ effect: { run_id: 'child-1', futureField: [1, 2] } }],
  },
});

function harness(raw: unknown = [response()]) {
  const invoke = vi.fn(async () => raw);
  const resolve = vi.fn(async () => ({ entity: pattern, native: reference }));
  return { runs: createNativePatternRuns({ invoke }, { resolve }), invoke, resolve };
}

describe('native response compatibility through the public adapter', () => {
  it.each<RunStatus>(['Waiting', 'Paused', 'Completed', 'Cancelled', 'Failed'])(
    'accepts %s and opaque future effect payloads without interpreting them',
    async (status) => {
      const raw = response();
      raw.view.status = status;
      const pending = { ...raw.view.pending, extra: { future: true } };
      const library = { ...raw.library, extra: 'preserved' };
      const view = { ...raw.view, pending, extra: 'ignored' };
      const { runs } = harness([{ ...raw, library, view, extra: 'ignored' }]);
      const [run] = await runs.load('session-1');
      expect(run).toEqual({
        pilot: null,
        library,
        anchor_id: null,
        view: {
          root_id: 'root-1',
          revision: 2,
          status,
          pending,
          items: raw.view.items,
        },
      });
      expect(run?.view.pending).toBe(pending);
      expect(run?.view.items).toBe(raw.view.items);
      expect(run?.library).toBe(library);
    },
  );

  it('accepts completed runs without pending effects or installed-library metadata', async () => {
    const raw = response();
    const { runs } = harness([
      {
        ...raw,
        library: null,
        pilot: 'custom',
        anchor_id: 'message-1',
        view: { ...raw.view, revision: 0, status: 'Completed', pending: null },
      },
    ]);
    expect(await runs.load('session-1')).toMatchObject([
      { library: null, pilot: 'custom', anchor_id: 'message-1', view: { pending: null } },
    ]);
    expect(await harness([]).runs.load('session-1')).toEqual([]);
  });

  it.each([
    ['non-array response', {}, 'Invalid native pattern response.'],
    ['non-object run', [null], 'Invalid native pattern run.'],
    ['missing view', [{}], 'Invalid native pattern run.'],
    [
      'empty root',
      [{ ...response(), view: { ...response().view, root_id: '' } }],
      'Invalid native pattern view.',
    ],
    [
      'negative revision',
      [{ ...response(), view: { ...response().view, revision: -1 } }],
      'Invalid native pattern view.',
    ],
    [
      'fractional revision',
      [{ ...response(), view: { ...response().view, revision: 1.5 } }],
      'Invalid native pattern view.',
    ],
    [
      'unsafe revision',
      [{ ...response(), view: { ...response().view, revision: Number.MAX_SAFE_INTEGER + 1 } }],
      'Invalid native pattern view.',
    ],
    [
      'unknown status',
      [{ ...response(), view: { ...response().view, status: 'Starting' } }],
      'Invalid native pattern view.',
    ],
    [
      'missing items',
      [{ ...response(), view: { ...response().view, items: undefined } }],
      'Invalid native pattern view.',
    ],
    [
      'missing pending',
      [{ ...response(), view: { ...response().view, pending: undefined } }],
      'Invalid native pattern effect.',
    ],
    [
      'non-object request',
      [
        {
          ...response(),
          view: { ...response().view, pending: { effect_id: 'e', run_id: 'r', request: [] } },
        },
      ],
      'Invalid native pattern effect.',
    ],
    [
      'missing library',
      [{ ...response(), library: undefined }],
      'Invalid native library reference.',
    ],
    [
      'blank revision ID',
      [
        {
          ...response(),
          library: { reference: { ...reference, revision_id: ' ' }, title: 'Check in' },
        },
      ],
      'Invalid native library reference.',
    ],
    ['missing pilot', [{ ...response(), pilot: undefined }], 'Invalid pilot.'],
    ['non-string anchor', [{ ...response(), anchor_id: 1 }], 'Invalid pattern anchor.'],
  ])('retains the existing error for %s', async (_name, raw, message) => {
    await expect(harness(raw).runs.load('session-1')).rejects.toThrow(message as string);
  });

  it('passes nested-run commands and their exact revision to Rust', async () => {
    const { runs, invoke } = harness();
    const [run] = await runs.load('session-1');
    if (!run) throw new Error('Expected loaded run.');
    const command = { run_id: 'child-1', event: { Submit: { value: 'unchanged' } } };
    await runs.apply('session-1', run.view, command, 'reset-1');
    expect(invoke).toHaveBeenLastCalledWith('session_pattern_run', {
      sessionId: 'session-1',
      resetToken: 'reset-1',
      operation: { action: 'apply', root_id: 'root-1', revision: 2, command },
    });
  });

  it('keeps exact article revision checks before invoking an installed executable', async () => {
    const { runs, invoke } = harness();
    await expect(
      runs.start('session-1', { ...pattern, revision: 'article-2' }, {}, null),
    ).rejects.toThrow('No executable revision is installed for this Patternverse pattern.');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('rejects blank session IDs before IPC and propagates native failures unchanged', async () => {
    const { runs, invoke } = harness();
    await expect(runs.load(' ')).rejects.toThrow('Session ID is required.');
    expect(invoke).not.toHaveBeenCalled();
    const failure = new Error('Native revision is stale.');
    invoke.mockRejectedValueOnce(failure);
    await expect(runs.load('session-1')).rejects.toBe(failure);
  });
});
