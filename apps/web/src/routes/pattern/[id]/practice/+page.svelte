<script lang="ts">
  import PatternRun from '$lib/components/PatternRun.svelte';
  let { data } = $props();
</script>

{#key data.pattern.id}<PatternRun {data} />{/key}
