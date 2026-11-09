<script lang="ts">
  import type { LibraryVerse } from '$lib/client/workspace-library-view';
  import VerseSelector from './VerseSelector.svelte';

  let {
    verses,
    selected,
    onselect,
  }: {
    verses: readonly (LibraryVerse & { key: string })[];
    selected: string;
    onselect: (key: string) => void;
  } = $props();
</script>

<VerseSelector {verses} {selected} {onselect} compact />
