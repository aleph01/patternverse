# ADR 0005: No automatic line merge

**Status:** accepted

The first sync engine reports divergent file changes as explicit conflicts. It does not
attempt line-level Markdown or binary merging. The user chooses this device, cloud, or both
where two surviving versions exist.
