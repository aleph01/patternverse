// Private test harness: not a route, and never included in a production entry point.
import { mount } from 'svelte';
import WorkspaceSyncReview from '../src/lib/components/WorkspaceSyncReview.svelte';
import WorkspaceSyncUpgrade from '../src/lib/components/WorkspaceSyncUpgrade.svelte';

export function mountReview(target: HTMLElement) {
  return mount(WorkspaceSyncReview, {
    target,
    props: {
      result: {
        type: 'review',
        token: 'browser-reviewed-version',
        stale: false,
        items: [
          {
            path: 'entities/one.json',
            title: 'Define the decision',
            kind: 'Library item',
            local: 'Your local notes\n' + 'LongUnbrokenText'.repeat(80),
            remote: 'The other device’s notes',
          },
        ],
      },
      onresolve: (choices, token) => {
        target.dataset.submitted = JSON.stringify({ choices, token });
      },
      onretry: () => {
        target.dataset.retry = 'yes';
      },
      oncancel: () => {
        target.dataset.cancelled = 'yes';
      },
    },
  });
}

export function mountRecovery(target: HTMLElement) {
  return mount(WorkspaceSyncReview, {
    target,
    props: {
      result: {
        type: 'blocked',
        token: 'pending-review',
        message: 'Newer work exists.',
        recoveryAvailable: true,
        items: [
          {
            path: 'entities/one.json',
            title: 'My pattern',
            kind: 'Library item',
            local: 'Current notes',
            remote: 'Pending notes',
          },
          {
            path: 'sessions/one.json',
            title: 'My conversation',
            kind: 'Mira conversation',
            local: 'Active notes',
            remote: 'Pending conversation',
            protectedReason: 'Active Mira work stays on this device.',
          },
        ],
      },
      onresolve: () => {
        throw new Error('Recovery must not submit normal choices');
      },
      onrecover: (choices, token) => {
        target.dataset.submitted = JSON.stringify({ choices, token });
      },
      onretry: () => {},
      oncancel: () => {
        target.dataset.cancelled = 'yes';
      },
    },
  });
}
export function mountUpgrade(target: HTMLElement) {
  return mount(WorkspaceSyncUpgrade, {
    target,
    props: {
      result: {
        type: 'upgrade',
        token: 'upgrade-review',
        items: 12,
        sessions: 3,
        resumed: false,
        stale: false,
      },
      onupgrade: (token) => {
        target.dataset.submitted = token;
      },
      oncancel: () => {
        target.dataset.cancelled = 'yes';
      },
    },
  });
}
