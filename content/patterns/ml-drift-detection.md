---
id: ml-drift-detection
type: pattern
title: 'Drift Detection'
summary: 'Compare current data with an identified reference to flag changes, then investigate what changed and whether prediction quality is affected.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A ticket-routing model still answers requests successfully, but more tickets now arrive through the mobile app. Has the model become unreliable, or has the business simply changed where customers contact support? Meanwhile, a separate failure could make its routes worse without changing that channel mix at all.

Drift Detection makes such changes visible. It compares a current window with an identified reference and raises a signal under a declared rule. The signal starts an investigation; it does not by itself diagnose the cause, measure model damage, or justify replacing the model.

## Core idea

Ask **what changed, relative to what, and according to which comparison?** A useful monitor names the population, feature or behavior, reference period, current period, statistic, and alert policy. Without that context, “drift detected” is an ambiguous conclusion.

Input drift concerns changes in the distribution of observed features. Prediction drift concerns changes in model outputs. Concept drift concerns changes in the relationship between inputs and targets, as discussed in [Gama and colleagues’ survey](https://doi.org/10.1145/2523813). These changes can coexist. Detecting one does not establish the others.

## How it works

Choose a reference that represents the comparison you need: an approved training snapshot, a previous operational window, or a seasonally matched period. A fixed reference preserves a stable comparison; a rolling reference follows recent conditions but can gradually absorb a persistent change. Record its identity rather than silently replacing it.

Define windows and eligibility consistently. Match feature definitions, population filters, time zones, missing-value handling, and category or bin boundaries. Check collection failures before interpreting a distribution change as a change in users. For numeric features, a binning choice can hide movement inside a bin.

Compute a suitable difference measure or test. For categorical proportions, one simple measure is the largest absolute category-share difference, also called **L-infinity distance**. [TensorFlow Data Validation’s tutorial](https://www.tensorflow.org/tfx/tutorials/data_validation/tfdv_basic) documents this comparison between data spans and configurable drift thresholds. That documented implementation is distinct from the independent teaching explorer below.

Define the response policy before interpreting the newest result. Consider volume, effect size, seasonality, repeated checks, and normal historical variation. Sequential methods offer another approach: [River’s ADWIN documentation](https://riverml.xyz/latest/api/drift/ADWIN/) describes an adaptive window that compares subwindow averages. A detector monitoring prediction errors needs suitable observed outcomes; feeding it an input feature answers a different question.

## Worked examples

### A large input shift can leave accuracy unchanged

All tickets, labels, and computations here are fictional. A fixed teaching router **M1** predicts **Billing for web tickets** and **Access for app tickets**. This deliberately simple rule is not trained. Reference R contains **100 tickets**, with **80 web and 20 app**. Current window C contains **100**, with **20 web and 80 app**.

| Channel | Reference       | Current         |
| :------ | :-------------- | :-------------- |
| Web     | 80 tickets (80%) | 20 tickets (20%) |
| App     | 20 tickets (20%) | 80 tickets (80%) |

The web-share difference is **|20% − 80%| = 60 percentage points**. The app-share difference is also 60 points, so the largest gap is **60 points**, or **0.60** on a 0–1 proportion scale. Percentage points describe a difference between shares; this is not a 60% relative increase.

The explorer’s application policy requests investigation when the gap is **strictly greater than 10 percentage points**, provided the current window has **at least 50 tickets**. Thus 60 > 10 triggers an input-shift signal. These thresholds are teaching choices, not statistical significance levels or production recommendations.

Suppose fully reviewed labels show the rule correct on **three of every four tickets within each channel**, in both windows. Reference correct counts are **60 web + 15 app = 75**. Current correct counts are **15 web + 60 app = 75**. Accuracy is therefore **75/100 = 75%** in both, despite the large input shift.

![Web and app shares change from eighty and twenty percent to twenty and eighty percent. Their largest gap is sixty percentage points, triggering the declared input alert, while fully labeled routing accuracy remains seventy-five percent in both windows.](../assets/machine-learning/drift-detection.svg 'Compare the channel-share gap with the labeled accuracy calculation. The 60-point input shift triggers investigation, yet accuracy stays 75% in this constructed example. Green identifies current data; an input-change signal is not a model-quality verdict.')

The explorer constructs individual ticket records, applies M1, counts channels, and computes accuracy from reviewed outcome labels. Changing the input scenario, current volume, or threshold recalculates every result. Its input alert never reads outcome labels. All labels are supplied only to make the quality comparison visible.

```patternverse-widget
{
  "src": "ml-drift-detection.html",
  "title": "Input drift signal and labeled quality explorer",
  "height": 1200,
  "fallback": "Reference channel shares are 80% web and 20% app; current shares are 20% and 80%. The largest gap is 60 percentage points. With 100 current tickets and a strict gap-above-10-point policy, the input alert requests investigation. Fully labeled accuracy remains 75% in both windows. A different scenario lowers accuracy to 50% without changing channel shares."
}
```

At a **60-point threshold**, a gap of exactly 60 does **not** exceed the limit. With only **20 current tickets**, counts **4 web and 16 app** give the same shares and gap, but the minimum-volume policy returns **insufficient volume**. A descriptive gap remains computable; the smaller window does not supply the same amount of evidence. The volume guard does not quantify uncertainty or guarantee a false-alarm rate.

### Worse predictions can escape an input monitor

A second scenario keeps current channel counts at **80 web and 20 app**. Both share differences are zero, so the input gap is **0 points**. M1’s predictions are unchanged for each channel.

Now constructed labels make M1 correct on **half the tickets within each channel**: **40 web + 10 app = 50**. Current accuracy becomes **50/100 = 50%**, a decline of **25 percentage points** from the reference. The input monitor raises no signal, because its measured distribution did not change. The input–target relationship did change in this example.

Production labels often arrive later or cover a selected subset of requests. An unlabeled monitor cannot supply this accuracy comparison. Separate outcome monitoring, label-coverage checks, and investigation are needed before attributing a performance decline to concept drift rather than another failure.

### Stable individual features can hide changed combinations

In a separate fictional population of 100 tickets, the reference has **50 web-short** and **50 app-long** tickets. The current population instead has **50 web-long** and **50 app-short** tickets.

Both windows remain **50% web, 50% app**, and **50% short, 50% long**. Separate channel and length comparisons each return zero. But the web-short combination changes from **50% to 0%**, so a joint-category comparison has a **50-point gap**. This illustrates a blind spot of individual-feature monitoring; it supplies no model-performance measurement. The explorer monitors channel only and does not execute this joint detector.

## Assumptions for correctness

Reference and current records must be comparable under stable measurement definitions. Windows need enough suitable observations for the selected method, accounting for dependencies rather than treating every repeated entity as independent evidence.

An alert’s meaning depends on the statistic and policy. A practical distance threshold is not a calibrated hypothesis test. Claims about significance or false-alarm control require the relevant assumptions and validation across the monitoring procedure, including repeated comparisons.

## When to use it

Use drift detection when inputs, populations, or operating conditions can evolve after release. It is useful for noticing changed customer mixes, collection behavior, or model outputs before suitable outcome labels are complete.

Choose monitors around plausible failure modes and important slices. A general-purpose distance over every field can create noise while missing the relationship that matters to a particular model.

## Tradeoffs and operating costs

Smaller windows can respond sooner but fluctuate more; larger ones can delay or dilute a brief change. Monitoring many features and windows increases compute, storage, and investigation work. References, thresholds, and alert ownership need maintenance.

Compare alerts against normal historical behavior and record responses. Investigation may identify a pipeline bug, expected seasonality, a new population, or a need for evaluation and adaptation. Automatic retraining can reproduce bad inputs or obscure the original problem.

## Common mistakes and limitations

Do not equate no alert with a healthy model, or an alert with degradation. Preserve denominators, category definitions, missingness, and reference versions. Replacing the reference merely to clear a warning removes the comparison rather than fixing its cause.

[Rabanser and colleagues’ Failing Loudly study](https://papers.neurips.cc/paper_files/paper/2019/hash/846c260d715e5b854ffad5f70a516c88-Abstract.html) examines detection and harmfulness as separate questions across tested dataset shifts. Its empirical findings are not guarantees that one detector will identify every consequential change in another application.

## Related patterns

[[ml-schema-based-data-validation|Schema-Based Data Validation]] checks input contracts; a schema-valid population can still shift. [[ml-continuous-model-evaluation|Continuous Model Evaluation]] checks predictions against eligible outcomes and label coverage. [[ml-slice-based-evaluation|Slice-Based Evaluation]] reveals performance differences that overall summaries hide. [[ml-training-serving-consistency|Training-Serving Consistency / Transform]] prevents inconsistent transformations from becoming a source of apparent change.

## Sources and further reading

- [Gama and colleagues: A survey on concept drift adaptation](https://doi.org/10.1145/2523813) — changing input–target relationships and adaptation.
- [TensorFlow Data Validation tutorial](https://www.tensorflow.org/tfx/tutorials/data_validation/tfdv_basic) — categorical drift comparisons, reference spans, and thresholds.
- [River: ADWIN](https://riverml.xyz/latest/api/drift/ADWIN/) — adaptive-window change detection.
- [Rabanser, Günnemann, and Lipton: Failing Loudly](https://papers.neurips.cc/paper_files/paper/2019/hash/846c260d715e5b854ffad5f70a516c88-Abstract.html) — empirical study of dataset-shift detection and characterization.
