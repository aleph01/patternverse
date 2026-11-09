---
id: stats-base-rates
type: pattern
title: 'Count Expected Cases Before Interpreting a Positive'
summary: 'Combine prevalence, sensitivity, and false-positive rates instead of confusing a detector result with the probability of the underlying condition.'
status: published
verses:
  - statistics
---

A detector identifies 90% of fraudulent submissions and incorrectly flags 5% of legitimate ones. Someone concludes that a flagged submission is probably fraudulent with 90% probability. That conclusion reverses the conditioning and ignores how common fraud is.

First choose a population and translate the rates into expected counts. Prevalence is how common fraud is in that population. A true positive is a fraudulent submission that gets flagged; a false positive is a legitimate submission that gets flagged. Count true positives and false positives separately, then ask what share of all positive results are true positives. This makes the denominator visible.

## Interactive example

![Expected flags among 10,000 submissions: 90 true positives and 495 false positives.](../assets/statistics/stats-base-rates-preview.svg 'At 1% prevalence, 90% sensitivity, and 95% specificity, 10,000 submissions yield expected counts of 90 true positives and 495 false positives: about 15.4% of flags are true positives.')

The bars count two routes to a flag: real fraud and false alarms. The calculation below combines them. Run the example to change how common fraud is or how the detector behaves; Reset restores the starting case.

```patternverse-widget
{
  "src": "stats-base-rates.html",
  "title": "Base rates and positive results",
  "height": 720,
  "fallback": "At 1% prevalence, 90% sensitivity, and 95% specificity, 10,000 submissions yield expected counts of 90 true positives and 495 false positives: about 15.4% of flags are true positives."
}
```

## Build the reference population

Imagine 10,000 submissions, of which 1% are fraudulent. There are 100 fraudulent and 9,900 legitimate submissions. At 90% sensitivity, the detector flags an expected 90 fraudulent submissions. At a 5% false-positive rate, it also flags an expected 495 legitimate submissions.

There are **90 + 495 = 585** expected flags in total. Of these, **90 / 585 ≈ 15.4%** are true positives. The denominator is all flagged submissions, because the question concerns a submission already known to have a flag. The detector can be useful, but its sensitivity is not the probability of fraud given a flag. A review process that ignores this distinction would treat many legitimate submissions as fraudulent.

Now suppose fraud prevalence is 10%, with the same detector characteristics. The expected counts become 900 true positives and 450 false positives; the positive predictive value becomes approximately 66.7%. The detector's sensitivity and specificity have not changed in this hypothetical example. The population in which it is used has.

## Keep the conditional probabilities separate

Sensitivity asks how often a positive occurs among actual cases. Specificity asks how often a negative occurs among noncases. Positive predictive value asks how often the underlying condition is present among positive results. Each has a different denominator.

The calculation is Bayes' rule expressed through frequencies. With prevalence p, sensitivity s, and false-positive rate f, the positive predictive value is p × s / (p × s + (1 − p) × f), provided the denominator is positive. Use proportions consistently; 5% means 0.05 in this formula.

The interactive example lets you vary all three inputs and inspect the expected counts. Fractional counts are expectations, not claims about how many people can exist in a realized sample.

## Advanced notes: the rates themselves are uncertain

Sensitivity and specificity estimated from a validation sample have uncertainty. They may also change across settings because case mix, measurement conditions, or selection differ. The simple calculation assumes the supplied rates apply to the target population. Examine that transport assumption before treating the output as a calibrated real-world probability.

Do not apply the same evidence twice when updating repeatedly. Two detector outputs may be strongly dependent because they use the same underlying signals. Multiplying likelihood contributions as if independent can overstate the update.

Finally, a probability is not a decision rule by itself. A 15% chance may justify an inexpensive manual review but not an irreversible sanction. The costs of false positives, false negatives, and further investigation belong in a separate decision analysis.

Use this pattern for alerts, classifications, screening, and evidence interpretation whenever someone mistakes “usually detects cases” for “usually right when it detects something.” Identify the relevant population first, then count both routes to a positive result.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [Statistics Done Wrong](https://www.statisticsdonewrong.com/p-value.html)
