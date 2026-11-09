---
id: ml-selective-prediction
type: pattern
title: 'Selective Prediction'
summary: 'Give a predictor an explicit abstention route, and evaluate accepted errors, automation coverage, and the cost of handling deferred cases together.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A support-ticket classifier routes every request automatically. Most labels are useful, but a few confident mistakes send urgent requests to the wrong team. Requiring a label on every ticket turns uncertainty into an operational decision without acknowledging it.

Selective Prediction adds another possible response: **defer this case**. A system may send it for human review, request more information, or use a defined fallback. The design problem includes deciding when to abstain and ensuring the alternative route can actually handle the work.

## Core idea

Separate the **predictor**, which proposes an answer, from the **selector**, which decides whether to release it. A simple selector accepts when a score is at least a threshold. Other designs learn the selector jointly with the predictor.

Two quantities describe the result. **Automation coverage** is the fraction of inputs accepted. **Selective risk**, using classification error here, is the fraction of accepted predictions that are wrong. Rejecting everything gives zero automation coverage and undefined selective risk, rather than perfect accuracy.

The [risk–coverage framework of El-Yaniv and Wiener](https://jmlr.org/papers/v11/el-yaniv10a.html) formalizes this tradeoff. Its coverage concerns answering inputs; it differs from conformal coverage, which concerns containing the true outcome in a set.

## How it works

Train the predictor, choose an available score, and develop the acceptance rule on data reserved for that purpose. Maximum class probability is one possible score; a separate error predictor or disagreement measure is another. A score useful for ranking likely mistakes need not be a calibrated probability of correctness.

Specify the comparison precisely: **accept if score ≥ threshold**, including equality. All examples sharing a score move together. Raising the threshold reduces or preserves automation coverage, but does not necessarily reduce observed error among accepted cases.

Choose an operating point using error costs, acceptable workload, and evidence about the target population. Freeze that choice before final evaluation. Measure accepted errors, deferred volume, subgroup behavior, and outcomes after fallback. A curve explored on evaluation labels describes those records; it is not independent evidence for a threshold chosen from the same curve.

[Geifman and El-Yaniv's 2017 method](https://papers.neurips.cc/paper_files/paper/2017/hash/4a8423d5e91fda00bb7e46540e2b0cf1-Abstract.html) constructs selectors for a fixed neural classifier and adds a statistical risk-control procedure under stated sampling assumptions. Simply applying a confidence cutoff does not reproduce that guarantee.

## Worked examples

### Ticket routing with an explicit review queue

Consider twelve fictional tickets with fixed Delivery/Billing predictions and known evaluation labels. The full table is available in the explorer. Listed in descending score order, the essential data are:

| Ticket | Score | Prediction correct? |
| ------ | ----: | :------------------ |
| T01    |  0.99 | Yes                 |
| T02    |  0.97 | Yes                 |
| T03    |  0.95 | No                  |
| T04    |  0.90 | Yes                 |
| T05    |  0.90 | Yes                 |
| T06    |  0.85 | Yes                 |
| T07    |  0.80 | No                  |
| T08    |  0.80 | Yes                 |
| T09    |  0.75 | No                  |
| T10    |  0.70 | Yes                 |
| T11    |  0.60 | No                  |
| T12    |  0.55 | No                  |

Accepting everything gives **5/12 errors, or 41.7%**. At threshold **0.80**, the system accepts eight tickets, including both tied scores of 0.80. It makes **2/8 accepted errors, or 25%**, with **8/12 automation coverage, or 66.7%**. Four tickets require the alternative route. No prediction has changed; the gate has changed which predictions are acted upon automatically.

![Twelve scored tickets pass through an acceptance threshold of 0.80. Eight are automated with two errors; four are deferred. Six routine cases and two complex cases are accepted, with all accepted errors in the complex group.](../assets/machine-learning/selective-prediction.svg 'The gate changes which fixed predictions are released, not which are correct. At 0.80 it accepts eight cases with two errors and sends four to review. Group results expose where accepted errors remain.')

The explorer computes every gate decision, risk–coverage point, subgroup count, and illustrative cost directly from these records. Its alternate outcome scenario changes two high-scoring labels while keeping predictions and scores fixed, exposing how confident mistakes can defeat the gate. It does not train or calibrate a classifier.

```patternverse-widget
{
  "src": "ml-selective-prediction.html",
  "title": "Selective prediction risk and coverage explorer",
  "height": 1200,
  "fallback": "At threshold 0.80, eight of twelve fictional predictions are accepted, with two errors; four need review. Compare automation coverage, accepted-case error, and review workload. A stricter gate can retain confident mistakes."
}
```

### A stricter gate can be worse on accepted cases

At threshold **0.90**, five tickets are accepted and one is wrong: **20% selective risk**. At **0.95**, only three remain, including the confident mistake T03: **33.3% selective risk**. At **0.97**, the remaining two happen to be correct. Zero observed errors in two cases is weak evidence about future reliability.

Subgroups also matter. In this invented dataset, Routine contains T01, T02, T04, T05, T06, T08, T10, and T11; Complex contains the other four. At 0.80, Routine has **6/8 accepted**, with **0/6 errors**. Complex has **2/4 accepted**, with **2/2 errors**. The overall improvement hides both unequal automation and complete failure on accepted complex cases.

This is an illustration, not an empirical finding about support systems. Research by [Jones and colleagues](https://arxiv.org/abs/2010.14134) documents that selective classification can amplify group disparities in studied datasets. A single aggregate curve cannot establish equitable service.

### Reviewing less is not automatically cheaper

Suppose an automatic routing error costs ten units, a review costs two, and every reviewed ticket is resolved correctly without delay. At 0.80, the fictional total is **2 × 10 + 4 × 2 = 28 units**, compared with **5 × 10 = 50** when everything is automated.

At 0.90, the total becomes **1 × 10 + 7 × 2 = 24**. Yet a team able to review four tickets per batch now has three excess tickets. That 24-unit calculation assumes all seven reviews occur; it does not price the backlog. If each review costs six units, the same threshold costs **52**, exceeding full automation's 50 under these simplified assumptions. Real reviewers also make mistakes and impose delays.

A verified research implementation takes a different route: [SelectiveNet](https://proceedings.mlr.press/v97/geifman19a.html) jointly trains prediction and selection to optimize risk subject to a coverage target. Its published classification and regression experiments demonstrate the architecture; they do not validate the ticket figures above.

## Assumptions for correctness

Selection must use information available when an answer is requested. Evaluation labels reveal mistakes afterward; they cannot be inputs to the deployed gate. Keep model, preprocessing, score computation, and threshold compatible when updating the system.

Generalizing measured rates requires representative evidence, adequate accepted-case counts, and appropriate handling of dependence or distribution change. Formal bounds need their particular assumptions and selection procedure. Neither high scores nor small empirical error alone supplies a guarantee.

## When to use it

Use this pattern when abstention has a useful, explicitly supported consequence and incorrect automatic decisions cost more than some additional review or delay. It fits gradual automation with measurable review capacity.

If every request requires an immediate answer and no viable fallback exists, adding an abstention flag leaves the central operating problem unresolved.

## Tradeoffs and operating costs

Review consumes staff time, adds latency, and may concentrate difficult cases in one queue. Measure the complete system's errors and turnaround alongside the automatic portion's performance. Obtain labels for sampled accepted cases as well as reviewed cases; otherwise monitoring can miss confident automatic failures.

Scores may require extra models or repeated predictions. A simple existing score is cheaper, but its usefulness must be checked rather than inferred from its name.

## Common mistakes and limitations

Do not call a 0.90 score a proven 90% chance of correctness. Do not report accepted accuracy while hiding how few cases were accepted. Empty acceptance has undefined risk; it must not appear as zero error on a chart.

Distribution shift can leave wrong answers highly scored. Thresholds optimized repeatedly on final evaluation data become part of model selection. Uniform thresholds can still give uneven coverage and errors across groups. Human review is an operational intervention with its own measurable failure modes.

## Related patterns

[[ml-cascade|Cascade]] routes cases to additional model stages and can still return a prediction for every case. [[ml-probability-calibration|Probability Calibration]] concerns the meaning of probability values; selective prediction concerns which outputs to release. [[ml-conformal-prediction|Conformal Prediction]] returns outcome sets: accepting only singleton sets does not automatically guarantee the conditional error rate among accepted cases. [[ml-slice-based-evaluation|Slice-Based Evaluation]] reveals uneven automation and accepted errors. [[ml-active-learning|Active Learning]] selects examples for labeling to improve a model; abstention handles current decisions, although deferred labels may later support training.

## Sources and further reading

- [El-Yaniv and Wiener: On the Foundations of Noise-free Selective Classification](https://jmlr.org/papers/v11/el-yaniv10a.html) — foundational risk–coverage framework, with its noise-free theoretical setting.
- [Geifman and El-Yaniv: Selective Classification for Deep Neural Networks](https://papers.neurips.cc/paper_files/paper/2017/hash/4a8423d5e91fda00bb7e46540e2b0cf1-Abstract.html) — post-training selectors and statistical risk control.
- [Geifman and El-Yaniv: SelectiveNet](https://proceedings.mlr.press/v97/geifman19a.html) — joint training with a selection head and coverage constraint.
- [Jones and colleagues: Selective Classification Can Magnify Disparities Across Groups](https://arxiv.org/abs/2010.14134) — limitations of aggregate selective performance.
- [Angelopoulos and Bates: A Gentle Introduction to Conformal Prediction](https://arxiv.org/abs/2107.07511) — prediction-set coverage and its distinction from selected-case accuracy.
