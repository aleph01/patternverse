# Python style type annotations

Optional binding annotations, square-bracket types, and explicit optional values
are additive features under the existing `:language 1` tag. Annotations document and check a type; they do not
convert values. Omitted annotations continue to use inference.

```pattern
:language 1
:output answer

answer: text = !ask {
    What would you like to put into words?
}
-> end
```

Types include `text`, `number`, `boolean`, `choice`, `choices`, `list[T]`,
`Optional[T]`, structural records such as `{answer: text, score: number}`, and
existing declared closed enums. Type mismatches are compile errors. There is no
`any`, scalar coercion, reassignment, or Python execution.

## Lists and inferred results

An annotation can supply an empty list's element type. Existing selection actions
already infer `list[choice]` for multi-selection; writing that type is optional.

```pattern
:language 1
:output selected
:output empty

empty: list[choice] = []
selected: list[choice] = !choose [multi, min=0, max=2] {
    Which needs feel present for you?
    - belonging: "Belonging"
    - space: "Space"
}
-> end
```

Lists remain homogeneous. Expected types propagate into record fields, list
elements, declared helper arguments/results, and explicit child-pattern inputs.
An empty list with no expected type still needs the legacy element annotation,
such as `[]:text`.

```pattern
:language 1
:output result

fn empty() -> list[text] => []
fn keep(items: list[Optional[text]]) -> list[Optional[text]] => items

result = {empty: empty(), notes: keep([None, "A little space"])}
-> end
```

Both `list[T]` and the existing `list<T>` spelling are accepted. Version 2 also
accepts the annotations while retaining its existing collection-yield rules.

## Optional values and presence checks

`Optional[T]` accepts a value of `T` or `None`. A present value keeps its original
type inside an explicit optional wrapper. `Optional` is built in and needs no
import. A binding initialized only with an unbound `None` needs an expected optional type.

For compatibility, an in-scope binding or helper parameter named `None` keeps its
ordinary value meaning, even in annotated code. Otherwise `None` denotes absence
where an optional value is expected or compared. `Optional` remains usable as an
ordinary value name; `Optional[T]` is a type constructor only in type positions.

```pattern
:language 1
:output description

note: Optional[text] = None
?branch {
    :when note != None {
        description: text = trim(note)
    }
    :else {
        description: text = "No note was supplied."
    }
}
-> end
```

Direct `== None` and `!= None` guards narrow a binding or known field path inside
the appropriate branch. Both operand orders work. Narrowing does not escape a
control-flow join unless every incoming path proves presence. An optional record
must be checked before accessing its fields. An optional value must be checked
before arithmetic, interpolation, or a call requiring its contained type.

There is no implicit truthiness, optional chaining, or Python `is` operator.
Use `optional ?? fallback` to obtain the contained value or an explicit default. Only
`None` selects the fallback: `""`, `0`, `false`, and `[]` remain present values.
The fallback must match the optional's contained type and is evaluated only when absent.
Both operands are type-checked even when the fallback will not execute.

```pattern
:language 1
:output summary
notes: list[text] = []
summary = first(notes) ?? "No notes yet."
-> end
```

`??` associates right to left: `a ?? b ?? fallback` is `a ?? (b ?? fallback)`.
It binds below arithmetic and above comparisons, Boolean operators, and pipelines.
Thus `note ?? " default " |> trim` trims whichever text was selected. Write
`note ?? (" default " |> trim)` to transform only the fallback. Multiline expressions
may end a line with `??` or begin the next continuation line with `??`.

`first`, `last`, `find`, and seedless `reduce` return `Optional[T]`; `min` and `max` return
`Optional[number]`. Empty lists (and unsuccessful searches) produce `None`.
Element access/search rejects lists whose elements are already optional because
directly nested optional types are not supported.

Comparing a nonoptional value to `None` is a type error. Nested
`Optional[Optional[T]]` is rejected as redundant; `list[Optional[text]]` and
`Optional[list[text]]` are distinct supported types.

`[]` means an explicitly supplied empty list. `None` means an explicitly supplied
absence. Neither means pause, cancellation, or implicit permission to skip a
step. A standalone `!ask` still returns text, including an empty answer; assigning
it to `Optional[text]` wraps that text as present. Existing `[optional]` form
questions also keep their current empty-text behavior.

## Public input and output types

Public inputs may use colon notation. Output annotations are optional and provide
an expected type for the output binding on every completing path.

```pattern
:language 1
:input topic: text
:output notes: list[text]

notes = []
!show {
    Topic: {{topic}}
}
-> end
```

The legacy `:input topic text` spelling and unannotated `:output notes` remain
valid. An `Optional[T]` input is still a required input: callers must explicitly
supply a present value or typed absence. Missing inputs and missing output fields
are not converted to `None`.

The host's tagged JSON representation of an absent `Optional[text]` is:

```json
{
  "type": "optional",
  "value": {
    "element_type": "text",
    "value": null
  }
}
```

A present optional value puts its tagged contained value in the inner `value`
field. The Rust runtime validates the underlying type, not just the JSON shape.

## Saved source and runs

The language tag stays at 1. Compiler revisions and saved-run schema versions are
tracked independently: practices using the new type features use the internal
`m4-v3` revision and run schema 5, while existing source without those features
keeps its `m4-v1` identity and schema 4. Saving and replay retain the underlying
type even when a value is absent. The earlier `:language 3` spelling remains
accepted for source created during the initial implementation, but is unnecessary.

Annotation-shaped text inside an implicit Markdown body remains prose. Use explicit
braces to close a question or display before writing the next typed binding.

This implements the annotation portion of the
[widget system specification](widget-system-spec.md). Widget calls, extension
packages, and publisher-based imports remain proposed work.
