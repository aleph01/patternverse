<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- Validated public article destinations also include existing external URLs and fragment links. */
  import { linkedDiff, linkChanges, type ContributionLink } from '$lib/contributions/model';
  let {
    before,
    after,
    beforeLinks = [],
    afterLinks = [],
  }: {
    before: string;
    after: string;
    beforeLinks?: ContributionLink[];
    afterLinks?: ContributionLink[];
  } = $props();
  const changes = $derived(linkedDiff(before, after, beforeLinks, afterLinks));
  const links = $derived(linkChanges(before, after, beforeLinks, afterLinks));
</script>

{#snippet text(change: { text: string; href?: string })}{#if change.href}<a
      href={change.href}
      target="_blank"
      rel="noopener noreferrer">{change.text}</a
    >{:else}{change.text}{/if}{/snippet}
<p class="contribution-diff">
  {#each changes as change, i (i)}{#if change.kind === 'added'}<ins>{@render text(change)}</ins
      >{:else if change.kind === 'removed'}<del>{@render text(change)}</del>{:else}{@render text(
        change,
      )}{/if}{/each}
</p>
{#if links.added.length || links.removed.length}<ul class="link-changes" aria-label="Link changes">
    {#each links.removed as link, i (`removed-${i}`)}<li>
        <span>Remove link:</span> <del>{link.text} → {link.href}</del>
      </li>{/each}
    {#each links.added as link, i (`added-${i}`)}<li>
        <span>Add link:</span>
        <ins
          ><a href={link.href} target="_blank" rel="noopener noreferrer">{link.text}</a> → {link.href}</ins
        >
      </li>{/each}
  </ul>{/if}

<style>
  p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.8;
  }
  ins {
    background: #fff0a6;
    color: #181814;
    text-decoration: none;
  }
  del {
    background: transparent;
    color: #181814;
    text-decoration: line-through;
  }
  a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .link-changes {
    padding-left: 18px;
    margin: 12px 0 0;
    font-size: 12px;
    overflow-wrap: anywhere;
  }
</style>
