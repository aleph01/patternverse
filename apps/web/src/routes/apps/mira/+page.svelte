<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- Mira links resolve their base route before appending encoded session/technique query parameters. */
  import { onMount } from 'svelte';
  import MiraMark from '$lib/mira/MiraMark.svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import { THERAPY_LIBRARY } from '$lib/mira/therapy-library';
  import {
    ArrowLeft,
    Settings2,
    MessageCircle,
    BookOpen,
    Footprints,
    Check,
    Ellipsis,
    Pencil,
    Trash2,
    X,
  } from '@lucide/svelte';
  import { createSession, transition, type Session } from '@patternverse/companion-core';
  import {
    createPrivateMiraStore,
    type PrivateMiraStore,
    type MiraSettings,
  } from '$lib/mira/private-store';
  import { MODALITIES, modalityById, availableModalityId } from '$lib/mira/modalities';
  import { resolveReleaseFeatures } from '$lib/release-features';
  import ModalityPicker from '$lib/mira/ModalityPicker.svelte';
  import '$lib/apps/apps.css';
  import '$lib/mira/workspace.css';

  let store: PrivateMiraStore;
  let sessions = $state<readonly Session[]>([]);
  let settings = $state<MiraSettings | null>(null);
  let error = $state('');
  let busy = $state(false);
  let search = $state('');
  let showAll = $state(false);
  let editing = $state<string | null>(null);
  let confirmingDelete = $state<string | null>(null);
  let deleting = $state<string | null>(null);
  let title = $state('');
  let choosing = $state(false);
  let modalitySearch = $state('');
  let desktop = $state(false);
  const features = $derived(resolveReleaseFeatures(desktop));
  const preferred = $derived(
    availableModalityId(
      settings?.preferredModalityId ??
        sessions.find((s) => s.id === settings?.activeSessionId)?.modalityId,
    ),
  );
  const requested = $derived(
    browser && features.guidedExercises
      ? THERAPY_LIBRARY.find((t) => t.id === page.url.searchParams.get('technique'))
      : undefined,
  );
  const filtered = $derived(
    sessions.filter((s) => s.title.toLowerCase().includes(search.toLowerCase())),
  );
  const visible = $derived(showAll || search ? filtered : filtered.slice(0, 5));
  const choices = $derived(
    MODALITIES.filter((m) => m.name.toLowerCase().includes(modalitySearch.toLowerCase())).map(
      (m) => ({ id: m.id, label: m.name }),
    ),
  );

  onMount(() => {
    desktop = '__TAURI_INTERNALS__' in window;
    store = createPrivateMiraStore();
    void Promise.all([store.list(), store.loadSettings()])
      .then(([saved, preferences]) => {
        sessions = saved;
        settings = preferences;
      })
      .catch(fail);
  });

  /** Keep private-storage failures visible; never replace an unreadable library with empty data. */
  function fail(cause: unknown) {
    error = cause instanceof Error ? cause.message : 'Could not open private sessions.';
  }

  /** Create exactly one session locally before navigating to the existing conversation host. */
  async function start() {
    if (!settings || busy) return;
    busy = true;
    error = '';
    try {
      const fresh = createSession(
        crypto.randomUUID(),
        requested?.modality ?? preferred,
        new Date().toISOString(),
      );
      const session = requested
        ? transition(fresh, {
            type: 'select-pattern',
            pattern: { sourceId: 'commons', entityId: requested.slug },
            at: new Date().toISOString(),
          }).session
        : fresh;
      await store.save(session);
      settings = { ...settings, activeSessionId: session.id };
      await store.saveSettings(settings);
      await goto(
        `${resolve('/mira')}?session=${encodeURIComponent(session.id)}${requested ? `&technique=${encodeURIComponent(requested.id)}` : ''}`,
      );
    } catch (cause) {
      fail(cause);
    } finally {
      busy = false;
    }
  }

  /** Preference changes affect new conversations, not existing session modalities. */
  async function prefer(id: string) {
    if (!settings) return;
    try {
      const next = { ...settings, preferredModalityId: id };
      await store.saveSettings(next);
      settings = next;
      choosing = false;
    } catch (cause) {
      fail(cause);
    }
  }

  /** Rename only the selected stored session and preserve its current transcript. */
  async function rename(id: string) {
    if (!title.trim()) return;
    try {
      const current = await store.load(id);
      if (!current) throw new Error('This session no longer exists.');
      await store.save(
        transition(current, { type: 'rename', title: title.trim(), at: new Date().toISOString() })
          .session,
      );
      sessions = await store.list();
      editing = null;
    } catch (cause) {
      fail(cause);
    }
  }

  /** Delete the selected conversation and exercise after the in-page confirmation step. */
  async function remove(session: Session) {
    if (deleting) return;
    deleting = session.id;
    error = '';
    try {
      await store.remove(session.id);
      sessions = sessions.filter((item) => item.id !== session.id);
      if (settings?.activeSessionId === session.id) {
        settings = { ...settings, activeSessionId: sessions[0]?.id ?? null };
        await store.saveSettings(settings);
      }
      confirmingDelete = null;
    } catch (cause) {
      fail(cause);
      sessions = await store.list().catch(() => sessions);
    } finally {
      deleting = null;
    }
  }
</script>

<svelte:head
  ><title>mira — Apps — Patternverse</title><meta
    name="description"
    content="Start a conversation, return to your sessions, or learn how to use mira."
  /></svelte:head
>
<!-- eslint-disable svelte/no-navigation-without-resolve -- Base routes are resolved before encoded query parameters are appended. -->
<main class="apps-page mira-landing">
  <div class="landing-top">
    <a href={resolve('/apps')}><ArrowLeft size={18} /> Apps</a><a
      href={`${resolve('/mira')}?panel=settings`}
      aria-label="mira settings"><Settings2 size={22} /></a
    >
  </div>
  <header class="landing-hero">
    <div>
      <h1><MiraMark size="1.25em" />mira</h1>
      <p>Reflect. Explore. Take a next step.</p>
    </div>
    <div>
      <button class="landing-action" disabled={!settings || busy} onclick={() => void start()}
        >+ New session</button
      >
      <p class="landing-preference">
        Preferred approach: <button
          class="landing-link"
          onclick={() => (choosing = true)}
          disabled={!settings}>{modalityById(preferred).name}</button
        >
      </p>
    </div>
  </header>
  {#if error}<p class="landing-error" role="alert">{error}</p>{/if}
  {#if features.guidedExercises && requested}<aside
      class="landing-section"
      aria-label="Selected technique"
    >
      <h2>{requested.title}</h2>
      <p>
        New session will open in {requested.modality.toUpperCase()} with this technique selected for review.
        It will not start automatically.
      </p>
    </aside>{/if}
  <section class="landing-section" aria-labelledby="sessions-heading">
    <div class="landing-section-head">
      <h2 id="sessions-heading">Your sessions</h2>
      <input
        type="search"
        aria-label="Search sessions"
        placeholder="Search sessions"
        bind:value={search}
      />
    </div>
    {#if !settings && !error}<p role="status">Opening private sessions…</p>
    {:else if !visible.length}<p>
        {search ? 'No matching sessions.' : 'Your conversations will appear here.'}
      </p>{/if}
    {#each visible as session (session.id)}
      {#if editing === session.id}
        <form
          class="landing-edit"
          onsubmit={(event) => {
            event.preventDefault();
            void rename(session.id);
          }}
        >
          <input aria-label="Session name" bind:value={title} maxlength="200" required />
          <div class="landing-edit-actions">
            <button class="landing-edit-save" type="submit" title="Save new name"
              ><Check size={16} /> Save</button
            >
            <button
              class="landing-edit-cancel"
              type="button"
              title="Cancel renaming"
              onclick={() => (editing = null)}><X size={16} /> Cancel</button
            >
          </div>
        </form>
      {:else if confirmingDelete === session.id}
        <div class="landing-delete-confirm" role="group" aria-label={`Delete ${session.title}`}>
          <div>
            <strong>Delete this session?</strong>
            <span>Its conversation and exercise progress will be removed from this device.</span>
          </div>
          <div class="landing-delete-actions">
            <button
              type="button"
              class="landing-edit-cancel"
              disabled={deleting === session.id}
              onclick={() => (confirmingDelete = null)}>Cancel</button
            >
            <button
              type="button"
              class="landing-delete-button"
              disabled={deleting === session.id}
              onclick={() => void remove(session)}
              ><Trash2 size={16} /> {deleting === session.id ? 'Deleting…' : 'Delete'}</button
            >
          </div>
        </div>
      {:else}
        <div class="landing-session">
          <a
            class="landing-session-link"
            href={`${resolve('/mira')}?session=${encodeURIComponent(session.id)}`}
            ><strong>{session.title}</strong><span
              >{new Date(session.updatedAt).toLocaleDateString()} · {modalityById(
                session.modalityId,
              ).name}</span
            ></a
          >
          <details>
            <summary
              aria-label={`Manage ${session.title}`}
              title="Rename or delete session"
              data-tooltip="Session actions"><Ellipsis size={20} /></summary
            >
            <div class="landing-session-menu">
              <button
                title="Rename session"
                onclick={() => {
                  editing = session.id;
                  confirmingDelete = null;
                  title = session.title;
                }}><Pencil size={16} /> Rename</button
              ><button
                class="landing-session-delete"
                title="Delete session"
                onclick={() => {
                  confirmingDelete = session.id;
                  editing = null;
                }}><Trash2 size={16} /> Delete</button
              >
            </div>
          </details>
        </div>
      {/if}
    {/each}
    {#if !showAll && filtered.length > 5}<button
        class="landing-link"
        onclick={() => (showAll = true)}>View all sessions →</button
      >{/if}
  </section>
  <section class="landing-section" aria-labelledby="getting-started">
    <h2 id="getting-started">Getting started</h2>
    <div class="landing-tutorial">
      <article>
        <MessageCircle aria-hidden="true" />
        <div>
          <h3>Start a conversation</h3>
          <p>
            Write what is on your mind. A new session uses your preferred approach; you can change
            it in the chat.
          </p>
        </div>
      </article>
      {#if features.guidedExercises}<article>
          <BookOpen aria-hidden="true" />
          <div>
            <h3>Explore a technique</h3>
            <p>
              Use the + button, or Shift+Space, to choose a pattern. Read it first, then start a
              guided exercise when you wish.
            </p>
          </div>
        </article>{/if}
      <article>
        <Footprints aria-hidden="true" />
        <div>
          <h3>Pick up where you left off</h3>
          <p>
            Return to a saved session. You can read it offline, rename it, or delete it from the
            session menu.
          </p>
        </div>
      </article>
    </div>
  </section>
  <section
    id="about-mira"
    class="landing-section landing-about"
    aria-labelledby="about-mira-heading"
  >
    <p class="landing-about-kicker">The companion inside Patternverse</p>
    <h2 id="about-mira-heading">About mira</h2>
    <p class="landing-about-intro">
      mira is a space to reflect in conversation. Start in your own words, choose a therapy approach
      that fits, and return to a saved session whenever you want. You can change approaches during a
      conversation without losing its history.
    </p>
    <div class="landing-about-details">
      <p>
        <strong>At your pace.</strong> Write a message, explore an approach, or revisit what you have
        already discussed. Your sessions remain available for you to rename or delete.
      </p>
      <p>
        <strong>Clear about privacy.</strong> Sessions are kept in private app storage. In the desktop
        app, an installed local model can process replies on your Mac. On the web, replies go through
        your selected OpenRouter model under mira’s zero-retention request.
      </p>
    </div>
    <a class="landing-link" href={resolve('/about/mira')}>Explore the full mira guide →</a>
  </section>
</main>
{#snippet noFeedback()}{/snippet}
{#if choosing}<ModalityPicker
    {choices}
    bind:search={modalitySearch}
    selected={preferred}
    onSelect={(id) => void prefer(id)}
    onClose={() => (choosing = false)}
    feedback={noFeedback}
  />{/if}
