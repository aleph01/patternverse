<script lang="ts">
  import type { SituationPriority } from '@patternverse/workspace';
  let {
    value,
    onchange,
    disabled = false,
    label = 'Priority',
    compact = false,
  }: {
    value: SituationPriority | null;
    onchange: (value: SituationPriority | null) => void;
    disabled?: boolean;
    label?: string;
    compact?: boolean;
  } = $props();
</script>

<label class="priority-field" class:compact>
  <span class:sr-only={compact}>Priority</span>
  <select
    aria-label={label}
    title="5 is the highest priority"
    value={value === null ? '' : String(value)}
    {disabled}
    onchange={(event) =>
      onchange(
        event.currentTarget.value ? (Number(event.currentTarget.value) as SituationPriority) : null,
      )}
  >
    <option value="">{compact ? '—' : 'Unassigned'}</option>
    <option value="1">{compact ? '1' : '1 · Lowest'}</option>
    <option value="2">2</option>
    <option value="3">3</option>
    <option value="4">4</option>
    <option value="5">{compact ? '5' : '5 · Highest'}</option>
  </select>
</label>

<style>
  .priority-field {
    display: inline-flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
    color: var(--bearings-muted);
    font-size: 0.65rem;
  }
  select {
    max-width: 100%;
    min-height: 34px;
    border: 1px solid var(--bearings-line);
    border-radius: 7px;
    padding: 0.3rem 0.5rem;
    color: var(--bearings-ink);
    background: var(--bearings-paper);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }
  select:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .compact select {
    width: 48px;
    min-height: 32px;
    padding: 0.2rem 0.25rem;
    border-color: transparent;
    background: var(--bearings-surface);
    font-size: 0.8rem;
    border-radius: 7px;
  }
  .compact select:hover {
    border-color: var(--bearings-line);
  }
  .compact {
    flex: none;
  }
  @media (pointer: coarse) {
    select {
      min-height: 44px;
      font-size: 16px;
    }
  }
</style>
