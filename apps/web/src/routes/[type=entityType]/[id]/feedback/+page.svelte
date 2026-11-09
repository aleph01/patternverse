<script lang="ts">
  import ArticleContribution from '$lib/components/ArticleContribution.svelte';
  let { data } = $props();
</script>

<svelte:head>
  <title>Improve {data.article.title} — Patternverse</title>
  <meta name="robots" content="noindex" />
</svelte:head>

{#key `${data.article.sourceId}:${data.article.path}`}
  <ArticleContribution html={data.html} article={data.article} />
{/key}
