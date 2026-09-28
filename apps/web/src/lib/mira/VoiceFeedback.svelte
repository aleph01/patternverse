<script lang="ts">
  import { Square } from '@lucide/svelte';
  import type { VoiceState } from './voice-controller';
  let { state, onStop }: { state: VoiceState; onStop: () => void } = $props();
</script>

{#if state.phase !== 'off' || state.feedback}
  <div class="mira-voice-control" class:listening={state.phase !== 'off'}>
    <div>
      <p role="status">{state.feedback}</p>
      {#if state.heard}<p class="mira-voice-heard">{state.heard}</p>{/if}
    </div>
    {#if state.phase !== 'off'}
      <button
        type="button"
        class="mira-icon-button"
        aria-label="Stop voice control"
        onclick={onStop}><Square size={16} /></button
      >
    {/if}
  </div>
{/if}
