# ADR 0004: Portable corpus and private preferences

**Status:** accepted

Remote storage uses the same Markdown-and-assets corpus as export/import. Saved references,
usefulness, and Source subscriptions may sync in `.patternverse/preferences.json`; they do
not become public Markdown metadata. Ephemeral responses and analytics are excluded.
