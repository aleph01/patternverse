---
id: ml-hierarchical-forecast-reconciliation
type: pattern
title: 'Hierarchical Forecast Reconciliation'
summary: 'Make forecasts across stores, regions, and totals add up consistently, while accounting for their different error patterns.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

The national sales forecast says 120 units next week. Regional forecasts say 70 for North and 40 for South. Store forecasts imply yet another total. Purchasing, staffing, and logistics now have incompatible answers to the same question, even though every model was trained on a reasonable dataset.

Hierarchical Forecast Reconciliation produces one consistent collection of forecasts. It addresses disagreements between predictions linked by known sums, rather than requiring every forecast to come from one model.

## Core idea

Forecasts are **coherent** when stores sum to regions and regions sum to the total. Reconciliation adjusts base forecasts into that allowable set. An average of unrelated model outputs does not enforce these adding-up relationships.

There can be many coherent answers. Keep the store forecasts and add them upward, or adjust forecasts at several levels together. Choosing between these answers requires assumptions about which forecasts contain useful information, not just a check that they add up.

## How it works

Generate base forecasts for the same origin, target period, units, and quantity definition. Keep their ordering aligned with the hierarchy.

**Bottom-up** reconciliation retains store forecasts and adds them upward. It is an essential baseline, but discards information in independently modeled aggregate forecasts. The documented `bottom_up()` implementation requires sum aggregation and matching forecasted times. [fabletools](https://fabletools.tidyverts.org/reference/bottom_up.html).

**Least-squares reconciliation** instead adjusts all levels together, minimizing the sum of squared adjustments. Weighting can make a reliable series more expensive to move. Correlations between forecast errors change which combinations of adjustments are plausible.

Estimate error behavior using history available before evaluation. Compare methods in rolling-origin backtests: repeatedly forecast forward using only history available at each origin. Measure performance by level and series alongside coherence.

## Worked examples

### Three forecasts, one constraint

Start with a smaller fictional hierarchy: Total 100, store A 60, and store B 50. The stores sum to 110. Bottom-up keeps them and changes Total to 110.

For equal-weight least squares, minimize **(a − 60)² + (b − 50)² + (a + b − 100)²**. Here a and b are adjusted store forecasts, and their sum is the adjusted total. The solution is **a = 56⅔, b = 46⅔, Total = 103⅓**: each store moves down 3⅓ and the total moves up 3⅓. They meet without treating any one forecast as authoritative.

Let each correction have size d. Coherence requires **110 − 2d = 100 + d**, giving **d = 10/3**. Equal squared penalties make equal-magnitude corrections optimal in this three-forecast case.

### Fictional retail hierarchy

North contains stores N1 and N2; South contains S1 and S2. All numbers forecast units for the same next week.

| Series | Base forecast | Equal-weight reconciled |
| ------ | ------------: | ----------------------: |
| Total  |           120 |                115.7143 |
| North  |            70 |                 69.5238 |
| South  |            40 |                 46.1905 |
| N1     |            30 |                 34.7619 |
| N2     |            30 |                 34.7619 |
| S1     |            20 |                 18.0952 |
| S2     |            30 |                 28.0952 |

Before reconciliation, Total − North − South is 10. North exceeds its store sum by 10, while South falls short by 10. Equal-weight least squares moves every level to resolve these three discrepancies together. The unrounded results add exactly within numerical precision; displayed decimals can leave tiny rounding differences.

Bottom-up instead produces Total 110, North 60, and South 50, leaving all store values unchanged. Neither result is justified merely because it adds up. Suppose the eventual store values were exactly their original forecasts, (30, 30, 20, 30). In this deliberately constructed outcome, equal-weight reconciliation raises store mean absolute error from zero to 3.3333 units. Its all-series root mean squared error nevertheless falls from 6.5465 to 5.2164. Different evaluation levels and losses answer different questions.

![A fictional seven-series hierarchy shows base forecasts changing into coherent forecasts, three adding-up gaps becoming zero, and a hypothetical store-error comparison.](../assets/machine-learning/hierarchical-forecast-reconciliation.svg 'Follow base forecasts into a single coherent hierarchy, then check the three gaps becoming zero. The separate hypothetical outcome shows why consistency can coexist with worse store error.')

```patternverse-widget
{
  "src": "ml-hierarchical-forecast-reconciliation.html",
  "title": "Hierarchical forecast reconciliation explorer",
  "height": 1200,
  "fallback": "Seven fictional forecasts disagree. Equal-weight reconciliation makes their adding-up gaps zero; bottom-up gives another coherent result. Compare adjustments and hypothetical errors separately: coherence does not guarantee better accuracy."
}
```

### Optional: matrices and error weights

A **summing matrix S** records which stores belong to each total. If b contains four store forecasts, **S b** contains the complete coherent hierarchy, including the stores. Each row selects the stores for one series. This also supports crossed product and geographic groups. [Forecasting: Principles and Practice](https://otexts.com/fpp3/hierarchical-forecasting.html).

The weighted objective is **Q = (S b − base)ᵀ W⁻¹ (S b − base)**. The vector in parentheses contains adjustments; W describes assumed forecast-error variances and covariances. For diagonal W, lower variance means a larger penalty for moving that series.

**Minimum Trace (MinT)** uses forecast-error covariance to minimize the sum of reconciled error variances among linear unbiased methods under its assumptions. It does not guarantee improvement for every series or outcome. With limited history, shrinkage can stabilize covariance estimates by pulling them toward a diagonal approximation. [MinT paper](https://robjhyndman.com/papers/mint.pdf).

The explorer solves the objective using fixed fictional matrices. Correlated weights use a positive diagonal matrix plus an explicit shared-factor covariance. No residuals estimate those weights, and no forecasting model is fitted. The hypothetical outcome is displayed separately and never enters the solve.

### Fictional nonnegative demand

Set Total to 10, both regions to 5, and each region's store forecasts to (1, 30). Every base value is nonnegative. Unconstrained equal-weight reconciliation nevertheless gives each small store approximately −10.1429. Replacing those negative values with zero independently leaves each regional forecast below its store sum by 10.1429.

Solving with nonnegative store constraints instead yields stores (0, 11.25, 0, 11.25), regions 11.25 each, and Total 22.5. The adjustment objective rises because the feasible set is smaller. This is a constrained solve, not clipping followed by a claim of coherence. Nonnegative reconciliation is an established extension when negative forecasts are inadmissible. [Wickramasuriya, Turlach, and Hyndman](https://robjhyndman.com/publications/nnmint/).

### Verified software mechanism

The fabletools `reconcile()` documentation aggregates male and female lung-death series, fits trend-and-seasonality models, applies `min_trace()`, and forecasts the resulting structure. This demonstrates a real implementation workflow; the retail values above do not reproduce that dataset or its results. [Documented example](https://fabletools.tidyverts.org/reference/reconcile.html).

## Assumptions for correctness

The aggregation map must describe the actual target. Stores must be disjoint within a regional sum; quantities must share units and time boundaries. Rates and percentages generally require their numerators and denominators to be handled explicitly rather than summing the rates. Changing store membership requires a compatible structure for each forecast target.

Numerical coherence requires a valid summing map and a well-posed solve. Statistical claims additionally depend on forecast bias and the error model. The explorer's positive-definite matrices establish a unique least-squares solution, not realistic error estimates. Fractional expected demand is acceptable here; integer purchasing decisions require a separate rule.

## When to use it

Use this pattern when multiple planning levels need mutually consistent forecasts, or when aggregate and detailed models contain complementary information. It is useful after model training and before downstream planning.

If only the total matters, maintaining and reconciling every store may add unnecessary work. If the quantities have no valid aggregation relationship, forcing one can create a coherent answer to the wrong problem.

## Tradeoffs and operating costs

Bottom-up is simple but depends heavily on detailed forecasts. Covariance-aware reconciliation adds residual collection, aligned historical forecasts, matrix estimation, and numerical maintenance. Dense matrices become costly for large collections; sparse methods can exploit aggregation structure.

The fabletools interface exposes OLS, variance scaling, structural scaling, full covariance, and shrinkage options. These are different specifications, not interchangeable labels for a guaranteed improvement. [Minimum-trace reference](https://fabletools.tidyverts.org/reference/min_trace.html).

## Common mistakes and limitations

Do not treat a management target as an observed forecast and silently force all predictions to meet it. Holding a total fixed is an additional constraint that changes the problem.

Coherence does not establish that forecast bias, a missing promotion, or an invalid hierarchy has been repaired. Independently rounding every displayed node can also break exact sums. If integer allocations matter, preserve the constraints during allocation.

This article concerns point forecasts. Adding marginal interval endpoints or quantiles does not generally produce the corresponding interval or quantile for a sum; uncertainty requires a joint treatment of dependence. The explorer makes no interval-coverage claim.

## Related patterns

[[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] keeps future observations out of weight estimation and method selection. [[ml-slice-based-evaluation|Slice-Based Evaluation]] checks which levels and series gain or lose after reconciliation.

[[ml-decision-focused-learning|Decision-Focused Learning]] optimizes predictions for downstream decisions; reconciliation enforces aggregation relationships and can precede that decision process. **Forecast combinations** blend estimates of the same target, whereas reconciliation links predictions of different, structurally related targets.

## Sources and further reading

- [Forecasting: Principles and Practice, hierarchical forecasting chapter](https://otexts.com/fpp3/hierarchical-forecasting.html): aggregation maps, coherent forecasts, and distributional extensions.
- [Wickramasuriya, Athanasopoulos, and Hyndman: MinT paper](https://robjhyndman.com/papers/mint.pdf): covariance-weighted reconciliation and its optimality assumptions.
- [fabletools: bottom_up](https://fabletools.tidyverts.org/reference/bottom_up.html): bottom-up behavior and input requirements.
- [fabletools: min_trace](https://fabletools.tidyverts.org/reference/min_trace.html): reconciliation specifications and sparse computation.
- [fabletools: reconcile](https://fabletools.tidyverts.org/reference/reconcile.html): a documented aggregation, modeling, and reconciliation workflow.
- [Wickramasuriya, Turlach, and Hyndman: Optimal non-negative forecast reconciliation](https://robjhyndman.com/publications/nnmint/): constrained reconciliation for nonnegative quantities.
