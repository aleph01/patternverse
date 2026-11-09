# Article contributions

The article reader opens an in-context contribution dialog. A floating bottom-center pill selects
text edits or comment pins. Contributors can attach comments to a section, a selected passage, or
the article as a whole, collect multiple comments, and review everything before one submission.
The `/contribute` page also lets contributors explicitly select a personal article, preview its
text and attribution, and submit a copy for possible addition to Commons. Sharing requires an
explicit permission checkbox. Only the selected article's title, type, text, summary and attribution,
an optional explanation and optional contact details enter this request. Linked articles, workspace
metadata and practice answers are never collected. Personal article edits do not change a submitted copy.

New article suggestions use the same bounded, rate-limited endpoint and private review inbox as
published-article feedback. They appear as **New article suggestion**, with a **Suggested article**
view containing the full escaped Markdown text, attribution and explanation. Approval, rejection,
notes, history and downloads work as for other contributions; approval never publishes an article.
No database migration is needed. New suggestions do not have published verse or collection membership,
so they appear when those filters are cleared.

The browser retains the selected suggestion copy and request UUID for retries, excluding contact
details. Reloading restores that copy and asks for sharing permission again. Unavailable or failed
submissions keep the draft, and identical retries return the same receipt. Changed suggestion content
with an already accepted request UUID is rejected. The website and Worker must both include this
contract before enabling the new path; the existing `SUBMISSIONS_ENABLED` switch still governs it.

The browser keeps drafts locally, excluding the optional name and reply email. Each draft retains
its request UUID and original article revision. A retry with the same article, edits and comments returns the same
receipt instead of inserting a second submission; changing a previously accepted request is refused.
Optional contact fields are excluded from the retry fingerprint, so recovery after a reload still
recognizes accepted content without storing reply details in the browser.
Failed or unavailable submissions retain the draft. A saved draft based on an older article stays
reviewable and submittable, but cannot silently apply edits to the newer article.

## Owner review

`/owner/contributions` provides an inbox with search, status and label filters, pagination, complete
comment context, edit diffs, submission downloads, review notes, and an audit history. The existing
Cloudflare Access application protecting `/owner/*` covers this route. The Worker also independently
verifies the JWT signature, issuer, audience, expiry, and exact owner email using the same verifier
as the statistics service. An email header alone never grants access. All owner responses are
private and `no-store`; no submissions are included in the public website or manifest.

Approval means editorial acceptance, **not publication**. This version intentionally leaves applying
accepted wording to the Markdown corpus and publishing it in the existing release workflow. Text
suggestions preserve original and proposed wording without rewriting Markdown links, figures, or
executable practices. The board flags a revision mismatch before editorial use. Rebuild the service
manifest alongside each public content release so that comparison remains current.

## Review inbox

The owner inbox uses a queue on the left and the selected submission on the right. Text edits,
comments (including all attached passages), original context, and review activity have separate
views. The layout stacks on smaller screens; selecting a submission jumps to its review.

Verse and collection filters use a separate catalog generated from the published corpus. Selecting
a verse narrows the available collections. Search, labels, status counts, sort order and pagination
share the same filter scope. This metadata is not added to contributor payloads or retry fingerprints.

Approve, reject, mark in review, and private notes persist in D1 with optimistic version checks.
A quick decision preserves existing labels and notes. Undo restores the preceding recorded review
state and refuses stale requests. Conflicting saves retain the unsaved note for copying before reload.
HTML owner pages use a same-origin referrer policy so browser forms retain a valid Origin while
private review URLs are withheld from other sites. Owner authorization and no-store headers apply
to every inbox, detail, export and update request.

### Local admin preview

The isolated browser preview runs the actual review code with a disposable sample D1 database.
Its test-only entry injects the test authorizer; production always uses `src/worker.ts` and verifies
Cloudflare Access. Do not use the preview entry or configuration for deployment.

```sh
pnpm --filter @patternverse/article-contributions build
pnpm exec wrangler dev --config apps/article-contributions/test/preview.wrangler.jsonc --ip 127.0.0.1 --port 8793 --persist-to /private/tmp/pv-review-preview-state
pnpm --filter @patternverse/web exec playwright test --config playwright.review.config.ts
```

With the local website running on port 4199, open `/owner/contributions`. The preview is clearly
marked as sample data and public submissions stay disabled. The preview database is separate
from the normal local contribution database. Browser checks reset only this disposable database.

## Activate production

This implementation does not deploy anything. `SUBMISSIONS_ENABLED=false` keeps acceptance off;
the website can still collect and export drafts. Enable only after all of the following are ready:

1. Provision a **separate** `patternverse-contributions` D1 database and record its ID in
   `wrangler.jsonc`, or use Wrangler’s resource provisioning during the approved deployment.
   Do not use the statistics database for message content.
2. Apply `migrations/0001_contributions.sql` to that database.
3. Verify that the existing owner Access application covers `/owner/contributions*` on both
   public hostnames and keep the declared Access audience, team domain and owner mailbox aligned.
4. Deploy this Worker with its more-specific API and owner routes, deploy the website, and test a
   real anonymous contribution and owner review. The owner statistics Worker retains its own routes.
5. Set `SUBMISSIONS_ENABLED=true` once the storage and private review routes are verified.

The build manifest contains only published Commons article identifiers, titles, paths and SHA-256
body revisions. Public requests are bounded while streaming, validated before insertion, restricted
to configured origins, and rate limited. Names, emails, messages, provider errors and connection
addresses are not logged. No emails are sent to contributors or the owner.

## Local checks

```sh
pnpm --filter @patternverse/article-contributions build
pnpm --filter @patternverse/article-contributions check
pnpm --filter @patternverse/article-contributions test
pnpm --filter @patternverse/web check
pnpm --filter @patternverse/web exec vitest run src/lib/contributions
```

`pnpm --filter @patternverse/article-contributions dev` uses port 8793. Vite proxies the contribution
API and review routes there. To exercise local persistence, apply the migration locally and run the
Worker with `SUBMISSIONS_ENABLED=true` and `ALLOWED_ORIGINS` including the local Vite origin and
the proxy endpoint. Wrangler rewrites local requests to the route hostname with HTTP, so also
include `http://patternverse.org` locally; `.dev.vars.example` contains the checked origins. Owner
authorization still requires a valid Access JWT; local tests inject an authorizer explicitly, never
through a production environment variable or bypass route.

The currently installed local runtime supports compatibility dates through `2026-10-08`. When
using that runtime, append `--compatibility-date 2026-10-08` to a direct `wrangler dev` invocation;
keep the production configuration date unchanged.

```sh
pnpm exec wrangler d1 migrations apply patternverse-contributions --local --config apps/article-contributions/wrangler.jsonc
WRANGLER_LOG_PATH=/tmp/pv-contributions.log pnpm exec wrangler types --config apps/article-contributions/wrangler.jsonc apps/article-contributions/worker-configuration.d.ts --strict-vars=false
```

Local runtime tests verify actual D1 persistence, duplicate retries, stale revisions, private owner
access, escaped user content, filtering, atomic review history, and conflicting review forms. Browser
tests stub only the HTTP service to verify the real article UI, including failure recovery.
