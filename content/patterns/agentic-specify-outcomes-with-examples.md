---
id: agentic-specify-outcomes-with-examples
type: pattern
title: 'Specify Outcomes with Examples'
summary: 'Describe observable behavior with concrete acceptance examples so a coding agent can implement and verify the intended outcome without guessing the product rules.'
status: published
tags:
  - agentic-coding
  - specifications
  - acceptance-criteria
  - software-engineering
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis adapting specification by example to agentic coding. All inventory, search, and copy examples are fictional; diagrams show specified outcomes, not measured agent performance.'
---

## Purpose and problem

“Add CSV import and handle errors.” A coding agent returns an upload form and a parser. Valid rows are saved while invalid rows are skipped. The developer expected the entire file to be rejected if any row failed. Both interpretations fit the request.

The missing information was a product decision, not a programming technique. A longer description of the parser would not necessarily have resolved it.

Specify Outcomes with Examples connects an intended behavior to concrete situations and observable results. It gives implementation and review a shared reference while keeping technical choices open where they do not affect the requirement.

## Core idea

Combine a rule with examples that expose its meaning: a starting state, an action, an expected result, and anything that must remain unchanged.

“Reject an invalid import” becomes more useful when a file contains one valid row followed by an invalid one and the expected result explicitly preserves existing inventory. The example distinguishes rejection from partial success.

This adapts established Specification by Example practice. Gojko Adzic describes collaboratively choosing and refining examples to communicate the required behavior without unnecessary implementation detail. Applying that approach to agent tasks is an editorial adaptation, not evidence that a particular prompt guarantees reliable implementation. [Specification by Example, chapter 2](https://manning-content.s3.amazonaws.com/download/d/5a22dfb-908c-408d-aaa1-46873b6b18c9/adzic_ch02.pdf)

## How it works

Begin with the outcome and identify choices that would produce meaningfully different behavior. Select an ordinary case, a boundary, and a failure that distinguish those choices. State the rule each example illustrates; several examples may share one rule.

Keep unresolved questions visible. Cucumber’s Example Mapping separates rules, examples, questions, and newly discovered scope. An agent can suggest missing cases, but its suggestions do not settle an unanswered product decision. [Example Mapping](https://cucumber.io/docs/bdd/example-mapping/)

Use a compact table or scenario rather than a prescribed click sequence. Gherkin provides one optional notation: Given establishes context, When identifies an event, and Then states the expected outcome. Executable scenarios also need implemented step definitions and assertions; formatting prose this way does not run a check. [Gherkin reference](https://cucumber.io/docs/gherkin/reference/)

Keep expected results grounded in the agreed rule, rather than copying the current implementation’s output. Derive checks from them and retain explicit links between requirements and verification.

## Worked examples

### An invalid import must leave inventory unchanged

In this fictional application, inventory initially contains only `P100` with quantity `4`. The request becomes:

> Preview an import before confirmation. Require `sku` and `quantity` columns. Identifiers are nonempty and case-sensitive; quantities are whole numbers at least zero. Reject identifiers repeated within the file or already present in inventory. Show all row errors. An invalid file must change no inventory. Confirmation of a valid file must apply all rows or none.

The last sentence also requires a write-failure check; prevalidation alone cannot establish it. The brief leaves parsing libraries and storage design open while settling observable behavior.

Consider this file, with data rows numbered from one, excluding the header:

```csv
sku,quantity
P201,3
P202,-1
P201,2
```

The expected preview reports an invalid quantity at row 2 and a repeated identifier at row 3 referencing row 1. It offers no confirmation of this invalid file. Inventory remains exactly `{P100: 4}`; the apparently valid first row is not imported.

An acceptance matrix distinguishes neighboring cases. Every row below starts from the same initial inventory and uses a separate file.

| File condition                                | Expected result                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| New identifiers `P201,3` and `P202,0`         | Preview succeeds without writing; confirmation adds both products. `P100` stays at `4`. |
| Second row has quantity `-1`                  | Report row 2; reject the file; inventory is unchanged.                                  |
| Third row repeats first-row identifier `P201` | Report row 3 and its earlier occurrence; reject the file.                               |
| First row uses existing identifier `P100`     | Report row 1; preserve its existing quantity.                                           |
| `quantity` column is missing                  | Report the missing column; change no inventory.                                         |

![An import acceptance matrix distinguishes successful confirmation, a negative quantity, and a repeated identifier. A three-row CSV contains both errors; the expected report identifies rows 2 and 3, and the final inventory remains P100 with quantity 4.](../assets/agentic-coding/specify-outcomes-import.svg 'Fictional specification, not a running importer. Each matrix case begins with P100 = 4. The displayed file contains two independent validation failures; rejection preserves all existing inventory. A write-time all-or-none guarantee needs additional verification.')

The matrix makes partial import an observable failure. It does not settle file-size limits, encoding, simultaneous imports, or cancellation; record those questions separately rather than silently accepting the agent’s defaults.

### “Relevant results first” leaves two different gaps

A fictional search returns `A10` and `A20` with equal relevance score `8`, followed by `A30` with score `7`. “Relevant results first” allows both `A10, A20, A30` and `A20, A10, A30`. An example containing only unequal scores would hide the ambiguity.

The revised contract sorts by decreasing score, then increasing identifier, and returns no results for an empty or whitespace-only query. With page size two, the unchanged fixture produces `A10, A20` and then `A30`. PostgreSQL likewise warns that LIMIT/OFFSET needs a unique ordering for predictable subsets. [LIMIT and OFFSET](https://www.postgresql.org/docs/current/queries-limit.html)

Now insert `A05`, also scoring `8`, after the first page was read. The new ordering is `A05, A10, A20, A30`. Skipping two rows for the next page yields `A20, A30`, repeating `A20` despite deterministic ordering.

![Equal relevance scores allow two result orders until an identifier tie-breaker is specified. A separate paging timeline shows that inserting A05 between requests makes offset paging repeat A20; the chosen fixed-result-set contract instead returns A30 on page two.](../assets/agentic-coding/specify-outcomes-search.svg 'Fictional scores and identifiers. Tie-breaking constrains order for unchanged inputs. Consistency across changing inputs is a separate product decision; a cursor alone does not establish a fixed snapshot.')

Here the team chooses a fixed result set for each paging session: page two still contains only `A30`; a new search sees `A05`. This is a specified outcome, not an implemented snapshot mechanism. Alternatives may be appropriate, but the agent should not choose one invisibly. A cursor alone does not prove that results remain fixed.

### A copy correction needs a small contract

Suppose an existing quantity form says “Save changes” and should say “Save quantity.” The requirement can be one sentence: replace that button’s visible label and accessible name, preserving its save behavior and the rest of the form.

The literal before-and-after text is sufficient illustration. Inspect both names and the existing save path; no elaborate scenario catalogue or separate graphic improves this decision. Passing that check establishes the scoped correction, not general accessibility or correctness of the whole form.

## Assumptions for correctness

Someone must be able to justify the expected behavior. Examples generated from guesses can make an incorrect requirement unusually precise.

Checks also need controlled starting conditions. The import cases reset inventory; search expectations identify whether data remains fixed. Verify through relevant observable interfaces, adding lower-level evidence where needed to inspect persistent effects.

When an example contradicts existing behavior, decide whether it reveals a defect or requests a behavior change before treating it as authoritative.

## When to use it

Use this pattern when short requests admit different reasonable implementations, when edge behavior matters, or when a review needs an agreed basis for acceptance. It fits backlog refinement, a bounded agent task, and a bug report.

For exploratory work, specify the question and evidence sought while leaving the eventual product behavior open.

## Tradeoffs and operating costs

Examples require discussion, maintenance, and selective automation. Spend effort on distinctions with meaningful consequences; many repetitive cases can conceal the missing rule.

Keep the brief and fixtures versioned with the relevant work. An intentional rule change should update its examples and checks together. A review description can identify the accepted cases and remaining uncertainty. One backlog item may span several agent tasks and pull requests.

## Common mistakes and limitations

Do not confuse passing these acceptance cases with satisfying the shared quality standard. In Scrum, the Definition of Done describes the quality measures for a usable Increment; it is broader than one feature’s examples. An agent task can stop before the parent feature meets that standard, and release remains a separate decision. [Scrum Guide](https://scrumguides.org/scrum-guide.html)

Avoid prescribing private function names or exact internal calls unless compatibility makes them necessary. Such details can make checks brittle without clarifying user behavior.

Finite examples do not prove complete coverage. Do not weaken expectations to match generated code, confuse a green check with an independently correct requirement, or treat clearer specification as evidence of measured productivity gains.

## Related patterns

[[use-contrast-not-just-examples|Use Contrast, Not Just Examples]] communicates a subtle boundary through nearby alternatives; this pattern connects software rules to starting conditions, actions, and accepted outcomes. [[preserve-the-invariants|Preserve the Invariants]] emphasizes what must survive a change, such as existing inventory. [[ml-behavioral-testing|Behavioral Testing]] makes selected model expectations executable; the specification here concerns the software being built, regardless of whether that software contains a model.

## Sources and further reading

- [Gojko Adzic: Specification by Example, chapter 2](https://manning-content.s3.amazonaws.com/download/d/5a22dfb-908c-408d-aaa1-46873b6b18c9/adzic_ch02.pdf) — refining collaboratively chosen examples.
- [Cucumber: Example Mapping](https://cucumber.io/docs/bdd/example-mapping/) — rules, examples, questions, and scope.
- [Cucumber: Gherkin reference](https://cucumber.io/docs/gherkin/reference/) — scenario semantics and automation.
- [PostgreSQL: LIMIT and OFFSET](https://www.postgresql.org/docs/current/queries-limit.html) — unique ordering for predictable subsets.
- [The Scrum Guide](https://scrumguides.org/scrum-guide.html) — Increment and Definition of Done.

The cases and drawings are original teaching material. No coding agent, importer, or search service is benchmarked here.
