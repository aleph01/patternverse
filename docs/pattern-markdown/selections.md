# Choices and ranking

Implemented in the portable Rust runtime, CLI, Mira desktop chat and Pattern Preview.
This does not add Pattern execution to the separately hosted PWA.

## Single and multiple choices

```pattern
!choose thinking_styles [multi, min=0, max=3, prefer=checklist] {
    Which descriptions, if any, seem to fit your experience?

    - all_or_nothing: "All-or-nothing thinking"
    - mind_reading: "Assuming what someone else thinks"
    - discounting: "Discounting something positive"
}
```

The binding name and stable option IDs are required. Labels are JSON-quoted strings;
IDs use the existing identifier grammar. The `!` prefix remains. Parameters are
optional; whitespace before `[` is optional. `[]` means no overrides.

- Without `multi`, select exactly one item, returning `choice`.
- `multi` returns `list<choice>`, in catalogue order rather than click order.
- Multi defaults: `min=1`, `max` is the available count. `min=0` explicitly permits none.
- Configured selections and ranking are bounded by 1000 items. Counts are inclusive
  integers. Contradictory counts and static bounds exceeding the catalogue are rejected.
  A dynamic maximum is capped to the available count; an unsatisfiable minimum rejects
  the transition atomically.
- `prefer=radio` or `chips` for single; `checklist` or `chips` for multi. These change
  appearance only, not validation. Defaults are radio cards and checkboxes.
- `from=<binding or field path>` uses a `choices` catalogue or `list<choice>`.
  It cannot be combined with literal options. Duplicate source IDs are rejected.
- Single and multiple choices require **Continue**. Changing a control never sends
  a reply. An empty selection is distinct from an explicit “unsure” choice or skipping
  a whole step through authored control flow.

The old `:option id "Label"` and `:from source` forms still work before prompt text.
Flags can also be separate attributes (`:multi`, `:min 0`, etc.). Do not mix literal
option styles within a block. In legacy colon-option/from blocks without a parameter
header, ordinary Markdown bullets remain prompt text, preserving saved semantics.
In new bullet-option blocks, escape the initial hyphen to display a literal option-like line.

## Ranking all offered items

```pattern
!rank priorities {
    Put these in the order that matters to you right now.

    - connection: "Connection"
    - learning: "Learning"
    - creativity: "Creativity"
}
```

Ranking returns `list<choice>` in the confirmed order. It must contain every offered
ID exactly once. There are no ties, tiers, partial rankings or automatic model
rankings. To rank a subset, first use `!choose [multi]`, then:

```pattern
!rank ordered [from=thinking_styles] {
    Which would you like to explore first?
}
```

The UI labels the initial order as unconfirmed. Drag the handles, use the move buttons,
or focus a handle and press ↑/↓, then **Confirm order**. Accepted results display as a
numbered list. Empty source lists still require confirmation; the result is a typed
empty list. `prefer=reorder` is optional; selection bounds do not apply to ranking.

## Ranking participant-created entries

```pattern
!collect steps {
    :max 3
    !ask description {
        What is one possible small step?
    }
    !rate effort 0..10 {
        How much effort might {{description}} take?
    }
}
!rank ordered_steps [from=steps, label=description] {
    Arrange these in the order you would like to consider them.
}
```

`label` must name a text field on each record. Labels must not be blank, but may be
identical: identity comes from the frozen source position (`row_0`, `row_1`, …), not
the wording. The output is `list<record>` containing the **whole original records**
in the confirmed order, including effort values. Source bindings remain unchanged.
The IDs are local to that offered snapshot, not cross-session record identifiers.

## Runtime, persistence and compatibility

Legacy single-choice instructions/effects retain their existing serialized shape.
Configured selections and ranking emit `interaction.select`, with `mode`, concrete
`min`/`max`, presentation hint and the frozen option catalogue. Replies are `selected`
(one ID), `selected_many` (IDs), and `ranked` (ordered IDs). Multi receipts are
normalized for idempotency; rank receipts retain meaningful order.

The Rust core enforces types, offered IDs, uniqueness and cardinality. Rejected replies
do not consume an effect. Pause/resume, retry, cancellation, durable checkpoints and
replay use the same existing boundaries. Confirmed replies survive restart. Unsent
UI drafts survive pause/resume while mounted, but are not persisted across app restart
or leaving the view. No selection is inferred or submitted automatically.

Structure distinguishes choosing several from arranging in order. Source highlighting
recognises headers and bullet IDs; it does not interpret the language.

## Runnable examples

- [Thought diary with optional thinking-style checklist](examples/thought-diary-multi-select.pattern.md)
- [Choose values, then arrange the selected values](examples/values-ranking.pattern.md)
- [Collect small steps and rank the full records](examples/collected-steps-ranking.pattern.md)

These are capability examples, not newly installed or clinically validated therapy
releases. Paste a source into a new Pattern Library entry to explore it in Preview;
existing immutable therapy patterns and active runs are not silently rewritten.
