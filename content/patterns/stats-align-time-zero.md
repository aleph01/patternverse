---
id: stats-align-time-zero
type: pattern
title: 'Align Eligibility, Assignment, and Follow-Up'
summary: 'Specify the target experiment and synchronize its starting conditions before comparing outcomes.'
status: published
verses:
  - statistics
---

An analyst compares customers who eventually earn a loyalty badge with customers who never earn it, measuring cancellation from account creation. To receive the badge, a customer must remain active for six months. The badge group is therefore guaranteed to survive part of the period being compared.

The response is to define the experiment you wish to emulate and align eligibility, treatment assignment, and follow-up. A future event should not silently determine a baseline group whose members must survive long enough to qualify.

Time zero is simply the moment the comparison starts. Eligibility asks who can enter then; assignment asks which strategy or group each person belongs to then; follow-up asks which later outcomes count. Aligning them prevents a group label learned in the future from creating a built-in event-free period.

## Specify the target experiment

Describe the eligible population, treatment strategies, assignment time, outcome, follow-up, causal contrast, and analysis plan. Then map each component to the available observational records. Differences between the desired experiment and the available data become explicit assumptions or limitations.

In the loyalty example, one possible question concerns assigning an eligible customer to a badge offer at a defined time. Another concerns a sustained engagement strategy over six months. Neither is automatically answered by comparing eventual badge recipients with everyone else from account creation.

A second example is evaluating employee training. Comparing people who complete a course with those who do not, while measuring outcomes from the date they were hired, can introduce a similar timing problem. Course completion may require continued employment and performance that also relate to the outcome.

## Make the entry rule visible

Draw a timeline showing when eligibility is known, when treatment status is determined, and when outcome observation begins. Check that both groups can be defined using information available at the intended assignment time. If a strategy involves future behavior, represent that strategy explicitly rather than relabeling future information as a baseline characteristic.

There are specialized methods for more complicated treatment strategies, including sequential trial emulation and approaches that represent deviations from assigned strategies. Their validity depends on additional assumptions and appropriate handling of confounding and censoring. Merely moving the start date in a spreadsheet is not a universal repair.

## Worked example: future labels create a forty-point gap

Consider 100 fictional customers followed from account creation to month 12, with complete cancellation records. Forty cancel before month 6. Of the 60 still active at month 6, 20 receive a badge at that time and 40 do not. Between months 6 and 12, four badge recipients and eight of the other active customers cancel. Assume that badges cannot be earned before month 6 and that canceled accounts cannot earn one later.

A retrospective analysis labels all 20 eventual recipients “badge” from account creation, and the other 80 customers “never badge.” Its twelve-month cancellation proportions are:

| Future-defined group | Canceled by month 12 |
| --- | --- |
| Eventually badge | 4 / 20 = 20% |
| Never badge | (40 + 8) / 80 = 60% |

The observed difference is **20% − 60% = −40 percentage points**. But all forty early cancellations were necessarily placed in the never-badge group. The badge group had to remain active for six months to qualify. It cannot contain an early cancellation under this labeling rule, even if earning a badge has no protective effect.

![Two timelines compare future-defined badge groups followed from creation with groups defined among active customers at month six. The apparent cancellation difference changes from minus forty percentage points to zero when the starting population and follow-up are aligned.](../assets/statistics/aligned-time-zero.svg "Fictional complete follow-up: 40 early cancellations, then 4 of 20 badge recipients and 8 of 40 other active customers cancel. The month-six comparison changes the target population and period; it does not by itself remove confounding.")

Now specify a different question: among customers active at month 6, what happens from month 6 to month 12 for those receiving a badge versus those not receiving one at that time? Both groups can be defined at the start of this follow-up. Their observed cancellation proportions are **4 / 20 = 20%** and **8 / 40 = 20%**, a difference of **0 percentage points**. The denominator is now 60 eligible survivors rather than the original 100 customers.

This landmark comparison illustrates aligned timing. It answers a question about month-six survivors, not about all new customers. Equal observed proportions do not prove that badges have no effect: selection into the badge group and other confounding can remain. If the goal is the effect of offering a badge at month 6, a new experiment could randomize that offer among eligible active customers and follow both assignment groups from that moment.

Do not interpret the change from −40 to zero as a universal correction obtained by subtracting early events. Here it follows from fully specified counts and a revised question. A strategy defined over several future months may need a longitudinal design and appropriate adjustment rather than one new landmark. Check which information is available at the proposed start and which customers the new eligibility rule excludes.

Use [[stats-define-target]] to state the revised population and period. [[stats-missingness]] addresses unavailable outcomes; the example here assumes all cancellations are observed, so its problem arises even without missing records.

## Advanced notes: time-varying confounding

Earlier treatment can affect a variable that influences both later treatment and the outcome. Ordinary adjustment for that variable can then block part of an effect or introduce bias, while failing to adjust can leave confounding. Longitudinal g-methods were developed for such structures under suitable assumptions.

This is a reason to begin with the time-indexed causal question. A single treatment indicator may conceal whether the target is assignment, initiation, adherence, or sustained exposure. These are different interventions and can require different information.

Administrative censoring and dropout must also be aligned with the design. State how follow-up ends and whether the observation process depends on prognosis or treatment. A clear time origin does not solve those additional issues but makes them easier to identify.

Use this pattern when groups are defined by eventual participation, completion, survival, or cumulative exposure. The concrete deliverable is a target-trial specification and an aligned timeline, followed by an honest account of which components the data can support.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [Hernán and Robins — Causal Inference: What If](https://content.sph.harvard.edu/wwwhsph/sites/1268/2024/04/hernanrobins_WhatIf_26apr24.pdf)

- [Hernán and colleagues: Specifying a target trial prevents immortal time bias](https://pmc.ncbi.nlm.nih.gov/articles/PMC5124536/)

