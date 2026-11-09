import { afterNavigate } from '$app/navigation';
import { onMount } from 'svelte';

/** Keep native fragment links, browser history, and variant navigation in sync. */
export function documentationLocation() {
  let hash = $state('');
  const update = () => {
    hash = window.location.hash;
  };
  afterNavigate(update);
  onMount(() => {
    update();
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  });
  return {
    get hash() {
      return hash;
    },
  };
}
