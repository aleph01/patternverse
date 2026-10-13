# Sync security and privacy

## Sign-in-only controlled preview

The preview's explicit `VITE_DROPBOX_SIGN_IN_ONLY=true` switch opts into readable
Dropbox storage rather than phrase-encrypted remote archives. Dropbox and anyone
with access to that account can read synced workspace content, explicitly saved
responses and saved Mira conversations. This is disclosed before connection and
in the privacy notice. The snapshot allowlist still excludes device settings and
AI/OAuth credentials. No new permissions or server-side data storage are introduced.

Local recovery state retains device-key encryption, separate from the remote
archive and previous phrase-derived keys. Local disconnect removes authorization
but retains this recovery key/history; clearing website data removes both. An
unlocked browser or same-origin script can access local keys/data, as before.
Existing encrypted archives block this mode instead of being silently downgraded.
The remainder's phrase-encrypted behavior applies only to the older/default flow.

The automatic-sync implementation enables foreground sync by default after sign-in,
with an immediate device-only off switch in Workspace → Sync & backup. Connection copy and
the privacy notice disclose the change before authorization. Closed/hidden apps,
offline devices and missing/expired tokens do not start automatic attempts. Settings
and credentials remain excluded. Disabling cancels pending attempts but lets an
already-running operation finish safely. Conflict/recovery review pauses automatic
scheduling; it never chooses a version for the user. This implementation has not yet
been published to the preview or production site.

## Current PWA implementation (supersedes the proposal below)

- Mira settings/API keys and sessions use AES-GCM in IndexedDB. The device key lives in the
  same browser. Personal library records are not encrypted locally. An unlocked browser or
  malicious same-origin script can access local data; this is not an application login boundary.
- OpenRouter uses each user's own key; conversation context goes to OpenRouter and its routed
  provider with the zero-retention requirement. Local encryption does not make replies local.
- Dropbox receives an encrypted snapshot of all personal library items and saved Mira sessions.
  Settings, API keys and in-progress exercise runs are excluded. PBKDF2-SHA256 (600,000 iterations,
  random salt) derives an AES-GCM key from the sync phrase; each encryption uses a fresh IV.
  Dropbox sees metadata, timing and size, not plaintext content. Weak phrases permit offline
  guessing; use a strong unique phrase. There is no recovery-key service.
- OAuth uses PKCE/state and short-lived access tokens in sessionStorage, not a token broker.
  Tokens are accessible to same-origin scripts. No refresh token is stored. Reconnect on expiry.
- Callback query credentials are removed from browser history and bypass offline caching.
  The initial request can still appear in hosting logs; avoid retaining callback query strings.
- One browser workspace is atomically bound to one Dropbox account before sync or connection
  completion. Disconnect removes the token and sync key/base, but retains ownership and local
  data. Another person must use a separate browser profile. This prevents accidental uploads,
  not reading data on an unlocked shared profile.
- Migration adopts existing key/base account records and refuses ambiguous multiple accounts.
  Older versions that erased all account records on disconnect cannot have ownership inferred;
  verify the intended account before the first reconnect.
- Markdown is sanitized. Generated CSP hashes allow trusted bootstrap scripts without allowing
  arbitrary inline scripts. Styles and HTTPS source connections remain permitted for the UI
  and public-library functionality. Hosting headers disallow framing and MIME sniffing and
  suppress referrers while preserving microphone access.
- Build-time credential/file scanning is heuristic, not a complete audit. Review dependencies,
  intended public content and live headers separately. Revoke provider access in Dropbox's
  connected-app settings; local disconnect is not remote revocation.

## Historical target architecture — not a description of the current PWA

The sections below retain the earlier multi-file/token-broker proposal for architectural
context. Their memory-only tokens, broker and plaintext Dropbox assumptions do not apply to
the current browser implementation described above.

## Protected assets

- personal Markdown and assets;
- saved references, usefulness, and subscriptions;
- OAuth authorization codes, access tokens, and refresh credentials;
- provider account and folder identifiers;
- base snapshots and execution journals.

## Threats and controls

| Threat                              | Controls                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| XSS steals provider credentials     | strict CSP, sanitized Markdown, no raw HTML, access tokens in memory only, refresh credentials unavailable to JavaScript |
| OAuth CSRF or account mix-up        | PKCE, unpredictable state, exact redirects, provider binding, origin validation                                          |
| Tokens leak to URLs or logs         | never accept tokens in query strings; redact authorization, callbacks, and provider errors                               |
| Private corpus appears in telemetry | no body or asset logging, no sync-content analytics, filename minimization                                               |
| Stale device overwrites newer work  | content hashes, last-synced base, expected remote revision, replan on mismatch                                           |
| Partial listing appears as deletion | adapters return only complete snapshots; partial acquisition is an error                                                 |
| Interrupted multi-file write        | idempotent changes, execution journal, recovery and post-write validation                                                |
| Malicious public Source             | HTTPS, schema validation, size limits, safe rendering, non-executable assets, explicit Source identity                   |
| Compromised device                  | documented residual risk, disconnect/revoke flow, continued local use after disconnect                                   |

Patternverse does not promise end-to-end encryption. Dropbox can read data stored in the
user's Dropbox account, and an attacker controlling an unlocked device can read the local
workspace.

## Data flow

The preferred flow keeps corpus bytes between the browser and Dropbox. The authentication
service handles only OAuth credentials and short-lived token issuance. It must not proxy or
log corpus bodies unless a later documented provider limitation makes that unavoidable.

Disconnect removes local connection metadata and instructs the user how to revoke the app
at Dropbox. Local IndexedDB content remains usable.
