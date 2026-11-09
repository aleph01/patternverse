---
id: stats-confirm-fresh
type: pattern
title: 'Confirm Discoveries on Fresh Evidence'
summary: 'Preserve exploration while reserving independent information for evaluating the resulting claim.'
status: published
verses:
  - statistics
---

An analyst discovers that a product change works especially well for one narrow subgroup. The subgroup was found after inspecting dozens of possibilities. Reanalyzing those same cases with the subgroup now labeled “primary” does not create independent confirmation.

Exploration generates ideas. Confirmation evaluates a sufficiently specified claim using evidence that was not already used to select it. Keep both activities, but record the boundary between them and design the next check for the claim that actually emerged.

## Preserve the discovery history

Suppose a search suggests that first-time users on older devices benefit most. Record which variables, exclusions, and models were examined. Define what the proposed replication would estimate: the same subgroup effect, an interaction with other users, or the effect of a targeted rollout.

Collect a new sample or reserve a genuinely untouched evaluation set when the design permits. Specify the outcome, population, analysis, practical threshold, and stopping rule before using the confirmatory evidence. Repeatedly consulting the held-out data during development spends its independence.

A second example is constructing a questionnaire score. Selecting items because they correlate strongly in one sample and then reporting that sample's fit as validation can overstate performance. Evaluate the proposed structure in independent data or through a properly designed validation procedure that includes the selection step.

## Make the analysis reproducible

Preserve data provenance, transformations, exclusions, code, software information, random seeds where applicable, and the analysis plan. Another person should be able to understand how the reported quantities were produced. Reproducibility makes mistakes and choices inspectable; it does not establish that the design identifies the intended quantity.

Distinguish computational reproduction from replication in new observations. Running the same code on the same data can reproduce the same error. A fresh sample can expose instability, while a changed population may test transportability rather than exact repetition.

## Worked example: a selected eight-point finding meets new evidence

Imagine a fictional exploratory analysis that examines **20 subgroup claims** and selects a promising estimate of **+8 performance points** with a **known standard error of 3**. Under a simple Normal approximation, the unadjusted 95% interval is **8 ± 1.959964 × 3**, or **2.12 to 13.88**. That calculation does not account for selecting the finding after the search.

To see why search matters, consider a separate idealized global-null scenario: all twenty claims have no effect, their tests are independent, and each uses a 5% false-positive threshold. The probability of at least one false positive is **1 − 0.95²⁰ ≈ 64.15%**. Real subgroup tests often overlap and are dependent, so this formula is an illustration under independence. It is not the probability that this particular selected finding is false.

Before examining fresh data, record the chosen subgroup, outcome, comparison, calculation method, and rule for when to stop collecting data. “Prespecified” means those choices were made before seeing the evidence used to check them; “fresh” means that evidence was not used to choose the claim. Suppose stakeholders also specify **+2 points** as the smallest worthwhile improvement, based on consequences rather than the selected estimate. The next study evaluates this recorded claim among comparable new cases.

![Twenty exploratory candidate boxes lead to one selected claim, then a locked analysis and fresh evidence. An interval panel contrasts an unadjusted exploratory estimate of eight with a fresh estimate of three; reference lines mark zero and a prespecified two-point practical threshold.](../assets/statistics/fresh-confirmation.svg "Fictional known-SE Normal calculations. The exploratory interval is unadjusted for selection. The fresh interval evaluates the prespecified claim, while the 64.15% search calculation concerns twenty independent null tests and is not a posterior false-discovery probability.")

The fresh estimate is **+3 points**, with a **known standard error of 2**. Its 95% interval is **3 ± 1.959964 × 2**, or approximately **−0.92 to 6.92**. This interval contains zero, the worthwhile threshold of two, and effects larger than two. The evidence does not tightly distinguish those possibilities.

Read −0.92 as a possible small worsening and +6.92 as a possible larger improvement under this analysis. The interval spans both zero and the two-point practical threshold, so this study leaves the decision-relevant question unresolved. A point estimate above two is not enough to establish that the underlying effect exceeds two.

| Evidence stage | Estimate; ordinary 95% interval |
| --- | --- |
| Selected exploration | +8; 2.12 to 13.88 |
| Prespecified fresh check | +3; −0.92 to 6.92 |

The estimates differ, but their intervals overlap. A non-significant fresh result does not prove that the original effect was absent, and overlap is not itself a formal test that the effects are equal. Assess design, precision, and the question being replicated. The fresh check may be inconclusive rather than a definitive confirmation or contradiction.

Do not choose another subgroup in the fresh sample and present its best result as the original claim’s confirmation. That creates another exploration stage. Preserve its discoveries, then define an independent check for any new claim. Similarly, simply rerunning the original code on the original observations assesses computational reproduction, not the independent evidence illustrated here.

A combined analysis can be useful, but naively pooling a selected exploratory estimate with fresh evidence ignores the selection history. Use a justified strategy that accounts for the way the first estimate entered the discussion, or clearly distinguish the prespecified fresh result from supplementary synthesis. Record what was searched and what was frozen. [[stats-account-for-search]] handles the search issue; [[stats-plan-precision]] helps make the next check informative enough for the practical threshold.

## Advanced notes: define success for the next study

Replication should not be reduced to whether both p values cross the same threshold. Compare estimated effects and their uncertainty, assess relevant differences in design and population, and examine what the combined evidence permits. A larger p value can arise from a noisier study even when effect estimates are similar.

Prespecification also has limits. A precisely recorded plan can be scientifically weak, and unexpected data problems may justify changes. Document deviations and their reasons rather than pretending the original plan covered them. Independent critical review remains valuable.

When fresh data are expensive, internal validation can estimate aspects of performance, but it must repeat the full discovery procedure within each training portion. Naively validating a model whose features were chosen using all observations leaks selection information.

Use this pattern after an interesting exploratory finding, a complicated model search, or a claim important enough to repeat. The goal is a transparent sequence from observation to hypothesis to independent evaluation, with enough detail to distinguish a stable result from a selected success.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [Statistics Done Wrong](https://www.statisticsdonewrong.com/)
- [American Statistical Association](https://www.amstat.org/docs/default-source/amstat-documents/p-valuestatement.pdf)

- [Nosek and colleagues: The preregistration revolution](https://www.pnas.org/doi/10.1073/pnas.1708274114)

