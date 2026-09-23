# Sync security and privacy

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
