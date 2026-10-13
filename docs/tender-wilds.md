# Tender Wilds

Tender Wilds lives at `/apps/tender-wilds`, with its own card under Apps.

Build habits through play. Grow a garden, discover new seeds, and explore a world of your own.

## First playable version

The overhead island is the primary interaction surface. Six nursery plots, six permanent garden
spots, a folded-paper bird, constructed objects, and island navigation appear in the game. Desktop uses
an adjacent activity panel; mobile stacks the garden above touch controls and opens a bottom action tray when a plot
or bridge is selected. Activity navigation stays within reach. Native buttons support keyboard and touch. Tap the ground to send the bird to a destination, or hold arrow keys while the garden is focused. The bird turns as it moves and stops when keys are released or focus leaves the garden. Movement respects reduced-motion settings.

Focus patterns come from published Commons and the local personal library. Users reorder their
priorities and recognize progress with S=1, M=2, L=3, XL=5 care points. One point reduces a plant's
total growth time by 25%, once per harvest. There are no streaks, expiration, or decay.

Plants mature in 12–72 hours. Time away counts. Harvesting yields two materials and starts another
growth cycle; a mature plant can instead be traded for coins, kept in a permanent spot, or paired
with another mature nursery plant to breed a seed. Permanent plants can be harvested directly or
returned to an empty nursery plot for rearrangement. Breeding preserves parents and combines colour
and form with deterministic colour variation.

Fibre, wood and petals build benches, lanterns and gates. Bridges require coins plus fibre and wood.
Each bridge opens another island and six permanent spots. Three habitats repeat; species unlock
on the first three islands. Prices remain bounded. This is an extensible initial catalogue (six
species and three recipes), not an unlimited catalogue of unique artwork or species.

The Sound effects switch starts off and remembers its setting on this device. Quiet, locally
synthesized effects accompany footsteps and successful garden actions. Audio starts only after
a user gesture, stops immediately when muted, and stays quiet while the page is hidden.

## Persistence and boundaries

Game state is stored in the separate IndexedDB database `patternverse-tender-wilds-v1`, after
mounting. Read-modify-write transactions prevent lost resource updates across tabs. Invalid saves
are retained and produce a visible error instead of being reset. Save failures do not award
resources or advance the displayed state. Public prerendered output contains only pattern choices,
never the garden or focus history.

Saves currently stay on the device. They are not part of workspace backups or Dropbox sync.
Deleting browser/site data also deletes the garden. There are no external model requests or
notifications. Timings and prices are first-pass balancing values, not a validated long-term economy.

Validation covers growth boundaries, repeated harvests, breeding, material and currency conservation,
invalid actions, map revisits, focus order, corrupt saves, concurrent writes, and the component
recognition-to-building flow. Browser review covers responsive layouts and direct plot selection.
