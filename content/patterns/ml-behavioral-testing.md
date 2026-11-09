---
id: ml-behavioral-testing
type: pattern
title: 'Behavioral Testing'
summary: 'Turn important expectations about model behavior into executable examples and input-output relations, revealing failures that aggregate scores can hide.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A review classifier performs well on its test set. Then someone writes “The service is not good,” and it returns positive. Adding a harmless speaker name changes its score again. The average accuracy never made either weakness easy to see.

Behavioral Testing asks whether a model satisfies specific expectations that matter for its task. It makes those expectations inspectable and repeatable, so a model update can be checked for recognizable failures as well as overall performance.

## Core idea

Describe a capability, construct inputs that isolate it, and state what would count as acceptable output. The expectation might specify a correct label, a relationship between two predictions, or a permitted range of change.

Treat the deployed prediction interface as the object under test. Its internal architecture need not be accessible. Keep the expectation independent of the current output: a model's answer is evidence to examine, not the source of truth for its own test.

The [CheckList research](https://aclanthology.org/2020.acl-main.442/) organizes NLP evaluation by capability and three test types: minimum functionality, invariance, and directional expectation. This provides a useful vocabulary for making different kinds of requirements explicit.

## How it works

Start from a concrete requirement, such as understanding simple negation or ignoring an irrelevant attribution. Record the task, input, expected result, and why that expectation holds. Include exceptions: a speaker's identity may be irrelevant to overall sentiment, but relevant to identifying who expressed it.

A **minimum functionality test** uses a small labeled example with a clear expected answer. An **invariance test** makes a justified change and checks that the selected output remains sufficiently stable. A **directional test** checks an expected direction of movement without necessarily requiring an exact score or label.

Specify the comparison precisely. “Unchanged” might mean the same class, an absolute score difference below 0.02, or an unchanged ranking. These are different requirements. Choose tolerances before comparing candidates and justify them against the task; a convenient tolerance is not automatically a meaningful one.

Run the actual prediction pipeline and retain original and changed inputs, outputs, model version, and failures by capability. Review failures before turning them into release gates. The [CheckList implementation](https://github.com/marcotcr/checklist) supplies templates, perturbations, expectation functions, and suite summaries; the explorer below is an independent teaching implementation.

## Worked examples

### Simple labels expose a missing capability

Consider a fictional binary classifier for overall sentiment. Its rule assigns **good = +1**, **great = +1**, **bad = −1**, and **awful = −1**. It lowercases text, extracts letter-only tokens, sums their weights, and maps the sum through **s = 1 / (1 + exp(−sum))**. Scores at least 0.5 produce positive; smaller scores produce negative. These are constructed scores, not calibrated probabilities.

| Input                    | Expected label | Rule's score | Predicted label |
| ------------------------ | -------------- | -----------: | --------------- |
| The service is good.     | Positive       |       0.7311 | Positive        |
| The service is bad.      | Negative       |       0.2689 | Negative        |
| The service is not good. | Negative       |       0.7311 | Positive        |

The third case fails because this rule ignores “not.” A second rule reverses a sentiment word's weight when its immediately preceding token is “not.” That changes the third score to **0.2689** and passes these three examples. It does not establish understanding of “hardly good,” sarcasm, or long-distance negation.

### Paired inputs need different kinds of expectations

Add a deliberately faulty name shortcut: each occurrence of **Mira** adds 1 to the sum, and **Noor** subtracts 1. For these fictional examples, attributing the same opinion to either speaker should leave its overall sentiment score stable.

“The service is good” scores **0.7311**. “Mira says the service is good” scores **0.8808**. Their absolute difference is **0.1497**, exceeding the chosen invariance tolerance **0.02**. Both labels remain positive, so a label-only comparison would miss this score change. This is evidence about these cases, not a demographic fairness assessment.

For a directional test, changing “good” to “not good” should **not increase** the positive score. The first rule returns 0.7311 for both and passes that non-increasing relation, even though its negation prediction is wrong. The minimum functionality test catches what this weaker relation permits.

![Three behavioral expectations applied to a fictional sentiment rule: a labeled negation case fails, an attribution-invariance pair fails, and a non-increasing score relation passes despite ignoring negation.](../assets/machine-learning/behavioral-testing.svg 'Read each expectation before its PASS or FAIL. The negation rule passes a non-increasing-score relation while giving the wrong label; a different test is needed to catch that error.')

The explorer runs seven fixed cases: three label tests, two name-invariance pairs, and two non-increasing pairs. Defaults pass **2/3**, **0/2**, and **2/2**, respectively. Enabling immediate negation handling and setting name weight to zero passes all seven. A constant score of 0.25 passes both relational families but fails the positive labeled example. Suite composition therefore matters more than a pooled pass count.

```patternverse-widget
{
  "src": "ml-behavioral-testing.html",
  "title": "Behavioral test suite explorer",
  "height": 1200,
  "fallback": "The fictional sentiment rule fails negation and name-invariance checks while passing non-increasing-score checks. Compare test families rather than treating a pooled pass count as task accuracy."
}
```

Changing the tolerance changes the test, not the predictor. Raising it to 0.20 accepts both default name changes without removing the shortcut. All predictions and comparisons are calculated locally; no external model or training process is simulated.

### A visual change needs a justified expectation

In a fictional package classifier, adding a small brightness change may justify preserving the parcel-type label while the object remains visible. Cropping away its identifying mark does not justify the same assertion. A failed test could expose model sensitivity or an invalid transformation; inspect both.

As a documented application, [DeepTest](https://arxiv.org/abs/1708.08559) generated altered driving images, including lighting and weather conditions, to test neural driving models. Its research setting supports the testing approach; it does not certify a production vehicle or make every image transformation label-preserving.

## Assumptions for correctness

The test oracle—the rule deciding acceptable behavior—must be defensible for the stated task. Human review is often necessary for ambiguous labels and transformed examples. Review expected behavior across relevant languages, contexts, and users.

Comparison settings must match the interface: score scale, decision threshold, preprocessing, and any randomness. For stochastic systems, define repeated trials and an acceptance criterion rather than treating one differing response as conclusive.

## When to use it

Use this pattern when aggregate evaluation leaves important requirements untested, when introducing a replacement model, or when a known incident should become a regression check. It also helps compare external services through their input-output interfaces.

Pair targeted cases with representative evaluation. A deliberately difficult suite diagnoses selected behaviors; its failure fraction is not an estimate of their prevalence in deployment.

## Tradeoffs and operating costs

The main costs are designing credible expectations, reviewing generated cases, maintaining suites as requirements change, and running predictions. Hundreds of template variants may still express one narrow assumption.

Keep a compact regression suite for frequent checks and broader diagnostic suites where cost permits. [Breck and colleagues' ML Test Score](https://research.google/pubs/whats-your-ml-test-score-a-rubric-for-ml-production-systems/) places model checks within wider production testing. Behavioral checks cover only part of that responsibility.

## Common mistakes and limitations

Do not repair only the exact sentences that failed and call the capability solved. Preserve development cases for regression, then assess new examples and representative performance separately. Avoid quietly weakening expectations until a preferred model passes.

An invariant constant predictor can be useless, as the explorer shows. Score stability also does not establish calibration, fairness, or robustness outside the tested transformations. Relational tests can miss consistently wrong answers.

Testing only the classifier function can miss serving-time preprocessing failures. Google's [Rules of ML](https://developers.google.com/machine-learning/guides/rules-of-ml) separately recommends testing infrastructure and agreement between training and serving predictions.

## Related patterns

[[ml-explainable-predictions|Explainable Predictions]] attributes an individual model output under a stated comparison; behavioral tests check whether specified responses hold. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] protects the validity of performance claims and selection boundaries. [[ml-slice-based-evaluation|Slice-Based Evaluation]] compares performance across meaningful subsets; behavioral tests isolate particular expectations. [[ml-label-preserving-augmentation|Label-Preserving Augmentation]] uses justified transformations to expand training data; invariance testing uses them to check outputs. **Adversarial Testing** actively seeks difficult failures, while behavioral suites can include ordinary cases and explicit relationships.

## Sources and further reading

- [Ribeiro and colleagues: Beyond Accuracy](https://aclanthology.org/2020.acl-main.442/) — CheckList's behavioral testing framework and NLP experiments.
- [CheckList: official implementation](https://github.com/marcotcr/checklist) — executable test types, templates, perturbations, and custom expectations.
- [Tian and colleagues: DeepTest](https://arxiv.org/abs/1708.08559) — image transformations for testing neural driving systems.
- [Breck and colleagues: What's your ML test score?](https://research.google/pubs/whats-your-ml-test-score-a-rubric-for-ml-production-systems/) — model tests within production readiness.
- [Google: Rules of Machine Learning](https://developers.google.com/machine-learning/guides/rules-of-ml) — infrastructure tests and training/serving consistency.
