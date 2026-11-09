---
id: agentic-steer-through-evidence
type: pattern
title: 'Steer Through Evidence'
summary: 'Use representative results and discriminating checks to change direction before uncertain implementation grows.'
status: published
tags:
  - agentic-coding
  - feedback
  - debugging
  - experimentation
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis of experimental engineering, debugging, prototyping, and documented coding-agent harness experience. Worked cases are fictional; reference calculations are identified separately.'
---

## Purpose and problem

An agent has changed twenty files, passed its new tests, and explained why the importer should work. The first real spreadsheet contains a quoted newline and becomes two products. Activity accumulated while the most consequential assumption remained untested.

Steer Through Evidence places feedback before further commitment. It helps an engineer decide whether to continue, revise, investigate, or stop. A checkpoint earns its place when its result could change that decision; inspecting every keystroke adds interruption without necessarily adding information.

## Core idea

Identify the uncertainty that could invalidate the approach. Choose a representative observation that would distinguish plausible explanations or alternatives, state what its outcomes would mean, then update the next action. Preserve the observation separately from its interpretation.

Brendan Gregg’s [performance methodology](https://www.brendangregg.com/methodology.html) connects hypotheses, predictions, tests, and analysis. Here that established engineering approach becomes a way to steer delegated implementation. It does not make an agent’s confident explanation evidence of correctness.

## How it works

### Put feedback at a decision boundary

Before delegating substantial work, identify what is expensive to discover late: parser semantics, an external contract, a blocking dependency, or an unfamiliar interaction. Ask for a small result that exercises that uncertainty before dependent work expands. Routine implementation can proceed autonomously within agreed boundaries.

Keep a short evidence record:

| Record                         | What it makes inspectable                                                  |
| ------------------------------ | -------------------------------------------------------------------------- |
| Decision and alternatives      | Continue with this parser, adapt it, or replace it                         |
| Prediction and check           | Which input or observation would distinguish the alternatives              |
| Provenance                     | Source revision, configuration, fixture, environment, command or procedure |
| Observation                    | Actual output, error, trace, or observed action                            |
| Interpretation and next action | What changed, what remains unknown, and who acts next                      |

Changed files show production of artifacts. Executed tests show that checks ran. Their inputs, expectations, outputs, and relationship to intended behavior determine what they establish. Ten passing tests of plain CSV do not answer a quoting question.

Anthropic’s [long-running harness account](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents) reports a particular failure mode: agents could make changes and run local checks while missing failures in the complete user path. Explicit browser testing helped in that web-app setting, with limitations. This is documented experience from one harness, not a general success-rate estimate or a requirement to use that toolchain.

### Make the result change the plan

Predict how competing explanations would produce different observations. If all predict the same timeout, another timeout is a reproduction, not a diagnosis. Inspect a stage boundary, isolate an input, or seek positive evidence for the suspected wait. Missing telemetry may mean missing instrumentation rather than missing execution.

Set an investigation budget appropriate to the decision: a bounded fixture probe, one instrumented reproduction, or an agreed time allowance. At its limit, report unresolved alternatives and choose a narrower check, a reversible fallback, or a request for a decision. Random retries and unlimited investigation both consume the implementation budget.

Attach evidence to the tested revision. A branch name moves; identify the actual source state and relevant dependency versions. Keep experimental changes isolated from others’ unfinished work, retain useful fixtures, and carry conclusions into the task or review record. Recheck a conclusion when integration changes its assumptions. A discovery task’s stopping condition may be a documented parser decision; product acceptance, the team’s Definition of Done, review, integration, and release still require their own evidence. Teams can incorporate these findings into normal backlog refinement and delivery without adding a ceremony for every probe.

## Worked examples

The following cases are fictional. CSV outputs are independently checked reference calculations. Timeout events and prototype observations are constructed teaching records, not production measurements or a user study.

### Probe the parser before building upload controls

An inventory team proposes splitting text at CRLF and then commas. It works on `P100,shelf`. Before building the upload experience, the task is to determine whether that approach preserves quoted fields and rejects an unfinished quote.

The valid fixture has header `sku,note` and two records. In the first note, the displayed line break is a CRLF inside quotes:

```csv
sku,note
P100,"front
shelf"
P200,"He said ""ok"", then left"
```

The expected notes are `front\r\nshelf` and `He said "ok", then left`. The selected format follows [RFC 4180’s quoted-field conventions](https://www.rfc-editor.org/rfc/rfc4180); supported dialects must still be agreed with actual producers.

A literal split produces three apparent data rows, including a one-field `shelf"` fragment, and splits the second note’s comma. On a separate fixture ending `P100,"front`, it accepts an unfinished quoted field as text. These observations reject the proposed splitter for this contract.

A reference run using Python’s [`csv.reader` with `strict=True`](https://docs.python.org/3/library/csv.html#csv.Dialect.strict) returns two records for the valid fixture and raises a CSV error for the unfinished quote. The next implementation decision is to evaluate an established parser with equivalent required behavior in the application’s runtime. This reference is not a selected production library or a complete dialect conformance test. Encoding, streaming boundaries, resource limits, and importer error reporting remain unresolved.

![The same quoted CSV input reaches a literal line-and-comma splitter and a strict CSV reference. The splitter fragments a multiline note and accepts an unfinished quote; the reference preserves two records and rejects the unfinished quote.](../assets/agentic-coding/steer-parser.svg 'Fictional fixtures, independently checked with the stated algorithms. The failed split changes the parser decision before upload work expands. Passing these fixtures does not establish a production importer or general CSV conformance.')

### Diagnose a timeout without optimizing the wrong stage

Request R17 times out at an illustrative 3,000 ms. Three plausible explanations are slow parsing, database contention, and a disconnected worker result path. Increasing the timeout or timing the whole request again cannot distinguish them.

The engineer requests correlated stage observations before changing code:

| Hypothesis                            | Discriminating evidence to seek                                    |
| ------------------------------------- | ------------------------------------------------------------------ |
| Parsing occupies the timeout interval | Parser start/end for R17, with reliable instrumentation            |
| Database contention blocks progress   | Database wait reason and identified blocking transaction           |
| Worker result path is disconnected    | Delivery/acknowledgement evidence or an explicit transport failure |

In the constructed record, parsing ends at 12 ms; a database operation begins waiting at 14 ms and is still pending at the deadline. Completed parsing rules out ongoing parsing as the explanation for this request’s remaining wait. A pending database span alone does not identify contention or establish worker connectivity.

A correlated database lock record then identifies transaction TX9 blocking R17 from 14 to 4,014 ms: a 4,000 ms wait. This positively identifies contention as a contributor. Result delivery has not been traced, so a concurrent worker fault remains possible. The next action is to inspect TX9’s transaction boundary and collect the missing delivery evidence, rather than rewrite the parser or declare a complete diagnosis.

![Three timeout hypotheses lead to targeted observations. Parser completion narrows the explanation; a correlated TX9 lock record establishes database contention while worker result delivery remains unobserved.](../assets/agentic-coding/steer-timeout.svg 'Constructed request R17 observations, not measured traces. Arrows show evidence narrowing an explanation, not probabilities or causal proof of every failure. Positive lock evidence identifies one contributor; the unobserved result path remains open.')

### Learn from a prototype without promoting it to production

An import preview disables confirmation when data row 2 has an invalid quantity. The uncertain interaction is how someone finds and repairs that row. Building persistence and background processing first would not answer it.

The team compares two prototypes with the same file and error. A shows only “Cannot confirm.” B adds “Fix row 2,” opens that row’s quantity field, retains the selected file and other rows, and returns to preview after correction. In the fictional walkthrough, the participant gets stuck in A and completes that path in B. This supports carrying B into the next design iteration for this task; it does not establish a population-wide usability result.

The evidence record retains the prototype revision, starting state, instructions, observed actions, and unresolved questions. The [GOV.UK prototyping guidance](https://www.gov.uk/service-manual/design/making-prototypes) explicitly separates learning from prototypes from production code standards. Here authorization, persistence, keyboard and assistive-technology access, failure recovery, and representative load remain to be checked. A disposable prototype can inform a specification even when none of its code is retained.

![The same row-2 quantity error is held constant across two prototype paths. The repair link supports completing the fictional walkthrough; a separate dashed area lists production conditions that were not tested.](../assets/agentic-coding/steer-prototype.svg 'Constructed walkthrough, not conducted user research. The interaction changes while the file and error stay fixed. Evidence for this repair path does not establish accessibility, authorization, persistence, recovery, or scalability.')

## Assumptions for correctness

Inputs must preserve the property being investigated. Traces need sufficient coverage, request correlation, and trustworthy timing; absence alone rarely excludes a hypothesis. Expected behavior must have a defensible basis outside the current implementation. Preserve contrary results and distinguish an inconclusive check from a successful one.

## When to use it

Use this pattern before uncertain choices attract dependent implementation, when progress reports describe effort more clearly than behavior, or when several causes fit one failure. Favor direct routine verification when the requirement and implementation path are already well established.

## Tradeoffs and operating costs

Probes, representative fixtures, instrumentation, and interpretation take time. A simplified environment may remove the condition that matters; realistic investigation may be costly or disruptive. Choose the least costly check that can alter the decision, and revisit that choice if the evidence stays ambiguous.

## Common mistakes and limitations

Convenient examples can hide the edge case. Aggregate pass counts, screenshots, and green dashboards can be misleading proxies. Changing several variables prevents attribution; a check predicted by every hypothesis cannot select one. Repeatedly revising expectations to fit output removes the challenge the check was meant to provide. Early feedback reduces uncertainty within its scope; it does not replace independent review or final acceptance.

## Related patterns

[[prefer-the-smallest-useful-experiment|Prefer the Smallest Useful Experiment]] is the published general decision principle. This article adds revision-specific engineering evidence and steering delegated implementation.

[[agentic-make-boundaries-and-decisions-explicit|Make Boundaries and Decisions Explicit]] is a local draft defining authority and decision triggers; this pattern supplies observations at those triggers.

[[agentic-keep-context-durable-and-discoverable|Keep Context Durable and Discoverable]] is a local draft preserving findings across sessions; this pattern determines which findings justify changing direction.

[[agentic-agree-on-done|Agree on Done]] is a local draft separating completion obligations; a useful probe can finish while product work remains incomplete.

## Sources and further reading

- [Brendan Gregg: Performance Analysis Methodology](https://www.brendangregg.com/methodology.html) — hypotheses, elimination, workload context, and investigation costs.
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents) — reported testing limitations and end-to-end feedback in a particular agent harness.
- [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180) and [Python CSV documentation](https://docs.python.org/3/library/csv.html) — quoting conventions, strict parsing, and physical-line versus record distinctions.
- [GOV.UK: Making prototypes](https://www.gov.uk/service-manual/design/making-prototypes) — testing ideas while retaining a separate production-quality obligation.
