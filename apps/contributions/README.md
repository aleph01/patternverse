# Contribution form delivery

The public `/contribute` page keeps a direct email link and offers a form. This Worker
handles `/api/contribute` on the same domain; the static Pages application does not
need a server adapter. Messages always go to `contact@patternverse.org`, with the
visitor's address in Reply-To. There are no confirmation emails to visitors and no
submissions database. Message bodies and addresses are not logged by the Worker.

## Activate delivery

Delivery defaults to **off**. The form checks `/api/contribute/status` and clearly
offers the email link while unavailable. Do not enable it until the mailbox and
sender are verified. Confirm real inbox delivery before announcing it as live.

1. In the Cloudflare account, verify `contact@patternverse.org` as an Email Routing
   destination. This requires following a verification link in that inbox.
2. Configure Email Service for the sender domain before using
   `contributions@patternverse.org`. Preserve the existing Squarespace/Mailgun
   forwarding and DNS records. Do not change the domain's MX records merely to
   add this outbound form. See Cloudflare's
   [sending setup](https://developers.cloudflare.com/email-service/get-started/send-emails/)
   and [send binding restrictions](https://developers.cloudflare.com/email-service/configuration/send-bindings/).
3. Review `wrangler.jsonc`, set `ENABLED` to `"true"` when ready, and deploy this
   Worker after the normal release approval. Deploy the website changes separately.
   The configured routes cover both public site origins and the destination binding
   restricts delivery to the contact inbox.
4. Send a real contribution through the deployed page and confirm it reaches the
   inbox and that Reply targets the visitor. Local tests use a mocked email binding;
   they do not establish real mailbox delivery.

## Local development and checks

```sh
pnpm --filter @patternverse/contributions check
pnpm --filter @patternverse/contributions test
pnpm --filter @patternverse/contributions dev
pnpm --filter @patternverse/web dev --host 127.0.0.1 --port 4196
```

The web dev server proxies `/api/contribute` to port 8792. To inspect the disabled
status locally, allow that local origin without changing production configuration:

```sh
pnpm exec wrangler dev --config apps/contributions/wrangler.jsonc --port 8792 \
  --var ALLOWED_ORIGINS:http://127.0.0.1:4196 --compatibility-date 2026-10-08
```

Local simulation does not send real email. Leave `ENABLED=false` for the normal
preview; a locally simulated send must never be mistaken for inbox delivery.
The browser form retains its draft on failure, rejects invalid input, and only
confirms success after the backend reports acceptance. The backend applies a
streamed body limit, field limits, allowed-origin checks, a honeypot, and a rate limit.

Regenerate bindings when changing Wrangler configuration:

```sh
WRANGLER_LOG_PATH=/tmp/patternverse-contributions-wrangler.log \
  pnpm exec wrangler types --config apps/contributions/wrangler.jsonc \
  apps/contributions/worker-configuration.d.ts --strict-vars=false
```
