<script lang="ts">
  import { LockKeyhole } from '@lucide/svelte';

  let { name = 'My Workspace' }: { name?: string } = $props();
</script>

<aside class="workspace-context" aria-label="Workspace ownership and privacy">
  <div>
    <span class="destination">Workspace</span>
    <strong>{name}</strong>
    <span class="privacy"><LockKeyhole size={13} aria-hidden="true" /> Private · only you</span>
  </div>
  <p>Changes are saved on this device. Your work is not added to public Patternverse.</p>
</aside>

<style>
  .workspace-context {
    margin: 1.5rem 0;
    padding: 1rem 1.1rem;
    border: 1px solid var(--ink);
    background: var(--paper);
  }
  .workspace-context > div {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.55rem 1rem;
    font-size: 0.82rem;
  }
  .destination {
    color: var(--muted, #55564e);
    font-size: 0.7rem;
  }
  .privacy {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
  }
  .workspace-context p {
    margin: 0.65rem 0 0;
    color: var(--muted, #55564e);
    font-size: 0.78rem;
    line-height: 1.5;
  }
</style>
