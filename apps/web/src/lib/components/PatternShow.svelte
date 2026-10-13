<script lang="ts">
  import { groupsFor, layoutPanel, type ShowView } from '$lib/pattern-run/show-view';
  let { view }: { view: ShowView } = $props();
  const id = $props.id();
</script>

<section class="pattern-show" aria-label={`Show ${view.spec.source}`}>
  {#each view.warnings as warning, index (index)}<p class="show-warning" role="status">
      {warning}
    </p>{/each}
  {#each view.panels as panel, panelIndex (panelIndex)}
    {@const positioned = layoutPanel(panel, view.axes)}
    {@const points = positioned.filter(
      (item, index) =>
        positioned.findIndex((peer) => peer.x === item.x && peer.y === item.y) === index,
    )}
    {@const spatial =
      ['axis', 'cartesian', 'tree', 'network'].includes(panel.representation) &&
      panel.items.length <= 80}
    <section class="show-panel" aria-labelledby={`${id}-panel-${panelIndex}`}>
      <h3 id={`${id}-panel-${panelIndex}`}>
        {panel.label !== null
          ? `${view.spec.split}: ${panel.label}`
          : view.spec.source.replaceAll('_', ' ')}
      </h3>
      {#if view.axes.length}
        <p class="show-dimensions">
          {view.axes.map((axis) => `${axis.attribute}: ${axis.low}–${axis.high}`).join(' × ')}
        </p>
      {/if}
      {#if panel.items.length === 0}<p class="show-empty">No items yet.</p>
      {:else if spatial}
        <div class="show-graphic">
          <svg
            viewBox="0 0 600 350"
            role="img"
            aria-labelledby={`${id}-title-${panelIndex} ${id}-desc-${panelIndex}`}
          >
            <title id={`${id}-title-${panelIndex}`}
              >{panel.representation === 'tree'
                ? 'Hierarchy'
                : panel.cyclic
                  ? 'Relationships with a feedback cycle'
                  : panel.representation === 'network'
                    ? 'Relationships'
                    : view.axes.map((axis) => axis.attribute).join(' × ')}</title
            >
            <desc id={`${id}-desc-${panelIndex}`}
              >Numbered items are listed in full below with their attributes and relationships. {panel.cyclic
                ? 'Dashed arrows identify edges in cycles.'
                : ''}</desc
            >
            <defs
              ><marker
                id={`${id}-arrow-${panelIndex}`}
                viewBox="0 0 10 10"
                refX="18"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
                ><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker
              ></defs
            >
            {#if view.axes.length}
              <line class="axis" x1="60" y1="285" x2="540" y2="285" />
              <text x="300" y="337" text-anchor="middle"
                >{view.axes[0].attribute}{view.axes[0].kind === 'temporal' ? ' · time' : ''}</text
              >
              <text class="bound" x="60" y="310">{view.axes[0].low}</text><text
                class="bound"
                x="540"
                y="310"
                text-anchor="end">{view.axes[0].high}</text
              >
              {#if view.axes.length === 2}
                <line class="axis" x1="60" y1="55" x2="60" y2="285" />
                <text x="18" y="170" text-anchor="middle" transform="rotate(-90 18 170)"
                  >{view.axes[1].attribute}</text
                >
                <text class="bound" x="65" y="40">{view.axes[1].high}</text>
                <text class="bound" x="45" y="289" text-anchor="end">{view.axes[1].low}</text>
              {:else if ['ordinal', 'categorical'].includes(view.axes[0].kind)}
                {#each view.axes[0].levels as level, index (index)}
                  {@const x =
                    60 +
                    (view.axes[0].levels.length < 2
                      ? 0.5
                      : index / (view.axes[0].levels.length - 1)) *
                      480}
                  <line class="band" x1={x} y1="50" x2={x} y2="285" /><text
                    class="bound"
                    {x}
                    y="32"
                    text-anchor="middle">{level}</text
                  >
                {/each}
              {/if}
            {/if}
            {#each panel.edges as edge, index (index)}
              {@const from = positioned.find((item) => item.id === edge.from)}{@const to =
                positioned.find((item) => item.id === edge.to)}
              {#if from && to}
                {#if from.id === to.id}<path
                    class="edge"
                    class:cycle={edge.cyclic}
                    d={`M ${from.x - 8} ${from.y - 8} C ${from.x - 55} ${from.y - 55}, ${from.x + 55} ${from.y - 55}, ${from.x + 8} ${from.y - 8}`}
                    marker-end={`url(#${id}-arrow-${panelIndex})`}
                  />
                {:else}<path
                    class="edge"
                    class:cycle={edge.cyclic}
                    d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2 + (edge.cyclic ? 20 : 0)} ${(from.y + to.y) / 2 - (edge.cyclic ? 25 : 0)} ${to.x} ${to.y}`}
                    marker-end={`url(#${id}-arrow-${panelIndex})`}
                  />{/if}
              {/if}
            {/each}
            {#each points as item, index (index)}
              {@const numbers = positioned
                .filter((peer) => peer.x === item.x && peer.y === item.y)
                .map((peer) => peer.number)
                .join(',')}
              <circle
                class:grouped={item.group !== null}
                cx={item.x}
                cy={item.y}
                r={numbers.length > 2 ? 19 : 13}
              />
              <text class="item-number" x={item.x} y={item.y + 4} text-anchor="middle"
                >{numbers}</text
              >
            {/each}
          </svg>
        </div>
      {/if}
      {#each groupsFor(panel) as group, groupIndex (groupIndex)}
        {#if group.label !== null}<h4>{view.spec.group}: {group.label}</h4>{/if}
        <ol class="show-items" class:ranked={view.spec.order !== null || spatial}>
          {#each group.items as item, itemIndex (itemIndex)}
            <li>
              {#if spatial}<span class="show-key">{panel.items.indexOf(item) + 1}</span>{/if}
              <div>
                <p class="show-item-label">{item.label}</p>
                <dl>
                  {#each Object.entries(item.fields) as [key, value] (key)}<div>
                      <dt>{key}</dt>
                      <dd>{value || '—'}</dd>
                    </div>{/each}
                </dl>
              </div>
            </li>
          {/each}
        </ol>
      {/each}
      {#if panel.edges.length}<div class="show-relations">
          <h4>{view.spec.link ?? 'Relationships'}</h4>
          <ul>
            {#each panel.edges as edge, index (index)}<li>
                {panel.items.find((item) => item.id === edge.from)?.label ?? edge.from} → {panel.items.find(
                  (item) => item.id === edge.to,
                )?.label ?? edge.to}{edge.cyclic ? ' · cycle' : ''}
              </li>{/each}
          </ul>
        </div>{/if}
    </section>
  {/each}
</section>

<style>
  .pattern-show {
    --show-ink: var(--ink, #181814);
    --show-paper: var(--paper, #fff);
    --show-muted: var(--muted, #60645e);
    --show-accent: var(--green-dark, #007a4d);
    color: var(--show-ink);
    background: var(--show-paper);
    min-width: 0;
    margin: 1rem 0;
    padding: 1rem;
    border: 1px solid color-mix(in srgb, var(--show-ink) 20%, transparent);
    border-radius: 5px;
  }
  .show-dimensions {
    font-size: 0.8rem;
    color: var(--show-muted);
    margin: 0 0 0.75rem;
  }
  .show-panel {
    min-width: 0;
    margin: 0 0 1.5rem;
  }
  .show-panel:last-child {
    margin-bottom: 0;
  }
  h3 {
    font-size: 1.05rem;
    line-height: 1.4;
    margin: 0 0 1rem;
    color: inherit;
  }
  h4 {
    font-size: 0.85rem;
    line-height: 1.5;
    margin: 1rem 0 0.6rem;
    color: var(--show-accent);
  }
  .show-warning,
  .show-empty {
    font-size: 0.85rem;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .show-warning {
    border-left: 2px solid var(--show-accent);
    padding-left: 0.75rem;
  }
  .show-graphic {
    overflow-x: auto;
  }
  svg {
    display: block;
    width: 100%;
    min-width: 450px;
    max-height: 420px;
    color: var(--show-ink);
  }
  .axis,
  .band {
    stroke: var(--show-muted);
    stroke-width: 1;
  }
  .band {
    opacity: 0.35;
  }
  .edge {
    stroke: currentColor;
    stroke-width: 1.5;
    fill: none;
  }
  .cycle {
    stroke-dasharray: 5 4;
  }
  circle {
    fill: var(--show-ink);
  }
  circle.grouped {
    fill: var(--show-accent);
  }
  svg text {
    fill: var(--show-ink);
    font-family: inherit;
    font-size: 13px;
  }
  svg text.bound {
    fill: var(--show-muted);
    font-size: 11px;
  }
  svg text.item-number {
    fill: var(--show-paper);
    font-size: 12px;
    font-weight: 750;
  }
  .show-items {
    list-style: none;
    margin: 0;
    padding: 0;
    counter-reset: rank;
  }
  .show-items li {
    display: flex;
    align-items: flex-start;
    gap: 0.7rem;
    padding: 0.8rem 0;
    border-top: 1px solid color-mix(in srgb, var(--show-ink) 15%, transparent);
  }
  .ranked:not(:has(.show-key)) li::before {
    counter-increment: rank;
    content: counter(rank);
    color: var(--show-accent);
    font-size: 0.8rem;
    padding-top: 0.15rem;
  }
  .show-key {
    color: var(--show-accent);
    font-size: 0.8rem;
    min-width: 1.2em;
    padding-top: 0.15rem;
  }
  .show-items li > div {
    min-width: 0;
  }
  .show-item-label {
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.5;
    margin: 0;
    overflow-wrap: anywhere;
  }
  dl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    margin: 0.3rem 0 0;
    font-size: 0.75rem;
    line-height: 1.6;
    color: var(--show-muted);
  }
  dl div {
    display: flex;
    gap: 0.35rem;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  dt {
    font-weight: 650;
  }
  dd {
    margin: 0;
  }
  .show-relations {
    font-size: 0.85rem;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }
  .show-relations ul {
    padding-left: 1.2rem;
  }
  @media (max-width: 600px) {
    .pattern-show {
      padding: 0.75rem;
    }
    .show-graphic {
      display: none;
    }
  }
  @media (prefers-color-scheme: dark) {
    .pattern-show {
      --show-ink: #eef2ef;
      --show-paper: #191c1a;
      --show-muted: #b2bcb5;
      --show-accent: #77d4a6;
    }
  }
  :global([data-theme='dark']) .pattern-show {
    --show-ink: #eef2ef;
    --show-paper: #191c1a;
    --show-muted: #b2bcb5;
    --show-accent: #77d4a6;
  }
  :global([data-theme='light']) .pattern-show {
    --show-ink: var(--ink, #181814);
    --show-paper: var(--paper, #fff);
    --show-muted: var(--muted, #60645e);
    --show-accent: var(--green-dark, #007a4d);
  }
</style>
