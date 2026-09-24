# Pinned local imports

In an editable Pattern, open **Import a saved pattern**, choose a library entry,
give it a local name, and select **Insert pinned import**. This inserts a declaration:

```pattern
:import "artifact-id@m4-v1:<64 lowercase hexadecimal characters>" as helper
```

The placeholder above is explanatory, not a runnable pin. The picker supplies the
actual artifact identity and content-derived compiled revision of its last valid
saved version. A title or ordinal version number is not a unique pin.

Call the imported Pattern using ordinary composition:

```pattern
!use helper as result {
    :with situation = situation
}
```

Input names/types must match the imported interface exactly. Only its declared
outputs appear on `result`. Importing a Pattern does not execute it. Declarations
precede statements; aliases are unique dot-separated identifiers. Even unused
imports must resolve and match their pins.

## Resolution and portability

Saving or inspecting a draft resolves an exact saved local revision and copies its
source closure into the draft bundle. It never reads another Pattern's unsaved
draft, selects a newer revision, downloads code, or executes a path/URL. Snapshot
compilation checks the content pin, all inputs/outputs, dependency cycles and the
existing graph/resource limits.

A bundle carrying an already-matching imported closure is portable without its
original catalog entry. The artifact ID identifies the original lineage; the
compiled content hash verifies the source and dependencies, not publisher identity
or trust. This is not a remote package registry or a hostile-code security boundary.

Existing explicit bundled `!use` dependencies remain supported. An imported root
is assigned its alias; transitive names are preserved. Conflicting transitive
names are rejected rather than overwritten. For Phase 1, resolve such conflicts
by choosing distinct source names/a fresh document; automatic namespace rewriting
and dependency-update tooling are not included.

Missing/mismatched pins keep a draft invalid while preserving its last valid
revision. Existing Runs and previews keep their original executable snapshots.
An invalid draft is never silently executed using a newer dependency. The editor
continues to label previews as using the last valid saved version.
