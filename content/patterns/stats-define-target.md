---
id: stats-define-target
type: pattern
title: 'Define the Quantity You Want to Estimate'
summary: 'Turn a broad question into an explicit population, outcome, time horizon, and comparison.'
status: published
verses:
  - statistics
---

A subscription team asks whether a new welcome message “improves retention.” One analyst measures next-week activity. Another measures paid subscriptions after three months. Both calculations may be correct while answering different questions. Choosing a statistical test cannot resolve this disagreement: the target itself is unsettled.

First write the question precisely, then choose a calculation. Name the population (who the answer concerns), outcome (what you measure), time horizon (when you measure it), and comparison. For a causal question, name the actions being compared. The quantity you want to learn is the **estimand**; the number calculated from your data is an **estimate**; the calculation rule is the **estimator**. For example: the day-90 retention difference, the observed five-percentage-point difference, and the rule “subtract the two group proportions.”

## Make the question concrete

A usable statement might be: “Among customers starting a paid subscription this month, what is the difference in the probability of remaining subscribed after 90 days under the new message versus the current message?” This definition determines who enters the analysis, which subscriptions count as retained, and what information must be collected.

Now a change to the question becomes visible. Excluding people who never open the email would change the population and could compromise a randomized comparison. Measuring activity instead of payment would change the outcome. Following only people who joined early enough to reach 90 days changes which enrollment periods contribute evidence.

The target should express the actual purpose. A business trying to forecast staffing may need expected support contacts, not whether the average customer reports being satisfied. A public survey might need the population proportion supporting a proposal, not the proportion among people who answered an online advertisement.

## Choose what would matter

Precision and practical importance belong in the question too. Suppose sending the welcome message costs little but changing the onboarding system costs months of work. The smallest worthwhile improvement may differ between those decisions. Establish a defensible threshold using consequences, domain knowledge, and constraints before inspecting the result. This threshold supports interpretation and study planning; it does not manufacture certainty.

A good target need not always be a mean. Waiting-time planning might require a high percentile. Budgeting may require the mean because total costs accumulate. Comparing two systems may require an absolute difference, a ratio, or both. Select the summary for its meaning rather than because the software makes it convenient.

## Worked example: three answers to three different questions

Consider a fictional experiment among 2,000 customers starting paid subscriptions this month. At signup, 1,000 are randomly assigned the current welcome message and 1,000 the new message. Assume complete outcomes, one assignment per customer, and no interference between customers. The intended quantity is the **new-minus-current difference in the probability of a paid subscription at day 90** among this month’s new subscribers under the two message assignments.

That sentence fixes five components: the population, the two interventions, the outcome, the horizon, and the difference scale. It concerns assignment to a message, rather than the effect of opening it. It does not target all existing customers or the probability of any activity next week.

| Assigned message | Active day 7; paid day 90 |
| --- | --- |
| Current, n = 1,000 | 700; 600 |
| New, n = 1,000 | 800; 650 |

For the stated target, the observed estimate is **650 / 1,000 − 600 / 1,000 = 0.05**, or **5 percentage points**.

Read that as 65% retained with the new message versus 60% with the current message: five additional retained subscribers per 100 assigned customers in these data. The corresponding probability ratio is **0.65 / 0.60 ≈ 1.0833**, an **8.33% relative increase**. A difference and a ratio describe the same two probabilities on different scales; name the scale when reporting the result.

![An explicit target statement leads to two randomly assigned groups of one thousand and day-ninety paid-retention rates of sixty and sixty-five percent. A second panel contrasts the five-point target estimate with a ten-point day-seven activity contrast and a misleading twenty-point selected-opener comparison.](../assets/statistics/defined-target.svg "Original fictional counts with complete follow-up. Changing the outcome, horizon, or eligible population changes the question. The diagram reports estimates and does not supply their sampling uncertainty or establish generalization to other customers.")

Now change the outcome and horizon to activity at day 7. The estimate becomes **800 / 1,000 − 700 / 1,000 = 10 percentage points**. Both calculations are correct, but the ten-point number does not estimate the original day-90 paid-retention target. A dashboard should not switch between them while keeping the label “retention improvement.”

Suppose 500 customers assigned the new message open it, and 400 of those remain paid at day 90. Their retention is **400 / 500 = 80%**. Comparing that selected subgroup with all customers assigned the current message gives **80% − 60% = 20 percentage points**. This changes the population on one side using behavior after assignment. Opening may depend on engagement that also predicts retention, so randomizing the message does not make this new comparison randomized.

The other 500 customers assigned the new message include **650 − 400 = 250** paid subscribers, a rate of **50%**. Keeping both opener groups recovers the assigned-group rate: **(400 + 250) / 1,000 = 65%**. This arithmetic makes the denominator change visible without establishing the causal effect of opening a message. That is a separate intervention question with additional design requirements.

The five-point estimate also needs a suitable uncertainty analysis before it supports a precise claim. This example isolates the target and estimator; its fictional counts do not establish performance in another enrollment month. Record the target before seeing the result and document any later revision. Use [[stats-align-time-zero]] for the starting rules and [[stats-communicate-effects]] for absolute and relative reporting.

## Advanced notes: the target and the available evidence

A precise question can still be impossible to answer from the available data. Statisticians call this a problem of identification: whether the observations, together with defensible assumptions, can determine the target quantity. Knowing exactly what you want to estimate does not guarantee that a survey covers the population or that observational groups permit a causal comparison. Keep the target, the identification assumptions, and the estimation procedure separate. If the evidence forces a narrower question, record the change explicitly.

Exploration remains useful. Looking at distributions and discovering unexpected relationships can improve the next question. Label those discoveries and avoid presenting a question chosen after seeing an attractive result as if it had been fixed beforehand.

This pattern helps whenever people disagree about what a result means, dashboards use competing denominators, or an analysis begins with “Which test should I run?” The first deliverable is one answerable question, followed by a statement of what evidence would answer it.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [The Effect](https://www.theeffectbook.net/index.html)

- [Hernán and Robins: Causal Inference: What If](https://content.sph.harvard.edu/wwwhsph/sites/1268/2024/04/hernanrobins_WhatIf_26apr24.pdf)

