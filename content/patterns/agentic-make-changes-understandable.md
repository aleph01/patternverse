---
id: agentic-make-changes-understandable
type: pattern
title: 'Make Changes Understandable'
summary: 'Make consequential behavior, assumptions, and tradeoffs explainable through inspectable code, representative traces, and independently checked evidence.'
status: published
tags:
  - agentic-coding
  - maintainability
  - code-review
  - explanation
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis of engineering review, decision-record, and verification practices. Cases, module responsibilities, summaries, and revision labels are fictional; executed reference checks are identified separately.'
---

## Purpose and problem

The agent says the importer is validated, transactional, and ready for maintenance. Its explanation sounds coherent. Asked what happens when the second write fails, the reviewer finds a commit inside the loop. The prose describes a design the code does not implement.

Make Changes Understandable gives maintainers a way to explain consequential behavior from inspectable artifacts. The useful outcome is a supported account of the changed system: what reaches a write, what stops it, why the design takes this shape, and what remains uncertain.

## Core idea

Connect **a claim to its code, a concrete path, and evidence that could contradict it**. An agent can help locate and explain those artifacts, but its fluency does not establish their agreement.

Understanding is selective: nobody needs to memorize every line. They do need enough coverage of the change to locate its consequential choices and explain relevant normal and failure paths. A diagram or one passing example cannot establish complete comprehension or justify approving unexamined behavior.

## How it works

### Turn a summary into an inspectable account

Begin with intended behavior and the actual revision, configuration, and surrounding contracts. Identify the entry point, transformations, decisions, callers, writes, and outputs. Follow one representative input through these responsibilities, then change a consequential condition: invalid input, stale state, denied authority, or a failed dependency. Explain where execution stops and what state remains.

Separate requirement, source inference, observed result, and unresolved assumption. “The helper is named atomic” is a clue; “the same connection begins before both inserts, commits afterward, and rolls back on this failure” is an inspectable explanation. Show the code that owns the boundary and a suitable check. Expected behavior must come from the requirement or another defensible reference, rather than merely copying the current output.

Google’s [review guidance](https://google.github.io/eng-practices/review/reviewer/looking-for.html) connects functionality and design with understandable complexity, useful tests, naming, and comments. Trace-based explanation complements reviewing the assigned change; it is not permission to sample an interesting path and assume the rest is sound.

### Leave the reasoning where the change lives

Names and structure should expose responsibilities: parsing text, enforcing product rules, authorizing an action, and committing a batch are different operations. Keep a consequential boundary visible instead of distributing its meaning across vague helpers. Comments should preserve reasoning the implementation cannot communicate; they must not promise behavior contradicted by it.

Use a short decision record when a significant interface, dependency, or tradeoff needs durable rationale. Nygard’s [ADR guidance](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) retains context, decision, status, and consequences, including superseded decisions. A local arithmetic correction usually needs a focused explanation and check, not a new architecture document.

Keep the relevant code, tests, and explanation consistent in the reviewable change. A useful record names important callers, assumptions, observed evidence, and remaining limits. [Google’s description guidance](https://google.github.io/eng-practices/review/developer/cl-descriptions.html) includes rationale and checking that the final description still matches the change. Tie evidence to source identity and material working changes; revisit affected traces after a new base or revision changes their assumptions.

### Ask for useful evidence, not a recital

When a maintainer cannot explain a consequential path, locate the missing artifact or run a discriminating check. Reduce incidental complexity within the authorized change where it obscures that path. Do not demand ceremonial explain-backs, rewrite unrelated modules, or measure understanding by document length.

Use existing review and backlog records to retain the unresolved engineering question. Product acceptance criteria define behavior; the team’s Definition of Done adds shared quality obligations. An agent can stop after producing an inspectable proposal while acceptance, review, integration, and release remain open. Stories, sessions, commits, branches, and pull requests need not correspond one to one, and these decisions need no additional Agile ceremony.

## Worked examples

These cases and revision labels are fictional. Python CSV and disposable SQLite checks use the named reference responsibilities; JavaScript references exercise the local correction and interface consumers. No production importer, actual review conversation, or application migration was executed.

### Follow P201 through the write boundary

The create-only importer accepts whole, nonnegative quantities, preserves existing stock, and commits valid new rows together. Each scenario starts independently with `P100: 4`. A valid CSV contains `sku,quantity` followed by `P201,3`.

| Responsibility        | Inspectable value or decision                                                            | Reference observation                          |
| --------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `parse_rows`          | Data row 1; SKU `P201`; quantity text `"3"`                                              | Parsing retains text, not a validated quantity |
| `validate_rows`       | Convert and check quantity                                                               | Normalized quantity is integer 3               |
| `preview_import`      | Retain source and show the proposal                                                      | Inventory remains P100:4                       |
| `confirm_import`      | Re-parse retained source, validate, check current inventory inside the write transaction | P201 must still be absent                      |
| Commit and fresh read | Insert P201:3, then commit                                                               | P100:4 and P201:3 are stored                   |

The trace distinguishes parsing from product validation and preview from authority to write. Python’s [CSV documentation](https://docs.python.org/3/library/csv.html) describes ordinary readers returning text fields; numerical meaning belongs to the application’s rules.

Change only the quantity to `-1`. Preview returns data row 1, code `quantity_nonnegative`. Direct confirmation of the invalid retained source rejects it with zero reference writes and leaves P100:4. The UI’s earlier rejection is not the storage safeguard.

A separate stale-state probe previews P201:3, then another connection inserts P201:5 before confirmation. Confirmation rejects `sku_exists` and preserves that newer quantity. The maintainer can now explain why confirmation rechecks current state rather than trusting a previously valid preview. The reference’s source retention is in memory; actual authorization, token lifecycle, malformed-file handling, and HTTP behavior remain unverified.

![The same P201 row travels from CSV quantity text through normalization, read-only preview, confirmation revalidation, and a committed fresh read. A negative quantity branches to rejection before writes; a stale preview is rejected when P201 already exists at confirmation.](../assets/agentic-coding/understand-trace.svg 'Arrows follow data and decision responsibility, not a claim that every application path was checked. Named functions belong to the teaching reference. SQLite observations verify selected states; browser, authorization, token persistence, and other input cases remain outside the probe.')

### Challenge “all or nothing” at the claimed boundary

Invented summary **S17** describes revision **X17** as all-or-nothing. Its essential write loop is shown schematically:

```python
for row in rows:
    insert_one(row)
    commit()
```

The relevant connection commits inside the loop; no enclosing transaction can make those already committed inserts disappear. Two valid new rows, P201:3 and P202:2, make the difference observable. Inject a controlled exception **before the second write**, retaining the same P100:4 baseline and input in both comparisons.

X17’s incremental reference leaves P100:4 and P201:3 through a fresh connection. S17’s claim predicts only P100:4 after failure. The source and observation agree with each other and contradict the explanation. Calling the function transactional or receiving an error response would not change the persisted prefix.

Corrected reference **T17** explicitly begins one transaction before the loop, commits after both inserts, and rolls back on the same exception. Its fresh read contains only P100:4. SQLite’s [transaction documentation](https://www.sqlite.org/lang_transaction.html) makes the commit and rollback boundaries explicit; an application must inspect how its driver uses them.

Retain the failure probe with the correction and replace S17 with an account of the actual boundary and verified failure point. Improving the explanation alone cannot repair X17 or authorize weakening the all-or-nothing requirement. This probe is a controlled exception, not a process crash, disk failure, concurrent-write test, or proof of all failure behavior.

![For the same two rows and failure before write two, the claimed transition returns to baseline while X17 actually commits P201 before failing. Corrected T17 keeps both inserts within one transaction and retains only the baseline after the same exception.](../assets/agentic-coding/understand-claim.svg 'The claim is invented; the incremental and atomic SQLite references were executed. Arrows show execution order and resulting state. A fresh read refutes S17 for X17, while T17 supports the stated single-transaction explanation only within the exercised conditions.')

### Match the explanation to the changed boundary

A local display helper receives a zero-based logical data index and should show one-based data rows, excluding the header. Changing `index + 2` to `index + 1` makes index 1 display row 2 instead of 3. A proportionate note states that rule, the location, the 0→1 and 1→2 checks, and that the wire contract is unchanged. No transcript or system-wide redesign is needed.

A separate proposal changes the shared error envelope. For the same negative second record, version 1 carries `errors[0].row = 2`; version 2 carries `errors[0].data_index = 1`. Displayed row 2 must remain unchanged. This affects the producer, web renderer, CLI formatter, and saved-preview reader, even if the field rename is short.

Proposed **ADR-17** explains the choice: align the wire index with parser data indices; keep user-facing rows one-based; identify envelope versions; and retain a transition decoder for old saved previews. Its consequences include updating consumers and deciding when old-format support can end. It remains proposed, rather than silently authorizing a migration.

Three reference consumers pass the same version-1 and version-2 fixtures. Web output remains `Data row 2: quantity_nonnegative`; CLI output remains `row 2 [quantity_nonnegative]`; the saved-preview reader normalizes both to index 1. The decoder rejects the exercised unknown-version case. These checks support the named consumers only; deployed clients, stored payload collections, and general malformed-envelope validation are untested.

![A local index-offset correction needs its rule and two checks. A versioned error-interface proposal additionally names producer semantics, web and CLI consumers, saved-preview compatibility, and proposed ADR-17; both retain the same displayed data row 2.](../assets/agentic-coding/understand-scope.svg 'Different engineering scopes require different evidence, not predetermined word counts. JavaScript reference consumers preserve the stated outputs for two envelope versions. The local correction is not an interface change, and the proposed interface record is not an executed application migration.')

## Assumptions for correctness

Source, configuration, and evidence must describe the same relevant state. Requirements and decision status need a defensible basis. A narrow passing probe cannot establish broader guarantees; explanations must retain the boundary between inspected behavior and inference. External documentation also needs to match the dependency or engine being used.

## When to use it

Use this pattern when generated changes are hard to maintain, summaries conceal important assumptions, or a later correction would depend on rediscovering the implementation’s reasoning. For a small understood change, its existing diff and focused evidence may already be sufficient.

## Tradeoffs and operating costs

Traces and decision records require maintenance. Too much duplicated explanation can become another stale source; too little leaves consequential choices implicit. Prefer stable responsibilities, selected concrete cases, and links to current evidence over exhaustive narration or generic assertions that everything is covered.

## Common mistakes and limitations

Fluent prose, a descriptive name, a diagram, or a passing check is not independent proof. Do not force expected results to match the implementation, require recitation as a gate, or refactor unrelated code for a more impressive explanation. Better understanding supports engineering judgment; it does not itself complete acceptance, integration, or release.

## Related patterns

[[agentic-ground-work-in-the-existing-system|Ground Work in the Existing System]] establishes context before editing; this draft makes the resulting change’s consequential behavior inspectable afterward.

[[agentic-keep-context-durable-and-discoverable|Keep Context Durable and Discoverable]] preserves findable knowledge; this draft checks whether the explanation is actually grounded in code and behavior.

[[agentic-review-intent-and-risk|Review Intent and Risk]] chooses consequential review paths and validates findings; this draft leaves a usable account of responsibilities, assumptions, and evidence for maintenance.

[[agentic-keep-a-traceable-change-history|Keep a Traceable Change History]] connects rationale and versions over time; this draft supplies the behavior explanation anchored by those records.

## Sources and further reading

- [Google: What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html) — design, complexity, tests, names, and explanatory comments.
- [Google: Writing good CL descriptions](https://google.github.io/eng-practices/review/developer/cl-descriptions.html) — change rationale and descriptions that match final behavior.
- [Michael Nygard: Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) — consequential decisions, status, context, and consequences.
- [SQLite: Transactions](https://www.sqlite.org/lang_transaction.html) — explicit transaction boundaries and driver-dependent behavior.
- [Python: CSV](https://docs.python.org/3/library/csv.html) — text fields and parsing responsibilities; the selected reference used Python’s installed CSV module.
