# Conflict handling

The first version does not automatically line-merge Markdown or merge binary assets.

The sync domain distinguishes:

- both sides modified a base file differently;
- both sides independently created different content at the same path;
- this device deleted a file that Dropbox modified;
- this device modified a file that Dropbox deleted.

Every conflict remains in the plan until the user explicitly chooses:

- **Keep this device**
- **Keep cloud version**
- **Keep both** where two distinct surviving versions exist

Keep-both requires a new canonical path. For authored Markdown, later application code must
also generate or request a unique entity ID and validate affected links. For binary assets,
the UI must explain that Markdown references may need review.

Deletion conflicts have only one surviving file version, so keep-both is invalid and must
be rejected rather than silently treated as another choice.

Conflict decisions are transformed into a new immutable plan. Provider adapters and UI
components never implement merge rules themselves.
