# Local widgets: first working release

Widgets are local, immutable packages interpreted by the existing Rust compiler and
practice runtime. A widget edits an output-shaped draft. Continue, Pause, Stop,
validation, typed bindings, and journal replay belong to the host.

## Try the complete workflow

1. Open **My Workspace → Widgets → Create widget**. Start with **Needs
   selector**, **Choice tags**, or **Blank reflection widget** in the full-page editor.
   The widget tab shows a card carousel; **View all widgets** opens a searchable full-page
   grid. Open any card to edit its draft or inspect its immutable released version.
2. Set the display name and purpose. **Code** edits the actual bundled HTML, CSS,
   JavaScript, contract JSON, and data. **Inputs & outputs** edits that same contract.
   Use its JSON editor for names, nested types, defaults, refinements, and fallback.
3. **Preview** takes plain JSON fixture inputs and an example prompt. Run or restart
   it to execute the authored files through the real bridge. Confirm example runs
   the same Rust output validation without saving participant answers. Try Narrow.
4. **Save draft** keeps editable work. **Save private version** validates and freezes
   the complete package. Change the version number before releasing changed bytes.
   Renaming the display name preserves package identity.
5. In a pattern's practice editor, use **Blocks → Add block before completion →
   Widget**. Choose an enabled release, prompt, input expressions, and result name.
   The block editor writes the ordinary Pattern Language import and call shown in
   **Source**; there is no separate block-only execution format.
6. Use a named output in a subsequent question or display, save the pattern, and
   choose **Run saved practice**. Select tags, then use the host's **Continue**.
   Editing selections alone never commits an answer.
7. Choose **Save to workspace** to retain confirmed answers and the executable
   checkpoint. **Practice history → Continue practice** restores its original source,
   widget bytes, contracts, inputs, and accepted answers. Unconfirmed drafts survive
   in-view pause/resume; they are not durable saved-run answers.

The insertion picker emits exact versions, for example:

```pattern
:language 1
:import "personal/needs-selector-your-id@0.1.0" as ui

selection = !widget ui.needs {
  :with max = 3
  Which needs feel unmet?
}

reflection = !ask {
  You selected {{selection.needs}}.
  What might help?
}
-> end
```

Replace the reference with the release shown in your widget's **Versions** tab.
The source editor also accepts major requests such as `@1`. The first successful
resolution of a source revision is stored locally; installing another version does
not change that source revision or an active/saved run. Select an exact new version
in source or insert the desired release to update a practice deliberately.

## Contracts and bridge

Packages contain an identity, versioned manifest, and relative-path text files.
Only widget and static data exports are supported. Contract types use the normal
Pattern type grammar: scalars, lists, choices, nested closed records, and
`Optional[T]`. Optional fields still require explicit values; absence is JSON null.
Numeric bounds/integer, text enums, list cardinality, catalogue membership, and
input-supplied maxima are checked independently in Rust. Unknown JSON contract
fields, duplicate keys, invalid defaults, and incompatible fallbacks are rejected.

Authored JavaScript uses only this host API:

```js
const api = await widget.ready();
const validation = await widget.setDraft({ note: "A reflection", energy: 7 });
```

`api` contains frozen plain inputs, the prompt, presentation metadata, the last
draft, and appearance preferences. `setDraft` replaces the entire output record and
returns `{valid, errors}`. The generic reflection template demonstrates a record
with independent text and number outputs; the runner contains no needs-specific
logic. There is no completion or practice execution API.

## Needs package

The template materializes the canonical `content/assets/libraries/needs.json` into
a choices export and a separate validated presentation sidecar. It retains source
attribution. Eight broad areas have expandable chevrons; 22 subgroup headings have
always-visible contents whenever their area is expanded. Simple offers the approved
24 starting choices, Detailed all 68. Search, changing categories, and changing
views preserve selections, including those hidden by the shortlist. The full
catalogue determines valid answers in both views.

The trusted **Use a plain checklist** adapter uses the frozen full catalogue and
the same Rust output validator. It retains draft selections, rejects duplicates or
unknown IDs, applies the same minimum/maximum, and reconstructs authoritative labels
in catalogue order. A disabled or unavailable custom widget without a declared
compatible fallback remains pending rather than manufacturing an answer.

Sidecar schema: `groups` (`id`, `label`, optional `parent_ids`), `memberships`
(choice ID → group IDs), optional `items` (choice ID → `description`, `aliases`,
`recognition_cues`), `starterIdsByArea`, and `attribution`. Validation rejects
unknown choices/groups, duplicate IDs/edges, cycles, and starters outside their
area. Metadata does not change the semantic choices type.

## Isolation and persistence

Author bytes execute only in an opaque-origin, script-only sandbox inside a trusted
intermediary document. The intermediary's frame policy constrains child navigation;
the child's policy blocks remote scripts, connections, images other than data URLs,
frames, forms, and base URLs. The bootstrap disables WebRTC connection constructors.
Author code cannot access application DOM, origin storage, native credentials, or
the practice controller. A private MessagePort is transferred once per mount;
source checks, increasing sequence IDs, validation revisions, and port cleanup
reject spoofed and obsolete updates. Continue freezes a copy of the latest validated
draft. Native acceptance validates again against the pending frozen interaction.

Limits: 1 MiB/package, 64 text assets, 32 exports, 32 inputs/outputs per widget,
128 KiB/draft message, 64 outstanding SDK requests, 60 inbound messages/second,
5-second startup deadline, and a 120–1600 px frame height. Local asset references
are bundled from package bytes; imports never fetch or install code. Complex module
imports need an author-supplied bundle. HTML document wrappers are normalized; put
layout classes on a root content element. Asset preparation uses inert template
contents so even authored markup cannot fetch resources in the application origin. A browser iframe has no reliable hard CPU or
memory termination boundary; resource-exhausting scripts remain a platform limitation.

Workspace IndexedDB stores drafts, immutable releases, dependency locks, and local
render enablement separately. Removal disables rendering and removes the draft;
released bytes remain for existing practices and history. Package JSON export/import
preserves exact identity and bytes. Imports begin disabled. Workspace backup,
recovery backup, and workspace sync include widget code, releases, and locks.
Render grants are device-local and are cleared on restore; restored/imported code
requires explicit enablement. Historical accepted receipts replay without running
historical interface JavaScript.

`practice-widget-host.htm` is a dedicated static document with its own restrictive
policy. The `.htm` extension also keeps it outside Tauri's `.html` application CSP
rewriting. The desktop application permits same-origin frames; its native IPC
initialization remains restricted to the main frame. Desktop packaging and native
WebView behavior still need a packaged-app release check.

## Scope

This release supports private/local packages, the shipped
`commons/needs-selector@0.1.0` used by **Identify Needs**, and standalone widget steps.
The shipped selector needs no installation; its full bytes must match the bundled
release to render without a local grant. See [Needs library](../needs/README.md).
Public
registry, publisher verification, publishing, remote capabilities, widgets within
atomic forms, custom validation scripts, and durable unconfirmed drafts remain
outside this release. The existing architecture is extended through package
validation, source inspection, shared host transport, the practice controller,
workspace persistence, and source-generating block insertion.

Validation lives in `crates/pattern-core/tests/widgets.rs`, workspace persistence
and backup tests, browser-engine integration tests in `src/lib/widgets`, and
`apps/web/tests/widgets.spec.ts` for the complete UI workflow and fallback/isolation.
