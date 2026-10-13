<script lang="ts">
  import { untrack } from 'svelte';
  import { resolve } from '$app/paths';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { practiceSnapshot, type PracticeIdentity } from '$lib/pattern-run/history';
  import type { PatternRun } from '$lib/pattern-runtime/types';
  import type { PracticeRunInput } from '@patternverse/workspace';
  let {
    run,
    identity,
    resumable = false,
    recordId,
    context = {},
    restored = false,
    retainedSteps = [],
  }: {
    run: PatternRun;
    identity: PracticeIdentity;
    resumable?: boolean;
    recordId?: string;
    context?: Readonly<Record<string, string>>;
    restored?: boolean;
    retainedSteps?: PatternRun['view']['items'];
  } = $props();
  let enabled = $state(untrack(() => restored));
  let saving = $state(false);
  let saved = $state(false);
  let error = $state('');
  let queue = Promise.resolve();
  let queued = 0;
  function persist(candidate?: PracticeRunInput) {
    let snapshot: PracticeRunInput;
    try {
      snapshot =
        candidate ??
        practiceSnapshot(run, identity, { resumable, id: recordId, context, retainedSteps });
    } catch {
      saved = false;
      error =
        'This run could not be saved. Keep the view open; its checkpoint may exceed the size limit.';
      return;
    }
    const token = ++queued;
    saving = true;
    error = '';
    queue = queue.then(async () => {
      try {
        await (await getLocalWorkspace()).savePracticeRun(snapshot);
        if (token === queued) {
          saved = true;
          error = '';
        }
      } catch {
        if (token === queued) {
          saved = false;
          error = 'Responses could not be saved. Keep this view open and retry.';
        }
      } finally {
        if (token === queued) saving = false;
      }
    });
  }
  $effect(() => {
    if (enabled) {
      // Track only runtime/host input changes; saving indicators must not retrigger writes.
      const current = run;
      const metadata = identity;
      const canResume = resumable;
      const id = recordId;
      const startingContext = context;
      const earlierResponses = retainedSteps;
      try {
        const snapshot = practiceSnapshot(current, metadata, {
          resumable: canResume,
          id,
          context: startingContext,
          retainedSteps: earlierResponses,
        });
        untrack(() => persist(snapshot));
      } catch {
        untrack(() => {
          saved = false;
          error =
            'This run could not be saved. Keep the view open; its checkpoint may exceed the size limit.';
        });
      }
    }
  });
</script>

<div class="save-practice" aria-label="Save practice responses">
  <div>
    <strong
      >{enabled
        ? saving
          ? 'Saving…'
          : saved
            ? 'Saved on this device'
            : 'Saving enabled'
        : 'Keep your responses.'}</strong
    >
    <p>
      {enabled
        ? 'Confirmed steps are saved to your private practice history. Text in an unfinished step is not saved.'
        : 'Save this run to your workspace, then keep saving as you continue. Nothing is uploaded.'}
    </p>
  </div>
  {#if !enabled}<button
      type="button"
      onclick={() => {
        enabled = true;
      }}>Save to workspace</button
    >
  {:else}<a
      href={resolve(`/my?pane=history&run=${encodeURIComponent(recordId ?? run.view.root_id)}`)}
      >Practice history →</a
    >{/if}
  {#if error}<p class="error" role="alert">
      {error} <button type="button" onclick={() => persist()}>Retry saving</button>
    </p>{/if}
</div>

<style>
  .save-practice {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    padding: 1.1rem 0;
    margin: 1rem 0;
    border-block: 1px solid var(--border, #dde2d9);
    font-size: 0.82rem;
  }
  .save-practice > div {
    flex: 1;
    min-width: min(240px, 100%);
  }
  strong {
    font-weight: 750;
  }
  p {
    margin: 0.4rem 0 0;
    color: var(--muted);
    font-size: 0.76rem;
    line-height: 1.6;
  }
  button {
    min-height: 44px;
    border: 1px solid #bfc2ba;
    border-radius: 5px;
    padding: 0.6rem 0.8rem;
    background: var(--paper, #fff);
    color: var(--ink, #181814);
    font: inherit;
    font-weight: 650;
    cursor: pointer;
  }
  button:hover:not(:disabled),
  button:focus-visible {
    background: var(--ink, #181814);
    color: var(--paper, #fff);
    border-color: var(--ink, #181814);
  }
  button:focus-visible {
    outline: 2px solid var(--green-dark, #00865c);
    outline-offset: 3px;
  }
  a {
    color: var(--green-dark);
    font-weight: 700;
    text-decoration: none;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  .error {
    color: #a62b1f;
    width: 100%;
  }
</style>
