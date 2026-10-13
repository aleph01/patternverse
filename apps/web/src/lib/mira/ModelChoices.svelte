<script lang="ts">
  import { MODEL_PRESETS } from './model-presets';
  import type { ZdrModel } from './openrouter';
  let {
    models,
    selected = $bindable(''),
    checked,
  }: { models: readonly ZdrModel[]; selected: string; checked: boolean } = $props();
  const dollars = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
</script>

<fieldset class="mira-model-choices">
  <legend>Choose what suits you</legend>
  {#each MODEL_PRESETS as preset (preset.id)}
    {@const model = models.find((item) => item.id === preset.id)}
    <label class:chosen={selected === preset.id}>
      <input
        type="radio"
        name="mira-model-preset"
        value={preset.id}
        bind:group={selected}
        disabled={checked && !model}
      />
      <span
        ><strong>{preset.label}</strong><small>{preset.description}</small><small
          >{preset.name}</small
        >
        {#if model?.inputUsdPerMillion !== undefined && model.outputUsdPerMillion !== undefined}
          <small
            >About {dollars(
              (model.inputUsdPerMillion * 2000 + model.outputUsdPerMillion * 500) / 10000,
            )} / 100 short replies</small
          >
        {:else if checked && !model}<small>Zero-retention route currently unavailable</small>
        {:else}<small>Check models to see current pricing</small>{/if}
      </span>
    </label>
  {/each}
</fieldset>
<p class="mira-cost-note">
  Estimates use 2,000 input and 500 output tokens per reply at the highest listed zero-retention
  endpoint rates. Longer chats and reasoning can cost more. Actual charges appear in your cost
  overview.
</p>

<style>
  .mira-model-choices {
    display: grid;
    gap: 0.6rem;
    padding: 0;
    border: 0;
    margin: 1rem 0;
  }
  legend {
    font-weight: 650;
    margin-bottom: 0.7rem;
  }
  label {
    display: flex;
    align-items: start;
    gap: 0.65rem;
    padding: 0.9rem;
    border: 1px solid #cdd8ce;
    border-radius: 12px;
    cursor: pointer;
  }
  label.chosen {
    background: #e9f0e9;
    border-color: #6b8671;
  }
  input {
    width: 1rem;
    height: 1rem;
    margin: 0.2rem 0 0;
    flex-shrink: 0;
  }
  span {
    display: grid;
    gap: 0.3rem;
  }
  small {
    font-size: 0.76rem;
    font-weight: 400;
    line-height: 1.4;
    color: #59685f;
  }
  .mira-cost-note {
    font-size: 0.73rem;
    line-height: 1.5;
    color: #66756b;
  }
</style>
