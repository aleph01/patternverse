---
id: stats-report-uncertainty
type: pattern
title: 'Report the Effect with Its Uncertainty'
summary: 'Interpret magnitude and precision together, using a relevant interval and a practical threshold.'
status: published
verses:
  - statistics
---

A feature test reports “not significant.” One reader concludes there is no useful effect. Another concludes the experiment was too small to learn anything. The label alone cannot settle the disagreement because it hides the estimate and its uncertainty.

Report the estimated quantity, its units, and an uncertainty interval appropriate to the design and model. Compare that interval with differences that matter for the question. This preserves information that a binary significance label discards.

## Interactive example

![One study: observed event rate 10%, with Wilson interval limits 5.52% and 17.44%.](../assets/statistics/stats-interval-preview.svg 'For 10 observed events in 100 independent trials, the 95% Wilson interval is approximately 5.52% to 17.44%. It is not a prediction interval or a universal procedure for dependent data.')

The three bars describe one study: its interval’s lower limit, its observed rate, and its upper limit. Run the example to change the event count or number of trials; Reset restores 10 events in 100 trials.

```patternverse-widget
{
  "src": "stats-interval.html",
  "title": "Binomial uncertainty explorer",
  "height": 720,
  "fallback": "For 10 observed events in 100 independent trials, the 95% Wilson interval is approximately 5.52% to 17.44%. It is not a prediction interval or a universal procedure for dependent data."
}
```

## Read the range in context

Suppose the estimated improvement is two percentage points, with a confidence interval from minus one to plus five. If an improvement of three points would justify a change, the result still permits a worthwhile benefit. It also permits a small harm. “No effect” overstates what the analysis establishes.

Now imagine an estimate of 0.1 points with an interval from minus 0.2 to plus 0.4. If the practically relevant range was defined as improvements or harms exceeding two points, this more precise result can help rule out those large effects under the analysis assumptions. The target and practical threshold matter more than whether the point estimate is exactly zero.

Conversely, a tiny effect can be statistically distinguishable from zero in a huge sample while being practically unimportant. State the magnitude in familiar units so the reader can judge consequences.

## Use the right kind of interval

A confidence interval describes uncertainty about a population quantity, such as its event rate. Its confidence level refers to how the interval-making procedure performs across repeated studies under its assumptions. A procedure with 95% coverage would include the true quantity in about 95 out of 100 such studies; we do not know which particular intervals miss it. A Bayesian credible interval instead describes uncertainty after combining a stated prior with the data and model. A prediction interval concerns a future observation. The three ranges answer different questions.

The interactive example uses a Wilson interval for a proportion. “Binomial” here means counting events in a fixed number of trials with two possible outcomes. The starting example observes 10 events in 100 trials, or **10%**. Its Wilson 95% interval runs from **5.52% to 17.44%**. The three bars show the lower limit, observed percentage, and upper limit for this one study, not three groups. You can read the result without deriving the Wilson formula.

Changing the inputs shows how sample size and event counts affect precision, including near zero or one. The example assumes independent trials with a common probability; surveys, clustered experiments, and causal comparisons can need different uncertainty calculations.

For a real analysis, account for the sampling design, dependence, missingness, measurement error, and relevant model assumptions. A narrow interval that ignores major sources of uncertainty can be confidently misleading.

## Advanced notes: absence, equivalence, and selection

Failing to reject an exact-zero hypothesis is not an equivalence result. If practical equivalence is the objective, specify meaningful bounds and use a design and procedure suited to that objective. A prespecified confidence interval lying wholly within suitable equivalence bounds may support such a conclusion, with the confidence level and testing formulation chosen appropriately.

Intervals selected after inspecting many outcomes also require care. A collection of individually valid intervals is not automatically a jointly valid set of statements. Nor does an interval conditional on a chosen model account for every uncertainty introduced by selecting that model.

An interval summarizes what a particular analysis says; it does not certify the data-generating process. Report the assumptions and describe limitations that the interval omits. Use this pattern whenever a conclusion rests on a star, a threshold, or the phrase “there was no significant difference.”

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [American Statistical Association](https://www.amstat.org/docs/default-source/amstat-documents/p-valuestatement.pdf)
- [NIST Engineering Statistics Handbook](https://itl.nist.gov/div898/handbook/prc/section2/prc241.htm)

