<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import {
    ArrowLeft,
    ArrowUp,
    ArrowDown,
    Plus,
    X,
    Sprout,
    Map,
    Leaf,
    Sparkles,
    CircleHelp,
    Volume2,
    VolumeX,
  } from '@lucide/svelte';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { createGardenStore } from './store';
  import { createGardenAudio } from './audio';
  import {
    SIZES,
    SPECIES,
    bridgeCost,
    BRIDGE_MATERIALS,
    RECIPES,
    canCraft,
    materialCost,
    duration,
    gardenAt,
    islandInfo,
    seedName,
    speciesFor,
    stage,
    remainingMinutes,
    type Game,
    type Action,
    type Priority,
    type Seed,
  } from './game';
  import PlantArt from './PlantArt.svelte';
  import World from './World.svelte';
  import './tender-wilds.css';

  let { patterns }: { patterns: Priority[] } = $props();
  let game = $state<Game | null>(null);
  let now = $state(Date.now());
  let store: ReturnType<typeof createGardenStore>;
  let tab = $state('garden');
  let selectedPlot = $state(0);
  let selectedGarden = $state(-1);
  let actionSheet = $state(false);
  let selectedSeed = $state(0);
  let selectedPriority = $state('');
  let selectedSize = $state(1);
  let gardenSlot = $state(0);
  let secondParent = $state(-1);
  let search = $state('');
  let adding = $state(false);
  let help = $state(false);
  let audio: ReturnType<typeof createGardenAudio> | undefined;
  let soundEnabled = $state(false);
  let soundBusy = $state(false);
  let soundNotice = $state('');
  let busy = $state(false);
  let error = $state('');
  let notice = $state('');
  let localPatterns = $state<Priority[]>([]);
  let libraryError = $state('');
  let mapPage = $state(0);
  const plant = $derived(game?.nursery[selectedPlot]);
  const priority = $derived(
    game?.priorities.find((p) => p.key === selectedPriority) ?? game?.priorities[0],
  );
  const garden = $derived(game ? gardenAt(game) : []);
  const gardenPlant = $derived(selectedGarden >= 0 ? garden[selectedGarden] : null);
  const choices = $derived(
    [...patterns, ...localPatterns]
      .filter(
        (p) =>
          !game?.priorities.some((f) => f.key === p.key) &&
          p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      )
      .slice(0, 16),
  );
  const tabs = [
    { id: 'garden', label: 'Garden', icon: Sprout },
    { id: 'focus', label: 'Focus', icon: Sparkles },
    { id: 'seeds', label: 'Seeds', icon: Leaf },
    { id: 'world', label: 'World', icon: Map },
  ];
  const discovered = $derived(
    (game?.discoveries ?? []).map((key) => {
      const [species, color, form] = key.split(':');
      return { species, color: Number(color), form: Number(form) };
    }),
  );

  onMount(() => {
    let alive = true;
    store = createGardenStore();
    audio = createGardenAudio();
    soundEnabled = audio.enabled;
    const quietWhenHidden = () => {
      if (document.hidden) audio?.silence();
    };
    document.addEventListener('visibilitychange', quietWhenHidden);
    const refresh = () => {
      if (!busy)
        void store
          .load()
          .then((saved) => {
            if (alive) game = saved;
          })
          .catch((e) => {
            if (alive) fail(e);
          });
    };
    refresh();
    void getLocalWorkspace()
      .then((w) => w.listEntities())
      .then((entities) => {
        if (alive)
          localPatterns = entities
            .filter((e) => e.type === 'pattern')
            .map((e) => ({
              key: `${e.sourceId}:${e.id}`,
              entityId: e.id,
              sourceId: e.sourceId,
              title: e.title,
            }));
      })
      .catch(() => {
        if (alive)
          libraryError =
            'Your personal library could not be loaded. Public patterns are still available.';
      });
    const timer = setInterval(() => {
      now = Date.now();
    }, 15_000);
    window.addEventListener('focus', refresh);
    return () => {
      alive = false;
      audio?.dispose();
      document.removeEventListener('visibilitychange', quietWhenHidden);
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  });
  function unlockSound() {
    void audio?.unlock().catch(() => {});
  }
  async function toggleSound() {
    if (!audio || soundBusy) return;
    soundBusy = true;
    soundNotice = '';
    try {
      await audio.setEnabled(!soundEnabled);
      soundEnabled = audio.enabled;
      if (soundEnabled) audio.play('select');
    } catch (e) {
      soundEnabled = false;
      soundNotice = e instanceof Error ? e.message : 'Sound is unavailable.';
    } finally {
      soundBusy = false;
    }
  }
  function fail(e: unknown) {
    error = e instanceof Error ? e.message : 'Your garden could not be saved. Please try again.';
  }
  async function send(action: Action, message: string) {
    if (busy || !game) return;
    busy = true;
    error = '';
    notice = '';
    try {
      game = await store.dispatch(action);
      audio?.action(action.type);
      if (action.type === 'bridge') mapPage = Math.floor(game.current / 6);
      now = Date.now();
      notice = message;
    } catch (e) {
      fail(e);
    } finally {
      busy = false;
    }
  }
  function choosePlot(index: number) {
    audio?.play('select');
    actionSheet = true;
    selectedPlot = index;
    selectedGarden = -1;
    selectedSeed = 0;
    tab = 'garden';
    gardenSlot = Math.max(
      0,
      garden.findIndex((p) => !p),
    );
    secondParent = game?.nursery.findIndex((p, i) => p && i !== index && stage(p, now) === 2) ?? -1;
  }
  function chooseGarden(index: number) {
    audio?.play('select');
    actionSheet = true;
    selectedGarden = index;
    gardenSlot = index;
    tab = 'garden';
  }
  function openMap() {
    actionSheet = true;
    tab = 'world';
    mapPage = Math.floor((game?.current ?? 0) / 6);
  }
  function add(p: Priority) {
    void send({ type: 'add-priority', priority: p }, `${p.title} added to your focus.`);
    selectedPriority = p.key;
    adding = false;
    search = '';
  }
  const showSeed = (s: Seed) => speciesFor(s.species).name;
</script>

<svelte:window
  onpointerdown={unlockSound}
  onkeydown={(event) => {
    unlockSound();
    if (event.key === 'Escape') actionSheet = false;
  }}
/>
<main class="tender-wilds">
  <header class="tw-header">
    <a class="tw-back" href={resolve('/apps')} aria-label="Back to Apps"><ArrowLeft size={18} /></a>
    <a class="tw-brand" href={resolve('/apps/tender-wilds')}
      ><span class="tw-brand-mark"><Sprout size={24} /></span>
      <div>
        <h1>Tender Wilds</h1>
        <span>A little care. A world of possibility.</span>
      </div></a
    >
    <button
      class="tw-sound"
      role="switch"
      aria-label="Sound effects"
      aria-checked={soundEnabled}
      disabled={soundBusy}
      onclick={toggleSound}
    >
      {#if soundEnabled}<Volume2 size={18} />{:else}<VolumeX size={18} />{/if}
      <span>Sound {soundEnabled ? 'on' : 'off'}</span>
      <span class="tw-sound-track" aria-hidden="true"><i></i></span>
    </button>
    <button
      class="tw-icon"
      aria-label="How to play"
      aria-expanded={help}
      onclick={() => (help = !help)}><CircleHelp size={20} /></button
    >
  </header>
  {#if soundNotice}<p class="tw-sound-notice" role="status">{soundNotice}</p>{/if}
  {#if help}
    <section class="tw-help">
      <div>
        <h2>Make room for what matters.</h2>
        <button class="tw-icon" aria-label="Close help" onclick={() => (help = false)}
          ><X size={18} /></button
        >
      </div>
      <p>
        Choose patterns in Focus. When you make progress, choose S · 1, M · 2, L · 3, or XL · 5
        points. You decide what each size means.
      </p>
      <p>
        Plants mature in 12 hours–3 days, even while you’re away. One care point shortens a plant’s
        total growing time by 25%, once per harvest. Harvest materials to build bridges and garden
        objects. Keep mature plants, breed two together, or trade them for coins.
      </p>
      <p>Nothing withers. No streaks to protect. Your garden waits for you.</p>
      <small
        >Saved in this browser or app on this device. Gardens do not sync between devices yet.
        Clearing site data removes your garden.</small
      >
    </section>
  {/if}
  {#if error && !game}<div class="tw-error" role="alert">
      {error}{#if !game}<button onclick={() => location.reload()}>Try again</button>{/if}
    </div>{/if}
  {#if game}
    <div class="tw-layout">
      <section class="tw-world-column" aria-label="Your garden world">
        <div class="tw-world-title">
          <div>
            <p class="tw-kicker">YOUR LITTLE WORLD</p>
            <h2>{islandInfo(game.current).name}<span> No. {game.current + 1}</span></h2>
          </div>
          <span class="tw-saved">Saved on this device</span>
        </div>
        <div class="tw-scene">
          <World
            {game}
            {now}
            {selectedPlot}
            {selectedGarden}
            {busy}
            onStep={() => audio?.play('step')}
            onPlot={choosePlot}
            onGarden={chooseGarden}
            onMap={openMap}
            onVisit={(island) => {
              selectedGarden = -1;
              void send({ type: 'visit', island }, 'A familiar path. A different shore.');
            }}
          />
        </div>
        <div class="tw-world-bottom">
          <span><i class="tw-dot"></i> Growing at your pace</span><button
            onclick={() => {
              tab = 'world';
              mapPage = Math.floor(game!.current / 6);
            }}>Explore the islands <span aria-hidden="true">↗</span></button
          >
        </div>
        <div class="tw-desktop-note">
          <span>01 / A QUIETER KIND OF PROGRESS</span>
          <p>Small things, tended.<br />A world, slowly becoming yours.</p>
        </div>
      </section>
      <section
        class="tw-controls"
        class:tw-action-sheet={actionSheet}
        aria-label="Garden activities"
      >
        <div class="tw-wallet">
          {#if actionSheet}<button
              class="tw-sheet-close tw-icon"
              aria-label="Close action panel"
              onclick={() => (actionSheet = false)}><X size={18} /></button
            >{/if}
          <div><Sparkles size={16} /><strong>{game.points}</strong><span>care points</span></div>
          <div>
            <span class="tw-coin" aria-hidden="true">○</span><strong>{game.coins}</strong><span
              >coins</span
            >
          </div>
        </div>
        <nav class="tw-tabs" aria-label="Tender Wilds activities">
          {#each tabs as item (item.id)}<button
              aria-current={tab === item.id ? 'page' : undefined}
              onclick={() => {
                tab = item.id;
                notice = '';
              }}><item.icon size={18} /><span>{item.label}</span></button
            >{/each}
        </nav>
        <div class="tw-panel" aria-busy={busy}>
          {#if error}<p class="tw-error" role="alert">{error}</p>{/if}
          {#if tab === 'garden'}
            <div class="tw-section-title">
              <h2>{selectedGarden >= 0 ? 'Your garden' : 'Your nursery'}</h2>
              <span>{selectedGarden >= 0 ? 'A place to stay' : '6 growing plots'}</span>
            </div>
            <p class="tw-muted">Tap a plot in the game to plant, tend, or harvest.</p>
            <div class="tw-card">
              {#if selectedGarden >= 0}
                <p class="tw-kicker">GARDEN SPOT {selectedGarden + 1}</p>
                {#if gardenPlant}
                  <h3>{showSeed(gardenPlant)}</h3>
                  <p class="tw-muted">
                    {stage(gardenPlant, now) === 2
                      ? 'Ready whenever you are. Harvest materials and let it grow again.'
                      : `Growing again · ${duration(remainingMinutes(gardenPlant, now))} to harvest`}
                  </p>
                  <button
                    class="tw-primary"
                    disabled={busy || stage(gardenPlant, now) < 2}
                    onclick={() =>
                      void send(
                        { type: 'harvest-garden', slot: selectedGarden },
                        `Harvested 2 ${speciesFor(gardenPlant!.species).material}.`,
                      )}>Harvest <span>+2 {speciesFor(gardenPlant.species).material}</span></button
                  >
                  <button
                    class="tw-text"
                    disabled={busy || !game.nursery.includes(null)}
                    onclick={() =>
                      void send(
                        { type: 'return', slot: selectedGarden, plot: game!.nursery.indexOf(null) },
                        'Returned to the nursery to move, tend, or trade.',
                      )}>Return to nursery</button
                  >
                {:else}
                  <h3>A home for something lovely.</h3>
                  <p class="tw-muted">
                    When a nursery plant is mature, choose “Keep in garden” and place it in spot {selectedGarden +
                      1}. It will stay here as your world grows.
                  </p>
                  <button class="tw-secondary" onclick={() => choosePlot(selectedPlot)}
                    >Choose a nursery plant</button
                  >
                {/if}
              {:else if plant}
                <p class="tw-kicker">
                  PLOT {selectedPlot + 1} · {['SPROUT', 'YOUNG', 'MATURE'][stage(plant, now)]}
                </p>
                <h3>{showSeed(plant)}</h3>
                <p class="tw-muted">
                  {seedName(plant).split(' · ').slice(1).join(' · ')}{stage(plant, now) < 2
                    ? ` · Mature in ${duration(remainingMinutes(plant, now))}`
                    : ' · Ready for its next chapter'}
                </p>
                {#if stage(plant, now) < 2}
                  <button
                    class="tw-primary"
                    disabled={busy || game.points < 1 || plant.boost > 0}
                    onclick={() =>
                      void send(
                        { type: 'boost', plot: selectedPlot },
                        'A little care. A little more growth.',
                      )}
                    >{plant.boost ? 'Tended for this harvest' : 'Tend · 25% less growing time'}
                    <span>1 point</span></button
                  >
                  {#if !game.points}<button class="tw-text" onclick={() => (tab = 'focus')}
                      >Recognize some progress to earn points →</button
                    >{/if}
                {:else}
                  <button
                    class="tw-primary"
                    disabled={busy}
                    onclick={() =>
                      void send(
                        { type: 'harvest', plot: selectedPlot },
                        `Harvested 2 ${speciesFor(plant!.species).material}. Your plant is growing again.`,
                      )}>Harvest <span>+2 {speciesFor(plant.species).material}</span></button
                  >
                  <p class="tw-muted">
                    Harvest for building materials; this plant will regrow. Or keep, trade, or breed
                    it below.
                  </p>
                  <label class="tw-label"
                    >A place in this garden<select bind:value={gardenSlot}
                      >{#each garden as p, i (i)}<option value={i} disabled={Boolean(p)}
                          >Spot {i + 1}{p ? ' · occupied' : ' · empty'}</option
                        >{/each}</select
                    ></label
                  >
                  <div class="tw-actions">
                    <button
                      class="tw-primary"
                      disabled={busy || Boolean(garden[gardenSlot])}
                      onclick={() =>
                        void send(
                          { type: 'keep', plot: selectedPlot, slot: gardenSlot },
                          'A new resident in your garden.',
                        )}>Keep in garden</button
                    ><button
                      class="tw-secondary"
                      disabled={busy}
                      onclick={() =>
                        void send(
                          { type: 'trade', plot: selectedPlot },
                          `Traded for ${speciesFor(plant!.species).value} coins.`,
                        )}>Trade · {speciesFor(plant.species).value} coins</button
                    >
                  </div>
                  <details class="tw-details">
                    <summary>Breed a new seed</summary>
                    <p class="tw-muted">
                      Pair two mature nursery plants. Their colour and shape can combine, with
                      occasional surprises. Both parents stay.
                    </p>
                    <label class="tw-label"
                      >Second parent<select bind:value={secondParent}
                        ><option value={-1}>Choose a mature plant</option
                        >{#each game.nursery as p, i (i)}{#if p && i !== selectedPlot && stage(p, now) === 2}<option
                              value={i}>Plot {i + 1} · {showSeed(p)}</option
                            >{/if}{/each}</select
                      ></label
                    ><button
                      class="tw-secondary"
                      disabled={busy ||
                        secondParent < 0 ||
                        secondParent === selectedPlot ||
                        !game.nursery[secondParent] ||
                        stage(game.nursery[secondParent]!, now) < 2 ||
                        game.coins < 4}
                      onclick={() =>
                        void send(
                          { type: 'breed', first: selectedPlot, second: secondParent },
                          'A new seed is waiting in your pouch.',
                        )}>Breed · 4 coins</button
                    >
                  </details>
                {/if}
              {:else}
                <p class="tw-kicker">PLOT {selectedPlot + 1}</p>
                <h3>Something starts here.</h3>
                {#if game.seeds.length}<label class="tw-label"
                    >Choose from your seed pouch<select bind:value={selectedSeed}
                      >{#each game.seeds as seed, i (i)}<option value={i}>{seedName(seed)}</option
                        >{/each}</select
                    ></label
                  ><button
                    class="tw-primary"
                    disabled={busy || !game.seeds[selectedSeed]}
                    onclick={() =>
                      void send(
                        { type: 'plant', plot: selectedPlot, seed: selectedSeed },
                        'Planted. Let time do a little of the work.',
                      )}>Plant seed</button
                  >{:else}<p class="tw-muted">Your seed pouch is empty.</p>
                  <button class="tw-primary" onclick={() => (tab = 'seeds')}
                    >Visit the seed shop</button
                  >{/if}
              {/if}
            </div>
            {#if garden.some(Boolean)}<details class="tw-details">
                <summary>Arrange this garden</summary>
                <p class="tw-muted">
                  Return a plant to an empty nursery plot to move it, breed it, or trade it.
                </p>
                {#each garden as p, i (i)}{#if p}<div class="tw-row">
                      <span>Spot {i + 1} · {showSeed(p)}</span><button
                        class="tw-text"
                        disabled={busy || !game.nursery.includes(null)}
                        onclick={() =>
                          void send(
                            { type: 'return', slot: i, plot: game!.nursery.indexOf(null) },
                            'Returned to the nursery.',
                          )}>Return</button
                      >
                    </div>{/if}{/each}
              </details>{/if}
          {:else if tab === 'focus'}
            <div class="tw-section-title">
              <h2>What matters to you</h2>
              <button
                class="tw-icon"
                aria-label="Add a focus pattern"
                aria-expanded={adding}
                onclick={() => (adding = !adding)}><Plus size={20} /></button
              >
            </div>
            <p class="tw-muted">
              A priority list, at your pace. Choose a pattern to recognize your progress.
            </p>
            {#if adding || !game.priorities.length}<div class="tw-card">
                <label class="tw-label"
                  >Find a pattern<input
                    type="search"
                    placeholder="Try creativity, sleep, reflection…"
                    bind:value={search}
                  /></label
                >{#if libraryError}<p role="status" class="tw-muted">{libraryError}</p>{/if}
                <div class="tw-search-results">
                  {#each choices as p (p.key)}<button
                      aria-label={`Add ${p.title} to focus`}
                      disabled={busy}
                      onclick={() => add(p)}
                      ><span
                        >{p.title}<small
                          >{p.sourceId === 'personal' ? 'Your library' : 'Patternverse'}</small
                        ></span
                      ><Plus size={16} /></button
                    >{:else}<p class="tw-muted">
                      No matching patterns. Try a shorter phrase.
                    </p>{/each}
                </div>
              </div>{/if}
            <ol class="tw-priorities">
              {#each game.priorities as p, i (p.key)}<li class:active={priority?.key === p.key}>
                  <button
                    class="tw-priority-pick"
                    aria-pressed={priority?.key === p.key}
                    onclick={() => (selectedPriority = p.key)}
                    ><span>{String(i + 1).padStart(2, '0')}</span><strong>{p.title}</strong></button
                  >
                  <div class="tw-priority-actions">
                    <button
                      class="tw-icon"
                      aria-label={`Move ${p.title} up`}
                      disabled={busy || i === 0}
                      onclick={() =>
                        void send(
                          { type: 'reorder', key: p.key, direction: -1 },
                          'Priority order saved.',
                        )}><ArrowUp size={14} /></button
                    ><button
                      class="tw-icon"
                      aria-label={`Move ${p.title} down`}
                      disabled={busy || i === game!.priorities.length - 1}
                      onclick={() =>
                        void send(
                          { type: 'reorder', key: p.key, direction: 1 },
                          'Priority order saved.',
                        )}><ArrowDown size={14} /></button
                    ><button
                      class="tw-icon"
                      aria-label={`Remove ${p.title} from focus`}
                      onclick={() =>
                        void send(
                          { type: 'remove-priority', key: p.key },
                          'Removed from focus. Your progress stays.',
                        )}><X size={14} /></button
                    >
                  </div>
                </li>{/each}
            </ol>
            {#if priority}<div class="tw-card tw-recognize">
                <p class="tw-kicker">A MOMENT WORTH RECOGNIZING</p>
                <h3>{priority.title}</h3>
                <a
                  class="tw-pattern-link"
                  href={priority.sourceId === 'commons'
                    ? resolve('/pattern/[id]', { id: priority.entityId })
                    : resolve('/my')}
                  >{priority.sourceId === 'commons' ? 'Open pattern ↗' : 'Open your library ↗'}</a
                >
                <p class="tw-muted">
                  Practised, learned, or simply tried. How much would you like to give yourself?
                </p>
                <div class="tw-sizes">
                  {#each SIZES as size (size.name)}<button
                      aria-label={`${size.name}: ${size.points} points`}
                      class:chosen={selectedSize === size.points}
                      aria-pressed={selectedSize === size.points}
                      onclick={() => (selectedSize = size.points)}
                      ><span>{size.name}</span><strong>{size.points}</strong></button
                    >{/each}
                </div>
                <button
                  class="tw-primary"
                  disabled={busy}
                  onclick={() =>
                    void send(
                      { type: 'recognize', key: priority!.key, points: selectedSize },
                      `${selectedSize} care ${selectedSize === 1 ? 'point' : 'points'} added. You decide what counts.`,
                    )}>Recognize progress <span>+{selectedSize}</span></button
                >
              </div>{/if}
            {#if game.recognitions.length}<details class="tw-details">
                <summary>Recent moments</summary
                >{#each game.recognitions.slice(0, 8) as r, i (i)}<div class="tw-row">
                    <span>{r.title}<small>{new Date(r.at).toLocaleDateString()}</small></span
                    ><strong>+{r.points}</strong>
                  </div>{/each}
              </details>{/if}
          {:else if tab === 'seeds'}
            <div class="tw-section-title">
              <h2>The seed shop</h2>
              <span>{game.seeds.length} in your pouch</span>
            </div>
            <p class="tw-muted">New beginnings, in small paper packets.</p>
            <div class="tw-shop">
              {#each SPECIES as s (s.id)}<article>
                  <div class="tw-seed-art"><PlantArt color={s.color} form={s.form} /></div>
                  <div>
                    <h3>{s.name}</h3>
                    <p>{duration(s.minutes)} to grow · harvests 2 {s.material}</p>
                    <button
                      class="tw-secondary"
                      disabled={busy || s.habitat > game.frontier || game.coins < s.price}
                      onclick={() =>
                        void send(
                          { type: 'buy', species: s.id },
                          `${s.name} added to your seed pouch.`,
                        )}
                      >{s.habitat > game.frontier
                        ? `Find on island ${s.habitat + 1}`
                        : `Buy seed · ${s.price} coins`}</button
                    >
                  </div>
                </article>{/each}
            </div>
            <details class="tw-details">
              <summary>Your seed collection · {discovered.length} varieties</summary>
              <p class="tw-muted">
                Every variety you plant or breed stays in your collection record.
              </p>
              <div class="tw-collection">
                {#each discovered as seed, i (i)}<div title={seedName(seed)}>
                    <PlantArt {...seed} /><small>{seedName(seed)}</small>
                  </div>{/each}
              </div>
            </details>
          {:else}
            <div class="tw-section-title">
              <h2>A world unfolding</h2>
              <span>{game.frontier + 1} {game.frontier === 0 ? 'island' : 'islands'}</span>
            </div>
            <p class="tw-muted">
              Every bridge opens another garden. Old places are always yours to revisit.
            </p>
            <div class="tw-materials" aria-label="Harvested materials">
              <span><strong>{game.materials.fibre}</strong> fibre</span><span
                ><strong>{game.materials.wood}</strong> wood</span
              ><span><strong>{game.materials.petals}</strong> petals</span>
            </div>
            <div class="tw-card tw-bridge">
              <Map size={28} strokeWidth={1} />
              <h3>Just across the water.</h3>
              <p class="tw-muted">
                Build from island {game.frontier + 1} to discover {islandInfo(
                  game.frontier + 1,
                ).name.toLowerCase()}. Six fresh garden spots, and room for something new.
              </p>
              <p class="tw-muted">Materials: {materialCost(BRIDGE_MATERIALS)}</p>
              {#if game.current === game.frontier}<button
                  class="tw-primary"
                  disabled={busy ||
                    game.coins < bridgeCost(game.frontier) ||
                    !canCraft(game, BRIDGE_MATERIALS)}
                  onclick={() => {
                    void send({ type: 'bridge' }, 'A new shore. Make yourself at home.');
                  }}>Build & cross <span>{bridgeCost(game.frontier)} coins</span></button
                >{:else}<button
                  class="tw-primary"
                  disabled={busy}
                  onclick={() =>
                    void send(
                      { type: 'visit', island: game!.frontier },
                      'Back at the edge of your world.',
                    )}>Visit the furthest island</button
                >{/if}
            </div>
            <details class="tw-details" open>
              <summary>Build for this garden</summary>
              {#each RECIPES as recipe (recipe.id)}{@const built = game.structures.some(
                  (s) => s.island === game!.current && s.recipe === recipe.id,
                )}
                <div class="tw-recipe">
                  <div>
                    <h3>{recipe.name}</h3>
                    <p>{recipe.description}</p>
                    <small>{materialCost(recipe.cost)}</small>
                  </div>
                  <button
                    class="tw-secondary"
                    disabled={busy || built || !canCraft(game, recipe.cost)}
                    onclick={() =>
                      void send(
                        { type: 'craft', recipe: recipe.id },
                        `${recipe.name} built in this garden.`,
                      )}>{built ? 'Built' : 'Build'}</button
                  >
                </div>
              {/each}
            </details>
            <div class="tw-islands">
              {#each Array.from({ length: Math.min(6, Math.max(0, game.frontier + 1 - mapPage * 6)) }, (_, i) => mapPage * 6 + i) as index (index)}<button
                  class:chosen={game.current === index}
                  disabled={busy}
                  aria-pressed={game.current === index}
                  onclick={() =>
                    void send(
                      { type: 'visit', island: index },
                      `Welcome to ${islandInfo(index).name.toLowerCase()}.`,
                    )}
                  ><span>{String(index + 1).padStart(2, '0')}</span><strong
                    >{islandInfo(index).name}</strong
                  ><small>{game.current === index ? 'You are here' : 'Visit garden →'}</small
                  ></button
                >{/each}
            </div>
            <div class="tw-pagination">
              <button disabled={mapPage === 0} onclick={() => mapPage--}>← Previous</button><span
                >{mapPage + 1} / {Math.floor(game.frontier / 6) + 1}</span
              ><button disabled={(mapPage + 1) * 6 > game.frontier} onclick={() => mapPage++}
                >Next →</button
              >
            </div>
          {/if}
          <p class="tw-notice" role="status" aria-live="polite">{notice}</p>
        </div>
      </section>
    </div>
  {:else if !error}<p class="tw-loading" role="status">
      Finding your little corner of the wilds…
    </p>{/if}
  <footer class="tw-footer">
    <span>Build habits through play.</span><span>No rush. Nothing lost by resting.</span>
  </footer>
</main>
