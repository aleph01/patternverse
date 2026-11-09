---
id: stats-choose-consequences
type: pattern
title: 'Compare Actions by Their Consequences'
summary: 'Connect uncertain outcomes to the benefits, losses, and constraints of the actions available.'
status: published
verses:
  - statistics
---

A team asks whether a measured improvement is statistically significant before deciding whether to ship a feature. But the feature is inexpensive to reverse, while delaying it has costs. Another team faces an irreversible high-cost change. The same estimate can support different actions because the consequences differ.

Statistical evidence describes uncertainty about quantities and outcomes. A decision also requires available actions, their consequences, and preferences or losses. Make these components explicit and compare actions under the relevant uncertainty.

## Specify actions before choosing a threshold

Consider an alert that triggers manual review. If review is cheap and missing a true issue is costly, a relatively low probability may justify investigation. The same probability would not automatically justify an irreversible sanction. A probability threshold should follow from the consequences and constraints, rather than being borrowed from a conventional significance threshold.

In a simple two-action example, acting costs 10 units and yields 50 units of benefit if the underlying condition is present. Ignoring other consequences, the expected net benefit is 50 × p − 10. Acting has positive expected net benefit when p exceeds 0.2. Those numbers are fictional assumptions that make the reasoning transparent, not a universal decision rule.

A second example concerns capacity. A staffing decision may weight excess capacity and unmet demand differently. The preferred forecast quantile can therefore differ from the forecast mean. Examine the full predictive distribution relevant to the action.

## Test sensitivity to values as well as probabilities

Benefits and costs may be uncertain, disputed, unevenly distributed, or difficult to express in one unit. Show how the preferred action changes across reasonable assumptions. Include hard constraints and ethical commitments explicitly rather than assuming everything can be traded away through one score.

Expected utility is a coherent framework when its assumptions and inputs are defensible. It does not decide whose preferences count or make contested values disappear. A useful analysis shows tradeoffs that stakeholders can examine.

## Worked example: the same probability supports different actions

Suppose a reversible process intervention costs **10 utility units** whenever used. A utility unit is a common scale for the benefits and losses being compared; it could represent money in a simple case, but these units are fictional preference values. If an underlying issue is present, it yields **50 units of gross benefit**; otherwise it yields no benefit. Declining the intervention has net benefit zero. Assume these utilities include the relevant consequences, the intervention has no unmodeled harms, and the issue probability is calibrated for this decision.

Let p be the chance that the issue is present. Acting has expected net benefit **50p − 10**. It is preferred to waiting when **p > 10 / 50 = 0.20**, with a tie at 0.20. At **p = 0.30**, the expected net benefit is **15 − 10 = 5 units**, so acting is preferred under these assumptions.

To unpack that average: if the issue is present, acting nets 50 − 10 = 40; if absent, acting loses 10. At p = 0.30, averaging those possible results gives **0.30 × 40 + 0.70 × (−10) = 5**. “Expected” means this probability-weighted average, not a promised gain on the next occasion. This threshold follows from the stated costs and benefits, not a significance convention.

Now change the intervention cost to **20** while keeping the probability and benefit unchanged. The threshold becomes **20 / 50 = 0.40**. At p = 0.30, expected net benefit is **15 − 20 = −5**, so waiting is preferred. The statistical probability did not change; the action changed because its consequences did.

![Expected net-benefit lines for costs ten and twenty cross the waiting baseline at issue probabilities 0.20 and 0.40. At probability 0.30, the lower-cost intervention yields five units. A second panel compares acting now, imperfect information, and perfect information under explicit assumptions.](../assets/statistics/decision-consequences.svg "Illustrative utility units, not a universal action threshold. Information values assume the stated issue probability, test sensitivity and specificity, fixed costs, and no delay or direct test effects. Perfect information is a benchmark, not an available test.")

## Worked example: ask whether another check is worth its cost

Return to cost ten and p = 0.30. With perfect information, act only when the issue is present. Expected net benefit would be **0.30 × (50 − 10) = 12**. The best immediate decision yields five, so the expected value of perfect information is **12 − 5 = 7 units** before paying for information. This is an upper benchmark for information about the issue in this model, not a recommended research budget.

Consider an imperfect check costing **2 units**, with sensitivity **0.80** and specificity **0.90**. Assume its error probabilities are known and the check does not itself change the issue or intervention benefit. The chance of a positive result is **0.30 × 0.80 + 0.70 × 0.10 = 0.31**. After a positive result, the issue probability is **0.24 / 0.31 ≈ 0.7742**; after a negative result it is **0.06 / 0.69 ≈ 0.0870**.

Relative to the 0.20 intervention threshold, this supports acting after a positive check and waiting after a negative one. Before the check’s own cost, expected net benefit is **50 × 0.24 − 10 × 0.31 = 8.90**. Subtract the two-unit check cost to obtain **6.90**, which improves on immediate action’s five by **1.90 units**. Gross information value is **8.90 − 5 = 3.90**, below the perfect-information benchmark of seven.

| Strategy at p = 0.30 | Expected net benefit |
| --- | --- |
| Act now | 5.00 |
| Check, then act if positive | 6.90, including check cost |
| Perfect information | 12.00, before information cost |

An actual delay cost of two more units would remove the imperfect check’s advantage. Uncertain test properties, limited review capacity, or a harm omitted from the utility table can also change the recommendation. State whose utilities and constraints the calculation represents. It is a conditional decision analysis, not a guarantee about the next realized outcome.

Use [[stats-base-rates]] for the probability update after a test and [[stats-forecast-intervals]] when actions depend on future quantities rather than a binary issue. Preserve hard constraints and consequential uncertainty alongside any expected-value calculation.

## Advanced notes: ask whether more information could change the action

If a new study might alter the decision, compare the expected value of improved information with its cost, delay, and feasibility. A large uncertainty interval does not automatically mean more research is worthwhile: the same action may remain preferable throughout the relevant range.

Conversely, a small remaining uncertainty can be worth resolving when the consequences are large and the decision sits near a consequential boundary. Value-of-information analysis requires a model of what additional evidence could reveal, not merely a desire for greater certainty.

Keep causal requirements in view. Predicting who will experience an outcome does not necessarily reveal who will benefit from an intervention. A decision about changing treatment needs the relevant intervention outcomes, not only a risk score.

Use this pattern when someone asks “Is the evidence strong enough to act?” State the actions, uncertain outcomes, consequences, constraints, and assumptions. Then present the preferred action together with the conditions that would change it. Statistical uncertainty remains visible, but it becomes connected to a concrete choice.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [Stan methods guide and case studies](https://mc-stan.org/docs/stan-users-guide/decision-analysis.html)

