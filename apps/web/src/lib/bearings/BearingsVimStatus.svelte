<script lang="ts">
  import type { VimStatus } from './vim';
  let { status, compact = false }: { status: VimStatus; compact?: boolean } = $props();
</script>

<span
  class="vim-status"
  class:compact
  title="Vim mode · i to write · Esc for Normal mode"
  aria-label={`Vim ${status.mode} mode${status.pending ? `, ${status.pending}` : ''}`}
>
  <span class="dot" class:insert={status.mode === 'insert'}></span>
  {#if compact}<strong aria-hidden="true">{status.mode === 'insert' ? 'I' : 'N'}</strong>{:else}Vim <strong
      >{status.mode}</strong
    >{/if}{#if status.pending}<kbd>{status.pending}</kbd>{/if}
</span>

<style>
  .vim-status {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    gap: 0.35rem;
    font:
      0.65rem / 1.5 ui-monospace,
      monospace;
    color: var(--bearings-muted);
    padding: 0.25rem 0.45rem;
    border-radius: 5px;
    background: var(--bearings-surface);
  }
  strong {
    text-transform: uppercase;
    font-weight: 500;
    color: var(--bearings-ink);
  }
  .compact {
    padding: 0 3px;
    background: transparent;
    gap: 4px;
    font-size: 11px;
  }
  .compact kbd {
    max-width: 4ch;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--bearings-muted);
  }
  .dot.insert {
    background: var(--bearings-accent);
  }
  kbd {
    color: var(--bearings-accent);
    min-width: 1ch;
  }
</style>
