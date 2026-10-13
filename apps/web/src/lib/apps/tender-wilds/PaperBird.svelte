<script lang="ts">
  let {
    view = 'side',
    stride = 0,
    walking = false,
  }: {
    view?: 'side' | 'above';
    stride?: number;
    walking?: boolean;
  } = $props();
  // The stride follows distance travelled, so feet stop when the bird stops.
  const step = $derived(walking ? Math.sin(stride) : 0);
  const bob = $derived(walking ? Math.abs(Math.sin(stride)) * 4 : 0);
</script>

<svg viewBox="0 0 160 160" aria-hidden="true" focusable="false">
  {#if view === 'side'}
    <g stroke="#c6bea2" stroke-width=".9" stroke-linejoin="round">
      <path d="M110 90L149 52L137 100L117 109Z" fill="#e4dabd" />
      <path d="M110 90L149 52L123 99Z" fill="#fff8e5" />
      <path d="M68 122L72 140L85 137L83 119M93 119L96 138L109 135L105 115" fill="#baaa83" />
      <path d="M30 55L58 28L87 32L111 64L122 106L88 130L44 112Z" fill="#fff8e7" />
      <path d="M30 55L58 28L53 90L44 112Z" fill="#eee3c8" />
      <path d="M58 28L87 32L77 65L53 90Z" fill="#fffdf3" />
      <path d="M53 90L88 130L44 112Z" fill="#e2d6b7" />
      <path d="M77 65L122 106L88 130L53 90Z" fill="#f6edd7" />
      <path d="M77 58L111 64L138 106L88 96Z" fill="#9ca77c" />
      <path d="M77 58L111 64L88 96Z" fill="#b2bc91" />
      <path d="M88 96L138 106L108 111Z" fill="#85966d" />
      <path d="M31 59L12 73L33 80Z" fill="#e98c6b" stroke="#d38160" />
      <path d="M12 73L33 73L33 80Z" fill="#ce7658" stroke="none" />
    </g>
    <circle cx="45" cy="62" r="3.4" fill="#373e32" />
    <circle cx="44" cy="61" r=".8" fill="#fffdf1" />
  {:else}
    <g class:walking stroke="#b6b298" stroke-width="1.5" stroke-linejoin="round">
      <g
        class="bird-part bird-foot"
        style:transform={`translate(${-step * 2}px, ${step * 13}px) rotate(${step * 9}deg)`}
        style:transform-origin="44px 108px"
      >
        <path
          d="M44 101L43 122L35 130L43 127L47 135L48 125L55 129L48 119L49 103Z"
          fill="#d19a6b"
          stroke="#a77d58"
        />
      </g>
      <g
        class="bird-part bird-foot"
        style:transform={`translate(${-step * 2}px, ${-step * 13}px) rotate(${step * 9}deg)`}
        style:transform-origin="116px 108px"
      >
        <path
          d="M116 101L117 122L125 130L117 127L113 135L112 125L105 129L112 119L111 103Z"
          fill="#d19a6b"
          stroke="#a77d58"
        />
      </g>
      <g
        class="bird-part bird-body"
        style:transform={`translate(${step * 2}px, ${-bob}px) rotate(${step * 4}deg)`}
        style:transform-origin="80px 92px"
      >
        <g
          class="bird-part"
          style:transform={`rotate(${-step * 6}deg)`}
          style:transform-origin="80px 46px"
        >
          <path d="M65 46L56 12L80 23L103 12L96 47Z" fill="#e6dcc2" />
          <path d="M80 23L80 51L56 12Z" fill="#fff8e6" />
        </g>
        <g
          class="bird-part"
          style:transform={`rotate(${-step * 7}deg)`}
          style:transform-origin="57px 66px"
        >
          <path d="M57 56L19 43L29 88L57 106Z" fill="#9dac83" />
          <path d="M57 56L19 43L51 82Z" fill="#f8f1dc" />
        </g>
        <g
          class="bird-part"
          style:transform={`rotate(${-step * 7}deg)`}
          style:transform-origin="103px 66px"
        >
          <path d="M103 56L141 43L131 88L103 106Z" fill="#9dac83" />
          <path d="M103 56L141 43L109 82Z" fill="#f8f1dc" />
        </g>
        <path d="M80 30L108 66L117 100L99 128L80 137L61 128L43 100L52 66Z" fill="#fff8e7" />
        <path d="M80 30L80 137L61 128L43 100L52 66Z" fill="#eee4cb" />
        <path d="M80 30L108 66L94 81L80 112L66 81L52 66Z" fill="#faf4e4" />
        <g
          class="bird-part"
          style:transform={`translate(0, ${bob * 0.6}px) rotate(${-step * 2}deg)`}
          style:transform-origin="80px 112px"
        >
          <path d="M80 125L92 136L80 154L68 136Z" fill="#e89070" stroke="#c77d5d" />
          <path d="M80 125V154L68 136Z" fill="#d87b5e" stroke="none" />
          <circle cx="61" cy="115" r="3.6" fill="#303a30" stroke="none" />
          <circle cx="99" cy="115" r="3.6" fill="#303a30" stroke="none" />
        </g>
      </g>
    </g>
  {/if}
</svg>

<style>
  /* Ease back onto both feet at rest; moving poses are driven by each frame. */
  .bird-part {
    transition: transform 140ms ease-out;
  }
  .walking .bird-part {
    transition: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .bird-part {
      transform: none !important;
      transition: none;
    }
  }
</style>
