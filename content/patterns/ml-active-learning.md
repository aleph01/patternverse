---
id: ml-active-learning
type: pattern
title: 'Active Learning'
summary: 'Spend a limited labeling budget on examples selected to improve the current model, then refit and evaluate against an independent reference.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A support team has 50,000 unlabeled tickets and enough specialist time to classify 300 this week. Labeling another hundred routine requests may teach its classifier less than resolving a handful of cases it repeatedly confuses. Yet choosing only unusual tickets could produce a dataset unlike the work arriving tomorrow.

Active Learning makes the choice of what to label part of model development. Its purpose is to obtain useful improvements from a constrained annotation budget. The gain depends on the task, model, selection strategy, and quality of the answers.

## Core idea

Train an initial model, use it to select examples for labeling, obtain those labels, and refit. Repeat while the expected benefit justifies the cost.

In **pool-based active learning**, the candidates already exist in an unlabeled pool. **Stream-based selection** instead decides whether to request a label as each example arrives. The source of labels, sometimes called an oracle, is often a person following an annotation policy. The name does not imply infallibility.

Selection and evaluation have different purposes. Deliberately informative training examples need not form a representative test set. Keep an independent evaluation sample that reflects the conditions of use.

## How it works

Start with labeled examples sufficient to fit the intended model. Score the remaining candidates with a query strategy, request a small batch of labels, check their quality, remove those candidates from the unlabeled pool, and retrain with the expanded labeled set.

**Uncertainty sampling** requests examples the model finds difficult to classify. For a binary probability model, a prediction near 0.5 is less decisive than one near 0.99. Other strategies use disagreement between models or combine uncertainty with coverage of different regions. These are ways to estimate usefulness, not interchangeable definitions of it.

Batch selection needs particular care: ten near-identical uncertain examples can ask essentially the same question. A diversity-aware batch can cover several gaps instead. Log the model version, query rule, selected records, annotation decisions, and costs so the process can be inspected and repeated.

## Worked examples

### Choosing support tickets

Suppose a fictional classifier estimates whether a ticket requests a refund:

| Ticket | Estimated refund probability | Least-confidence score: 1 minus the larger class probability |
| ------ | ---------------------------: | -----------------------------------------------------------: |
| A      |                         0.99 |                                                         0.01 |
| B      |                         0.51 |                                                         0.49 |
| C      |                         0.20 |                                                         0.20 |

Least-confidence sampling selects B. Its actual label must still come from the specialist. The score describes the current classifier's uncertainty; it does not prove that B is incorrectly classified or that labeling it will improve performance.

If B is an incomplete message that no specialist can resolve, repeatedly requesting similar messages wastes effort. The annotation policy needs an ambiguous or unanswerable outcome, and selection should account for answerability and duplicate content.

### Learning a cutoff with an equal budget

The explorer uses fictional numerical scores to make the learning loop inspectable. A simulator labels scores at or above 63 positive. Each learner begins knowing only that 0 is negative and 100 is positive. Its model places a cutoff halfway between the largest revealed negative and smallest revealed positive. Initially that is **(0 + 100)/2 = 50**. Querying 50 reveals a negative, so the next fit moves to **(50 + 100)/2 = 75**.

Uncertainty selection queries the remaining integer score nearest that midpoint. Random selection draws without replacement from the same pool of scores 1–99. Both acquire one label per round and refit the same model family.

| Stage                 | Latest uncertainty-selected score and label | Remaining possible cutoff    | Fitted cutoff |
| --------------------- | ------------------------------------------- | ---------------------------- | ------------: |
| Initial two labels    | None                                        | Greater than 0, at most 100  |            50 |
| One additional label  | 50 is negative                              | Greater than 50, at most 100 |            75 |
| Two additional labels | 75 is positive                              | Greater than 50, at most 75  |          62.5 |

The interval contains cutoffs consistent with the revealed labels. It is not a statistical confidence interval.

![Two threshold classifiers start at cutoff 50. After two additional labels each, uncertainty selection fits 62.5 while seeded random selection fits 53.](../assets/machine-learning/active-learning-label-budget.svg 'Compare both strategies after the same two additional labels: their fitted cutoffs differ because they queried different scores. The dashed truth explains the result but is withheld from fitting and selection. This is a noiseless fictional scenario.')

With seed 2026, random selection first requests scores 3 and 6. Both are negative, so its fitted cutoff becomes 53. On 200 separate scores, uncertainty selection gets 199 correct and random selection gets 180. These are calculated results for this scenario, not typical savings estimates.

### Why one more label can lower the score

The next uncertainty query, 62, is negative. The model's possible cutoff interval shrinks again, but its midpoint moves to 68.5 and test correctness falls to 189 of 200. The new interval is (62, 75], whose midpoint is **(62 + 75)/2 = 68.5**. It rules out more cutoffs, but its midpoint is temporarily farther from the true 63 than 62.5 was. More information need not improve this fitted prediction rule at every step.

```patternverse-widget
{
  "src": "ml-active-learning.html",
  "title": "Active learning label-budget explorer",
  "height": 1150,
  "fallback": "Two learners start with the same two labels. Each round acquires one label per strategy and refits. Compare their cutoffs and separate test results in a noiseless, one-boundary scenario."
}
```

### A documented implementation

The open-source modAL framework separates the estimator from the query strategy. Its `ActiveLearner.query` selects candidates; newly obtained labels are supplied through `teach`, which expands the labeled training data and refits the estimator. It provides least-confidence, margin, and entropy strategies. This is a documented software workflow, not evidence that one strategy is best for every deployment.

Lewis and Gale's early text-classification research also tested uncertainty sampling on a newswire categorization task. Its empirical results belong to that experimental setting; they are not a general promise about annotation savings.

## Assumptions for correctness

Queried examples must be available to annotate, and their labels must answer a consistent target question. Annotation guidelines, disagreement review, and the ability to abstain matter when difficult cases are genuinely ambiguous.

The representation and model need enough capacity to learn the relevant distinction. A confidently wrong model may never request a missing subpopulation. Preserve coverage through an appropriate starting sample and selection design rather than equating low confidence with all useful information.

The explorer assumes one monotonic, noiseless boundary, reliable simulated labels, and equal label costs. Its 200 fractional test scores are separate from the integer query pool; their labels never enter fitting or selection. Real evaluation labels also consume resources.

## When to use it

Consider Active Learning when unlabeled examples are plentiful, expert labels are expensive, and repeated training and annotation rounds are practical. Ticket routing, document classification, and specialist image annotation can present this combination.

If labels are cheap, the target is changing rapidly, or retraining dominates costs, representative random labeling can be simpler. A small, exhausted pool offers little room for better selection.

## Tradeoffs and operating costs

Annotation efficiency can be offset by scoring the pool, retraining, coordinating specialists, reviewing disagreements, and waiting between rounds. Compare performance against elapsed time and annotation cost as well as label count. Particularly difficult examples may take longer to label.

Use a random-selection baseline with comparable starting data, model tuning, and budget. Repeat experiments across starting samples or random seeds before making a production claim. Define stopping criteria using independent evaluation and cost constraints; a changing query score alone need not establish sufficient performance.

## Common mistakes and limitations

Evaluating only on actively selected examples confuses targeted data collection with population performance. Repeatedly adjusting the strategy against a final test set also turns that set into development data.

Pure uncertainty selection can overfocus on noise, outliers, or one narrow region. Confidence can be misleading, and label errors can redirect later queries. Active Learning is not guaranteed to beat random selection: Imberg and colleagues report datasets where uncertainty sampling performed worse.

The explorer deliberately favors a setting where midpoint queries are informative. It does not simulate messy representations, human disagreements, multiple classes, unequal annotation time, or changing data. Its finite query pool also limits how precisely the true boundary can be recovered.

## Related patterns

[[ml-weak-supervision|Weak Supervision]] obtains labels from imperfect rules or other sources; Active Learning chooses which examples deserve additional annotation. They can be combined. **Transfer Learning** can provide the initial representation. [[ml-probability-calibration|Probability Calibration]] examines confidence quality but does not by itself establish a good query policy. [[ml-slice-based-evaluation|Slice-Based Evaluation]] and [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] help check whether the resulting improvement is credible across the intended population.

## Sources and further reading

- [Burr Settles: Active Learning Literature Survey](https://burrsettles.com/pub/settles.activelearning.pdf) — scenarios, query strategies, and practical considerations.
- [Lewis and Gale: A Sequential Algorithm for Training Text Classifiers](https://arxiv.org/abs/cmp-lg/9407020) — early uncertainty-sampling research.
- [modAL: ActiveLearner](https://modal-python.readthedocs.io/en/latest/content/models/ActiveLearner.html) — querying, supplying labels, and refitting.
- [modAL: Uncertainty sampling](https://modal-python.readthedocs.io/en/latest/content/query_strategies/uncertainty_sampling.html) — least confidence, margin, and entropy.
- [Imberg and colleagues: Optimal Sampling in Unbiased Active Learning](https://proceedings.mlr.press/v108/imberg20a.html) — sampling design and cases where uncertainty sampling underperforms random selection.
- [Werner and colleagues: A Cross-Domain Benchmark for Active Learning](https://papers.nips.cc/paper_files/paper/2024/hash/72de9826cfe582e175520f404eaad473-Abstract-Datasets_and_Benchmarks_Track.html) — repeated comparisons and variability in active-learning evaluation.
