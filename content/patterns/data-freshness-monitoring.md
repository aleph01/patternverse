---
id: data-freshness-monitoring
type: pattern
title: Freshness Monitoring
summary: "Measure how current usable data is against a timeliness objective, tracing delay through source progress, processing, publication, and consumption."
status: published
aliases: []
tags:
  - data-engineering
  - quality-observability
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

The dashboard says “updated just now.” The pipeline’s latest run succeeded. Yet the orders available to users stop seventeen minutes before the present.

The refresh timestamp describes activity. It does not describe the currency of the data.

**Freshness Monitoring measures whether available data meets an explicit timeliness promise.** It connects source progress, processing, publication, and consumption so that a healthy-looking pipeline cannot silently serve an outdated picture.

Its purpose is to detect delay before people make decisions under the assumption that the data is current.

## Choose the clock that answers the question

Several timestamps can describe the same record:

| Clock | What it describes |
|---|---|
| Event time | When the business event occurred |
| Source commit time | When the source committed the change |
| Arrival time | When the receiving system obtained it |
| Publication time | When the processed result became available |

A fifth timestamp—the last successful job run—describes execution.

These clocks answer different questions. Event-to-publication delay matters when tracking recent customer activity. Source-commit-to-publication delay matters when replicating operational state. A daily report may instead require a particular business period to be published before a deadline.

Do not label all of these simply “freshness.”

Define the promise in terms users recognize: “All required sources are represented through a point no more than five minutes behind,” or “Yesterday’s complete settlement is available by 08:00 Europe/Berlin.”

Then specify how the system obtains trustworthy evidence for that promise.

![Freshness monitoring at noon UTC. Source progress reaches noon and landing data represents source progress through 11:59:50, but the published dataset represents progress only through 11:43. The latest job succeeded at noon, yet published data breaches a five-minute freshness objective.](../assets/data-engineering/freshness-monitoring.svg "At noon the source is at 12:00 and landing at 11:59:50, but the published dataset is only current through 11:43. A job succeeding at noon does not repair the seventeen-minute data lag against a five-minute objective.")

*Measure the source progress represented in the consumer-facing result. A successful execution does not establish that this progress advanced.*

## Example: ingestion is current, publication is stale

At 12:00 UTC, an active source has committed changes through noon. Landing storage has applied changes through 11:59:50. The published model represents source changes only through 11:43.

The delivery objective allows five minutes of delay. Landing is ten seconds behind; the published model is seventeen minutes behind.

The source connector is probably not the immediate bottleneck. The evidence points toward transformation, validation, publication, or the serving path.

For this design, the calculation is:

**Published age = observation time − source time represented by the published version**

The progress value must describe changes actually applied. Receiving a log record is not equivalent to applying it, and applying changes to a private candidate is not equivalent to publishing them.

Commit the progress checkpoint with the corresponding dataset version. Otherwise, a separately updated status record can announce progress that consumers cannot yet see.

For multiple required partitions, retain progress per partition. One fast partition must not hide another that has stopped. A timestamp from the newest record is not a substitute for evidence that the relevant preceding changes were processed.

Also observe the consumer surface. A fresh warehouse table can still sit behind an outdated materialized view, replica, or result cache.

## Example: a daily feed misses its business deadline

A finance report must contain the previous business day’s complete settlement by 08:00.

At 07:55, the loader writes a new status row and successfully reprocesses an older file. A monitor using the latest load timestamp reports that the table is fresh. The expected settlement file is still absent.

This promise requires a calendar-aware check: the expected business date, required files or source partitions, completion evidence, and publication deadline. Weekends, holidays, timezones, and daylight-saving changes belong in that definition.

A zero-transaction day can be complete. It still needs affirmative evidence—such as a source completion manifest—rather than relying on the presence of a recent transaction.

dbt provides configurable freshness thresholds through `warn_after` and `error_after`, with a loaded timestamp field, a custom query, or supported adapter metadata supplying the measurement. Its documented timestamp query uses the maximum loaded value. That is useful when recent loading is the intended signal; it does not independently prove business-period completeness. [dbt freshness configuration](https://docs.getdbt.com/reference/resource-configs/freshness)

Run the check explicitly. Current dbt documentation describes `dbt freshness` for version 2 and later, while `dbt source freshness` remains supported for source-only checks. A configured rule needs an executing monitor, not merely a place in a project file.

## Example: distinguish a quiet stream from a stalled one

An equipment stream emits events only when something changes. Overnight, no events arrive.

An alert based on “time since the newest business event” cannot distinguish normal silence from a disconnected pipeline.

A heartbeat can provide evidence of movement. Inject a timestamped marker into the source path and observe its progress through ingestion, transformation, and publication.

Prometheus recommends this approach for offline processing: pass a heartbeat through the system and expose the latest heartbeat timestamp seen at each stage. This provides broader evidence than a stage-local “last processed something” timestamp. [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/)

The marker must exercise the path being monitored. A heartbeat written directly to the destination proves little about source ingestion. A marker that can overtake blocked business records does not prove those records were delivered.

Where processing is partitioned, heartbeat coverage must reflect the required partitions or an explicitly narrower scope.

Heartbeats establish liveness and propagation delay under those assumptions. They do not prove that every business event arrived. Keep completeness and reconciliation checks alongside them.

## Use several signals to explain the delay

Freshness is the symptom users experience. Supporting signals help identify its cause.

Track arrival activity, backlog, processing delay, applied source positions, publication progress, and the last successful consumer probe. Preserve their meanings rather than combining them into one ambiguous number.

Google Cloud Dataflow illustrates this distinction. Its streaming data-freshness metric relates processing time to event timestamps, while system latency measures how long data has been processing or awaiting processing. It also exposes backlog metrics. These signals help distinguish event-time delay from time spent inside the processing system. [Dataflow job metrics](https://docs.cloud.google.com/dataflow/docs/guides/using-monitoring-intf)

Old events arriving during a backfill can increase event-time delay without indicating that live processing has stalled. Conversely, one recently processed event can make a maximum timestamp look healthy while older work remains blocked.

A watermark can help describe streaming progress, but its meaning depends on the source and processing assumptions. Do not present an estimate about event-time completeness as an unconditional guarantee that no earlier event will ever arrive.

## Alert on the promise, and monitor the monitor

Choose thresholds from the delivery requirement and the time needed to respond. A warning should leave useful intervention time before the breach becomes consequential.

Evaluation frequency matters. A five-minute objective checked once an hour cannot be monitored effectively. Detection also includes query duration, any persistence requirement before alerting, and notification delay.

Give alerts enough context to act: affected dataset and scope, measured boundary, observation time, threshold, recent stage progress, and owner. Group related downstream symptoms when one upstream failure explains them.

Treat missing measurements as an explicit state. An empty result, failed query, absent partition, or stopped monitor must not silently become “fresh.”

Prometheus recommends exporting the timestamp of the last event and calculating its age at observation time. This avoids an age gauge remaining frozen when its update logic stops. [Prometheus timestamp instrumentation](https://prometheus.io/docs/practices/instrumentation/#timestamps-not-time-since)

Still monitor whether that timestamp and its collection path are available. Distinguish healthy, delayed, and unknown conditions.

## Costs and limits

Freshness checks consume queries, metadata reads, monitoring storage, and operator attention. Repeated full-table timestamp scans can become expensive. Progress records maintained with publication can reduce that work, provided they accurately represent committed data.

Control metric dimensions: per-record identifiers rarely belong in a monitoring system. Retain detailed evidence elsewhere and expose the operational scopes needed for diagnosis.

Check timestamp plausibility. Future-dated records, inconsistent timezones, or clock skew can produce negative ages and false reassurance. Rewriting every row’s load timestamp during a replay can similarly make old business data appear new.

This pattern is especially useful for operational dashboards, replicated datasets, scheduled feeds, and streaming products. It establishes timeliness under a defined contract; fresh data can still be incomplete or wrong.

[[data-run-ledgers|Run Ledgers]] preserves execution and publication evidence. [[data-atomic-publication|Atomic Publication]] keeps progress aligned with visible data. [[data-segmented-quality-checks|Segmented Quality Checks]] exposes stalled subpopulations. [[data-source-to-target-reconciliation|Source-to-Target Reconciliation]] checks whether the expected records actually arrived.
