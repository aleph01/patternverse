# patternverse.org launch gate

## First public release switches

The production web build defaults to `core`: chat, saved sessions, library browsing/editing,
therapy approach selection, simple OpenRouter model choices, and standalone patterns that do not
need AI remain available. AI-guided therapy patterns, voice tools, advanced model selection and
Dropbox sync are hidden. Non-therapy AI-assisted patterns remain available with a user-supplied
OpenRouter key and an explanation of why the model is used.
The desktop app and local development keep their full interface. No local data is deleted.

Build with `VITE_RELEASE_PROFILE=full` to restore all four features, or set individual
`VITE_FEATURE_VOICE`, `VITE_FEATURE_GUIDED_EXERCISES`, `VITE_FEATURE_ADVANCED_MODELS`, or
`VITE_FEATURE_DROPBOX_SYNC` to `true` or `false`. These are public build settings, not secrets.
Changing a switch requires a new web build and deployment; hiding a feature is not an
authorization boundary. Full regression browser tests deliberately build the full profile.

With Dropbox hidden, transfer between the old Pages origin and patternverse.org is unavailable
in the first public release. Keep the old origin accessible and do not clear its site data.
Mira sessions can use the encrypted archive in Sessions, but that does not include personal
library items. Enable Dropbox sync later or provide a library export/import before retiring
the old origin.

Do not switch DNS or redirect the existing app until the checks below are complete.
The existing design and desktop downloads are outside this security-preparation change.

## Automated checks

- Web unit tests, type checks, production build and public-build credential/file scan.
- Production browser tests for OAuth URL cleanup, no callback caching, CSP enforcement and
  the existing offline library/session workflow. Test on real iOS before broad launch.
- Dependency advisory review, followed by remediation or explicit assessment of findings.

### Preparation results (2026-09-29)

- Web unit suite: 84 tests passed; public-build scanner: 2 tests passed.
- Type checking and focused lint passed. Production build and credential/file scan passed.
- Security/offline browser suite: 12 checks passed across desktop and mobile Chromium.
- Production dependency audit: no known vulnerabilities after Tiptap 3.30.5 and devalue 5.9.4
  updates. This is advisory-database coverage, not proof of absence of vulnerabilities.
- Broader workspace regression: the combined search/filter test times out looking for
  “Only mine” on the homepage. The current homepage explicitly hides controls, which are
  on `/library`; reconcile this existing workflow/test mismatch before a full green release.
- Real Dropbox account authorization, iPhone Safari and deployed headers are still unverified.

### Release profile validation (2026-09-30)

- Web unit suite: 87 tests passed; type checks and focused lint passed.
- Public core build: 8 browser checks passed across desktop and phone Chromium, including
  direct exercise and OAuth callback routes, editing, chat and hidden controls.
- Full feature build: 11 focused browser checks passed for Mira, voice, practices and callback
  behavior. The final local build output was returned to the public core profile.

## External/manual gates (not satisfied by unit tests)

- Review intended public corpus/build output for personal content; secret detection is heuristic.
- Verify Dropbox App Folder scopes, additional users/production status, exact callback URLs.
- Test actual authorization and encrypted round trips for two accounts using separate profiles;
  confirm switching accounts in the same profile is refused and preserves local data.
- Test interrupted sync recovery and backups. Local apply currently spans two databases and
  is not atomic; do not claim full transactional recovery.
- Review OpenRouter routing, key entry, budget/privacy disclosures and error/log redaction.
- Confirm public privacy/support information, including what voice recognition may send to
  platform providers. This preparation does not certify legal compliance.
- After preview deployment, inspect actual HTTP security headers and CSP in a browser.
- Confirm DNS ownership/canonical host; preserve unrelated mail/DNS records.

## Existing-user migration

Browser storage belongs to an origin: pages.dev, localhost, www and the apex do not share it.
Keep the old Pages app accessible during migration; do not immediately redirect it.

1. On the old app, connect the intended Dropbox account, retain a strong sync phrase and
   complete sync. Verify completion before leaving.
2. Open the new domain, authorize the same Dropbox account, enter the same sync phrase and
   sync. Check library items and conversation titles/content.
3. Re-enter the OpenRouter API key and personal settings. These are deliberately not synced.
   In-progress exercise run state is also not synced.
4. Keep the old site data until the result has been checked. Do not clear it merely to resolve
   account ownership errors. Users unable to use Dropbox need a tested export/import path
   before retiring the old origin.

## Publication boundary

Publish only the reviewed `apps/web/build` directory, never the repository or environment files.
The only current public environment setting is `PUBLIC_DROPBOX_APP_KEY` (an identifier, not a
secret). Do not embed a shared paid OpenRouter key. Users supply their own key.
