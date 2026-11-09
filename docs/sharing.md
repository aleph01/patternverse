# Sharing and website embeds

Published Commons pattern pages have a **Share** button beside the library control.
The compact dialog offers **Copy link**, **Embed card**, and, when supported,
**Embed practice**. All embeds use the default light appearance. There is no theme
selector or appearance parameter.

Links and copied iframe URLs point to `https://patternverse.org`; collection filters,
personal history IDs, fragment positions and practice answers are not copied.
Previews use the current site, so local development can preview unpublished code.
Clipboard denial leaves selectable text and a manual-copy message.

The public, prerendered endpoints are:

- `/embed/card/pattern/<pattern-id>`: title, authored summary, verse category,
  authored use-case context where available, article link and practice action.
- `/embed/practice/pattern/<pattern-id>`: an exercise authored inside a pattern.
- `/embed/practice/practice/<practice-id>`: a separate practice record.

A practice embed opens on a welcome screen. **Start practice** mounts the existing
website runner and shared Rust runtime. When a pattern has several embeddable
practices, the share panel includes a chooser. Rust inspection excludes invalid
definitions, required external inputs, dependencies, AI and unsupported interaction
kinds, including those in nested scopes. Drafts and private records have no embed.

Embedded execution is ephemeral: no workspace save controls, history restoration,
Dropbox sync, stored text preferences or AI provider access. History query parameters
are ignored; no answers or checkpoints are sent to the containing website. Closing
or reloading the frame discards answers. The host supplies only an iframe, with
scrolling for longer content; no host script or resize-message protocol is needed.

Only the two new public embed namespaces remove framing restrictions. Other pages
and the legacy prototype retain the website's existing framing policy. The generated
page CSP continues to restrict scripts, connections and other resources. See
[Cloudflare's header removal rules](https://developers.cloudflare.com/pages/configuration/headers/#detach-a-header).

Validation: `pnpm --filter @patternverse/web exec vitest run src/lib/server/pattern-share.test.ts`
and `pnpm --filter @patternverse/web exec playwright test --config playwright.sharing.config.ts`.
