<script lang="ts">
  import IllustrationShape from './IllustrationShape.svelte';
  import './tokens.css';
  let { variant } = $props<{ variant: 'reframe' | 'unstuck' | 'steps' }>();
</script>

<!-- A shared 4:3 canvas keeps every circle circular in all card layouts. -->
<svg
  class="geometric-illustration"
  class:mint={variant === 'reframe'}
  class:coral={variant === 'unstuck'}
  class:blue={variant === 'steps'}
  viewBox="0 0 400 300"
  preserveAspectRatio="xMidYMid meet"
  aria-hidden="true"
>
  {#if variant === 'reframe'}
    <IllustrationShape kind="semicircle" x={70} y={72} size={156} rotation={180} color="green" />
    <IllustrationShape kind="line" x={104} y={44} size={212} />
    <IllustrationShape kind="semicircle" x={254} y={144} size={88} color="white" />
    <IllustrationShape kind="semicircle" x={254} y={144} size={88} rotation={180} />
  {:else if variant === 'unstuck'}
    <IllustrationShape kind="circle" x={110} y={70} size={168} color="white" />
    <IllustrationShape kind="line" x={104} y={24} size={248} rotation={45} />
  {:else}
    <IllustrationShape kind="square" x={144} y={194} size={64} color="blue" />
    <IllustrationShape kind="square" x={208} y={130} size={64} color="blue" />
    <IllustrationShape kind="square" x={272} y={66} size={64} color="blue" />
    <IllustrationShape kind="circle" x={64} y={112} size={64} color="yellow" />
  {/if}
</svg>

<style>
  .geometric-illustration {
    display: block;
    width: 100%;
    height: 100%;
  }
  .mint {
    background: var(--illustration-mint);
  }
  .coral {
    background: var(--illustration-coral);
  }
  .blue {
    background: var(--illustration-blue-soft);
  }
</style>
