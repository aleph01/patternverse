---
id: ml-hyperparameter-tuning
type: pattern
title: 'Hyperparameter Tuning'
summary: 'Compare training configurations within a defined search budget, using validation evidence to select a candidate while preserving independent evaluation.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A classifier works, but its results change whenever you adjust tree depth or regularization. One setting wins on yesterday’s split; another wins after a longer search. Picking the largest score feels straightforward, yet it leaves two questions unanswered: what alternatives were actually tried, and how trustworthy is the winning score?

Hyperparameter Tuning makes that comparison deliberate. Define what can vary, how each configuration will be evaluated, and how much search you can afford. The result is a traceable comparison, not a promise of the best possible model.

## Core idea

Separate **fitting a model** from **choosing how it is fitted**. Training learns parameters, such as regression coefficients, from training data. A hyperparameter, such as a regularization strength, controls that fitting procedure. Tuning tries candidate settings and compares their resulting models using validation evidence.

Think of each trial as a complete experiment: configuration, training procedure, validation protocol, and result. “Best” means best among the completed eligible trials under that protocol. An untried candidate cannot win.

## How it works

Choose an objective that represents the intended use, with an explicit improvement direction. Define candidate ranges and valid combinations. A learning rate spanning several orders of magnitude often calls for multiplicative spacing rather than small equal increments. Specify the evaluation split, training allowance, and stopping policy before interpreting scores.

Fit preprocessing inside each trial’s training boundary. Compare candidates on the same folds or holdout where appropriate, and record their settings, scores, failures, seeds, and resource use. For grouped or time-ordered observations, choose a validation scheme matching the prediction setting rather than defaulting to shuffled rows.

Grid search enumerates specified combinations. Random search samples from declared ranges or distributions. Adaptive methods use earlier trial results to choose later settings; resource-allocation methods can stop weaker candidates early. These are alternative search policies around the same fit-and-compare mechanism. [Scikit-learn’s tuning guide](https://scikit-learn.org/stable/modules/grid_search.html) documents grid, randomized, and successive-halving searches, including parameter distributions and resource allocation.

After selection, follow a declared refitting policy, then evaluate the resulting procedure on evidence that did not guide selection. Refitting can change the fitted coefficients, so record both the winning trial and the final artifact. If the independent result leads you to redesign the search, that result has become development feedback; it cannot remain untouched final evidence.

## Worked examples

### A small search can miss the better setting

This computed demonstration uses fictional, dimensionless input readings **x** and responses **y**. Four training records are **(−2, −4), (−1, −1), (1, 1), (2, 4)**. A model predicts **wx**, where **w** is its fitted coefficient. We fix the intercept at zero throughout.

The hyperparameter **λ**, pronounced lambda, penalizes large coefficients. Each fit minimizes the **sum of squared training errors plus λw²**. For this one-coefficient model, the fitted value is **w = Σxy / (Σx² + λ)**: sum the input–response products in the numerator and the squared inputs in the denominator. Here those sums are **18** and **10**. This objective matches the squared-error penalty documented for [ridge regression](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Ridge.html); the explorer implements the scalar solution directly.

Validation panel A contains four separate fictional observations: **(−2, −2), (−1, −1), (1, 1), (2, 2)**. The input values repeat, but these are distinct records whose responses are withheld from fitting. Measure mean squared error, **MSE**: square each prediction error, add the four values, and divide by four.

| Setting λ | Fitted w | Training MSE | Validation MSE |
| --------: | -------: | -----------: | -------------: |
|         0 |      1.8 |        0.400 |          1.600 |
|         2 |      1.5 |        0.625 |          0.625 |
|         8 |      1.0 |        2.000 |          0.000 |
|        26 |      0.5 |        4.625 |          0.625 |

For λ = 2, **w = 18 / 12 = 1.5**. Validation predictions are **−3, −1.5, 1.5, 3**. Subtracting the responses gives **−1, −0.5, 0.5, 1**, so MSE is **(1 + 0.25 + 0.25 + 1) / 4 = 0.625**. These squared, dimensionless errors make lower values preferable.

A budget of two trials, ordered λ = 0 then 2, selects **λ = 2**. Expanding to all four candidates selects **λ = 8**, whose predictions exactly match this constructed validation panel. Meanwhile, λ = 0 has the lowest training error. Tuning chooses using validation error, not the fit’s training loss. The zero validation error is a property of these invented numbers, not evidence of perfect future predictions.

![Two completed ridge trials are compared on validation panel A. Lambda zero has validation MSE 1.6 and lambda two has MSE 0.625. Lambda two is selected within the two-trial budget; lambda eight and twenty-six remain untried.](../assets/machine-learning/hyperparameter-tuning.svg 'Follow the completed trials from training into validation, then into selection. Only evaluated candidates can win: increasing the budget can change the selected setting, while independent test evidence remains outside this comparison.')

The explorer actually fits each attempted candidate and computes its validation errors. Change the budget or trial order to see which candidates become eligible. Optional details show the source records, predictions, and fitting arithmetic. No test outcomes are supplied.

```patternverse-widget
{
  "src": "ml-hyperparameter-tuning.html",
  "title": "Hyperparameter search budget and validation explorer",
  "height": 1200,
  "fallback": "With validation panel A and two trials ordered from weaker penalties, lambda 0 fits coefficient 1.8 with validation MSE 1.6; lambda 2 fits coefficient 1.5 with MSE 0.625 and is selected. Lambda 8 and 26 are untried. With four trials, lambda 8 is selected with zero MSE on this constructed panel. These are synthetic calculations, not measured production performance."
}
```

### Validation evidence can change the winner

Panel B keeps the same four validation inputs but changes their responses to **−3, −1.5, 1.5, 3**. All training data and fitted coefficients stay unchanged. With all four trials, λ = 2 now has zero validation error and wins; λ = 8 has MSE **0.625**.

This is a controlled illustration of dependence on validation outcomes, not a simulation of random sampling or uncertainty. It does not tell us which panel represents deployment better. In real work, an unstable ranking warrants examining split suitability and variability, rather than treating a tiny score difference as decisive.

### Count the search’s actual fitting work

A separate fictional grid has **four regularization strengths** and **three feature configurations**: **4 × 3 = 12 candidates**. Five-fold validation fits each candidate five times, giving **12 × 5 = 60 fits**. One final refit brings the total to **61**, assuming no failures or extra experiments.

Random search instead limits sampled trials. [Bergstra and Bengio’s study](https://jmlr.org/papers/v13/bergstra12a.html) found it an effective alternative to grids in the settings they studied, especially when relatively few hyperparameters strongly affected results. That finding supports considering random search; it does not establish that it always wins. Neither search policy is benchmarked by this explorer.

## Assumptions for correctness

Validation examples must support the intended comparison, with training-only transformations and appropriate entity or time separation. Candidate objectives, resource allowances, and failure handling must be comparable or their differences explicitly modeled. A short-run ranking need not match a full-training ranking.

The winning validation score is selection evidence, not independent performance evidence. [Cawley and Talbot](https://jmlr.org/papers/v11/cawley10a.html) explain how optimization of a noisy selection criterion can itself overfit. Independent testing, or an appropriate outer evaluation loop, must assess the chosen procedure.

## When to use it

Use tuning when plausible training settings materially affect a model and credible validation data are available. Start with a useful baseline and a small, justified search space before investing in broader exploration.

If labels are unreliable, the split is unsuitable, or the model lacks essential inputs, a larger search may simply optimize the wrong experiment. Repair those problems first.

## Tradeoffs and operating costs

Every candidate consumes fitting and evaluation resources. Parallel execution can reduce waiting time while increasing memory, accelerator demand, and operational complexity. Cheap preliminary trials save work only when their evidence helps allocate the remaining budget.

Repeated seeds or folds improve the view of variability but multiply cost. More search also creates more opportunities to exploit quirks in the same validation data. Keep a trial ledger and a stopping budget rather than extending the search indefinitely after near misses.

## Common mistakes and limitations

Do not use the final test set to choose ranges, settings, or stopping rules. Do not fit scaling or feature selection on all observations before cross-validation. Failed or incomplete trials need an explicit status, not an invented favorable score.

Searching a narrow range thoroughly can still miss useful regions. A selected setting is conditional on the data, preprocessing, metric, and search budget. [Scikit-learn’s nested-validation example](https://scikit-learn.org/stable/auto_examples/model_selection/plot_nested_cross_validation_iris.html) separates inner selection from outer evaluation; its documented implementation is distinct from this fixed-holdout teaching explorer.

## Related patterns

[[ml-heuristic-benchmark|Heuristic Benchmark]] establishes whether added complexity beats a credible simple reference. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] protects the information boundaries within tuning and final evaluation. [[ml-checkpoints|Checkpoints]] preserves progress inside a trial; it does not choose the trial’s settings. [[ml-workflow-pipeline|Workflow Pipeline]] coordinates trial tasks and artifacts, while tuning supplies their comparison and selection policy.

## Sources and further reading

- [Scikit-learn: Tuning the hyper-parameters of an estimator](https://scikit-learn.org/stable/modules/grid_search.html) — search spaces, randomized search, and resource allocation.
- [Scikit-learn: Ridge](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Ridge.html) — penalized squared-error objective.
- [Bergstra and Bengio: Random Search for Hyper-Parameter Optimization](https://jmlr.org/papers/v13/bergstra12a.html) — empirical and theoretical comparisons with grid search.
- [Cawley and Talbot: On Over-fitting in Model Selection and Subsequent Selection Bias in Performance Evaluation](https://jmlr.org/papers/v11/cawley10a.html) — overfitting the selection criterion.
- [Scikit-learn: Nested versus non-nested cross-validation](https://scikit-learn.org/stable/auto_examples/model_selection/plot_nested_cross_validation_iris.html) — selection inside independent outer evaluation.
