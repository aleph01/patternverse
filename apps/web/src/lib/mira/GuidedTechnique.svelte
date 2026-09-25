<script lang="ts">
  import {
    listTechniques,
    loadGuidedRun,
    startGuidedRun,
    applyGuidedAction,
    type GuidedRun,
    type Technique,
    type GuidedEffect,
  } from './guided';
  import type { PrivateMiraStore } from './private-store';

  let {
    sessionId,
    modalityId,
    store,
  }: { sessionId: string; modalityId: string; store: PrivateMiraStore } = $props();
  let run = $state<GuidedRun | null>(null);
  let techniques = $state<readonly Technique[]>([]);
  let selecting = $state(false);
  let working = $state(false);
  let answerDraft = $state('');
  let error = $state('');

  $effect(() => {
    const id = sessionId;
    const modality = modalityId;
    let live = true;
    run = null;
    techniques = [];
    error = '';
    void Promise.all([loadGuidedRun(store, id), listTechniques(modality)])
      .then(([saved, available]) => {
        if (live) {
          run = saved;
          techniques = available;
        }
      })
      .catch((cause) => {
        if (live) error = messageOf(cause);
      });
    return () => {
      live = false;
    };
  });

  const pending = $derived(run?.view.pending ?? null);
  const active = $derived(run?.view.status === 'Waiting' || run?.view.status === 'Paused');

  function messageOf(cause: unknown): string {
    return cause instanceof Error ? cause.message : 'The guided exercise could not continue.';
  }
  function prompt(effect: GuidedEffect): string {
    const value = effect.request.payload.prompt ?? effect.request.payload.markdown;
    return typeof value === 'string' ? value : '';
  }
  function choices(effect: GuidedEffect): readonly { value: string; label: string }[] {
    const value = effect.request.payload.options;
    if (!Array.isArray(value)) return [];
    return value.filter(
      (option) => typeof option?.value === 'string' && typeof option?.label === 'string',
    );
  }
  function answerText(result: unknown, effect: GuidedEffect): string {
    if (!result || typeof result !== 'object' || !('value' in result)) return '';
    const value = result.value;
    if (typeof value !== 'string') return '';
    return choices(effect).find((option) => option.value === value)?.label ?? value;
  }
  function focusDialog(node: HTMLElement) {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node.focus();
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        selecting = false;
        return;
      }
      if (event.key !== 'Tab') return;
      const buttons = [...node.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      if (!buttons.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', onKeydown);
    return {
      destroy: () => {
        node.removeEventListener('keydown', onKeydown);
        previous?.focus();
      },
    };
  }
  async function start(id: string) {
    if (working) return;
    working = true;
    error = '';
    try {
      run = await startGuidedRun(store, sessionId, id);
      selecting = false;
    } catch (cause) {
      error = messageOf(cause);
    } finally {
      working = false;
    }
  }
  async function apply(event: unknown, runId: string) {
    if (!run || working) return;
    working = true;
    error = '';
    try {
      run = await applyGuidedAction(store, sessionId, run, event, runId);
      answerDraft = '';
    } catch (cause) {
      error = messageOf(cause);
      try {
        run = await loadGuidedRun(store, sessionId);
      } catch {
        /* Keep the error visible. */
      }
    } finally {
      working = false;
    }
  }
  function fulfill(kind: 'selected' | 'text', value: string) {
    if (!pending || !value.trim()) return;
    void apply(
      { Fulfill: { effect_id: pending.effect_id, result: { kind, value: value.trim() } } },
      pending.run_id,
    );
  }
</script>

<div class="mira-guided">
  <div class="mira-guided-heading">
    <div>
      <p class="mira-eyebrow">Guided reflection · on this device</p>
      {#if active}<h3>
          {techniques.find((item) => item.id === run?.view.technique_id)?.title ??
            run?.view.technique_id}
        </h3>
      {:else}<h3>Therapy techniques</h3>{/if}
    </div>
    <div class="mira-guided-actions">
      {#if active && run}<button
          type="button"
          class="mira-guided-stop"
          aria-label="End exercise"
          title="End exercise"
          disabled={working}
          onclick={() => apply('Cancel', run!.view.root_id)}>■</button
        >{/if}
      <button type="button" onclick={() => (selecting = true)} disabled={working || active}
        >Choose technique</button
      >
    </div>
  </div>
  {#if error}<p role="alert" class="mira-guided-error">{error}</p>{/if}
  {#if run}
    <div class="mira-guided-history">
      {#each run.view.items.filter((item) => item.effect.effect_id !== pending?.effect_id) as item (item.effect.effect_id)}
        {#if prompt(item.effect)}<p>{prompt(item.effect)}</p>{/if}
        {#if item.result && answerText(item.result, item.effect)}<p class="mira-guided-answer">
            {answerText(item.result, item.effect)}
          </p>{/if}
      {/each}
    </div>
    {#if pending && active}
      <div class="mira-guided-step">
        <p>{prompt(pending)}</p>
        {#if pending.request.kind === 'interaction.choose'}
          <div class="mira-guided-options">
            {#each choices(pending) as option (option.value)}
              <button
                type="button"
                disabled={working}
                onclick={() => fulfill('selected', option.value)}>{option.label}</button
              >
            {/each}
          </div>
        {:else if pending.request.kind === 'interaction.ask'}
          <form
            onsubmit={(event) => {
              event.preventDefault();
              fulfill('text', answerDraft);
            }}
          >
            <label class="visually-hidden" for="mira-guided-answer">Exercise response</label>
            <textarea
              id="mira-guided-answer"
              bind:value={answerDraft}
              rows="3"
              maxlength="30000"
              placeholder="Your response…"></textarea>
            <button type="submit" disabled={working || !answerDraft.trim()}>Continue →</button>
          </form>
        {:else}<p>
            This exercise step needs a capability that is not available here. You can end the
            exercise safely.
          </p>{/if}
      </div>
    {:else}<p class="mira-guided-finished">
        Exercise {run.view.status.toLowerCase()}. You can choose another whenever you wish.
      </p>{/if}
  {/if}
</div>

{#if selecting}
  <div
    class="mira-technique-overlay"
    role="presentation"
    onclick={(event) => {
      if (event.target === event.currentTarget) selecting = false;
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mira-techniques-title"
      class="mira-technique-dialog"
      tabindex="-1"
      use:focusDialog
    >
      <div class="mira-guided-heading">
        <h2 id="mira-techniques-title">Therapy techniques</h2>
        <button
          type="button"
          aria-label="Close technique selector"
          onclick={() => (selecting = false)}>×</button
        >
      </div>
      <p>Choose a guided exercise for the current therapy modality. You can end it at any step.</p>
      {#if techniques.length === 0}<p>
          No guided techniques are available for this modality yet.
        </p>{/if}
      <div class="mira-technique-list">
        {#each techniques as technique (technique.id)}
          <button
            type="button"
            disabled={working || technique.needs_ai}
            onclick={() => start(technique.id)}
          >
            <span>{technique.title}</span>
            {#if technique.needs_ai}<small>AI wording not connected yet</small>{:else}<small
                >Start guided reflection →</small
              >{/if}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}
