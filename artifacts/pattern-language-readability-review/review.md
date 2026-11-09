# Readability trial: The Work

Read the [complete proposed rewrite](proposed.pattern.txt) beside the [original snapshot](original.pattern.md). The source practice is [the existing review implementation](../the-work-review/practice.pattern.md).

This document records the accepted language-design trial. The syntax is now supported additively under `:language 1`, and the source practice has been migrated to it. The original snapshot remains unchanged for regression comparison. See [current readable authoring](../../docs/pattern-markdown/readability.md).

## What to judge

Can you follow each decision where it occurs, see where the paths rejoin, and tell which questions are optional without learning special cases?

The rewrite keeps the entire practice in one file so you can evaluate the structure without following helper calls. It retains every participant-facing prompt, option, title, placeholder, reference, and result expression. Most of the file is still the authored practice text.

|                                            | Original           | Proposal                |
| ------------------------------------------ | ------------------ | ----------------------- |
| Source lines                               | 387                | 337                     |
| Separate labels                            | 11                 | 0                       |
| Continuation jumps outside dispatch tables | 7                  | 0                       |
| Explicit optional fields                   | 20 attribute pairs | 20 `[optional]` markers |
| Successful completion points               | 2                  | 2                       |

## Three proposed conventions

1. **One binding form:** `answer = !ask { ... }` and `note = expression`. Inside a form, the same notation defines a record field; it does not expose a standalone outer binding. Form answers remain unavailable until submission.
2. **Local branches:** `?match answer { :case option { ... } }` places actions inside their selected case. After a case finishes, execution continues below the match. An explicit `-> end` still finishes the practice. Every offered ID is covered; omitting the fallback is valid here only because the catalogue is static and exhaustively covered.
3. **Visible exceptions:** `notes = !ask [optional] { ... }` replaces repeated required/multiline metadata. All text fields in this example are multiline. Unmarked form questions retain the original required default. `[optional]` permits an empty text answer; it does not create an implicit skip or fabricate a result.

Assignments on mutually exclusive continuing paths retain the current definite-assignment rule: a value used after a match must be supplied with the same type on every path that reaches it. Thus both opening paths provide `situation` and `thought`, all three truth cases provide `certainty_note`, and both turnaround cases provide `turnaround_note`. The early-leave case completes with its own `outcome`.

## The conditional second question, before

```text
?match truth {
:case yes -> certainty
    :case no -> no_certainty
    :else -> unresolved_certainty
}

certainty:
!choose absolute {
    **Your thought:** {{thought}}

    **Question 2: Can you absolutely know that it's true?**

    An honest yes can stay yes. This is not a demand to disprove yourself. A lack of absolute certainty also does not erase evidence or a reason to protect yourself.

    - yes: "Yes"
    - no: "No"
    - unresolved: "I don't have an answer; continue without deciding."
}
= certainty_note absolute.label
-> reaction

no_certainty:
= certainty_note "Not asked: your No at question 1 leads directly to question 3 in the standard sequence."
-> reaction

unresolved_certainty:
= certainty_note "Left unresolved: this adaptation continued to question 3 without requiring a yes/no answer."
-> reaction
```

## The same section, proposed

```text
?match truth {
:case yes {
    absolute = !choose {
      **Your thought:** {{thought}}

      **Question 2: Can you absolutely know that it's true?**

      An honest yes can stay yes. This is not a demand to disprove yourself. A lack of absolute certainty also does not erase evidence or a reason to protect yourself.

      - yes: "Yes"
      - no: "No"
      - unresolved: "I don't have an answer; continue without deciding."
    }
    certainty_note = absolute.label
  }
  :case no {
    certainty_note = "Not asked: your No at question 1 leads directly to question 3 in the standard sequence."
  }
  :case unresolved {
    certainty_note = "Left unresolved: this adaptation continued to question 3 without requiring a yes/no answer."
  }
}
```

There is no `reaction` destination to find. Every case continues into question 3 immediately below the match. Choosing `yes` asks question 2; choosing `no` or `unresolved` records the same explanation as before.

## Route preservation

- Opening: one-thought and fuller-worksheet paths rejoin before question 1; leaving completes immediately.
- Question 1: yes asks question 2; no and unresolved go directly to question 3 with their original distinct notes.
- Question 2: every answer continues to question 3.
- Questions 3 and 4: their text notes remain optional.
- Turnarounds: explore shows the same three forms and notes; skip continues directly to closing.
- Closing: the same review and `reflected` outcome remain.
- Pause, end, saving, and other participant controls are unchanged by this proposal.

## Checks and limits

The original snapshot passes the installed Rust compiler without diagnostics (41 nodes). A mechanical comparison verified all authored wording, choices, titles, placeholders, references, and value expressions by occurrence, allowing indentation and the specified syntax changes. All 20 optional fields are retained, and the original comparison snapshot is unchanged.

The branch syntax, exhaustive static-choice cases without an else arm, and `[optional]` marker are now implemented. Runtime regression tests compare all 41 original and rewritten routes, including pause and restore. This trial does not introduce helpers, a new runtime, medical changes, or changes to the published library.

Original source SHA-256: `f11db7a304d04fae725c5812399955daf9a9cd9eee8270bbc1ae2f9e950d769b`.
