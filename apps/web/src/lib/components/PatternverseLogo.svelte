<script lang="ts">
  import { base } from '$app/paths';

  let { compact = false }: { compact?: boolean } = $props();
</script>

<span class="patternverse-logo" class:compact>
  <img
    src={`${base}/icons/patternverse-mark.png`}
    alt=""
    aria-hidden="true"
    width="36"
    height="35"
  />
  <span>patternverse</span>
</span>

<style>
  .patternverse-logo {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    white-space: nowrap;
    font-family: Baskerville, 'Iowan Old Style', Georgia, serif;
    font-size: 1.28rem;
    font-weight: 400;
    letter-spacing: -0.045em;
    line-height: 1;
  }

  .patternverse-logo img {
    display: block;
    width: 1.25em;
    height: auto;
  }

  .patternverse-logo.compact {
    font-size: 1.05rem;
  }
</style>
