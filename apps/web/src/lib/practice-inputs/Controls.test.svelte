<script lang="ts">
  import TextInput from './TextInput.svelte';
  import RatingInput from './RatingInput.svelte';
  import SelectionChoices from './SelectionChoices.svelte';
  let {
    disabled = false,
    mode = 'multi',
    presentation = 'worksheet',
    prefix = 'test',
  }: {
    disabled?: boolean;
    mode?: string;
    presentation?: 'worksheet' | 'guided';
    prefix?: string;
  } = $props();
  let text = $state('');
  let rating = $state<number | null>(null);
  let range = $state<number | null>(1);
  let selected = $state(['a']);
  let order = $state(['b', 'a', 'c']);
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
  ];
</script>

<TextInput
  id={`${prefix}-text`}
  label="Response"
  placeholder="Write here"
  bind:value={text}
  {disabled}
/>
<RatingInput id={`${prefix}-number`} bind:value={rating} scale={{ min: -2, max: 5 }} {disabled} />
<RatingInput
  id={`${prefix}-range`}
  bind:value={range}
  scale={{ min: 1, max: 4, low: 'Low', high: 'High' }}
  presentation="range"
  {disabled}
/>
<SelectionChoices
  {options}
  {mode}
  {presentation}
  bind:selected
  bind:order
  {disabled}
  onChoose={(value) => (selected = [value])}
/>
<output aria-label="Drafts">{JSON.stringify({ text, rating, range, selected, order })}</output>
