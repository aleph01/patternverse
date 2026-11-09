# Widgets in practices: authoring and Settings design

Implementation update: the first local-widget workflow is implemented; see
[Local widgets](local-widgets.md) for usage, validation, and current limits. Public
registry and remote capabilities remain proposed.

Status: local workflow implemented; broader product design retained · 2026-11-02.

This document makes the [widget system specification](widget-system-spec.md)
concrete for authors. It covers Settings management, code authoring, inserting a
widget into a practice, and the first needs-selector integration. The in-conversation mockups remain visual references; the local implementation
uses authored packages and the real widget bridge.

## The model

A widget is a reusable interface for one practice interaction. A practice supplies
inputs and receives a typed record of outputs after the participant confirms.
Widget code can update a draft; the shared practice runtime owns validation,
confirmation, progression, and saved answers.

Keep four things separate:

| Part       | Purpose                                                                    | Needs-selector example                              |
| ---------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| Definition | Name, description, stable identity, input/output contract, fallback.       | Needs selector, returning a list of selected needs. |
| Interface  | HTML, CSS, JavaScript, and bundled assets.                                 | Expandable areas and selectable tags.               |
| Data       | Versioned data supplied with the package or explicitly passed into a call. | The 68-need hierarchy and 24 starting options.      |
| Instance   | A call at one place in a practice, with its own prompt and inputs.         | “Which needs feel unmet in this situation?”         |

The same definition can serve many practices. Renaming it changes its display
name, not its stable identity or practice references. Changing its executable code,
data, or contract creates a new immutable version. Display aliases in a personal
library are stored separately from immutable release metadata.

## Settings → Widgets

Add a visible **Widgets** section to the existing workspace Settings. Users should
not need to understand extension packages to find it. Internally, widgets are
exports of the versioned packages already described in the specification.

The manager has **My widgets** and **Installed** views:

- **My widgets:** editable personal definitions and drafts, including copies of
  installed widgets. Show name, description, latest private version or draft
  status, enablement, and practices using released versions.
- **Installed:** inspectable installed packages and their widget exports. Show
  publisher, exact version, compatibility, enablement, and usage. Editing another
  publisher's code begins with **Duplicate to my widgets**.

Primary actions are **Create widget** and **Import package**. Import is an explicit
local package import in the first release. A public registry is a later feature.
Creating offers **Blank widget**, **Needs selector**, and **Choice tags** templates.
Templates produce ordinary editable files and contracts.

Per-widget actions are **Open**, **Rename**, **Duplicate**, **Enable/disable**,
**Export package**, and **Remove**. Package-wide removal or disabling identifies
all affected exports and dependent practices. A usage view distinguishes current
practice definitions from pinned historical runs. Historical answers survive
removal. If a current step needs a disabled widget, offer a compatible fallback
or explain that the interaction is unavailable.

Avoid one global Save button for widget management. Every widget owns its draft
and release actions; ordinary workspace preferences retain their existing Save.

## The widget editor

The editor opens from a manager row and has five tabs:

| Tab              | Editable content or behavior                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Overview         | Display name, purpose, enablement, defaults, identity, usage, and source attribution.                        |
| Code             | HTML, CSS, JavaScript, bundled data, and other local assets.                                                 |
| Inputs & outputs | Named fields, types, defaults, bounds, selection membership, and fallback.                                   |
| Preview          | Example inputs and prompt, the isolated interface, current draft output, validation, and simulated Continue. |
| Versions         | Immutable releases, changes, compatibility, and explicit practice-update actions.                            |

### Overview and identity

Name and purpose are ordinary text fields. A read-only identity is available under
Details. New personal widgets get a stable local identity and an author-chosen
package/export name. Changing a released package identifier creates a new widget;
it is not a rename. Duplicate creates a new identity with its own history.

Presentation defaults belong here, such as an initial Simple or Detailed view.
Defaults that affect a call are resolved and frozen when the interaction opens.
A participant can change presentation locally without silently changing the
practice's allowed answers or confirmed selection.

### Code

Use a file navigator and an editable source pane. The basic files are
`widget.html`, `widget.css`, `widget.js`, `widget.json`, and any bundled data.
A single-document HTML import may retain inline styles and scripts. No build step
is required for plain HTML/CSS/JavaScript. Framework-generated widgets must be
bundled before import; first-release Settings is not a package manager or build
service.

Authors can paste code, add or rename files, and edit data. Asset paths stay inside
the package. Imported HTML uses its own isolated document. Code is not executed
while typing, saving a draft, browsing files, or checking contracts.

### Inputs & outputs

Provide a field editor with an equivalent JSON view. Both edit the same contract;
there is no separately stored visual contract. Validate changes before replacing
the last valid definition. An unfinished JSON edit can remain a draft with errors.

Examples of generic outputs are `{value: text}`, `{items: list[choice]}`, or a
structured reflection record. The needs selector uses `{needs: list[choice]}` with
membership constrained to the supplied options. It is one example, not a special
language operation.

Keep package validation declarative. Custom JavaScript cannot define trusted
validation rules. A fallback is a named host adapter whose output and confirmation
behavior match the contract.

### Preview

Preview opens only after **Run preview**. It uses the same package verifier,
bridge, contract checks, and isolated renderer as real practice calls, but fixture
values and simulated confirmation remain separate from real practice runs.

Show fixture inputs, a prompt, and the current output draft. Changing the fixture
or source requires an explicit restart, preserving the distinction between the
running preview and the current editor draft. Surface code/runtime errors and
contract errors without hiding Stop preview or the editor.

**Continue** in preview confirms a sample answer locally for inspection. It never
writes a real practice receipt. A disabled/failed preview can exercise the trusted
fallback. Provide narrow and wide preview widths and normal light/dark behavior.

### Drafts and releases

**Save draft** preserves unfinished work. **Save private version** checks the
whole package and creates an immutable release plus an import reference. It does
not publish publicly or update practices. A previously saved release stays usable
while its next draft is being edited.

For release validation, verify identity and paths, contract/default consistency,
asset and data references, declared host API compatibility, and supported fallback
compatibility. Preview testing provides additional evidence but cannot establish
correct behavior for every input of arbitrary JavaScript.

A practice chooses a released version. Updating it is explicit and creates a new
practice revision after checking compatibility. An active or saved run keeps its
pinned package, data, and output contract.

## Insert a widget into a practice

Add **Widget** to the practice block editor's Add block menu:

1. Choose an enabled, compatible, released widget.
2. Enter the prompt that belongs to this practice step.
3. Map inputs to defaults, literal values, or earlier typed practice bindings.
4. Name the result, for example `selection`, and inspect its named outputs.
5. Preview the step, then apply the validated source change.

The editor generates ordinary Pattern Language source and its import dependency;
blocks remain a projection of the single source representation. Picker labels are
friendly names; saved references use stable identities and exact revisions.
Do not save JavaScript inside the practice document.

Illustrative proposed source for a personal release:

```pattern
:language 1
:import "personal/needs-selector@0.1.0" as needs_ui
:output selected_needs

selection = !widget needs_ui.needs {
    :with initial_view = "simple"

    Which needs feel unmet in this situation?
}

selected_needs: list[choice] = selection.needs
!show {
You selected: {{selected_needs}}
}
-> end
```

The example depends on the proposed package resolver and widget interaction; it
is not supported source today. `initial_view` is a declared text input of this
widget with the declarative refinement `enum: ["simple", "detailed"]`.
An unsupported value produces a widget setup diagnostic; it must not
alter output validation. Public package references use the same import model.

The first release supports a widget as its own practice step. Including widgets
inside an atomic `!form` needs additional shared-draft and confirmation semantics
and is deferred. Widgets do not call each other or manage practice navigation.

## Bridge and run lifecycle

The existing proposal's narrow interface remains sufficient:

```js
const api = await widget.ready();
// api.inputs, api.presentation, api.prompt, api.draft, appearance preferences

const result = await widget.setDraft({ needs: selectedChoices });
// result.valid and result.errors report host validation; Continue belongs to host.
```

The host mounts the exact verified package with frozen inputs for one pending
effect. The interface edits an output-shaped draft. Continue freezes and checks
that draft, the Rust runtime checks it independently, and accepted outputs become
an immutable practice binding. Earlier answers remain intact after validation or
rendering failure. Late writes from a prior mount cannot affect another step.

Keep Continue, Pause, End, and recovery outside the authored document. Package
code receives only explicit inputs and the current draft. Use an isolated opaque
origin with a host-controlled content policy and a per-mount validated message
channel. The initial package format accepts no external capabilities; no remote
scripts or network access are needed for local widgets.

A confirmed answer can appear later in the practice and in saved history under
the existing save opt-in. Runtime replay validates accepted outputs without
executing historical interface code. Authoring files, preview fixtures, interface
drafts, and real participant answers have separate ownership and storage.

## The needs selector as the first integration

Use [the current library](../../content/assets/libraries/needs.json) and its
[editorial notes](../needs/README.md) as the source: 68 selectable needs, 8 areas,
22 subgroups. Selectable IDs come only from `kind: need` records.

Generate the widget's typed choices and presentation sidecar from that source.
Each choice is `{value: id, label}`. The sidecar carries descriptions, aliases,
recognition cues, category hierarchy, memberships, and the curated starter IDs.
Generation must reject unknown parents, cycles, unknown starters, and selectable
category nodes. Preserve the source attribution and canonical need IDs. Do not
maintain a second hand-edited taxonomy in widget code.

The current mockup's starter list contains 24 distinct needs:

| Area                         | Starting options                            |
| ---------------------------- | ------------------------------------------- |
| Body and physical well-being | Rest, Food, Movement                        |
| Safety and stability         | Physical safety, Stability, Trust           |
| Connection and belonging     | Belonging, Empathy, Care                    |
| Autonomy and freedom         | Choice, Independence, Personal space        |
| Authenticity and expression  | Authenticity, Self-expression, Self-respect |
| Understanding and growth     | Clarity, Learning and growth, Competence    |
| Meaning and contribution     | Purpose, Contribution, Appreciation         |
| Play, beauty, and harmony    | Play, Ease, Beauty                          |

**Simple** initially shows three starting tags per area. **Detailed** exposes all
68 needs under static subgroup labels; only the broad areas have expansion
chevrons. Switching views preserves every selected ID, including selections not
shown in Simple. The selection tray identifies retained Detailed selections.

The allowed catalogue for this default call remains all 68. The starter list is a
navigation shortcut, not a smaller answer contract. The participant can reach all
choices through Detailed, and Simple search offers a clear route to search all
needs when it finds no starting-option match. A host fallback can therefore offer
all 68 while preserving exactly the same output and constraints.

If a practice author deliberately wants to allow only a subset, the author must
supply that subset as `options`. Starter membership is intersected with those
options; neither Detailed, search, nor imported drafts can select excluded IDs.
Default maximum is the supported catalogue limit (1000), capped to the offered
count, displayed to authors as **Any number**. A practice can choose a lower limit.
No default maximum of three is implied by showing three starting tags per area.

The draft prototype's local Continue/review behavior becomes the host's ordinary
Continue once integrated. Replace its conversation-state API with the widget
bridge. Its curated list and initial view become declared versioned package data
and inputs, not personal hard-coded exceptions in the runner.

## Storage and integration boundaries

The concrete implementation should extend existing boundaries:

| Existing area                               | Proposed responsibility                                                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `packages/workspace`                        | Personal drafts, immutable package releases, installation/enablement, usage references, import/export, and backup migration. |
| `packages/compiler`                         | Package interfaces, explicit dependency resolution, diagnostics, practice serialization and inspection.                      |
| `crates/pattern-core` / `pattern-host`      | Widget effects, typed inputs/outputs, runtime refinements, confirmation and receipt replay.                                  |
| Web shared run/controller and host adapters | Mounting, draft bridge, host controls, fallback, and effect/session lifecycle.                                               |
| Web Settings                                | Manager, file/contract editor, fixtures, and preview UI.                                                                     |
| Practice block editor                       | Widget picker, input mapping, result binding, and validated source projection.                                               |

Proposed storage entities are WidgetDraft, PackageRelease, Installation,
WidgetPreferences, and PracticeDependencyLock. Names describe responsibilities;
final TypeScript and persisted schemas require a migration design. Keep mutable
drafts separate from content-addressed immutable release assets. Backup must cover
personal code and releases before Settings advertises export/restore support.
Device enablement stays local; restored or synced code is not silently executed.

The website/editor use the same compiler and runtime today. Mira and website
embeds must use compatible host adapters or an honest fallback, rather than a
second widget execution engine. Existing article-widget HTML can be reused after
packaging, but its current size/loading message protocol is not a practice-answer
bridge. Article exploration has no implicit permission to write practice answers.

## Implementation sequence

1. Define package contracts, local releases, storage/backup migration, and the
   needs-library-to-catalogue generator. No public registry dependency.
2. Add compile-time widget calls, exact dependency locking, runtime validation and
   receipts, and the trusted multi-choice fallback.
3. Add the shared isolated renderer and draft bridge; exercise a real needs step
   through confirmation, history, revisit, and fallback.
4. Add Settings management, file editing, contract editing, and fixture preview.
5. Add the practice block editor's Widget picker and host compatibility checks.

Success means a person can create a widget in Settings, name it, paste code, define
its inputs and outputs, preview it, save a private version, insert it into a
practice, and use its confirmed answer in a later step. Renaming or drafting a
new version does not break existing practice references or saved runs.
