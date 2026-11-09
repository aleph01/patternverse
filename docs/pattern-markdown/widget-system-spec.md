# Widget system imports and Python style type annotations

Implementation update: the first local-widget workflow is implemented; see
[Local widgets](local-widgets.md) for usage, validation, and current limits. Public
registry and remote capabilities remain proposed.

Status: widget, package, and publisher-import portions are proposed. Python-style
annotations and optional values are implemented under `:language 1`; see the
[current annotation reference](type-annotations.md). Widget examples below still
depend on the proposed widget runtime and package resolver.

Date: 2026-10-31.

Product design update: 2026-11-02. See [Widgets in practices: authoring and
Settings design](widget-authoring-design.md) for the concrete manager/editor flow,
practice insertion, and the current needs selector. The general package, bridge,
validation, and versioning contracts remain proposed.

## Purpose and decisions

Pattern authors can import widgets from Patternverse or another identified
publisher, pass typed inputs, and use named outputs in later steps. Widget authors
can write their own HTML, CSS, and JavaScript, or start from a template. Both paths
produce the same package and contract.

The Pattern Language compiler and Rust runtime continue to own types, control flow,
validation, confirmation, and saved-run replay. A widget supplies an interface for
one pending interaction. Its JavaScript cannot execute Pattern source or advance a
run directly.

The author-facing syntax is deliberately small:

```pattern
:language 1
:import "patternverse/nvc@1" as nvc
:output needs

selection = !widget nvc.needs {
    :with max = 3

    Which needs feel present for you right now?
}

needs: list[choice] = selection.needs
-> end
```

The imported widget supplies its default catalogue. Authors can override declared
inputs with `:with`. Every widget returns a record of named outputs, including when
it has only one output. Binding annotations are optional; checking is mandatory.

The following decisions supersede the exploratory alternatives:

- Use `:import`, not a separate `:extension` declaration.
- Use `!widget alias.export`; do not require separate catalogue and renderer
  declarations at every call site.
- Make authored HTML, CSS, and JavaScript first-class. Templates generate ordinary,
  editable widget files.
- Require explicit input and output contracts in widget definitions.
- Use `name: type = expression`, `list[T]`, and `Optional[T]` for new authoring.
- Keep installation, enablement, permission grants, and importing separate.

## Scope and compatibility

This proposal covers personal widget creation, extension packages, publisher
namespaces, imports, contracts, host integration, and type annotations. A package
may export several widgets and static data catalogues. Widgets are the first
extension kind; external-service actions, background execution, native code,
general package scripts, and arbitrary runtime type loading are outside version 1.

The language tag remains `:language 1`. Binding annotations, square-bracket types,
and optional values are additive syntax; existing version-two collection behavior
also remains supported. `None` is contextual: a binding or helper parameter of that
name keeps its ordinary meaning, while an otherwise unbound `None` denotes absence
in an optional-value context. `Optional[T]` is recognized only in type positions;
`Optional` is not a newly reserved value name. Existing valid source, identities,
and saved runs keep their interpretation. Annotation-shaped Markdown in implicit
bodies stays prose, so authors should close bodies with explicit braces before
introducing a typed binding.

The current system already has immutable typed bindings, `list<type>`, structural
records, typed helpers, `:with`, exact local Pattern imports, and accepted receipt
replay. These are the foundation, not features introduced by widgets. See
[the functional core](functional-core.md), [local imports](imports.md),
[selections](selections.md), and [persistence](persistence.md).

The existing tag accepts legacy `list<T>` spellings as aliases for `list[T]`, including in
helpers and empty-list annotations. Canonical new source and diagnostics use square
brackets. Existing legacy constructs retain their meaning. This proposal does not
add Python execution, Python imports, assignment mutation, truthiness, or comments.

## Extension identity and exports

An extension has a publisher, package name, semantic version, and content revision:

```text
patternverse/nvc@1.0.0
jeger/nvc-tools@1.0.0
personal/my-needs@0.1.0
```

Public publisher and package segments are lowercase ASCII identifiers containing
letters, digits, and hyphens, beginning with a letter. Export names and local
aliases use the existing language identifier rules. A package has one export
namespace; duplicate names across export kinds are invalid.

The `patternverse` publisher is reserved for official packages. Other public
publishers are registered to an account or organization. Registry authorization
establishes ownership; a string in a manifest does not prove identity. An official
badge identifies the publisher, not additional permissions or clinical validation.

`personal` is a local workspace alias, not a globally claimable publisher. Its
resolved identity includes the workspace's stable identity and package lineage.
Portable snapshots retain that identity and exact content. They must never bind
to a different workspace's similarly named personal package.

The local alias is independent of the publisher:

```pattern
:import "jeger/nvc-tools@1" as nvc
```

An author can change suppliers while keeping `nvc.needs` in the practice if the
replacement has a compatible interface. Replacing a supplier is an explicit
dependency change, requires rechecking the practice, and affects only new runs.
Structural compatibility does not claim that the suppliers' content is equivalent.

## Imports and exact resolution

### Source syntax

```pattern
:import "patternverse/nvc@1" as nvc
:import "jeger/sketch@2.1.0" as sketch
```

Declarations precede executable statements. `@1` requests a compatible release in
major version 1; `@2.1.0` requests that exact semantic version. Version 1 of the
package resolver supports these two forms only. Bare package names, `latest`,
arbitrary URLs, filesystem paths, and dynamic import expressions are invalid.

`nvc.needs` resolves a widget export. `nvc.catalogue` can resolve a static data
export. The compiler rejects use of an export in the wrong position. Imports do
not create new language keywords. Local aliases must be unique and must not
collide with bindings or helper names. Aliases are lexical names, never a search
through ambient installed widgets.

The existing `:import "artifact-id@m4-v1:..." as helper` form remains a local
Pattern import. Its target is called with `!use helper`. Package references have a
separate parser and resolver; neither form is guessed from the other's failure.

### Resolution rules

On first resolution, the editor selects the highest matching, explicitly installed
release compatible with the host API. If none is available, it reports the missing
dependency and offers installation as a separate user action. It never downloads
or executes package code while compiling source.

The resolved dependency record contains:

- The source alias and version request.
- Stable publisher and package identities, exact semantic version, and content hash.
- Package manifest, export interfaces, host API requirement, and all referenced
  asset and catalogue hashes.
- The exact dependency closure needed to compile and render the practice.

Once resolved, `@1` continues to mean that recorded revision. A later installation
does not silently update it. **Update dependency** explicitly resolves again,
checks compatibility, and creates a new practice revision. Registry releases
cannot be overwritten under the same package identity and version.

Compilation without an editor consumes an explicit dependency bundle or installed
lock record; it must not query the network. Missing assets, cycles, conflicting
identities, incompatible host APIs, or hash mismatches are errors. Aliases for
different revisions remain distinct; the resolver never substitutes one revision
for another.

Compiled identity includes the exact contracts and package closure. An executable
snapshot preserves source, resolved packages, and accepted runtime semantics.
Importing a package does not run it, install it, enable it, grant permissions, or
publish any participant data. Merely inspecting a package does not run its code.

## Package and widget files

A package can contain:

```text
extension.json
catalogues/needs.json
widgets/needs/widget.json
widgets/needs/widget.html
widgets/needs/widget.css
widgets/needs/widget.js
```

An illustrative extension manifest is:

```json
{
  "schemaVersion": 1,
  "publisher": "patternverse",
  "name": "nvc",
  "version": "1.0.0",
  "hostApi": 1,
  "permissions": [],
  "exports": {
    "needs": {
      "kind": "widget",
      "path": "widgets/needs/widget.json"
    },
    "catalogue": {
      "kind": "data",
      "type": "choices",
      "path": "catalogues/needs.json"
    }
  }
}
```

Identity belongs to the package. A widget is addressed as an export of that
package, so a private `personal/my-needs` package can also export `needs`.
The earlier `personal.needs` shorthand is not canonical import syntax.

Asset paths are relative to the containing manifest or HTML file, stay inside the
package, and resolve to pinned bytes. They cannot use absolute paths, traversal,
remote imports, dynamic code downloads, or symlinks escaping the package.
Plain HTML, CSS, and JavaScript require no build step. Authors may bundle a
framework themselves, but the installed package must be self-contained and use
the same host API. Packages have no install scripts or compiler plugins.

### Widget contract

The needs widget definition is:

```json
{
  "schemaVersion": 1,
  "name": "Needs selector",
  "entry": "widget.html",
  "inputs": {
    "options": {
      "type": "choices",
      "defaultFrom": "catalogue"
    },
    "max": {
      "type": "number",
      "default": 1000,
      "integer": true,
      "minimum": 1,
      "maximum": 1000
    },
    "initial_view": {
      "type": "text",
      "default": "simple",
      "enum": ["simple", "detailed"]
    }
  },
  "outputs": {
    "needs": {
      "type": "list[choice]",
      "from": "options",
      "minItems": 0,
      "maxItemsFrom": "max"
    }
  },
  "fallback": {
    "kind": "multi-choice",
    "input": "options",
    "output": "needs"
  }
}
```

All input and output names and types are mandatory. Defaults are optional.
`defaultFrom` names a static data export in the same package; it never calls
JavaScript. `default` and `defaultFrom` are mutually exclusive. Defaults are
validated when checking the package and frozen when starting a widget call.

Type strings use the same grammar as Pattern source, including nested records and
`Optional[T]`. The initial manifest supports these declarative refinements:

| Field | Meaning |
| --- | --- |
| `integer`, `minimum`, `maximum` | Constraints on a numeric value. |
| `enum` | Nonempty, unique allowed text values for a text input or output; defaults and runtime values must belong to the set. |
| `from` | For a `choice` or `list[choice]` output, the named input catalogue that supplies valid choices. |
| `minItems` | Inclusive lower bound for a list's length. |
| `maxItems` or `maxItemsFrom` | Inclusive fixed upper bound, or a named numeric input supplying it. Mutually exclusive. |

Unknown fields, duplicate JSON keys, unknown types, invalid references, invalid
defaults, incompatible refinements, and contradictory bounds are errors. These
constraints are interpreted by the trusted host/runtime, never by widget code.
No arbitrary validation scripts or expressions run during contract checking.

For catalogue-backed selection, the effective maximum is capped to the number of
offered choices, matching existing multi-choice behavior. A minimum exceeding the
effective maximum makes the call unsatisfiable. Empty results are allowed only
when `minItems` permits them. Generic list output bounds do not impose uniqueness;
catalogue-backed choice selections reject duplicate IDs and normalize catalogue
order. An ordered-selection contract is outside the initial fallback adapter.

Records are closed: every declared field must be supplied and extra fields are
rejected. An output of `Optional[text]` must explicitly contain either text or
`None`; omitting that output is an error. Similarly, an optional input still needs
an argument unless its definition provides a default, which may explicitly be null.

## Calling widgets from Pattern Language

```pattern
:language 1
:import "patternverse/nvc@1" as nvc
:output needs

available_needs = nvc.catalogue

selection: {needs: list[choice]} = !widget nvc.needs {
    :with options = available_needs
    :with max = 3

    Which needs feel present for you right now?
}

needs = selection.needs
-> end
```

`!widget` is an effectful, whole binding statement, like existing interaction
actions. It cannot be nested inside an expression, list, helper, or pure pipeline.
The target is a statically resolved imported widget export, not a runtime string.
The result is always the record declared by `outputs`.

`:with name = expression` maps a declared input to a typed expression.
`:with name` uses the same-name binding. Duplicate, extra, missing required, or
mistyped arguments are compile errors. Omitted inputs use their frozen defaults.
Call inputs are immutable for the duration of the interaction.

The optional Markdown body is the standard prompt, exposed separately as
`api.prompt`; it is not an undeclared input. An absent body supplies an empty
prompt. Existing safe interpolation applies. The host renders the prompt through
its Markdown renderer; widget code receives plain prompt text for accessible
labels. It must not insert participant text as raw HTML.

Aliases resolve to data exports in ordinary expressions, as in `nvc.catalogue`.
These values are compile-time-known immutable package data, not calls to code.
Only declared inputs, the current prompt, presentation metadata for those inputs,
and the current widget's draft reach the interface. No chat history, other run
bindings, files, credentials, or answers are implicit inputs.

## HTML CSS and JavaScript authoring

The host provides a `widget` global through a controlled bridge. The bridge API is
the same in Settings Preview, editor preview, and practice runs.

An illustrative `widget.html` is:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="widget.css">
  </head>
  <body>
    <div id="choices" role="group" aria-label="Needs"></div>
    <script type="module" src="widget.js"></script>
  </body>
</html>
```

`widget.css` can style the interface freely inside the widget document. The host
provides theme, font scale, and reduced-motion preferences; packages must support
keyboard interaction, visible focus, readable contrast, and responsive layouts.
Widgets cannot style or cover host navigation and participant controls.

The following minimal `widget.js` demonstrates draft output. The official needs
widget additionally provides category browsing.

```js
const api = await widget.ready();
const { inputs } = api;
const root = document.getElementById("choices");
root.setAttribute("aria-label", api.prompt || "Needs");

const selected = new Set(
  (api.draft?.needs ?? []).map(choice => choice.value)
);

for (const option of inputs.options) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = option.label;

  const refresh = () => button.setAttribute(
    "aria-pressed", String(selected.has(option.value))
  );

  button.addEventListener("click", async () => {
    if (selected.has(option.value)) {
      selected.delete(option.value);
    } else if (selected.size < inputs.max) {
      selected.add(option.value);
    }
    refresh();

    await widget.setDraft({
      needs: inputs.options.filter(option => selected.has(option.value))
    });
  });

  refresh();
  root.append(button);
}

if (api.draft === null) {
  await widget.setDraft({ needs: [] });
}
```

Choice objects use the existing `{value, label}` shape. `value` is the stable
semantic ID. The host validates membership against the frozen catalogue and
reconstructs accepted choice values using its own labels, rejecting fabricated
IDs. JavaScript objects do not become trusted choices merely by having these keys.

### Host API version 1

| API | Contract |
| --- | --- |
| `await widget.ready()` | Resolves once with a read-only snapshot of `inputs`, plain `prompt`, `presentation`, `draft`, and host appearance preferences. It is gated on the host session handshake. |
| `await widget.setDraft(outputs)` | Replaces the whole draft output record. Resolves with `{valid, errors}`, where errors identify output paths and contract violations. It does not confirm or advance the practice. |

`draft` is null until an interface first supplies a draft; it is otherwise the
current output-shaped record, even when that draft is invalid. Message sequence
numbers ensure an older update cannot overwrite a newer draft. Continue stays
unavailable while the latest update is pending or invalid. On confirmation, the
host freezes that exact draft revision and stops accepting edits until the runtime
accepts or rejects the response. A rejection reopens editing on the same step.

An invalid draft may be retained for preview diagnostics but cannot enable
Continue. Missing required outputs in a partial editing draft are invalid rather
than silently filled. Widgets must inspect validation results when showing their
own errors; the host always displays authoritative validation state.

The host owns the draft and remounts the interface with the latest snapshot after
pause/resume or a host state replacement. Version 1 has no arbitrary lifecycle or
global event subscription API. A draft is mutable UI state; the confirmed Pattern
result remains immutable. Theme preference changes may also trigger remounting.

The host owns Continue, Pause, and End outside the widget. There is no
`widget.complete()`, `evalPattern()`, navigation, storage, network, or parent-state
API. Inputs and draft records use a schema-directed JSON codec: `None` is JSON null,
lists are arrays, records are objects, and choices are checked against the
referenced catalogue. Internal persisted values keep tagged types; the JSON codec
does not replace the Rust value representation.

## Confirmation execution and saved runs

The compiler lowers a call to a pending typed widget interaction carrying the
exact package/export revision, evaluated inputs, normalized contract, prompt, and
effect identity. Standard selection widgets use the existing selection validation
and receipt semantics through a widget adapter; they do not implement a second
selection engine. Other widgets use a generic record-output interaction checked
by the same runtime type system.

Selecting or typing only updates a draft. On participant confirmation, the host
revalidates the current draft and submits a response bound to the pending effect.
The runtime independently checks the output record and refinements. Acceptance,
binding the result, and advancing the run are atomic. Failure preserves the
pending interaction and earlier accepted work. Double confirmation is idempotent;
conflicting duplicate or late responses are rejected.

Browser validation is never the only validation. The Rust runtime must receive
the frozen catalogue and normalized constraints needed to check the result without
executing JavaScript. A custom renderer cannot expand the offered choices, bypass
limits, change the result schema, or synthesize participant confirmation.

Runs pin the exact source, compiler semantics, package closure, catalogue,
contract, and accepted receipts. Restore/replay validates accepted data without
executing historical widget code. An active pending interface mounts only after
the participant resumes and the host checks that the pinned package is permitted.

Pause preserves the pending effect. End cancels it without successful outputs;
neither action fabricates `None` or an empty list. Version 1 drafts survive while
the run remains mounted, including pause/resume, but are not guaranteed across
app restart. This matches the existing selection draft boundary. If durable
drafts are added later, they must use the host's encrypted storage, retain their
unconfirmed status, and never be replayed as accepted receipts.

## Isolation and permissions

Custom widget code runs in an isolated frame/document with an opaque origin and a
host-controlled Content Security Policy. The implementation must not combine
same-origin privileges with script execution in an app-origin frame. Package
assets are served from immutable verified bytes without granting application
origin access. The relevant browser behavior is specified by the
[HTML frame sandbox rules](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox).

The initial policy allows bundled interface code and styles but blocks external
requests, remote asset loads, form submission, popups, downloads, top-level
navigation, service workers, persistent storage, and ambient clipboard, device,
file, and credential access. An iframe alone does not establish the network policy;
the host must enforce CSP and package asset restrictions too.

The host establishes a per-mount message channel and validates its source,
session identity, protocol version, message schema, and pending-effect association.
An opaque origin's `"null"` origin string is not an authentication mechanism.
Remount, pause, end, or accepted confirmation invalidates the old channel; stale messages
cannot update another interaction. The bridge bounds payload size, message rate,
and widget dimensions. A stalled widget cannot hide the host's recovery controls.

Version 1 accepts only `permissions: []`. Unknown or unsupported permission requests
make a package incompatible. A future capability extension must declare explicit
inputs, outputs, effects, and permission grants; ordinary widget imports are not
authorization for external-service operations.

## Settings and widget creation

### Managing extensions

Settings has a **Widgets** area with Installed and My widgets views; extensions are
the underlying packaging model. Each installed
package shows publisher identity, official/personal status, version, enablement,
available exports, compatibility, and permissions. Participants can inspect files
and contracts without executing them, enable or disable a package, choose
presentation defaults, install a specific available release, or remove it.

Installed means available to resolve. Enabled means permitted to render. Importing
means the practice depends on a specific package interface. These states are
separate. A disabled package's verified contract can still be inspected or compiled
against without running its interface. Execution uses a trusted fallback or reports
that the required interaction is unavailable.

Removing a package removes its installation and rendering permission but does not
delete accepted answers, alter historical runs, or rebind imports. Snapshots retain
the bytes required for history and deterministic replay; retained bytes do not
grant permission to execute removed code.

### Creating a personal widget

**Create widget** offers Blank HTML/CSS/JavaScript and Start from template. The
author chooses a package name and export name in the personal namespace. A template
prefills ordinary package files and a contract; it is not another runtime format.

The editor exposes Interface, Inputs and outputs, and Preview. Interface includes
HTML, CSS, and JavaScript files. Inputs and outputs offers form editing and the
equivalent JSON definition. Preview supplies example input values, the prompt,
validation diagnostics, the draft result, and a separate simulated confirmation.
Preview never accepts an answer into a real run.

Saving a draft does not replace a saved release. **Save private version** validates
the package and creates an immutable personal release plus an import snippet.
Later edits produce a new release. Public publishing and claiming a global
publisher namespace are separate actions, outside the initial personal editor.
Code entered in the editor does not run until the author starts Preview.

Builder controls edit the definition and template parameters. They must not pretend
to reverse-engineer arbitrary customized JavaScript. When custom source no longer
matches its originating template, retain source editing and disable incompatible
visual controls with a clear explanation.

Preferences such as tiles versus expandable categories can change presentation
only. They cannot change the practice's frozen catalogue, declared outputs, limits,
or confirmation semantics. An invocation explicitly selecting a package is not
silently switched to a different publisher's implementation by a preference.

## Fallbacks and availability

Fallbacks are trusted host adapters named by the manifest, not replacement package
scripts. The host verifies that an adapter can preserve the exact output record,
catalogue, constraints, ordering, and confirmation behavior.

The initial `multi-choice` fallback supports the needs contract above: it uses the
same input catalogue and effective limits, returns the named `needs` output, and
requires explicit confirmation. If a widget declares additional outputs that the
adapter cannot supply, that adapter is incompatible. No generic text-to-record or
drawing-to-text conversion is implied.

If an installed widget is disabled, fails to mount, or is unsupported on the current
host, offer its compatible fallback. Carry valid draft selections into the adapter
without confirming them. If no compatible fallback exists, report the missing
interaction in preflight and prevent starting; a mid-run failure preserves the
pending step and offers recovery, pause, or end. Never invent a successful result.

## Python style type annotations

### Type grammar

```text
binding      := name [":" type] "=" expression_or_action
type         := "text" | "number" | "boolean" | "choice" | "choices"
              | existing_closed_enum_name
              | "list[" type "]"
              | "Optional[" type "]"
              | "{" [field_types] "}"
field_types  := name ":" type ("," name ":" type)* [","]
```

Existing identifier, expression, action, effect-placement, and resource limits
still apply. An annotation is part of a binding, never a label or Markdown body.
Declarations, helper parameter/result types, and widget type strings share the
same type parser. Existing closed enums retain their current declaration and
matching rules; package-exported named type aliases are deferred.

Public Pattern interfaces may use the same colon notation:

```pattern
:input situation: text
:output needs: list[choice]
```

Inputs still require a declared type. Output annotations are optional: an
unannotated `:output needs` is inferred from the definitely assigned binding,
while an annotated output constrains that binding on every completing path.
The legacy `:input situation text` spelling remains accepted. Interface
annotations do not make required outputs optional or change `!use` isolation.

```pattern
name: text = "Alex"
energy: number = 7
needs: list[choice] = selection.needs
note: Optional[text] = None
summary: {needs: list[choice], note: Optional[text]} = {
    needs: needs,
    note: note
}
```

Names remain immutable, annotations cannot reassign or shadow existing bindings,
and records remain structural. No implicit conversion exists between text and
number, number and boolean, choice and text, or `choices` and `list[choice]`.
An annotation checks an expectation; it does not cast or parse a value.

### Inference and empty collections

Omitted binding annotations use existing inference. The compiler knows widget
result types before running interface code. Function parameters and result types
retain their existing explicit declarations; this proposal does not add inference
for helper signatures.

An expected type can supply otherwise missing element information:

```pattern
empty_needs: list[choice] = []
pending_notes: list[Optional[text]] = [None, "A little space"]
```

The expected type propagates into list elements and record fields, including
declared helper arguments/results and widget input/default contexts. A binding
initialized with only an empty list or bare `None` needs an expected type from
its annotation or declared public output. Otherwise its type is ambiguous.
Legacy typed empty-list syntax such as `[]:text` remains accepted.

Lists are homogeneous. The compiler does not infer arbitrary unions or `any` for
mixed values. A list of ordinary values and `None` needs an explicit optional
element expectation. Empty results from a typed widget, map, filter, or traversal
retain their known element type.

### Optional values

`Optional[T]` admits a value of `T` or explicit absence written as an unbound `None`.
An existing lexical binding or helper parameter named `None` takes precedence.
`Optional` is a built-in type constructor in type positions, not a Python module import. A value of `T` can satisfy
an expected `Optional[T]` through a checked optional-value injection; this does
not convert the contained value. `None` can satisfy an expected optional type but
not a plain type. Nested `Optional[Optional[T]]` is rejected as redundant in the
initial grammar.

| Type or state | Meaning |
| --- | --- |
| `list[choice]` containing `[]` | A typed, explicitly supplied empty selection. |
| `Optional[list[choice]]` containing `None` | An explicitly supplied absence of a value. |
| Missing output key | Invalid output, even when that field has an optional type. |
| Pending draft | An unconfirmed interface state, not an output. |
| Pause or cancellation | A run lifecycle state, not `None` and not a successful result. |

Optional values require an explicit presence check before use as `T`:

```pattern
note: Optional[text] = None
?branch {
    :when note != None {
        cleaned: text = trim(note)
        !show {
            {{cleaned}}
        }
    }
    :else {
        !show {
            No note was supplied.
        }
    }
}
-> end
```

Direct `== None` and `!= None` guards narrow an immutable binding or known field
path in the appropriate branch. The compiler recognizes both operand orders.
Narrowing applies only within the branch, respects existing definite-assignment
rules, and does not mutate the original binding. More complex guard reasoning,
Python `is`, pattern destructuring, and optional chaining are deferred. A direct
comparison of a nonoptional `T` to `None` is a type error; `None == None` is valid.

Comparing two optional values requires compatible underlying types; two absent
values compare equal, while present values use the underlying equality. Two
optional lists/records compare recursively. Ordering, arithmetic, field access
through an optional record, and helpers expecting `T` reject an unnarrowed
`Optional[T]`. There is no truthiness. Interpolating an unnarrowed optional value
also requires an explicit branch, avoiding an implicit user-facing string for
absence.

At branch joins, every continuing path must produce the same declared type.
Annotating each arm with `Optional[T]` permits one arm to yield a present value and
another to yield `None`; the compiler does not invent a wider type from unrelated
arms. Existing `[optional]` form fields continue to return explicit text values
under their current rules. They do not start returning `None` automatically.

The Rust value system must add an explicitly typed optional representation so that
an absent `Optional[text]` retains its underlying type during persistence, equality,
and replay. Existing serialized `Type` and `Value` variants remain readable in
their original schema versions. New optional variants and widget receipts require
versioned snapshot support; old readers must report incompatibility rather than
coerce or discard them.

## Initial official needs selector

The first official package is `patternverse/nvc`, with a `needs` widget and a
`catalogue` data export. The widget returns `{needs: list[choice]}` and uses explicit
multi-selection confirmation. `minItems: 0` allows confirming no selections.
Category changes never clear selections; users can remove selections before
continuing. Category labels and layout are presentation metadata, not result IDs.

The source is the [current needs library](../../content/assets/libraries/needs.json),
with 68 selectable needs, eight areas, and 22 subgroups. See its
[editorial notes and source attribution](../needs/README.md) and the
[current interaction design](widget-authoring-design.md#the-needs-selector-as-the-first-integration).
The package must preserve source attribution and applicable sharing terms. It is
a self-reflection aid; it must not infer what a participant needs or label selected
needs as a diagnosis. Needs should remain distinct from proposed strategies.

An illustrative catalogue file is:

```json
{
  "choices": [
    {"value": "belonging", "label": "Belonging"},
    {"value": "support", "label": "Support"},
    {"value": "personal_space", "label": "Personal space"}
  ],
  "presentation": {
    "groups": [
      {"id": "connection", "label": "Connection"},
      {"id": "autonomy", "label": "Autonomy"}
    ],
    "memberships": {
      "belonging": ["connection"],
      "support": ["connection"],
      "personal_space": ["autonomy"]
    }
  }
}
```

A `choices` data export decodes the `choices` array to the existing core catalogue
type and retains the presentation sidecar separately. Group IDs and memberships
are checked at package validation; every member must refer to an offered choice.
A choice can belong to multiple groups without acquiring multiple semantic IDs.
The SDK exposes a catalogue input as a read-only array of `{value, label}` and
its sidecar as `api.presentation[inputName]`. If an expression supplies a catalogue
without a sidecar, render it as ungrouped choices. Metadata never changes equality,
validation, or the core result shape.

The example above is a compact sidecar illustration, not the complete inventory.
The production sidecar must also represent the area/subgroup hierarchy,
descriptions, search aliases, and the curated 24 starter IDs. Exact additional
sidecar fields require a validated schema before implementation.

Simple shows three starting tags per area; Detailed exposes all 68 under static
subgroup labels. Only broad areas collapse. Both views preserve selections and
the full allowed catalogue. A shortlist does not impose a selection limit.
Official defaults use the catalogue and maximum 1000, capped to the offered count
and labelled **Any number** in authoring. Authors may supply another compatible
catalogue or lower maximum. The `initial_view` input selects Simple or Detailed;
the editor validates those supported values before preview or use. A host
preference changes presentation only. Disabling the widget uses a plain checklist
with the same allowed catalogue and effective bounds.

## Diagnostics and acceptance criteria

Diagnostics identify the source span or manifest field, expected contract, actual
value/type, and the action needed to proceed. They must distinguish unresolved
imports, disabled packages, unsupported hosts, invalid definitions, invalid drafts,
and failed confirmed-response validation.

Implementation acceptance requires the following examples to pass:

| Scenario | Required result |
| --- | --- |
| Import an official or personal package under a local alias | Resolve its exact identity and expose only declared exports. |
| Install a newer compatible release after a practice was saved | Existing practice and active runs keep their recorded revision. |
| Request a missing package or unsupported permission | Explain the dependency; compilation never installs or executes it. |
| Call a widget with a missing input or wrong type | Report a compile diagnostic before mounting code. |
| Use the official needs widget without explicit inputs | Resolve its pinned defaults and infer the named output record. |
| Return unknown choice IDs, duplicate selections, or excess selections | Reject without advancing or partially binding outputs. |
| Modify draft selections without Continue | No accepted receipt and no Pattern output. |
| Confirm twice, pause/resume, or deliver a stale bridge message | Preserve atomicity, idempotency, and effect/session isolation. |
| Disable a selection widget | Offer its compatible host checklist; preserve valid draft choices. |
| Disable a custom widget with no compatible fallback | Preserve pending state; report unavailability rather than fake output. |
| Restore an accepted widget result | Validate its receipt without executing historical interface code. |
| Read old source or snapshots | Preserve old identifiers, list syntax, semantics, and value schemas. |
| Bind `needs: list[choice]` to a text result | Fail compilation with expected and actual types. |
| Bind `needs: list[choice] = []` | Retain a typed empty list. |
| Bind `note: Optional[text] = None` | Preserve explicit absence with the known underlying type. |
| Omit an optional-typed output or submit JavaScript `undefined` | Reject; require explicit null/`None`. |
| Treat `Optional[text]` as text without narrowing | Fail compilation. |
| Use a direct presence guard | Narrow inside the branch and retain the original type afterwards. |
| Attempt external requests, parent DOM access, or old-session writes | Block without affecting host controls or another interaction. |

## Delivery sequence and remaining decisions

1. Add versioned annotation parsing, square-bracket types, contextual empty-list
   inference, optional values, narrowing, and snapshot compatibility tests.
2. Add package validation and explicit local import resolution with immutable
   dependency records, typed exports, and compiler inspection diagnostics.
3. Add the host-owned draft/confirmation adapter, isolated interface runtime,
   package asset handling, bridge validation, and trusted selection fallback.
4. Add Settings management and the private widget editor with contract and fixture
   preview, followed by the official needs selector and accessible templates.
5. Add a public registry and publisher verification after personal packages work
   end to end. The initial registry is not a prerequisite for local imports.

Implementation must select concrete payload, asset-size, message-rate, CPU, and
layout limits consistent with existing runtime budgets, and verify the isolation
mechanism on web and desktop hosts. These are implementation decisions; the
contract already requires bounded messages, responsive host controls, and no
ambient access. Public registry hosting, publishing review, signing/key recovery,
and package revocation distribution need a separate operational design.

Package-exported named types, capability extensions, external services, durable
unconfirmed drafts, and structured binary outputs are deferred. None may be
introduced by giving ordinary widget code broader ambient permissions.
