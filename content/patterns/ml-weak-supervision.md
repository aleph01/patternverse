---
id: ml-weak-supervision
type: pattern
title: 'Weak Supervision'
summary: 'Turn imperfect rules, existing records, and other noisy signals into training labels while tracking their coverage, conflicts, and shared errors.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A support team wants to route refund requests automatically. It has thousands of tickets, a few expert annotations, and useful clues: certain phrases, billing records, and existing routing rules. Reviewing every ticket would take weeks. Treating every clue as a correct label would teach the classifier the team's existing mistakes.

Weak Supervision uses imperfect information to create training targets at scale. It shifts some effort from labeling individual examples to specifying, inspecting, and combining sources of evidence. The aim is a useful learned predictor, judged against independently checked labels.

## Core idea

Let several imperfect sources suggest labels without requiring each source to decide every case. Preserve their disagreements and missing votes, combine them using an explicit method, and train a model from the resulting targets.

[Weak supervision is a broad family](https://cs.nju.edu.cn/zhouzh/zhouzh.files/publication/nsr18.pdf), including incomplete, coarse-grained, or inaccurate supervision. This article focuses on **programmatic weak supervision**, or data programming: expressing sources as labeling functions that return a class or abstain. Sources can include keyword rules, database lookups, existing classifiers, and expert heuristics. Abstaining means “this source has no answer,” not “the example belongs to the negative class.”

## How it works

Define the target precisely, then reserve human-reviewed development and test samples. Development labels help diagnose sources and choose settings; a separate test sample checks the final system. Split related records together where necessary so duplicated customers or documents cannot leak across the boundary.

Run labeling functions over the training pool to create a **label matrix**: rows are examples, columns are sources. Inspect coverage, overlap, and conflict. Coverage counts rows with at least one vote; overlap counts rows with at least two; conflict counts rows receiving different class votes. None measures correctness.

A majority or weighted vote is a transparent baseline. A probabilistic **label model** instead uses patterns of votes and disagreements to estimate training targets. This needs assumptions about how sources make errors: copied rules can agree without adding evidence. Snorkel’s documented [`LabelModel`](https://snorkel.readthedocs.io/en/latest/packages/_autosummary/labeling/snorkel.labeling.model.label_model.LabelModel.html) assumes source outputs are independent once the true class is fixed. Duplicated rules violate that condition. More generally, different source-quality settings can explain the same votes, so source accuracies may not be uniquely recoverable.

Train a separate predictive model using the aggregated labels. A soft target keeps both possibilities: a target of 0.7 gives the positive-label loss weight 0.7 and the negative-label loss weight 0.3 in binary cross-entropy. This model may learn features beyond the original rules and predict on cases where they abstain. Whether it generalizes must be measured; aggregation itself provides no such guarantee.

## Worked examples

### Refund routing from three imperfect rules

The following tickets and rules are fictional. The classes mean “requests a refund” and “other”; they do not determine whether a refund should be granted.

Rule R votes Refund when the text contains the whole word “refund.” B votes Refund for the phrase “charged twice.” D votes Other for “delivered.” Each otherwise abstains. Case is ignored. These deliberately crude rules expose why a plausible clue can be wrong: delivery does not rule out a refund request.

| Ticket text                                | R      | B      | D     |
| ------------------------------------------ | ------ | ------ | ----- |
| A: Refund please; tracking says delivered. | Refund | —      | Other |
| B: Charged twice. Please refund.           | Refund | Refund | —     |
| C: Package delivered, thank you.           | —      | —      | Other |
| D: Where is my parcel?                     | —      | —      | —     |

Here, coverage is 3/4, overlap 2/4, and conflict 1/4, each using all four rows as its denominator. Ticket D has no weak label. Filling its missing votes with Other would manufacture evidence.

### A copied rule changes the answer

For a transparent baseline, assign R weight 2, B weight 1, and D weight 3. These are teaching choices, not learned accuracies. Define **Refund vote share** as Refund weight divided by all emitted weight. Choose Refund above 50%, Other below 50%, and leave ties unresolved.

Ticket A gets 2/(2 + 3) = 40% Refund weight, so this baseline chooses Other. Add an exact copy of R and count every column: 4/(4 + 3) ≈ 57.1%, flipping the result to Refund. Counting the known copy once restores 40%. No independent information was added. Neither percentage is a probability of correctness.

![Three rules produce conflicting or missing ticket labels. Copying the refund rule changes ticket A's weighted vote from 40 percent to 57.1 percent without adding evidence.](../assets/machine-learning/weak-supervision-votes.svg 'Follow ticket A through the two counts. A copied refund rule flips the weighted decision without adding independent evidence. Assigned vote shares are not probabilities of correctness.')

The explorer runs these exact text rules. Change a ticket, disable a source, or add the copy to inspect the actual matrix and arithmetic. It compares counting every column with counting the known copy once. It does not fit a probabilistic label model or train a classifier.

```patternverse-widget
{
  "src": "ml-weak-supervision.html",
  "title": "Weak supervision vote explorer",
  "height": 1200,
  "fallback": "Ticket A has 40% Refund vote share. An exact copied rule raises naive counting to 57.1% without adding evidence. These are assigned weighted votes, not learned probabilities."
}
```

### Documented systems and distant supervision

The Snorkel research system combines labeling functions, models their noisy outputs, and trains a separate discriminative model. Its reported results concern specific datasets and collaborators, not a universal replacement for annotation.

[Mintz and colleagues](https://aclanthology.org/P09-1113/) demonstrated another source: **distant supervision** for relation extraction. They used Freebase relations to obtain noisy supervision from sentences mentioning related entities. A known relationship between two entities does not mean every sentence mentioning them expresses it. Transferring database facts into sentence labels therefore introduces systematic noise, rather than creating verified sentence annotations.

## Assumptions for correctness

Sources must address the same target with a consistent class mapping. An old routing field that records team ownership may not mean “requests a refund.” Information available only after resolution can contaminate evaluation or train a model to imitate a later outcome.

The aggregation method's assumptions matter. Estimating source quality from unlabeled data requires sufficient information and a suitable model of errors, class balance, abstentions, and dependencies. Correlated sources can confidently repeat a common mistake. Exact deduplication in the explorer handles only a known copy; it does not discover subtler dependencies.

## When to use it

Use this pattern when unlabeled data is abundant and domain knowledge can be expressed in reusable signals. Document classification, relation extraction, and combining legacy rules with limited annotations are natural candidates.

If experts cannot articulate informative sources, or a modest labeled dataset already solves the problem, direct annotation can be simpler. Critical decisions still need evidence that the resulting model meets the required standard.

## Tradeoffs and operating costs

One rule can label many records, but writing, testing, versioning, and maintaining sources consumes expert time. Recompute labels when rules change, track their provenance, and retrain compatible model versions. External lookups and model-based labeling can add latency or usage charges.

Compare against direct rules, majority voting, and a small supervised baseline. Evaluate the final predictor on independently reviewed data, including important slices and abstention-heavy regions. More coverage can mean more mistakes rather than more useful supervision.

## Common mistakes and limitations

Treating correlated votes as independent evidence can inflate confidence. Treating abstention as a negative label can distort class balance. Tuning rules repeatedly against the final test set removes its value as an independent check.

Rules can encode language, demographic, or workflow biases. A learned model can reproduce those biases even when it no longer executes the rules. Soft targets express a model's uncertainty under assumptions; they do not certify truth. The explorer's assigned weights and tiny English examples establish neither source reliability nor production performance.

## Related patterns

[[ml-active-learning|Active Learning]] chooses examples for additional annotation; Weak Supervision creates targets from imperfect sources. They can be combined. **Self-Training** uses a model's own predictions as pseudo-labels, while this workflow emphasizes multiple explicit sources. **Transfer Learning** reuses learned representations or parameters rather than generating labels. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] and [[ml-slice-based-evaluation|Slice-Based Evaluation]] help detect inflated results and uneven errors.

## Sources and further reading

- [Zhi-Hua Zhou: A Brief Introduction to Weakly Supervised Learning](https://cs.nju.edu.cn/zhouzh/zhouzh.files/publication/nsr18.pdf) — the broader family of incomplete, inexact, and inaccurate supervision.

- [Ratner and colleagues: Data Programming: Creating Large Training Sets, Quickly](https://arxiv.org/abs/1605.07723) — labeling functions, generative assumptions, and noise-aware training.
- [Ratner and colleagues: Snorkel: Rapid Training Data Creation with Weak Supervision](https://arxiv.org/abs/1711.10160) — the end-to-end research system and its empirical settings.
- [Snorkel: LabelModel](https://snorkel.readthedocs.io/en/latest/packages/_autosummary/labeling/snorkel.labeling.model.label_model.LabelModel.html) — conditional probabilities, probabilistic aggregation, and the documented conditional-independence assumption.
- [Snorkel: LFAnalysis](https://snorkel.readthedocs.io/en/latest/packages/_autosummary/labeling/snorkel.labeling.LFAnalysis.html) — definitions of coverage, overlap, and conflict.
- [Mintz and colleagues: Distant supervision for relation extraction without labeled data](https://aclanthology.org/P09-1113/) — knowledge-base supervision and its sentence-level assumption.
