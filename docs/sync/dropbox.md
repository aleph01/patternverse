# Dropbox provider plan

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
