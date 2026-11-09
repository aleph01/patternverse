---
id: ml-multilabel
type: pattern
title: 'Multilabel'
summary: 'Represent each applicable label separately so one input can receive several labels, then choose and evaluate the resulting set explicitly.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A customer writes, “I was charged twice, and now I cannot sign in.” A support classifier must choose Billing or Access, so whichever answer it gives hides part of the request. Adding more training examples will not fix an output contract that permits only one topic.

Multilabel changes that contract. It lets one input receive several labels from a defined vocabulary, preserving overlapping facts instead of forcing them into competing categories. The team must then decide how scores become a set and how incomplete or incorrect sets are evaluated.

## Core idea

Ask one yes/no question per label: does Billing apply, does Access apply, and does Delivery apply? The answer is a vector of binary indicators in a fixed label order. In **[Billing, Access, Delivery]** order, the opening ticket’s target is **[1, 1, 0]**.

This is often called a **multi-hot** representation. Unlike a one-hot target, it may contain several ones. **Multiclass** classification chooses one class from several; multilabel classification allows several classes to apply together. The [scikit-learn task guide](https://scikit-learn.org/stable/modules/multiclass.html) distinguishes these target structures.

An all-zero vector can mean that none of the defined labels applies, if that state is legitimate and fully reviewed. It must not silently stand for “nobody checked this example.”

## How it works

Define each label and the annotation rules before fitting. Store the vocabulary and column order with the model. [MultiLabelBinarizer](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.MultiLabelBinarizer.html) converts sets into an indicator matrix and records the corresponding class order; the consumer must preserve that mapping.

A simple baseline trains a binary classifier for each label. A neural alternative shares a feature extractor and has one output per label. A **sigmoid** converts each raw output score into a value between zero and one. Each value concerns one label; their sum need not equal one. A single softmax over mutually exclusive labels instead makes the outputs compete for a total probability mass of one.

Train with a suitable per-label objective, then choose decision thresholds on validation data. At inference, include each label whose score meets its threshold. Shared thresholds are a starting point; different error costs and score behavior can justify different thresholds by label.

Preserve independent evaluation data, respecting related customers, documents, and time. Inspect label-level precision and recall as well as whole-set performance. Training a classifier, calibrating its probabilities, and selecting its operating thresholds are separate choices.

## Worked examples

### Several true labels need separate training signals

These four tickets, reviewed targets, and scores are fictional. Scores are supplied numbers for a computed demonstration, not outputs from a model trained here. Each target lists every applicable topic in the three-label vocabulary.

| Ticket | Reviewed topics    | Scores: Billing, Access, Delivery |
| ------ | ------------------ | --------------------------------- |
| A      | Billing + Access   | 0.80, 0.40, 0.10                  |
| B      | Access             | 0.60, 0.80, 0.20                  |
| C      | Billing + Delivery | 0.70, 0.20, 0.60                  |
| D      | None               | 0.10, 0.30, 0.40                  |

For A, the scores sum to **1.30**. That is compatible with separate label probabilities: Billing and Access can both occur. It does not establish that these invented values are calibrated, nor specify the probability of their joint occurrence.

For a positive target, binary log loss contributes **−ln(p)**, where p is the label’s predicted probability. For a negative target, it contributes **−ln(1 − p)**. Averaging A’s three contributions gives **[−ln(0.80) − ln(0.40) − ln(0.90)]/3 ≈ 0.415 nats**, using natural logarithms. Access contributes a penalty because its true label receives only 0.40; Delivery contributes a smaller penalty because its absence receives probability 0.90.

[PyTorch’s BCEWithLogitsLoss](https://docs.pytorch.org/docs/2.14/generated/torch.nn.BCEWithLogitsLoss.html) implements this binary cross-entropy objective directly from raw outputs, combining sigmoid and loss for numerical stability. Passing already sigmoid-transformed probabilities to that logits-based interface would apply the wrong input contract. The explorer computes the equivalent probability-form loss from its supplied scores; it performs no optimization.

![Ticket C has separate Billing, Access, and Delivery scores. Billing and Delivery cross their respective thresholds, producing the multi-hot prediction one, zero, one instead of forcing one winner.](../assets/machine-learning/multilabel.svg 'Follow each topic through its own threshold comparison. Green decisions can coexist for the same ticket: they are separate label selections, not competing shares of one category. The reviewed set provides a comparison; these supplied scores are not measured model performance.')

The illustration inspects C at threshold **0.50**, selecting Billing and Delivery. The explorer can inspect any ticket, change the shared or Access-specific threshold, and compare with a forced single-label rule. Its dataset metrics always cover all four tickets, while the diagram and loss inspector describe the selected ticket.

```patternverse-widget
{
  "src": "ml-multilabel.html",
  "title": "Multilabel sets and threshold explorer",
  "height": 1200,
  "fallback": "At threshold 0.50, ticket C receives Billing and Delivery. Across four fictional tickets, one label is missed and one extra label is selected: Hamming loss is 2/12, exact-set accuracy is 2/4, and micro F1 is 0.80. Scores are supplied; thresholds change decisions without retraining."
}
```

### A small label error can invalidate an entire set

At shared threshold **0.50**, A misses Access, B adds Billing, and C and D match exactly. Across **4 tickets × 3 labels = 12** binary decisions, there are two errors. **Hamming loss = 2/12 ≈ 0.167**, the fraction of wrong label decisions. **Exact-set accuracy = 2/4 = 0.50**, because only two tickets have every label correct. [Scikit-learn’s Hamming-loss documentation](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.hamming_loss.html) explains this distinction from whole-set error.

There are **four true-positive selections**, **one false positive**, and **one false negative**. Pooling these counts gives **micro F1 = 2 × 4 / (2 × 4 + 1 + 1) = 0.80**. This summarizes label retrieval, whereas exact-set accuracy asks whether the complete answer is right. Neither replaces the other.

Lower only Access’s threshold to **0.30**. A gains its missing topic, but D gains a false Access topic. Hamming loss and exact-set accuracy stay unchanged, but micro F1 rises to **10/(10 + 2) ≈ 0.833**, with five true positives and two false positives. Different customers are affected. Threshold selection needs a meaningful validation population and error costs, not just a favorable example.

### Image tags use the same output contract

A fictional photograph can simultaneously be Outdoors, People, and Snow. Its input may be a single image; multiple output labels do not require multiple input modalities. Choosing the highest-scoring tag would discard other valid descriptions. Conversely, forcing a tag onto an irrelevant image creates a false positive when an empty set should be allowed.

Scikit-learn’s [OneVsRestClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.multiclass.OneVsRestClassifier.html) documents fitting one binary classifier per label when given a multilabel indicator matrix. It is a concrete implementation route, not evidence that these support-ticket scores or image tags were produced by that estimator. Structured alternatives can model label relationships; the task guide also describes classifier chains, where earlier label predictions inform later ones.

## Assumptions for correctness

An omitted annotation must not automatically become a known negative. If review covers only some labels, training and evaluation need an explicit treatment of unknown entries, such as a justified observation mask. This demonstration assumes complete annotations.

Labels must have stable meanings and compatible combinations. Separate outputs do not enforce a hierarchy or prevent contradictory tags. Model dependencies or check constraints when the application requires them. Shared features can capture relationships even with per-label losses; separate sigmoid outputs do not prove real labels are independent.

## When to use it

Use multilabel prediction for overlapping document topics, image tags, product attributes, or concurrent issue types. Keep a multiclass formulation when exactly one category is correct by definition. Use a separate output structure when predicting different quantities, such as both delivery duration and cost, rather than treating every multioutput task as multilabel.

## Tradeoffs and operating costs

Each additional label needs definitions, annotations, evaluation support, and an operating policy. Rare labels may have unreliable estimates despite good aggregate results. [Scikit-learn’s F1 documentation](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.f1_score.html) distinguishes micro aggregation from macro averaging, which gives each label equal weight. Inspect both and the individual labels when their consequences differ.

Large vocabularies also increase output storage and serving work. Vocabulary changes require compatible training targets, model outputs, and consumer mappings.

## Common mistakes and limitations

An empty prediction is not automatically an abstention or an unknown-category detector. It only says no score met the current selection rule. Low thresholds can flood downstream teams; high ones can hide valid secondary topics.

Do not select thresholds on final test outcomes or infer calibrated probabilities from sigmoid alone. A good micro score can conceal a rare-label failure, while exact-set accuracy can hide useful partial answers. State zero-denominator conventions when a label has no positives or predictions.

## Related patterns

[[ml-reframing|Reframing]] changes the target contract; multilabel is one concrete output choice. [[ml-multimodal-input|Multimodal Input]] combines input types rather than output labels. [[ml-class-rebalancing|Class Rebalancing]] changes training influence when labels are uneven. [[ml-probability-calibration|Probability Calibration]] examines probability meaning before scores inform decisions. [[ml-selective-prediction|Selective Prediction]] explicitly defers cases; an empty label set alone does not implement it.

## Sources and further reading

- [Scikit-learn: Multiclass and multioutput algorithms](https://scikit-learn.org/stable/modules/multiclass.html) — target structures, multilabel learning, and classifier chains.
- [Scikit-learn: MultiLabelBinarizer](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.MultiLabelBinarizer.html) — set encoding and class order.
- [PyTorch: BCEWithLogitsLoss](https://docs.pytorch.org/docs/2.14/generated/torch.nn.BCEWithLogitsLoss.html) — stable binary cross-entropy from raw outputs.
- [Scikit-learn: Hamming loss](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.hamming_loss.html) — individual-label versus whole-set errors.
- [Scikit-learn: F1 score](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.f1_score.html) — count definitions, averaging, and undefined cases.
- [Scikit-learn: OneVsRestClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.multiclass.OneVsRestClassifier.html) — binary relevance implementation for multilabel targets.
