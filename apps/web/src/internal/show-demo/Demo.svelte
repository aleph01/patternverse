<script lang="ts">
  import { onMount } from 'svelte';
  import init, { preview } from '$lib/mira/engine/pattern_wasm.js';
  import ShowContent from '$lib/components/ShowContent.svelte';
  import type { GuidedEffect } from '$lib/mira/guided';
  import initiatives from '../../../../../docs/pattern-markdown/examples/show-initiatives.pattern.md?raw';
  import relationships from '../../../../../docs/pattern-markdown/examples/show-relationships.pattern.md?raw';
  let source = $state(initiatives),
    effects = $state<GuidedEffect[]>([]),
    error = $state(''),
    ready = $state(false),
    dark = $state(false);
  async function run() {
    if (!ready) return;
    error = '';
    try {
      const result = JSON.parse(preview(source));
      effects = result.effects.filter(
        (effect: GuidedEffect) => effect.request.kind === 'content.show',
      );
      if (result.status === 'Waiting')
        error = 'This preview stopped at the first interaction. Static examples need no replies.';
    } catch (cause) {
      effects = [];
      error = String(cause);
      try {
        const diagnostics = JSON.parse(error);
        if (Array.isArray(diagnostics))
          error = diagnostics
            .map(
              (diagnostic) =>
                `${diagnostic.message} (bytes ${diagnostic.primary.start}–${diagnostic.primary.end})${diagnostic.help ? `\n${diagnostic.help}` : ''}`,
            )
            .join('\n\n');
      } catch {
        /* Runtime failures already supply a readable message. */
      }
    }
  }
  onMount(() => {
    void init()
      .then(() => {
        ready = true;
        return run();
      })
      .catch((cause) => {
        error = String(cause);
      });
  });
</script>

<main class="demo" data-theme={dark ? 'dark' : 'light'}>
  <header>
    <p>Local authoring preview · not a public page</p>
    <h1>One collection. Different perspectives.</h1>
    <p>The actual Rust compiler and runtime supply every view below.</p>
  </header>
  <div class="actions">
    <button
      onclick={() => {
        source = initiatives;
        void run();
      }}
      disabled={!ready}>Initiatives</button
    ><button
      onclick={() => {
        source = relationships;
        void run();
      }}
      disabled={!ready}>Relationships, time & layers</button
    ><label><input type="checkbox" bind:checked={dark} />Dark preview</label>
  </div>
  <label class="source"
    >Pattern Markdown<textarea bind:value={source} spellcheck="false"></textarea></label
  >
  <button onclick={run} disabled={!ready}>Run local preview</button>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <div class="views">
    {#each effects as effect (effect.effect_id)}<ShowContent {effect} />{/each}
  </div>
</main>

<style>
  .demo {
    max-width: 1100px;
    margin: auto;
    padding: 2rem;
    color: var(--ink);
  }
  h1 {
    font-size: clamp(1.75rem, 4vw, 3rem);
    line-height: 1.1;
    margin: 1rem 0;
  }
  header p {
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin: 1.5rem 0;
    align-items: center;
  }
  button {
    padding: 0.75rem;
    border: 1px solid var(--ink);
    background: var(--paper);
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .source {
    display: grid;
    gap: 0.5rem;
    font-size: 0.85rem;
    margin: 1rem 0;
  }
  textarea {
    width: 100%;
    min-height: 260px;
    padding: 1rem;
    font: 13px/1.6 monospace;
    border: 1px solid #aab4ae;
    border-radius: 5px;
    background: white;
    color: #181814;
  }
  .error {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  @media (max-width: 600px) {
    .demo {
      padding: 1rem;
    }
  }
</style>
