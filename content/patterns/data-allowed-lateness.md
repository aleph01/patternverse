---
id: data-allowed-lateness
type: pattern
title: Allowed Lateness
summary: "Retain window state for a defined event-time horizon so accepted late records can revise results before routine correction stops."
status: published
aliases: []
tags:
  - data-engineering
  - streaming-event-processing
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

A dashboard publishes a five-minute purchase total. A delayed mobile event arrives moments later and belongs to that same interval.

Discarding it preserves a stable answer but loses valid activity. Keeping every interval open forever preserves correction opportunities but creates unbounded state and endlessly changing reports.

**Allowed Lateness gives an event-time window a bounded opportunity to accept delayed records after its initial completion point.** The system can publish a useful result, retain the state needed for revisions, and eventually stop updating that window through the live computation.

The pattern makes a practical agreement: results may change within this horizon; later corrections follow a different route.

## Keep membership, progress, and acceptance separate

A window’s interval determines which event timestamps belong to it. Its watermark indicates progress through event time. Allowed lateness governs how long the window remains eligible for delayed contributions after that progress passes the window’s end.

For a window `[10:00, 10:05)` with ten minutes of allowed lateness, the cleanup boundary is approximately watermark 10:15. Exact boundary arithmetic depends on timestamp precision and implementation.

The membership interval remains `[10:00, 10:05)`. An event timestamped 10:12 does not become eligible merely because the system still retains the earlier window.

Flink documents this mechanism directly: allowed lateness retains window state beyond the initial watermark crossing, permits qualifying late records to update it, and eventually removes that state. Its default allowance is zero. [Apache Flink allowed-lateness documentation](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/dev/datastream/operators/windows/#allowed-lateness)

Crucially, this is an **event-time progress horizon**. Ten minutes of allowed lateness does not mean ten wall-clock minutes after a report first appears.

![A window publishes 100 at watermark 10:06, accepts a delayed event and revises the total to 120 at watermark 10:09, then routes another delayed event to a correction path after cleanup.](../assets/data-engineering/allowed-lateness.svg "For window [10:00,10:05) with ten minutes of allowed lateness, an event arriving at watermark 10:09 updates 100 to 120. At watermark 10:16, a further event goes to a separate correction route.")

## A purchase total stays open for correction

Consider an illustrative purchase window containing two initially observed events:

| Event | Event time | Amount |
|---|---|---:|
| E1 | 10:01 | 30 |
| E2 | 10:04 | 70 |

When the watermark reaches 10:06, an end-of-window trigger publishes `100`. The window’s ten-minute allowance keeps its state available beyond that first firing.

Two more records arrive later:

| Event | Event time | Watermark when processed | Amount | Handling |
|---|---|---|---:|---|
| E3 | 10:03 | 10:09 | 20 | Accept and revise |
| E4 | 10:02 | 10:16 | 5 | Outside live acceptance horizon |

E3 raises the total to `120`. E4 still belongs to the original interval, but its live state has expired. A configured correction route can retain it for historical repair.

The complete historical total would be `125`, assuming all four events are valid and distinct. The live result remains `120` until another process repairs it.

That distinction should be visible to consumers. “Final under the streaming policy” describes a processing decision, not proof that no further valid fact exists.

The example also shows why allowed lateness is not simply a maximum age for each event. Eligibility depends on the window’s boundary and current progress, rather than only the difference between an event timestamp and the clock.

## Accepting a record does not define its output

Retention gives the operator an opportunity to incorporate late data. A trigger determines when it emits another result.

A system might update immediately, collect corrections briefly, or wait until closure. Apache Beam exposes these choices separately through allowed lateness, triggers, and accumulation modes. [Apache Beam trigger and accumulation documentation](https://beam.apache.org/documentation/programming-guide/#triggers)

For the purchase example, two valid publication contracts are:

| Contract | First output | Late output | Consumer action |
|---|---:|---:|---|
| Complete revised totals | 100 | 120 | Replace the earlier total |
| Incremental contributions | 100 | 20 | Add the new contribution once |

Mixing these contracts produces incorrect results. Adding `100` and `120` counts earlier contributions twice.

Beam’s accumulating mode retains earlier contributions in subsequent panes; discarding mode emits contributions since the preceding firing. “Discarding” here concerns accumulation between emissions—it does not itself mean rejecting late input.

The destination also needs retry protection. Repeating a revised total should not create another row, and repeating an incremental contribution should not add it again. Stable result keys, revision ordering, or uniquely identified changes make the contract enforceable.

## Sometimes the right choice is to delay the action

A monitoring rule alerts when a device produces fewer than three observations during an hour.

At the first publication point, the observed count is two. A delayed third observation arrives within the accepted correction horizon.

A dashboard can revise two to three. An alert already delivered to an operator may be much harder to retract meaningfully.

Kafka Streams documents this problem and provides suppression until a window closes. Its example combines an hourly window, a ten-minute grace period, and final-result suppression before evaluating a low-count alert. [Kafka Streams final-window-results documentation](https://kafka.apache.org/41/streams/developer-guide/dsl-api/#windowing)

This separates two product needs. One consumer can receive provisional updates for visibility, while another waits for the policy’s final result before acting.

The cost is additional latency and buffering. Closure also depends on the engine’s progress model, so an hour ending at 10:00 with ten minutes of grace does not establish a universal wall-clock delivery promise of 10:10.

## Choose the allowance from observed consequences

Suppose an illustrative trial measures 10,000 events against the actual window lifecycle:

| Arrival category | Events |
|---|---:|
| Available before initial publication | 9,700 |
| Accepted during a ten-minute revision horizon | 290 |
| Arrived beyond that horizon | 10 |

The allowance captures 290 additional events in the live calculation. Those figures help quantify its benefit, but they do not establish that ten minutes is the right setting.

The remaining ten events might all come from one important source. They might carry unusually large amounts, or arrive during outages that the trial rarely encountered.

Measure lateness by source and relevant segment, and assess its effect on results—not only its frequency. Record the watermark and applicable window when evaluating acceptance; a histogram of wall-clock transport delay alone may not reproduce the operator’s decisions.

Longer outages and offline sources may be better served by a separate reconciliation process than by retaining every live window for days.

## Account for state and correction traffic

Allowed lateness is useful when sources regularly deliver delayed events and consumers benefit from prompt, revisable results.

Its operating costs include retained aggregate state, event buffers where required, checkpoints, recovery time, and downstream updates. A sum can often retain a compact accumulator. Exact distinct counts, complex ordering, or calculations requiring original records can need much more state.

Long allowances multiply the number of retained windows across active keys. Overlapping windows can let one late event revise several results. Session windows add another complication: accepted late activity can merge previously separate groups, requiring superseded results to be retired.

Increasing the allowance does not automatically preserve additional history already deleted by an earlier policy. Expanding a horizon may therefore require replay or a rebuild, rather than only a configuration change.

## Make the boundary observable

Records outside the live horizon need an explicit outcome: retain for correction, quarantine for investigation, or exclude under a documented policy. Flink provides a late-data side output for this purpose. [Apache Flink late-data routing](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/dev/datastream/operators/windows/#getting-late-data-as-a-side-output)

Changing their timestamps to force acceptance would assign them to the wrong business interval.

Framework settings also require translation. Kafka Streams uses grace periods; Spark ties late-data handling to watermark semantics and operator behavior. Spark explicitly states that data beyond its watermark delay may or may not still be processed, so that delay should not be treated as an interchangeable allowed-lateness switch. [Spark watermark guarantees](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#semantic-guarantees-of-aggregation-with-watermarking)

Verification should cover accepted corrections, cleanup boundaries, repeated delivery, and downstream revisions. Monitor both excluded records and the measures they would change.

## Related patterns

[[data-watermarks|Watermarks]] supplies the event-time progress used to assess window completion.

[[data-event-time-processing|Event-Time Processing]] preserves the occurrence timestamps that determine membership.

[[data-session-windows|Session Windows]] shows how late acceptance can change grouping boundaries as well as totals.

[[data-historical-restatement|Historical Restatement]] repairs valid facts that arrive after live state expires.
