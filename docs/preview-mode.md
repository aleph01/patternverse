# Shared preview mode

Open any website page with `?preview=1` to opt into the shared preview experience,
for example `/apps/bearings?preview=1`. All preview features use this one switch.
Ordinary visits keep preview features hidden, including direct visits to their pages.

The choice survives navigation and reloads through this tab’s `sessionStorage`.
Open a page with `?preview=0` to clear it. The flag is then removed from the URL,
preserving other parameters and the fragment. Preview mode adds no status banner.
Browser storage restrictions fall back to in-memory state until the next full page load. Only the
exact values `1` and `0` are recognized; duplicate flags are ignored.

Preview mode is initialized in the root layout after mounting. Each layout owns
its own state; server rendering and static builds always hide preview UI. It
does not enable the existing build-time release switches or include draft content
that the production compiler excluded. Set `VITE_PREVIEW_ENABLED=false` when
building to disable preview mode entirely, including previously opted-in sessions.

## Put a feature or section in preview

Wrap the feature and each of its public entry points with the shared component:

```svelte
<script lang="ts">
  import PreviewOnly from '$lib/preview/PreviewOnly.svelte';
</script>

<PreviewOnly>
  <a href="/some-feature">Open the new feature</a>
  {#snippet fallback()}
    <p>The existing public experience can go here.</p>
  {/snippet}
</PreviewOnly>
```

The fallback is optional. Children only mount while preview is enabled, so hidden
features do not start their effects or access local data. The component adds no
HTML wrapper. Use `getPreviewMode()` for logic or derived values:

```svelte
<script lang="ts">
  import { getPreviewMode } from '$lib/preview/context';
  const preview = getPreviewMode();
  const label = $derived($preview.enabled ? 'Preview experience' : 'Public experience');
</script>
```

## Put a page in preview

Wrap its interactive contents with `PreviewPage`. This uses the same session,
provides a public fallback with a home link, and adds `noindex, nofollow` to the
page. Gate its navigation links separately with `PreviewOnly`.

```svelte
<script lang="ts">
  import PreviewPage from '$lib/preview/PreviewPage.svelte';
  import NewFeature from '$lib/components/NewFeature.svelte';
</script>

<PreviewPage><NewFeature /></PreviewPage>
```

Bearings is the first application: its page, home card, workspace notebook links,
and workspace dialog action all use this policy. Leaving preview does not delete
notebooks or other workspace data.

## Filter content using the same policy

`ReleaseVisibility` is `'public' | 'preview'`. `isReleaseVisible` and
`filterReleaseItems` can apply this policy to arbitrary content, lists, menus, or
search results. Unclassified items default to public. For example:

```svelte
<script lang="ts">
  import { getPreviewMode } from '$lib/preview/context';
  import { filterReleaseItems } from '$lib/preview/visibility';
  const preview = getPreviewMode();
  const cards = [
    { title: 'Existing article', visibility: 'public' as const },
    { title: 'Early article', visibility: 'preview' as const },
  ];
  const visibleCards = $derived(
    filterReleaseItems(cards, (card) => card.visibility, $preview.enabled),
  );
</script>
```

This is an application presentation policy, not a new Commons frontmatter field.
The strict corpus schema, published/draft statuses, public MCP output, and corpus
compilation are unchanged. A future Commons preview rollout must deliberately
integrate this policy across discovery, search, relationships, direct article and
practice pages, and external exports; filtering one list alone is insufficient.

## Publication boundary

Preview mode reduces casual discovery. It does not make code, prerendered data,
assets, or content private. Anyone can use the flag. `noindex` is a crawler hint,
not access control. Confidential content and restricted server actions need
separate access controls. Continue to exclude material from public builds when
it must not be published at all.

## Verify

```sh
pnpm --filter @patternverse/web exec vitest run src/lib/preview
pnpm --filter @patternverse/web exec playwright test --config playwright.preview.config.ts
```

The browser suite covers desktop and mobile, ordinary visitors, direct opt-in,
navigation and reload persistence, explicit opt-out, saved notebook retention,
workspace entry points, URL preservation, and server rendering.
