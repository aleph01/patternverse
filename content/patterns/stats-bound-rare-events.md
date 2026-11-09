---
id: stats-bound-rare-events
type: pattern
title: 'Bound the Rate When No Events Are Observed'
summary: 'Express what zero observed events can rule out under a stated sampling model instead of concluding the event is impossible.'
status: published
verses:
  - statistics
---

A team tests 100 components and observes no failures. The report states that the failure rate is zero. The observed sample proportion is zero, but many positive population failure probabilities could still produce an event-free sample.

The response is to report an appropriate bound on the unknown event probability under an explicit sampling model. State the sample size, exposure, confidence level or prior, and assumptions. Zero events are informative without proving impossibility.

## Interactive example

![Zero observed events in 100 trials; the one-sided 95% upper probability bound is 2.95%.](../assets/statistics/stats-zero-events-preview.svg 'With zero events in 100 independent, fully observed trials, the one-sided 95% exact binomial upper bound is about 2.95%, under the fixed-sample model.')

The observed rate is zero; the upper-bound bar shows how much uncertainty remains under the model. The bars are percentages, not event counts. Run the example to change the number of event-free trials; Reset restores 100.

```patternverse-widget
{
  "src": "stats-zero-events.html",
  "title": "Zero-event upper bound",
  "height": 720,
  "fallback": "With zero events in 100 independent, fully observed trials, the one-sided 95% exact binomial upper bound is about 2.95%, under the fixed-sample model."
}
```

## A transparent binomial calculation

Assume n independent trials with the same event probability p, complete observation, and a fixed sample size. The probability of observing zero events is (1-p)^n. A one-sided 95% exact upper confidence bound after zero events solves (1-p)^n = 0.05, giving p = 1 - 0.05^(1/n).

For n=100, the bound is approximately 2.95%.

The upper bound is a limit on the unknown event probability, not an expected count of 2.95 failures in the tested sample. “One-sided” means we are looking for an upper limit only; zero is already the lowest possible probability. At p ≈ 0.0295, observing zero events in 100 trials has about a 5% chance. Still higher probabilities make zero events less likely under this fixed-sample model.

For n=1,000, the upper bound is approximately 0.299%. The larger event-free sample rules out more high-rate possibilities under the model, but neither bound says the rate is exactly zero.

The familiar rule of three approximates the 95% upper bound as 3/n for sufficiently large n. Use the exact expression when convenient and label the confidence level and one-sided interpretation. The interactive example uses the exact expression, not the approximation.

## Match the denominator to the event process

One hundred components each tested briefly are not necessarily equivalent to one hundred fully observed uses under realistic conditions. Repeated uses of the same component may be dependent. Differing follow-up times may require a rate or survival model rather than a binomial probability per independent trial.

A second example is a service outage. No outages during a quiet week does not establish reliability during peak demand. The population of opportunities and operating conditions must match the claim. Missing or undetected events further change what the observation of zero means.

## Advanced notes: sparse data require suitable methods

Simple symmetric normal intervals can behave badly near zero or one. Choose intervals or posterior summaries suited to the data and objective, and recognize that exact frequentist intervals can be conservative. A Bayesian upper bound incorporates a prior and has a different interpretation; state that prior rather than treating it as invisible.

If testing stops according to observed outcomes or is repeatedly extended until a desired bound appears, examine whether the inferential procedure remains valid under that stopping rule. The fixed-n expression is not a universal sequential guarantee.

Sparse subgroup estimates may also benefit from partial pooling when groups are meaningfully related. That approach shares information through a model rather than creating additional observed events. Inspect sensitivity to the hierarchy and prior when local data are weak.

Use this pattern for rare failures, defects, adverse outcomes, and other event counts when someone interprets “we did not see it” as “it cannot occur.” Report what the study actually excludes, the conditions to which the bound applies, and which observation assumptions remain uncertain.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [NIST Engineering Statistics Handbook](https://itl.nist.gov/div898/handbook/prc/section2/prc241.htm)
- [NIST: confidence intervals and bounds for instrument performance](https://www.nist.gov/publications/estimating-instrument-performance-confidence-intervals-and-confidence-bounds)
