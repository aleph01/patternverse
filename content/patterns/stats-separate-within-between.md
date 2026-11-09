---
id: stats-separate-within-between
type: pattern
title: 'Separate Within-Group from Between-Group Relationships'
summary: 'Identify the level of comparison before interpreting a relationship in grouped or repeated data.'
status: published
verses:
  - statistics
---

Across cities, places with higher average income may have a different pattern of spending than the relationship among households within any one city. A relationship between group averages does not automatically describe the people inside those groups.

The response is to identify the level of the question and separate within-group variation from between-group variation. Preserve identifiers and model the relevant structure rather than treating a pooled association as one universal relationship.

## Interactive example

![Raw success rates favor B, 74% to 36%; at the same case mix they favor A, 60% to 50%.](../assets/statistics/stats-composition-preview.svg 'A succeeds more often within each fictional subgroup, but B has the higher raw aggregate because it receives more easy cases. Standardizing both to a common mix changes the comparison.')

The first pair of bars uses each option’s actual case mix. The second pair gives both options the same target mix. Run the example to change those mixes; Reset restores the reversal shown here.

```patternverse-widget
{
  "src": "stats-composition.html",
  "title": "Group composition explorer",
  "height": 900,
  "fallback": "A succeeds more often within each fictional subgroup, but B has the higher raw aggregate because it receives more easy cases. Standardizing both to a common mix changes the comparison."
}
```

## Distinguish the comparisons

Imagine following workers across days. Workers who usually take more breaks may differ from other workers in job type, workload, or health. That between-worker comparison is different from asking whether a particular worker performs differently on days when they take more breaks than usual.

A useful decomposition writes a time-varying predictor as the person's average plus the deviation from that average.

For example, if a worker averages two breaks a day but takes three today, write today’s count as **2 + 1**. The two describes this worker’s usual count, which can be compared with other workers’ usual counts. The extra one describes today’s change relative to this worker’s own average. The total of three alone does not tell those comparisons apart. A model can then represent between-person and within-person associations separately. The interpretation still depends on timing, covariates, outcome structure, and assumptions; the decomposition does not automatically make either association causal.

A second problem arises when groups have different composition. In the interactive example, option A succeeds more often than B within both easy and difficult cases, yet B has the higher aggregate rate because B receives many more easy cases. This is a constructed illustration of Simpson's paradox.

## Worked example: compare the same case mix

The explorer fixes success rates at **90% for A and 80% for B on easy cases**, and **30% for A and 20% for B on difficult cases**. A is ten percentage points higher within either subgroup. Yet only 10% of A’s cases are easy, compared with 90% of B’s.

A’s raw rate is **0.10 × 90% + 0.90 × 30% = 36%**. B’s is **0.90 × 80% + 0.10 × 20% = 74%**. B’s easier case mix reverses the aggregate comparison.

Give both options a target mix of half easy and half difficult cases. A then has **0.50 × 90% + 0.50 × 30% = 60%**, and B **0.50 × 80% + 0.50 × 20% = 50%**. The standardized difference is **60% − 50% = 10 percentage points**. The four bars compare raw and standardized rates; they do not represent four new datasets.

## Standardize a relevant composition

If the question is performance at the same case mix, calculate subgroup estimates and combine them using a common target distribution. The standardized result answers a different, explicitly defined question from the raw aggregate. Keep both visible and explain the weights.

Choosing subgroups requires substantive reasoning. A pretreatment source of confounding and a posttreatment mediator have different causal roles. Adjusting indiscriminately can introduce bias or remove part of the effect of interest. A reversal in the data does not, by itself, establish which analysis has a valid causal interpretation.

## Advanced notes: dependence and aggregation are separate issues

Observations from the same group may be correlated, affecting uncertainty even when the target is a pooled association. A clustered uncertainty procedure or multilevel model may be appropriate. Correcting standard errors for clustering does not automatically distinguish within-group and between-group meanings in the coefficient itself.

Conversely, group fixed effects can focus an estimate on within-group variation while answering a narrower question than stakeholders expect. If a predictor barely changes within groups, there may be little information for that contrast. Strong precision at the individual-row level cannot compensate for absent relevant variation.

Spatial data add another layer: neighboring areas may share conditions, while area averages still do not reveal individual relationships. State whether the unit of inference is a person, location, or population summary and justify movement between those levels.

This pattern is useful for panel data, schools, hospitals, teams, neighborhoods, and any analysis where an overall trend could arise from who belongs to which group. Ask what varies within units, what differs between units, and which comparison addresses the question. Then choose a model and uncertainty calculation that preserve those distinctions.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [Dagitty: learning resources for causal diagrams](https://dagitty.net/learn/index.html)
- [The Effect](https://www.theeffectbook.net/index.html)
