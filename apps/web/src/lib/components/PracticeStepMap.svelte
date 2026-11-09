<script lang="ts">
  import { tick } from 'svelte';
  import { Check, ListTree, PanelRightClose, ChevronDown } from '@lucide/svelte';

  let {
    steps,
    open,
    finished = false,
    onToggle,
    onNavigate,
  }: {
    steps: readonly {
      id: string;
      number: number;
      heading: string;
      completed: boolean;
      reviewSuggested?: boolean;
    }[];
    open: boolean;
    finished?: boolean;
    onToggle: () => void;
    onNavigate: (id: string) => void;
  } = $props();
  const instance = $props.id();
  const completed = $derived(steps.filter((step) => step.completed).length);
  const current = $derived(steps.find((step) => !step.completed));
  let toggle: HTMLButtonElement;
  let navigation = $state<HTMLElement>();

  $effect(() => {
    if (!open || !current) return;
    // Scroll only the map's list, never the notebook, as a long run grows.
    void tick().then(() => {
      const selected = navigation?.querySelector<HTMLElement>('[aria-current="step"]');
      if (!navigation || !selected) return;
      const bounds = navigation.getBoundingClientRect();
      const item = selected.getBoundingClientRect();
      if (item.bottom > bounds.bottom) navigation.scrollTop += item.bottom - bounds.bottom;
      else if (item.top < bounds.top) navigation.scrollTop -= bounds.top - item.top;
    });
  });
  function close() {
    onToggle();
    toggle.focus();
  }
</script>

<div class="practice-step-map">
  <button
    bind:this={toggle}
    type="button"
    class="step-map-toggle"
    aria-label={open ? 'Hide step map' : 'Show step map'}
    aria-expanded={open}
    aria-controls={`${instance}-map`}
    onclick={onToggle}
  >
    <ListTree size={16} aria-hidden="true" />
    <span class="step-map-position">{current ? `Step ${current.number} · ` : ''}</span>
    <span>{open ? 'Hide step map' : 'Show step map'}</span>
    <ChevronDown size={14} aria-hidden="true" />
  </button>
  <aside id={`${instance}-map`} class="step-map-rail" aria-label="Step map" hidden={!open}>
    {#if open}
      <div class="step-map-panel">
        <div class="step-map-heading">
          <h2>Step map</h2>
          <button type="button" aria-label="Close step map" onclick={close}
            ><PanelRightClose size={16} aria-hidden="true" /></button
          >
        </div>
        <p class="step-map-progress">
          {completed}
          {completed === 1 ? 'step' : 'steps'} complete{current ? ` · step ${current.number}` : ''}
        </p>
        <nav bind:this={navigation} aria-label="Practice steps">
          <ol>
            {#each steps as step (step.id)}
              <li>
                <button
                  type="button"
                  aria-label={`Go to step ${step.number}: ${step.heading}`}
                  aria-current={!step.completed ? 'step' : undefined}
                  onclick={() => onNavigate(step.id)}
                >
                  <span class="step-map-marker" aria-hidden="true"
                    >{#if step.completed}<Check size={13} />{:else}{step.number}{/if}</span
                  >
                  <span class="step-map-title"
                    ><span class="step-map-name" title={step.heading}>{step.heading}</span>
                    {#if step.reviewSuggested}<small>Review suggested</small>{/if}
                    <span class="pattern-run-visually-hidden"
                      >{step.completed ? 'Completed' : 'Current step'}</span
                    >
                  </span>
                </button>
              </li>
            {/each}
          </ol>
        </nav>
        <p class="step-map-foot">
          {finished
            ? 'Revisit any completed step.'
            : 'Revisit any completed step. Next steps appear as you go.'}
        </p>
      </div>
    {/if}
  </aside>
</div>

<style>
  .practice-step-map {
    margin-top: 1.25rem;
  }
  button {
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  button:focus-visible {
    outline: var(--focus-width) solid var(--focus-color);
    outline-offset: 3px;
  }
  .step-map-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    border: 1px solid var(--notebook-line);
    border-radius: 7px;
    padding: 0.5rem 0.75rem;
    background: transparent;
    font-size: 0.75rem;
  }
  .step-map-toggle:hover {
    background: var(--mint);
  }
  .step-map-position {
    display: none;
  }
  .step-map-rail {
    position: absolute;
    top: 3rem;
    right: 2rem;
    bottom: 2rem;
    width: 210px;
  }
  .step-map-panel {
    position: sticky;
    top: 1.5rem;
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 3rem);
  }
  nav {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }
  .step-map-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .step-map-heading h2 {
    margin: 0;
    color: var(--muted);
    font-size: 0.6875rem;
    font-weight: 650;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .step-map-heading button {
    display: grid;
    place-items: center;
    min-width: 44px;
    min-height: 44px;
    border: 0;
    background: transparent;
    border-radius: 7px;
  }
  .step-map-heading button:hover {
    background: var(--mint);
  }
  .step-map-progress {
    margin: 0.25rem 0 1rem;
    font-size: 0.75rem;
    color: var(--muted);
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 4px;
  }
  li {
    min-width: 0;
  }
  nav button {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr);
    gap: 0.5rem;
    align-items: center;
    width: 100%;
    min-height: 48px;
    padding: 0.625rem 0.5rem;
    border: 0;
    border-radius: 7px;
    background: transparent;
    text-align: left;
    font-size: 0.75rem;
    line-height: 1.5;
  }
  nav button:hover {
    background: var(--notebook-surface);
  }
  nav button[aria-current] {
    background: var(--mint);
    color: var(--green-dark);
    font-weight: 650;
  }
  .step-map-marker {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    color: var(--green-dark);
  }
  [aria-current] .step-map-marker {
    border-radius: 50%;
    background: var(--green);
    color: var(--ink);
  }
  .step-map-title {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .step-map-name {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
  }
  small {
    display: block;
    font-size: 0.6875rem;
    color: var(--muted);
    font-weight: 400;
  }
  .step-map-foot {
    margin: 1.25rem 0 0;
    padding-top: 1rem;
    border-top: 1px solid var(--notebook-line);
    color: var(--muted);
    font-size: 0.6875rem;
    line-height: 1.6;
  }
  @media (max-width: 900px) {
    .step-map-position {
      display: inline;
    }
    .step-map-rail {
      position: static;
      width: auto;
      margin-top: 1rem;
    }
    .step-map-panel {
      position: static;
      padding: 1rem;
      border: 1px solid var(--notebook-line);
      border-radius: 10px;
      background: var(--notebook-paper);
      max-height: min(70dvh, 32rem);
    }
    .step-map-foot {
      margin-top: 1rem;
    }
  }
</style>
