# Patternverse desktop

The macOS app hosts the same Patternverse interface as the website. In **mira**, replies run through
an app-owned local model; the desktop app does not fall back to OpenRouter. Model setup is in mira's
Settings. Downloading a model is optional until you want to chat. Dictation uses the bundled local
Whisper runtime and places its transcript in the draft composer for review before sending.

## Development

Requires the repository's Node/pnpm versions, current stable Rust, and macOS build tools.

```sh
pnpm install
pnpm --filter @patternverse/desktop desktop:dev
```

To package the app:

```sh
pnpm --filter @patternverse/desktop desktop:build
```

The first run prepares pinned Ollama and Whisper sidecars. The sidecar files are local build inputs,
not committed to the repository. Packaging may take substantial disk space. Browser mira remains
separate and uses the participant's own OpenRouter key with zero-data-retention routing; it never
probes the desktop runtime.

Conversation storage is private to each app installation. Browser conversations are **not**
silently moved into the desktop app. Use Settings → export/import archive if you want to transfer
them, and keep the archive passphrase safe. The desktop app shares its pattern library interface
with the website, but its local personal workspace is likewise app-specific.
