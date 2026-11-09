---
id: ml-cascade
type: pattern
title: 'Cascade'
summary: 'Run inexpensive stages first and spend further computation only on cases that continue, evaluating early exits and final outcomes as one system.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A factory photographs every part, then runs an expensive defect detector on every image. Most parts are ordinary. A cheap preliminary model could discard obvious negatives and reserve the expensive inspection for plausible defects. But a defect discarded early will never reach the model that might recognize it.

Cascade addresses this tradeoff between computation and retained quality. It arranges conditional stages so that later work happens only when earlier results justify continuing. The design must account for both the work avoided and the decisions made along the way.

## Core idea

Each stage has an explicit contract: what it receives, what it returns, and when processing stops. In a screening cascade, a cheap detector rejects likely negatives; survivors receive further inspection. The final positive decision requires surviving the earlier gates.

Another form accepts an adequate answer from a cheap model and escalates the remaining cases. [FrugalGPT](https://arxiv.org/abs/2305.05176) studies learned language-model cascades of this kind. Its reported experiments do not establish savings or answer quality for another workload.

Both forms allocate computation conditionally. Keep the stopping rule explicit: “reject unlikely defects” and “accept a sufficiently reliable answer” use different scores and may send cases onward on opposite sides of a threshold.

## How it works

Specify the final task and the consequence of each exit before choosing models. Here an early exit means predicting ordinary; continuation means asking the later detector. A later negative also means ordinary. There is no human review or abstention route in this example.

Fit stages and choose routing thresholds using suitable training and validation data. Favor retaining relevant cases when downstream stages cannot recover discarded ones. Evaluate later stages on the cases they will actually receive, as well as recording a full-system comparison. Their routed population may differ substantially from the original input distribution.

Freeze the stages, preprocessing, routing rule, and failure policy together. Compare the complete cascade with running the later model alone. Measure end-to-end errors, the fraction reaching each stage, resource work, and observed latency separately. A cheaper first model is useful only when its overhead is repaid by enough avoided work.

## Worked examples

### A gate saves inspections but loses a recoverable defect

This fictional batch includes four defects among eight parts to expose early misses, not represent factory prevalence. Gate scores are supplied ranking signals, not calibrated probabilities. A reviewed defect has target one; an ordinary part has target zero.

| Part | Reviewed defect? | Gate score |
| ---- | ---------------- | ---------: |
| A    | Yes              |       0.90 |
| B    | Yes              |       0.70 |
| C    | Yes              |       0.50 |
| D    | Yes              |       0.20 |
| E    | No               |       0.80 |
| F    | No               |       0.40 |
| G    | No               |       0.10 |
| H    | No               |       0.05 |

Pass a part onward if **score ≥ 0.30**, including equality. A, B, C, E, and F continue: **five of eight parts**. D, G, and H stop and receive the ordinary label.

Initially, the supplied later-stage answers match all eight reviewed labels. Among the five survivors, that stage identifies A, B, and C and rejects E and F. It cannot inspect D. The cascade therefore finds **3/4 defects, or 75% recall**, even though the later model alone finds all four in this constructed batch.

Suppose the gate requires **1 millisecond of model work per part**, and the later detector requires **12 milliseconds per inspected part**. Treat these as constant, invented service demands and add them across the batch.

![Eight fictional parts pass through a cheap gate. Five reach the later detector and three stop. Defect D stops early, leaving three of four defects found and 68 milliseconds of supplied model work.](../assets/machine-learning/cascade.svg 'Follow both branches after the gate, including the cases that stop. Green cells mark reviewed defects for evaluation; those labels are not inputs to the routing rule. A later detector can correct surviving false alarms, but it cannot recover a defect on the stopped branch.')

The explorer computes every route, final prediction, error count, and work total from these records. Its alternate later-stage answers miss B and falsely flag E, showing that continuation does not guarantee correctness. Predictions for every part are supplied offline so the later-model-alone comparison is available; simulated serving uses those answers only for survivors. No detector is trained or timed.

```patternverse-widget
{
  "src": "ml-cascade.html",
  "title": "Cascade routing, recall and work explorer",
  "height": 1200,
  "fallback": "At gate threshold 0.30, five of eight fictional parts reach stage 2. Defect D stops early, so the cascade finds three of four defects. With supplied work of 1 ms per gate call and 12 ms per later call, total work is 8 + 60 = 68 ms versus 96 ms for the later model alone. These are teaching calculations, not measured performance."
}
```

### Less work can mean more missed defects

The gate consumes **8 × 1 = 8 ms**. Five later calls consume **5 × 12 = 60 ms**. Total cascade work is **68 ms**, compared with **8 × 12 = 96 ms** for the later model alone: **28 ms less work**, about **29.2%** of that baseline.

Raise the gate threshold to **0.60**. Only A, B, and E continue. Work falls to **8 + 3 × 12 = 44 ms**, but only A and B are detected: **2/4 recall** with the initially matching later-stage answers. The additional savings discarded C’s opportunity for recovery.

Now keep threshold 0.30, but give the gate a work cost of **3 ms** and the later stage **4 ms**. The cascade requires **8 × 3 + 5 × 4 = 44 ms**, exceeding the later-only baseline of **32 ms**. Conditional execution is not automatically economical.

Total work also differs from response time. With the original costs, a surviving request requires **1 + 12 = 13 ms** of sequential stage work instead of twelve. Parallelism, batching, queues, and data transfer determine actual latency; these totals are not measurements of throughput or a latency percentile.

### Documented detection and recommendation systems

[Viola and Jones](https://papers.neurips.cc/paper_files/paper/2001/hash/0b1ec366924b26fc98fa7b71a9c249cf-Abstract.html) describe detector cascades designed to retain positives while rejecting negatives efficiently. [OpenCV’s cascade-classifier tutorial](https://docs.opencv.org/4.x/db/d28/tutorial_cascade_classifier.html) explains staged rejection of image windows and provides a working face-detection example. An image can contain many candidate windows; the cascade operates on those windows, not simply once per whole photograph. Neither implementation produces the fictional part scores above.

A recommendation system offers a related candidate-filtering structure. [TensorFlow Recommenders](https://www.tensorflow.org/recommenders/examples/basic_ranking) describes efficient retrieval followed by richer ranking of the retrieved candidates. A ranker cannot recommend an item excluded from its candidate set. Increasing candidate count can improve opportunity for recall while increasing ranking work; retrieval scores and ranking scores need not share a probability interpretation.

## Assumptions for correctness

Routing must use information available at inference. The reviewed labels in the diagram are evaluation evidence, never gate inputs. Keep evaluation labels outside threshold selection, and sample early exits for audit so missed positives do not disappear from monitoring.

Later-stage performance must be measured conditionally on reaching that stage. Here, overall recall equals gate retention of positives multiplied by later recall among retained positives. This uses conditional rates; multiplying two independently reported full-population recalls is generally unjustified. If no positives survive, later conditional recall is undefined rather than perfect.

## When to use it

Use a cascade when inexpensive evidence can resolve or filter many cases and the remaining cases justify more computation. Candidate retrieval, object detection, and staged answer escalation can fit this structure.

Prefer a single model when most inputs require the later stage anyway, the gate is costly, or irreversible early errors outweigh the resource savings. Always compare with a credible single-stage baseline.

## Tradeoffs and operating costs

Stages add interfaces, monitoring, deployment coordination, and failure modes. Specify what happens when a required later stage is unavailable; silently treating its failures as ordinary predictions changes the policy.

Traffic shifts can change both pass rates and the difficulty of survivors. Track resource use and quality by stage and relevant slice. Retraining a gate changes the population seen downstream and can invalidate earlier quality and capacity estimates.

## Common mistakes and limitations

Do not report only the later detector’s accuracy or the cascade’s average work. Both can conceal harmful early exits. A high overall accuracy on mostly negative inputs can coexist with poor detection of positives.

Gate scores need not be calibrated to support useful ranking, but their operating thresholds still need validation. More stages can compound missed opportunities. The explorer’s complete labels, constant work costs, and full offline predictions are teaching assumptions; operational data may not provide them automatically.

## Related patterns

[[ml-selective-prediction|Selective Prediction]] adds a supported abstention route; a cascade can instead return a prediction for every input. [[ml-ensembling|Ensembling]] combines member predictions rather than merely routing cases between stages. [[ml-workflow-pipeline|Workflow Pipeline]] coordinates dependencies; cascades additionally define conditional inference exits. [[ml-slice-based-evaluation|Slice-Based Evaluation]] reveals uneven retention and final quality. [[ml-heuristic-benchmark|Heuristic Benchmark]] supplies simpler comparison policies.

## Sources and further reading

- [Viola and Jones: Fast and Robust Classification using Asymmetric AdaBoost and a Detector Cascade](https://papers.neurips.cc/paper_files/paper/2001/hash/0b1ec366924b26fc98fa7b71a9c249cf-Abstract.html) — high-retention detector stages and conditional computation.
- [OpenCV: Cascade Classifier](https://docs.opencv.org/4.x/db/d28/tutorial_cascade_classifier.html) — staged image-window rejection and an executable detection example.
- [TensorFlow Recommenders: ranking](https://www.tensorflow.org/recommenders/examples/basic_ranking) — retrieval and ranking as successive candidate-selection stages.
- [Chen, Zaharia, and Zou: FrugalGPT](https://arxiv.org/abs/2305.05176) — learned language-model cascades and task-dependent cost/quality evaluation.
