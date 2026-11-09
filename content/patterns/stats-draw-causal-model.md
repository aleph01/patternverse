---
id: stats-draw-causal-model
type: pattern
title: 'Choose Adjustments from a Causal Model'
summary: 'Make causal assumptions explicit before deciding which variables to condition on.'
status: published
verses:
  - statistics
---

A researcher includes every available variable in a regression to make the treatment comparison “as fair as possible.” One variable is affected by the treatment. Another determines who enters the sample. Including more information can change the target or introduce bias rather than remove it.

The response is to reason about causal roles before choosing adjustments. Draw a directed diagram of the assumed relationships among treatment, outcome, common causes, mediators, selection variables, and important unobserved factors. Use that model to assess which comparisons can identify the effect of interest.

Read each arrow as a proposed causal influence, not merely a correlation. “Adjusting for” a variable means comparing groups while accounting for that variable; in the table below, it means first comparing workers with the same prior skill. A confounder is a shared cause of treatment and outcome. A mediator is an intermediate step through which treatment acts. A collider is a shared result of two causes. The diagrams show why those roles call for different choices.

## Worked example: why prior skill changes the comparison

Imagine a fictional training program with 100 attendees and 100 nonattendees. Before training begins, everyone is classified as novice or experienced. Passing the same later assessment is the outcome. Experienced workers are more likely to attend and more likely to pass even without training; the proposed diagram therefore treats prior skill as a common cause.

![Three causal diagrams distinguish prior skill as a common cause, practice as a mediator, and selection for review as a collider.](../assets/statistics/causal-roles.svg 'Select an adjustment for its causal role. The diagrams are assumptions about a process, not relationships established by a correlation table. Green identifies training or a causal route; purple identifies the third variable under discussion.')

| Prior skill          | Trained: passes / people | Not trained: passes / people | Difference            |
| -------------------- | ------------------------ | ---------------------------- | --------------------- |
| Novice               | 8 / 20 = 40%             | 24 / 80 = 30%                | +10 percentage points |
| Experienced          | 64 / 80 = 80%            | 14 / 20 = 70%                | +10 percentage points |
| All observed workers | 72 / 100 = 72%           | 38 / 100 = 38%               | +34 percentage points |

The raw difference is 34 percentage points. It combines a within-skill contrast with very different group composition: four fifths of attendees are experienced, compared with one fifth of nonattendees. For a target population that is half novice and half experienced, standardize both groups to that same composition. The trained rate becomes 0.5 × 40% + 0.5 × 80% = 60%; the comparison rate becomes 0.5 × 30% + 0.5 × 70% = 50%. The standardized contrast is 10 percentage points.

That calculation is transparent, but its causal interpretation requires more. It assumes the skill groups capture the relevant common causes, both treatment options are represented in each group, and the intervention and outcome are consistently defined. If motivation still affects attendance and passing within skill groups, the table has not removed that confounding. The equal mixture is an explicit target choice, not a universal adjustment weight.

Now change the third variable's role. If training increases practice and practice improves passing, practice is a mediator. Conditioning on it can block part of the total effect we wanted to estimate. If reviewers select records using both attendance and assessment results, review selection is a collider; restricting analysis to reviewed records can create an association. Neither variable should be added automatically just because it predicts the outcome. Specify the effect first, then explain which paths the proposed adjustment would block or open.

## Interactive example

![Raw success rates favor B, 74% to 36%; at the same case mix they favor A, 60% to 50%.](../assets/statistics/stats-composition-preview.svg 'A succeeds more often within each fictional subgroup, but B has the higher raw aggregate because it receives more easy cases. Standardizing both to a common mix changes the comparison.')

This explorer is a separate case-mix example, with different numbers from the training table above. Its first two bars use each option’s own case mix; the next two use a common mix. Run it to change the mixes. A reversal alone does not tell us whether adjustment is causally justified.

```patternverse-widget
{
  "src": "stats-composition.html",
  "title": "Group composition explorer",
  "height": 900,
  "fallback": "A succeeds more often within each fictional subgroup, but B has the higher raw aggregate because it receives more easy cases. Standardizing both to a common mix changes the comparison."
}
```

## Explain what each adjustment does

A pretreatment common cause can create an association between treatment and outcome even without a treatment effect. Adjustment may block that noncausal path when the relevant assumptions and information hold. A mediator lies on a causal route from treatment to outcome; conditioning on it can remove part of the total effect being targeted.

A collider is a common effect along a path. Conditioning on it can open a path that was otherwise blocked. Selection into a dataset can condition on a collider even when the analyst never adds a column with that name to a regression.

For example, imagine two independent qualifications that both help applicants gain admission. Among admitted applicants, weakness on one qualification can be associated with strength on the other because both contributed to selection. An analysis restricted to admitted applicants does not automatically describe the relationship in the applicant population.

## Treat the diagram as an assumption statement

Arrows come from substantive knowledge, timing, design, and explicit hypotheses. A correlation matrix cannot by itself establish the correct causal diagram. Consider plausible alternative diagrams and identify which differences matter to the analysis.

The interactive composition example illustrates another reason the diagram matters. An aggregate reversal suggests that group composition affects the comparison, but it does not say whether conditioning on the group is causally appropriate. If the group is a pretreatment confounder, a mediator, or a selection consequence, the interpretation can differ.

## Advanced notes: the target determines valid adjustment

A set sufficient to identify one treatment effect need not identify every coefficient in the same regression. Interpreting all adjusted coefficients as separate causal effects is a common mistake. Each target requires its own causal argument.

Some diagrams reveal that the effect is not identified by ordinary covariate adjustment. Unobserved common causes, missing overlap, or feedback over time may require another design, additional assumptions, bounds, or a narrower question. A diagram is valuable even when it tells you that the available data cannot answer the desired question.

Drawing an acyclic graph also requires appropriate time indexing when a process contains feedback. A treatment at one time can affect a covariate that influences later treatment. Collapsing those events into one variable can obscure the problem.

Use this pattern whenever “control for everything” seems attractive or different adjustments produce conflicting conclusions. Record the target effect, diagram, proposed adjustment set, and assumptions that cannot be verified directly from the observed data. The diagram clarifies the reasoning; it does not guarantee that the reasoning describes reality.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [Catalogue of Bias: collider bias](https://catalogofbias.org/biases/collider-bias/)
- [Dagitty: learning resources for causal diagrams](https://dagitty.net/learn/index.html)

