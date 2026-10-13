<script lang="ts">
  let {
    value = $bindable(''),
    id,
    label,
    labelClass = '',
    placeholder = '',
    rows = 4,
    disabled = false,
  }: {
    value?: string;
    id: string;
    label: string;
    labelClass?: string;
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
  } = $props();
</script>

<label for={id} class={labelClass} class:visually-hidden={labelClass === 'visually-hidden'}
  >{label}</label
>
<textarea
  class="practice-text-input"
  {id}
  bind:value
  {rows}
  maxlength="30000"
  {disabled}
  {placeholder}></textarea>

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
