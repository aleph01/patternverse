---
id: stats-handle-censoring
type: pattern
title: 'Keep the Information in Unfinished Follow-Up'
summary: 'Use observed event-free time without pretending the event happened at the end of observation.'
status: published
verses:
  - statistics
---

A company studies time until subscription cancellation. Some customers have canceled; others remain subscribed when the study ends. Averaging only the observed cancellation times discards the continuing customers. Treating their last observation date as a cancellation invents events that did not happen.

An unfinished follow-up still supplies information: the event time exceeds the observed duration. This is right censoring. Survival methods represent that contribution explicitly rather than treating it as an ordinary missing value or a completed event time.

## Worked example: six subscriptions with different follow-up

Suppose six fictional customers enter observation at subscription start. Follow-up ends at cancellation or at the last confirmed active month. A cross in the figure means observation ended without a recorded cancellation; it does not mean the customer canceled then.

| Customer | Observed months | End of observation     |
| -------- | --------------- | ---------------------- |
| A        | 2               | Cancellation           |
| B        | 3               | Still active; censored |
| C        | 4               | Cancellation           |
| D        | 5               | Still active; censored |
| E        | 6               | Cancellation           |
| F        | 6               | Still active; censored |

![Six observation timelines and a survival curve that drops only at cancellations, with censoring marked by crosses.](../assets/statistics/censored-follow-up.svg 'The observation timeline determines the risk set. At month 6, both E and F are still at risk immediately before E cancels; F is then censored. The curve is a point estimate without uncertainty bands, based on a very small fictional sample.')

The **risk set** contains customers still being observed who have not yet canceled. “At risk” means eligible to have the event, not that a customer has been judged especially likely to cancel. “Survival” here means remaining subscribed.

Immediately before the first cancellation at month 2, all six customers are at risk. The estimated event-free proportion becomes **(6 − 1) / 6 = 5/6**, or 83.3%. B’s observation ends at month 3. We know B remained subscribed until then, but do not know what happened afterward. Remove B from later risk sets without recording a cancellation or lowering the curve.

At month 4, four customers remain at risk: C, D, E, and F. C cancels, so multiply the previous survival estimate by 3/4: (5/6) × (3/4) = 5/8, or 62.5%. After D is censored at month 5, E and F are the two customers at risk immediately before the month-6 event. Multiplying by 1/2 gives 5/16, or 31.25%—displayed as 31.3%. For the tied event and censoring time, F contributes to the risk set before being removed.

The calculation shows why neither common shortcut works. Averaging the three cancellation times gives four months, which describes those observed cancellations rather than the full population's mean cancellation time. Replacing the three censoring times with cancellations invents events. The survival curve instead uses everyone's observed contribution and stops where follow-up stops; it supplies no evidence that 31.25% will remain subscribed forever.

This example assumes independent customers and censoring that does not selectively remove customers with different future cancellation prospects. Staggered administrative study ending can be compatible with that assumption; disappearing records caused by likely cancellation may not be. Six customers yield an unstable estimate, and the drawing intentionally omits confidence bands to focus on the risk-set arithmetic. For a real report, include uncertainty, numbers at risk, the follow-up rule, and a check of why tracking ended.

## Preserve both time and event status

For each customer, record when observation starts, when it ends, and whether cancellation occurred. A customer observed for six months without cancellation is known to have remained event-free for those six months. They are not known to remain subscribed forever.

A Kaplan-Meier curve estimates survival over time using risk sets and observed events under its assumptions. A survival regression can model relationships with covariates. The method should match the question and the observation process, including different follow-up lengths.

An equipment test supplies a second example. Some components fail after 50 hours, while others are still functioning when the test stops at 100 hours. The functioning components contribute at least 100 hours of survival information. Removing them would make the tested population appear less durable.

## Ask why observation ended

Administrative study ending differs from dropout related to impending failure. Standard methods rely on conditions under which censoring is sufficiently noninformative for the analysis, possibly after conditioning on modeled information. If customers disappear from tracking precisely when cancellation becomes likely, additional modeling or sensitivity analysis may be needed.

Delayed entry is another issue. If a person enters observation only after already surviving a period, the risk set must reflect that entry process. Ignoring it can create an artificially selected population of survivors.

## Advanced notes: distinguish the event types

A competing event can prevent the event of interest. For example, a component may fail through one mechanism before another mechanism can occur. Estimating the cumulative probability of a particular event requires a competing-risk formulation appropriate to that question. Treating every competing event as ordinary censoring does not automatically estimate the real-world cumulative incidence.

A hazard describes an instantaneous event rate among those still at risk; a survival probability describes remaining event-free through a time. A hazard ratio is not generally a risk ratio or an absolute change in event probability. Translate fitted models into outcomes that match the audience's question.

Some survival targets are difficult to estimate if follow-up is too short. A median event time may not be reached in the observed period. Report that limitation rather than extrapolating without a defensible model. Restricted mean survival over a prespecified horizon may be a useful alternative target where appropriate.

Use this pattern for cancellation, recovery, failure, completion, and other event-time questions. Start by distinguishing an observed event, an event-free observation period, and an unobserved future. Those distinctions are the information the analysis must preserve.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [NIST: Kaplan-Meier product-limit calculation](https://www.itl.nist.gov/div898/handbook/apr/section2/apr215.htm)
- [Stan methods guide and case studies](https://mc-stan.org/docs/stan-users-guide/survival.html)
