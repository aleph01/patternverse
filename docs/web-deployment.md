# Automatic website updates

Once configured, every push to `main` runs the existing CI checks, then publishes
the website to Cloudflare Pages. Pull requests never publish to production. You
can also run the CI workflow manually from GitHub Actions on `main`.

This does not watch local file saves or automatically commit/push your work.
Publish-ready updates must first be pushed to `main`. Failed checks leave the
live website unchanged. Desktop DMG updates are separate from website publishing.

## One-time setup

1. Put this repository on GitHub with a `main` branch and GitHub Actions enabled.
   Include the workflow, deployment script, package manifest, and lockfile.
2. Create a **Cloudflare Pages Direct Upload** project named `patternverse`, with
   `main` as its production branch. From the repository root, you can use:

   ```sh
   pnpm exec wrangler login
   pnpm exec wrangler pages project create patternverse --production-branch main
   ```

   If the project already exists, do not recreate it. If its name differs, set the
   GitHub Actions variable `CLOUDFLARE_PAGES_PROJECT` to that name. Confirm its
   production branch is `main`.

3. In Cloudflare, create an API token with **Account → Cloudflare Pages → Edit**,
   restricted to the account hosting this project. Copy that account's account ID.
4. In GitHub repository **Settings → Secrets and variables → Actions**, add secrets
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Never put the token in source
   files or paste it into chat. The workflow uses the `production` environment;
   configure any approval rules there if you want a human approval before release.
5. Make the initial deployment, then open the Pages project's **Custom domains**
   and add `patternverse.org` (and `www.patternverse.org` if desired). For the root
   domain, activate the domain's Cloudflare zone by replacing its nameservers at
   the registrar with the exact pair assigned by Cloudflare. Preserve existing
   email and other DNS records when moving DNS. This is a one-time connection;
   future deployments use the same domain automatically.

Cloudflare's [CI deployment guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
and [custom domain guide](https://developers.cloudflare.com/pages/configuration/custom-domains/)
describe these account settings.

## Local commands

```sh
# Build and scan public files without uploading anything:
pnpm deploy:web --build-only

# Explicitly publish current local source after Wrangler login:
pnpm deploy:web
```

The publishing script validates content, excludes drafts, builds the production
site, checks the output for private files/recognizable credentials, and uploads
only `apps/web/build`. It stops on any failure. Cloudflare publishing credentials
are removed from the build environment and supplied only to the upload command.

The manual publish command deploys the current local source, including uncommitted
changes; use it only when those changes are ready to be public. Routine releases
should use the checked GitHub workflow. Until the project and credentials are
configured, the workflow cannot publish. Nothing is deployed by adding these files.
