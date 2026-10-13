<script lang="ts">
  let {
    value = $bindable<number | null>(null),
    id,
    label = 'Your rating',
    scale = {},
    presentation = 'number',
    disabled = false,
  }: {
    value?: number | null;
    id: string;
    label?: string;
    scale?: { min?: number; max?: number; low?: string; high?: string };
    presentation?: 'number' | 'range';
    disabled?: boolean;
  } = $props();
</script>

<label for={id}>
  {#if presentation === 'range'}
    {scale.low ?? scale.min ?? 0} — {scale.high ?? scale.max ?? 10}
    <strong>{value}</strong>
  {:else}{label}{/if}
</label>
{#if presentation === 'range'}
  <input
    {id}
    type="range"
    min={scale.min ?? 0}
    max={scale.max ?? 10}
    step="any"
    bind:value
    {disabled}
  />
{:else}
  <input
    {id}
    type="number"
    min={Number(scale.min ?? 0)}
    max={Number(scale.max ?? 10)}
    bind:value
    {disabled}
  />
{/if}
