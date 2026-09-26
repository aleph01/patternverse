# Phone PWA review

This is a local review build. Do not publish it until an iPhone Safari and installed-PWA pass is complete.

## Available offline

- The static Patternverse library is cached by the versioned service worker.
- Personal library items remain editable in IndexedDB without a network connection.
- Mira's encrypted local sessions remain readable without a network connection.
- AI replies require an OpenRouter connection. Browser dictation depends on the speech service available to Safari; it is not promised offline.

## OpenRouter

The browser defaults to `openrouter/auto` and sends `provider.zdr: true`, `data_collection: deny`, and `allow_fallbacks: false` with every reply request. If no eligible route exists, the request fails closed. An OpenRouter API key is stored encrypted on the current device and is never included in Dropbox sync.

## Dropbox setup for review

Register one Dropbox app with **App Folder** access and only the file-content read/write and account-info scopes required by the current OAuth flow. Set `PUBLIC_DROPBOX_APP_KEY` in the web build environment. Register the exact callback URI for each review origin, e.g. `https://example.invalid/auth/dropbox/callback`. The app key is public; never put the Dropbox app secret in the PWA.

The current browser connection uses PKCE and a short-lived, session-scoped token. If the token expires or the PWA process loses its session, the user reconnects. A production rollout should either retain this deliberate reconnect behavior or add a separate token broker with refresh credentials outside browser JavaScript.

The first successful sync needs a strong phrase (minimum 12 characters). A second device uses the same phrase; each device remembers its derived, non-exportable key in its own IndexedDB. Personal library items and conversation contents are encrypted before upload. Dropbox sees one encrypted app-folder file, not the plaintext records. If the phrase is lost and all linked devices lose their saved keys, the remote data cannot be recovered. Sync is currently user-initiated via **Sync now**, and conflicting edits require an explicit local/remote choice. A deletion on one device propagates after the next successful sync.

## Device review checklist

1. Add the site to the iPhone Home Screen and open it standalone.
2. Open the library and Mira online once, turn off connectivity, then read a pattern, edit and save a personal library item, and reopen a saved Mira session.
3. Reconnect, add an OpenRouter key, and send a test message. Confirm text appears even when spoken reply is enabled.
4. Dictate a message, inspect the live transcript in the composer, stop, and confirm nothing was sent before tapping Send.
5. Link a Dropbox account on both devices, use the same sync phrase, and move a test pattern, concept, practice, verse, collection, and conversation in both directions.
6. Change the same pattern on both devices and verify conflict resolution never silently replaces either version.

No iPhone hardware or live Dropbox account was available to automated tests; these steps remain mandatory before publishing.
