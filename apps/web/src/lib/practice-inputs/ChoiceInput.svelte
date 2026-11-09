<script lang="ts">
  import type { PatternOption } from '$lib/pattern-run/view';

  let {
    id,
    prompt,
    options,
    mode,
    selected,
    disabled = false,
    onchange,
  }: {
    id: string;
    prompt: string;
    options: readonly PatternOption[];
    mode: 'single' | 'multi';
    selected: readonly string[];
    disabled?: boolean;
    onchange: (values: string[]) => void;
  } = $props();

  function change(value: string, checked: boolean) {
    onchange(
      mode === 'single'
        ? [value]
        : options
            .filter((option) =>
              option.value === value ? checked : selected.includes(option.value),
            )
            .map((option) => option.value),
    );
  }
</script>

<fieldset class="choice-input" {disabled}>
  <legend>{prompt}</legend>
  {#each options as option (option.value)}
    <label>
      <input
        type={mode === 'multi' ? 'checkbox' : 'radio'}
        name={id}
        value={option.value}
        checked={selected.includes(option.value)}
        onchange={(event) => change(option.value, event.currentTarget.checked)}
      />
      <span>{option.label}</span>
    </label>
  {/each}
</fieldset>

<style>
  fieldset.choice-input {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
    display: grid;
    gap: 0.6rem;
  }
  .choice-input legend {
    border: 0;
    padding: 0;
    margin: 0 0 0.65rem;
    font-size: inherit;
    letter-spacing: normal;
    text-transform: none;
    font-weight: 650;
    line-height: 1.5;
  }
  .choice-input label {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    cursor: pointer;
  }
  input {
    accent-color: var(--accent, #008653);
  }
</style>
