<script lang="ts">
  import { resolve } from '$app/paths';
  import PracticeRunner from '$lib/components/PracticeRunner.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.practice.title} — Patternverse</title>
</svelte:head>

<main class="practice-page">
  <header class="practice-page-heading">
    <a href={resolve(`/pattern/${data.pattern.id}`)}>← {data.pattern.title}</a>
    <p>Interactive Practice</p>
    <h1>{data.practice.title}</h1>
  </header>

  <PracticeRunner
    practiceId={data.pattern.id}
    practice={data.practice}
    markdownHtml={data.markdownHtml}
    returnHref={`/pattern/${data.pattern.id}`}
    returnLabel={data.pattern.title}
  />
</main>
