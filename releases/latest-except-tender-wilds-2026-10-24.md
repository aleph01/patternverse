# Latest website release — 24 October 2026

Published to <https://patternverse.org> through Cloudflare Pages production branch
`main`. Deployment: `6561a058-faee-42e9-b92e-4d39656a36a0`.

## Scope

The release includes the latest eligible website changes and all 286 published
entries: 209 patterns, 61 collections, 11 verses, three concepts, and two practices.
The 118 draft entries remain excluded. Tender Wilds remains available in local
development and version control; its public route and bundles are excluded.
Existing core release switches remain in effect. Separate backend services and
desktop installers were not deployed.

The component refactor is committed on `codex/component-boundaries-refactor`,
with video, workspace, Tender Wilds, and shared browser verification separated.
A release fix saves the visited page's loaded dependencies before its navigation
documents, preventing an incomplete first-visit cache from reopening without
interactive controls. Two regression tests cover delayed and failed dependencies.
Only this refactor and its release fixes were selected for commits; older unrelated
workspace changes remain outside these commits. No Git push or pull request was made.

## Verification

- The isolated candidate passes content validation, production compilation, the
  workspace build, public-output scans, and exact published/draft inventory checks.
- All 27 refactor application/test/configuration files match the previously
  verified source. That refactor passed all 1,794 web tests; its full audit and
  browser baseline comparison are in `docs/component-boundaries-refactor.md`.
- The offline fix passes 42 focused cache tests and the web type check, with
  zero Svelte errors or warnings. All 14 deployment safeguard tests pass.
- Final desktop/phone search, offline, navigation, resumable-download, and update
  checks: 28 passed, two baseline-worker checks skipped. The older navigation test
  that expects the removed “Browse the library” heading was excluded from this
  final rerun after its cache assertions had passed in the initial run.
- Final widget, publication-boundary, practice, and desktop-hover smoke checks:
  13 passed, one touch-device hover check skipped.
- The initial broader release/photography suite recorded 103 passed, six skipped,
  and seven failed. Four timeout/interaction cases pass isolated reruns. Three
  stale assertions still expect nine-verse tile geometry or a collection's older
  12-entry inventory; the current site has 11 verses and that collection has 14
  entries. These tests were not weakened or used to change the intended content.
- All **658 production HTTP checks pass**: public HTML, widget host, entry scripts,
  search data, manifest, worker, version, and WebAssembly match the artifact bytes;
  all draft article URLs and three Tender Wilds URL forms return 404.

## Artifact and rollback

The exact upload and machine-readable reports are retained under
`.local/releases/latest-except-tender-wilds-2026-10-24/production-candidate/`.
The artifact has 1,484 files including `_headers`; Wrangler uploaded 1,483 assets
and the headers separately. Its SHA-256 fingerprint, calculated over sorted
relative filenames followed by their bytes, is:

```text
9877b4850e60582fe9ed81884563281dce26e1e58d71d2888fa4649fc738e166
```

The previous production deployment is
`b661a031-ab52-4ab2-9f83-608f80501ecf`. The earlier 157-entry release policy remains
available for that release; this publication intentionally includes all currently
published content instead of applying its historical content holdback.
