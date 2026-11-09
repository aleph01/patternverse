---
id: stats-paired-comparisons
type: pattern
title: 'Preserve the Pairing'
summary: 'Compare linked observations through their differences and retain the pairing when calculating uncertainty.'
status: published
verses:
  - statistics
---

A team measures task-completion time before and after a tool change for the same workers. Some workers are consistently faster than others. Treating the before and after columns as unrelated groups ignores information about whose measurements belong together.

When observations are naturally paired, preserve that structure. For a mean change, calculate each pair's difference and estimate the average difference and its uncertainty using a procedure suited to those linked observations. The pairing can remove stable person-to-person variation from the contrast.

## Worked example: four workers, four changes

Keep the same worker identifier on both measurements. In this fictional example, lower completion time is better, and a negative change means an improvement. The differences vary, so this case also lets us calculate uncertainty rather than relying only on the perfectly uniform example below.

| Worker | Before, minutes | After, minutes | After minus before |
| ------ | --------------- | -------------- | ------------------ |
| A      | 10              | 8              | −2                 |
| B      | 20              | 19             | −1                 |
| C      | 30              | 27             | −3                 |
| D      | 40              | 38             | −2                 |

![Linked completion times for four workers and a separate display of their changes of minus two, minus one, minus three, and minus two minutes.](../assets/statistics/paired-changes.svg 'Preserve the link between measurements. Workers differ greatly in completion time, while their changes cluster near a two-minute improvement. The zero line on the change display means no change; each letter identifies the same worker as in the table.')

The mean change is **(−2 − 1 − 3 − 2) / 4 = −2 minutes**: an average two-minute reduction. The individual changes have sample standard deviation √(2 / 3), approximately 0.82 minutes. This measures their scatter.

To estimate uncertainty about the average change, divide that standard deviation by √4, giving a **standard error of about 0.41 minutes**. A paired t interval uses a multiplier that allows for estimating the spread from only four differences. Here it is about 3.182, with three degrees of freedom (four differences minus one). The interval is −2 ± 3.182 × 0.408, or **−3.30 to −0.70 minutes**.

Every value in that interval is negative, which means a reduction of about 0.70 to 3.30 minutes under this analysis. It is an interval for the average change, not a prediction that every worker saves that much time.

For this calculation, treat workers as independent sampled units and the differences as reasonably modeled by a Normal distribution. Four observations provide very little opportunity to assess that assumption; the interval illustrates the procedure rather than establishing a dependable production benefit. The before-after design also leaves causal explanations unresolved.

If we instead treated the two columns as independent groups, the estimated standard error of their mean difference would be about 9.05 minutes. That calculation includes large stable differences between workers that cancel in the paired contrast. Pairing does not change the difference between the two column averages here; it changes which variability informs uncertainty.

Pairing the rows incorrectly creates a different dataset. Reversing the after column would produce changes of +28, +7, −11, and −32 minutes. The average remains −2, but the linked observations and estimated variability are no longer the ones we collected. Match on identifiers, not spreadsheet row position. With more observations, inspect individual changes and use [[stats-missingness]] when follow-up is selective; use [[stats-difference-in-differences]] when an untreated comparison can help investigate alternative explanations for change.

## Compare each unit with its counterpart

Suppose three workers take 10, 20, and 30 minutes before a change, and 9, 19, and 29 minutes afterward. Every worker improved by one minute. The levels vary widely across workers; the observed changes do not. An independent-groups calculation uses variability that is not the relevant variability of the paired contrast.

Real differences will vary, so inspect their distribution and influential pairs. Missing a follow-up also breaks a pair; silently dropping that person may introduce selection. Preserve identifiers, timing, and reasons for unavailable measurements rather than pairing rows by their current spreadsheet order.

A second use is comparing two instruments on the same specimens. Each specimen serves as the link between readings. Analyze the differences and how they vary with the magnitude of the measurement. A high correlation between instruments does not itself show close agreement: one could consistently read ten units higher.

## Match the analysis to the design

A paired t procedure for a mean difference makes assumptions about the differences and sampling structure. Rank-based or randomization procedures answer questions under their own assumptions; they are not automatic substitutes that remove every difficulty. Resampling should sample whole pairs rather than breaking their connection.

Deliberately matched observational units require additional care. A match may improve comparability on observed characteristics without eliminating unmeasured confounding. Explain why the matching variables were chosen and which target population the retained pairs represent.

## Advanced notes: change does not establish causation

A before-after difference can reflect practice, seasonality, regression to the mean, or other concurrent changes. Pairing addresses statistical dependence and some stable differences; it does not create an untreated counterfactual. A randomized crossover design or an appropriate control group may support a stronger causal interpretation, subject to its additional assumptions.

For repeated measurements at many times, reducing everything to one difference can discard useful trajectory information. A longitudinal model may better represent the question, especially when timing differs or within-person correlation matters. The principle remains: retain the dependence that generated the observations.

Check for order effects when the same person receives both conditions. Fatigue, learning, and carryover can make the second observation systematically different. Randomizing or balancing order and allowing a suitable washout period can be important design responses.

Use this pattern whenever records are linked by person, specimen, matched unit, or repeated condition. State what creates the pairing, what quantity the contrast estimates, and which remaining sources of uncertainty or bias the pairing does not remove.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [NIST Engineering Statistics Handbook](https://www.itl.nist.gov/div898/handbook/prc/section3/prc311.htm)
