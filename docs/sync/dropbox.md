# Dropbox provider plan

## Sync settings boundary

`lib/client/sync-settings.ts` owns the settings view's state and explicit actions:
connect/disconnect, device preference changes, manual sync, conflict choices,
recovery confirmation, and archive upgrade review. `SyncAndBackup.svelte` renders
that state and forwards user actions. `sync-settings-browser.ts` supplies browser
storage, OAuth handoff, preference listeners, and the existing sync services.
Constructing the adapter/controller has no browser effects; mounting subscribes
without starting an upload.

The legacy encrypted, workspace encrypted, and sign-in-only modes remain distinct.
The controller does not parse archives, merge records, validate snapshots, migrate
data, or schedule uploads. Sign-in-only manual actions still use
`syncDropboxAccount`, sharing the application's existing automatic-sync gate;
the other modes retain their existing entry points. Review/recovery tokens and
confirmation flags are passed unchanged. Dismissing a review changes only the
view, not the shared scheduler or recovery records.

Actions snapshot their inputs and guard repeated clicks. Disposal releases view
subscriptions and ignores delayed results/authorization redirects; it does not
cancel an already-started recoverable sync or stop the application scheduler.
Late key reads cannot restore remembered-key state after disconnect. Authorization
and key-read failures are reported without unhandled promises. Tests cover all
three modes, explicit review/upgrade actions, preference failures, and lifecycle
cleanup without contacting a real Dropbox account. No stored formats, credentials,
provider permissions, encryption decisions, or UI styling change.

## Automatic sign-in-only sync (implementation, not yet published)

The sign-in-only flow now defaults to automatic sync, controlled by **Workspace →
Sync & backup → Automatic Dropbox sync**. The preference applies immediately, stays on
this browser/device only, survives reopening, and is not exported or synced. It can
be disabled before connecting Dropbox. Unavailable preference storage fails closed.

One application-level scheduler reuses `syncWorkspaceWithDropbox` for automatic,
manual and reviewed attempts. Successful local saves are debounced 1.5 seconds
(maximum ten-second postponement), and the foreground app checks remote changes
once a minute and on focus/online return. There are no service-worker or closed-app
uploads. Offline, hidden, disconnected or expired sessions cannot start automatic
attempts. Reconnect on expiration; no refresh tokens or new Dropbox scopes were added.

Manual and automatic calls share an in-flight gate; the existing whole-attempt Web
Lock protects different tabs. Saves made during an attempt queue one fresh follow-up.
Disabling automatic sync cancels future attempts, not an in-flight recoverable
operation. Existing provider revision checks, snapshot validation, ownership binding
and conflict/recovery semantics are unchanged. No automatic conflict choices exist.
Reviews pause scheduling and remain available across route changes, with a link to
Sync & backup. Fatal failures pause for manual retry; transient failures use bounded
exponential backoff and honor Retry-After. Receiving remote writes does not emit
local-save notifications, avoiding upload echo loops.

Workspace invalidation now uses one typed `workspace-changed` notification from
the client storage boundary. Its topics identify the changed sections; its origin
distinguishes local saves, remote sync applies, and backup replacement. Views share
a latest-read/disposal helper so delayed storage reads cannot overwrite newer
snapshots or active edits. Device-only sync preferences retain their separate
notification channel and are never treated as content to upload. Events contain
no private records, responses, or credentials. Other-tab reads still refresh on
focus; these notifications are not a cross-tab data transport.

Confirmed backup replacement turns automatic sync **off before replacement** and
waits for the existing whole-attempt Web Lock when available. A queued automatic
attempt rechecks that preference under the same lock before contacting Dropbox.
That pre-start cancellation is not a failure/conflict pause: explicitly enabling
automatic sync afterward starts a fresh attempt without needing a manual retry.
Restore notifications refresh views but never schedule an upload. Automatic sync
remains off after reload, focus, polling, or reconnect, including after a failed
restore. The confirmation and result explain that users must review the restored
workspace before explicitly syncing or re-enabling automatic sync. This does not
cancel a sync already operating on the pre-restore workspace. If the off preference
cannot be stored, replacement fails closed. Storage schemas and backup formats
are unchanged.

The earlier sign-in-only preview was live-tested by the user on two devices:
creation, updates, conflicting edits/resolution and offline editing all succeeded.
Those were manual verse tests, not live automatic-sync or saved-response/Mira tests.

Automatic-sync validation: focused unit/component tests pass, including 100
generated scheduler-event sequences; 52 isolated browser checks pass across desktop
and mobile-sized Chromium/WebKit. The browser tests verify automatic uploads from
outside Sync & backup, immediate disabling in sync settings, persistence after reload,
and manual syncing while disabled. All provider calls use a mock, never a personal
Dropbox account. Type checks and linting also pass.

## Sign-in-only preview (2026-10-10)

The controlled workspace preview explicitly enables `VITE_DROPBOX_SIGN_IN_ONLY=true`
alongside the Dropbox/workspace flags. This removes the user-chosen sync phrase and
Patternverse's encryption of **remote** data, not authorization, account binding,
schema validation, revision preconditions, or conflict/recovery review. Normal builds
still default to the existing encrypted flow until rollout is explicitly changed.

The same transport, snapshot validator, virtual-record bridge, planner, orchestrator
and UI are reused. `/patternverse-sync-v3.json` contains
`{ version: 3, protection: 'dropbox-account', snapshot: <existing v2 portable snapshot> }`.
Its contents are readable to Dropbox and anyone with account access. Both the
connection screen and privacy notice disclose this before use. The existing section
allowlist excludes credentials, settings, unsaved responses and live Mira caches.

Every read, including upload preflight, checks for existing v1/v2 archives. Presence,
permission failures, ambiguous errors, unsupported or incomplete documents block
sign-in-only sync without upload or local replacement. No automatic plaintext
migration or encrypted-archive deletion is provided. A coordinated migration would
require separate review; old clients must not continue writing a parallel archive.

Local recovery checkpoints remain encrypted with an automatically generated,
non-exportable device key stored in a separate account-bound IndexedDB database.
This key never enters Dropbox or derives from the OAuth token. It survives local
disconnect/reconnect so interrupted work can still recover, and is removed by
clearing website storage. Its recovery namespace is distinct from encrypted sync.
No second device needs this local key. Whole attempts retain the same cross-tab lock.
That earlier preview uses manual sync; the automatic implementation above changes
this behavior only for sign-in-only builds when released.

The development app still uses App Folder access and short-lived PKCE credentials.
Actual iPhone OAuth handoff and real-account exchange remain unverified. Tests use
mocked HTTP and disposable databases, never a live Dropbox account.

Validation for this preview: 111 focused unit/component checks (including 20
generated Unicode snapshots), 48 browser checks across desktop/mobile Chromium
and WebKit, and Svelte type checks pass. The browser checks exercise the actual
sign-in-only screen, PKCE callback and explicit Sync now action against a mocked
provider; signing in alone produces no upload. These are not live-account tests.

## Current browser implementation

The earlier plan below is retained as design history, not the deployed PWA's implementation.
The PWA uses direct authorization-code + PKCE, short-lived sessionStorage tokens and no broker.
Each person authorizes their own account through the same public app identifier; users do not
need a developer app. Each device authorizes independently and uses the same private sync phrase.

The browser reads/writes one encrypted `/patternverse-sync-v1.json` snapshot of personal library
items and saved Mira sessions, using a three-way merge and Dropbox revision preconditions.
The plaintext snapshot limit is 8 MB. Settings/API keys and exercise runs are not synced.
Local apply spans two databases and is not atomic: interrupted-apply recovery remains a launch
test requirement. See [current security behavior](security.md).

Before inviting users, verify App Folder (not Full Dropbox) access, minimum scopes, and enable
additional users in the App Console. Register `https://patternverse.org/auth/dropbox/callback`
exactly, retaining the existing Pages callback during migration. Confirm the canonical host
before registering an optional www callback. Test two real accounts in separate profiles and
verify that account switching in one profile is refused without deleting local data.

Dropbox currently permits limited development users; reaching 50 starts a two-week deadline
for production approval. Confirm status using the
[official guide](https://docs.dropboxapi.com/dropbox-api/docs/developer-resources/developer-guide).

## Opt-in workspace sync (v2)

`apps/web/src/lib/client/dropbox-workspace-store.ts` implements `RemoteCorpusStore`
over one encrypted `/patternverse-sync-v2.json` App Folder document. The virtual
record paths produced by `sync-corpus.ts` are not separate Dropbox files. There is
no new merge algorithm: `dropbox-workspace-sync.ts` composes the existing planner,
journal, encrypted checkpoint store and recoverable workspace/Mira database adapter.
Saved library references, ratings, saved responses and situations travel with
personal content and saved conversations. Credentials, settings and live Mira run
caches do not.

Writes re-read and validate the archive, check the expected revision and record
hashes, reconstruct through the workspace validator, encrypt, then upload with
`update(rev)` or `add`, `autorename: false` and `strict_conflict: true`. The API
revision still guards edits/deletions between that re-read and the actual upload.
Fresh random encryption IVs are used for every upload. The whole sync attempt is
serialized with a native Web Lock; the local-apply lock uses a different name to
avoid nested-lock deadlock.

Only the exact tagged download `path/not_found` error means absence. Other errors
map to typed authentication, permission, quota, rate-limit, revision or connection
failures. Response streams are bounded before JSON parsing; unexpected archives,
wrong keys and changed salts fail closed. Upload responses must include a revision.
API bodies, tokens and private content are not returned in error diagnostics.

The existing device key cache and account-owner binding are reused. Recovery
checkpoints must decrypt successfully before a supplied key is remembered; changing
the phrase cannot silently abandon pending recovery. A lost upload response leaves
the journal in place, and the next attempt re-reads and converges rather than
blindly uploading the old plan again.

### Review UI and rollout boundary

`SyncAndBackup.svelte` can opt in using `workspaceSync={true}`. The workspace page
passes this only when both Dropbox sync is enabled and the build explicitly sets
`VITE_WORKSPACE_DROPBOX_SYNC=true`. It is off by default, including full and desktop
profiles; the ordinary production build remains unchanged. Controlled previews set
`VITE_FEATURE_DROPBOX_SYNC=true` and `VITE_WORKSPACE_DROPBOX_SYNC=true` together.
Neither sign-in nor sync starts automatically. Each preview origin needs its exact
`/auth/dropbox/callback` URI registered in the Dropbox App Console. A stable preview
branch alias avoids registering a new URI for every deployment; workspace browser
storage remains separate from other preview origins and the production site.

`WorkspaceSyncReview.svelte` shows record-specific This device /
Dropbox choices, explicit deletions, expandable escaped record details and no
default selections. Choices carry a token covering base/local/remote revisions and
hashes. The shared orchestrator checks it before journal or database writes and
returns `review-outdated` if anything changed, even if no conflicts remain.

Blocked **persisted** local updates now offer current versus pending choices with
an explicit confirmation. A review token covers the original intent, current records
and Mira reply/cache protections. The encrypted recovery copy contains the original
expected/desired snapshots **and the current versions** that might be replaced.
Copy and replacement intent are persisted together with an envelope CAS; normal
database CAS then applies the reviewed intent. Later edits still block it. Active
Mira sessions/caches can only keep this device. The subsequent ordinary sync may
need a separate Dropbox conflict review. Cancellation deletes neither intent nor journal.
There is one latest recovery copy per scope, not an indefinite backup history or
a user-facing recovery-copy restore browser. If no intent was persisted (for example,
active Mira work blocked preflight), retry still requires settling that active work.

### Explicit legacy archive upgrade

If v2 is absent but v1 exists, the coordinator offers a separate upgrade review.
`dropbox-upgrade.ts` uses the existing bounded archive transport and snapshot codecs:

1. Validate/decrypt v1 and require a version-bound confirmation, including the notice
   that older clients will stop syncing.
2. Preserve the actual local v1 successful ancestor in the encrypted v2 base. This
   retains offline deletion history; current remote/local data is not a guessed base.
3. Add `/patternverse-sync-v1-backup-<source-revision>.json` and verify its encrypted
   original against a checksum. Never overwrite a different existing backup.
4. Replace the v1 entry using its revision with a non-secret upgrade marker referencing
   that backup. Old clients reject the marker as an unsupported format. An in-flight
   old-client upload against the earlier revision loses its CAS race.
5. Create v2 using strict `add`, decrypt/validate it, and recheck the marker. A competing
   v2 creation is verified rather than overwritten. **No local records change during
   upgrade**; the user invokes ordinary sync afterwards to review/merge modern fields.

There is no cross-file transaction: the verified backup is written before parking v1,
and v1 is parked before v2 creation. A lost response can leave an existing backup,
a resumable marker, or a complete v2 archive. Resume validates the marker's exact
allowed backup path, salt and checksum before decrypting; missing/tampered material
fails closed. All writes have explicit revision or add preconditions and
`strict_conflict: true`; no delete or unconditional overwrite operation is used.
Existing v2 successful history blocks an older-archive upgrade rather than guessing
that its missing modern fields mean deletion. A changed archive key must also unlock
the local v1 ancestor before the remembered device key can be replaced.

The backup remains original ciphertext, while the marker exposes only version,
paths, revision, salt and checksum. Rollback is not automatic: restoring v1 while v2
is still active would fork history. Any manual rollback must first coordinate all
devices and preserve/inspect current v2 work. Do not launch before real-account
upgrade/resume tests and a documented support/rollback procedure.

No live Dropbox account, public flag, OAuth scope, automatic sync schedule or
server-side token broker was changed. Real-account App Folder/permission behavior,
mobile Safari and installed-PWA OAuth remain to be verified separately.

API references: [official upload conflict semantics](https://dropbox.github.io/dropbox-sdk-js/global.html#FilesCommitInfo),
[official error handling](https://docs.dropboxapi.com/dropbox-api/docs/error-handling).

## Historical multi-file provider proposal

Dropbox is the first complete remote provider. Google Drive and GitHub are not part of the
initial implementation.

## Storage model

Use the Dropbox [App Folder permission model](https://developers.dropbox.com/oauth-guide#dropbox-api-permissions).
Patternverse owns a visible application folder
containing exactly one portable personal corpus. The adapter lists nested paths, downloads
exact bytes, uploads changed files, deletes removed files, and maps Dropbox revisions to the
common remote revision model.

The adapter will depend on a small `DropboxApiClient` boundary rather than exposing a large
SDK throughout the application. The current plan is to use the official
[`dropbox` JavaScript SDK](https://dropbox.github.io/dropbox-sdk-js/) behind that boundary,
pinning its version when the Dropbox milestone begins. No Dropbox type may enter the sync
domain or remote-store contract.

## Authentication decision to verify

Dropbox's [official OAuth guidance](https://developers.dropbox.com/oauth-guide) supports
authorization-code flow with PKCE for public browser clients, short-lived access tokens,
and refresh tokens when offline access is requested. A purely local flow is
technically possible, but persisting a refresh token in JavaScript-accessible browser
storage would increase the impact of persistent XSS.

Milestone 0 therefore recommends verifying a minimal token broker:

- exact redirect URI and PKCE/state validation;
- encrypted device-bound refresh credential outside JavaScript;
- secure HttpOnly same-site connection cookie;
- short-lived access token returned only to browser memory;
- direct browser-to-Dropbox corpus transfer;
- redacted diagnostics and explicit revocation/disconnect.

No Patternverse account, password, user profile, or corpus-content database is introduced.
Each additional device authorizes Dropbox independently.

## Questions for the vertical slice

- Confirm App Folder behavior after rename, deletion, and reauthorization.
- Confirm revision semantics for nested file updates and deletes.
- Confirm pagination and complete-listing guarantees.
- Confirm mobile Safari and installed-PWA redirect behavior.
- Decide whether the token broker uses encrypted stateless cookies or a minimal encrypted
  session store after reviewing token size, rotation, revocation, and hosting constraints.
- Confirm the least Dropbox scopes needed for App Folder file operations.

No production Dropbox application or credentials should be created before this review is
accepted.
