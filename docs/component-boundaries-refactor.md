# Component boundary refactor

## Scope and baseline

The 2026-10-24 component audit scanned 410 files: 110 flagged files, 252 warnings,
and no errors. This pass targets three untouched feature boundaries after reviewing
the architecture, compatibility inventory, audit findings, and current workspace.
Existing changes in Mira, authoring, library, sync, and release infrastructure belong
to other sessions and are outside this pass. Size warnings alone do not justify
changing already cohesive transformations, declarations, or stylesheets.

## Prioritized backlog and acceptance criteria

1. **Embedded video lifecycle.** Separate YouTube, Vimeo, and Dailymotion setup
   from shared clip enforcement and disposal. Inject provider creation and scheduling
   into the lifecycle coordinator; retain the existing browser-facing entry point.
   Cover delayed initialization, disposal, duration errors, pause/seek/loop behavior,
   provider errors, and SDK setup with deterministic tests. Preserve provider URLs,
   captions, autoplay policy, and explicit replay behavior.
2. **Private workspace management.** Move verse-membership transformations out of
   `PersonalWorkspace.svelte` into its existing framework-independent management
   boundary. Extract the structure-management panel as a controlled presentation
   component. Keep drafts, refresh ownership, focus, confirmation, and persistence
   in the host. Cover immutable membership changes and existing private-first
   verse rules; exercise real workspace management in desktop/mobile browsers.
3. **Tender Wilds composition and effects.** Make the feature shell express its
   activity composition rather than every activity's markup. Extract cohesive
   nursery, focus, seed-shop, and world activities. Separate loading, dispatch,
   clock updates, and cleanup into a coordinator with explicit store, audio,
   scheduling, and publication ports. Preserve selection drafts and game/storage
   semantics. Test storage failures, refresh/write ordering, duplicate actions,
   and unmount during asynchronous work, together with existing game/UI tests.

Within these boundaries, public operations precede implementation helpers after
required imports, types, and initialization. Pure transformations have explicit
inputs and outputs; concrete browser capabilities are composed by the hosts.
No dependency injection container or functional programming dependency is needed.

## Verification and completion

- Run focused unit/component tests for each boundary and the existing related tests.
- Run formatting, lint/type checks, content validation, all unit tests, production
  build, and the repository's browser suite. Distinguish pre-existing failures from
  regressions using evidence; do not change another session's work to make checks pass.
- Compare the component audit with the baseline without modifying audit rules.
- Review changes for lifecycle, reactivity, focus, styling, compatibility, persistence,
  and performance invariants. Record results here before declaring completion.
- Keep only this session's work on `codex/component-boundaries-refactor`; do not
  push or open a pull request.

## Results

The three implementation items are complete:

- `video-player.ts` composes browser providers around the injected
  `createVideoPlayback` lifecycle. SDK loading, provider setup, and shared excerpt
  enforcement have distinct owners. Late players are destroyed, disposed controls
  cannot restart playback, and disposal interrupts a pending clip-reset sequence.
- `PersonalWorkspace.svelte` composes a pure management view and the controlled
  `WorkspaceStructurePanel`. Membership plans run against the workspace
  transaction's current records. Private-first identity resolution, last-home
  validation, confirmation, drafts, and focus remain with their existing owners.
- `TenderWilds.svelte` composes four activity components. Nursery, focus, and map
  drafts remain in the host. `createGardenSession` receives storage, clock, audio,
  subscription, and publication ports and reuses the existing refresh guard.
  Confirmed saves cannot be replaced by an obsolete focus read; disposal prevents
  late UI/audio continuations without interrupting already-started storage writes.

### Audit comparison

| Signal                                                   | Before | After |
| -------------------------------------------------------- | -----: | ----: |
| Source files scanned                                     |    410 |   422 |
| Flagged files                                            |    110 |   110 |
| Warnings                                                 |    252 |   245 |
| Errors                                                   |      0 |     0 |
| Warnings in the scoped hosts and their extracted modules |     11 |     4 |

The remaining scoped findings are the size of `PersonalWorkspace.svelte` (605
nonblank/noncomment lines including its stylesheet), the lengths of two cohesive
lifecycle factories, and explicit branching in clip-boundary enforcement. Audit
thresholds and suppressions are unchanged. Tender Wilds game rules and audio
synthesis remain separate existing modules; their independent audit findings are
outside the selected backlog.

### Validation

- Focused behavior, lifecycle, provider, pure-view, and component tests pass.
- All 194 web test files / 1,794 tests pass. The final full rerun used four workers
  and 30-second test/hook timeouts for this shared machine; assertions and repository
  timeout configuration are unchanged. An earlier run also passed with defaults.
- `pnpm lint` passes, including every workspace's type checks and zero Svelte errors
  or warnings. `pnpm validate:content` validates 404 entities. `pnpm build` passes,
  including public-build checks.
- Desktop and phone source-UI checks pass for activity drafts, garden persistence,
  responsive layout, panel focus, keyboard order, and control styling. Tender Wilds
  remains excluded from public builds; its supplementary source checks use
  `playwright.component-boundaries.config.ts`.
- The full production browser suite completes with **455 passed, 74 failed, and
  29 skipped**. Verification uses an isolated source copy to avoid sharing
  SvelteKit generated files with the existing development server. All 27
  application/test/configuration files in this refactor match the verified copy
  byte for byte. The public build's HTML and JavaScript bootstrap versions also
  match; early runs affected by shared generated files are excluded from these
  results.
- Every browser failure was compared with a separate build restoring all five
  pre-refactor files. **67 failures reproduce before the refactor** (35 desktop,
  32 mobile). The remaining **seven pass when rerun against the refactored
  artifact** (six desktop, one mobile). No persistent browser failure specific to
  this refactor remains unresolved. Existing failures include outdated language
  documentation, inventory, library, and release-profile expectations.
- The focused production run passes 13 of 14 checks, including both video checks
  and all core workspace-management checks. Its sole failure expects a mobile
  library List control absent from the current library; this also fails with the
  original components. The four supplementary source-UI checks all pass again
  against the final refactor on desktop and phone.

The root `pnpm test` run identifies an existing MCP catalog mismatch for
`reframing-surface-higher-goals`: the public article and package definition have
different sources/roots. Both definitions and the MCP test were already changed
before this session and are untouched by this refactor. Every other supporting
package test suite passed. Root `pnpm format:check` reports the existing
`docs/pattern-packages/liberating-structures.md` formatting issue; this session's
files are formatted. These unrelated changes have been left with their owners.

### Workspace handoff

The refactor is committed on `codex/component-boundaries-refactor`. Updating
GitButler's stale upstream state resolved its earlier dependency refusal. Video
playback, workspace management, Tender Wilds, and shared browser verification are
separate commits, with their focused tests alongside the corresponding changes.
The other sessions' changes remain outside these commits. Tender Wilds source is
preserved in version control and remains excluded from public website builds.
