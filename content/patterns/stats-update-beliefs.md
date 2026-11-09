---
id: stats-update-beliefs
type: pattern
title: 'Update Beliefs with Evidence'
summary: 'Combine an explicit prior and observation model with new evidence, then examine how the assumptions influence the posterior.'
status: published
verses:
  - statistics
---

A team tries a new onboarding flow with ten users. Eight complete the task. One colleague declares that the completion rate is 80%; another thinks ten users tell us almost nothing. They agree on the observations but have different starting expectations and different ideas about how much the pilot should change them.

Bayesian updating makes those starting assumptions and revisions explicit. The **prior** describes uncertainty before the new observations. The **likelihood** describes how the observations could arise at each possible value of the quantity. Combining them gives the **posterior**, uncertainty after the update. Its conclusions depend on the model and prior; a small dataset does not become certainty merely because the calculation is Bayesian.

## Worked example: eight completions in ten attempts

Let p be the completion probability for a defined population of users attempting the same task. For this fictional calculation, assume ten independent binary outcomes sharing one unchanged probability. We observe eight completions and two failures. The count has a Binomial likelihood: values of p that make those observations more plausible receive more support.

A Beta distribution provides a convenient prior over probabilities from zero to one. Its two positive parameters, a and b, determine its shape; its mean is a / (a + b).

Beta(2, 2) is the name of a whole distribution, not a statement that two people succeeded and two failed. In this model its two numbers determine how strongly different rates are weighted before observing the new trials. The simple addition rule below follows from pairing this prior with this likelihood. Begin with Beta(2, 2), a symmetric prior centered at 50%. It assigns less density near the boundaries than near the center, without asserting that the true rate is exactly one half.

For this Beta–Binomial model, add completions to a and failures to b. The posterior is Beta(2 + 8, 2 + 2), or **Beta(10, 4)**. Its mean is 10 / 14, approximately **71.4%**. The observed fraction remains 80%; the posterior mean is another quantity, combining those observations with the stated prior.

![Two prior distributions centered at one half update to different posterior distributions after the same eight completions in ten attempts.](../assets/statistics/belief-update.svg "Green uses Beta(2, 2), updating to Beta(10, 4). Purple uses Beta(8, 8), updating to Beta(16, 10). Each curve is a probability density whose area is one; its height is not the probability of one exact completion rate. The same observations can produce different posteriors under different prior assumptions.")

| Prior, mean 50% | Updated distribution | Updated mean |
| --- | --- | --- |
| Beta(2, 2) | Beta(10, 4) | 71.4% |
| Beta(8, 8) | Beta(16, 10) | 61.5% |

The second prior is more concentrated around 50%, so the same ten observations shift its mean less. Neither prior is justified merely because the algebra is convenient. If earlier evidence supports substantial concentration, describe that evidence and its relevance to the current users and task. If no such reason exists, a concentrated prior can dominate a small pilot in an unjustified way. Comparing plausible priors makes that dependence visible.

Under the first model, the posterior predictive probability that the next comparable user completes the task is also 10 / 14. That single-event probability is different from a distribution over the unknown p, and from the chance that the next ten users will all succeed. Predictions for several new users must account for the shared uncertainty about p; multiplying the predictive mean as though p were known discards that dependence.

## Update again without counting the same evidence twice

Suppose a second independent group contributes seven completions in ten attempts, under the same observation model. Start from Beta(10, 4) and add seven completions and three failures. The result is Beta(17, 7), with mean 17 / 24, approximately 70.8%. Starting instead from the original Beta(2, 2) and using all fifteen completions and five failures gives the same result.

This agreement is useful for checking a sequential calculation. It requires the same model, the same prior, and evidence that has not been duplicated. Using the first posterior as a new prior and then adding all twenty outcomes again counts the first pilot twice. Reusing published summaries from overlapping participants can create a less obvious version of the same error.

An additional example is a component's failure probability. Observing zero failures in a small test does not force the posterior probability to zero. A prior and likelihood can still represent uncertainty about rare failures. The result depends on exposure, independence, observation quality, and the relevance of earlier information; [[stats-bound-rare-events]] offers a complementary frequentist bound under its stated assumptions.

## Check the model behind the update

The arithmetic assumes comparable trials. If the second group received a redesigned interface, combines different populations, or learned from the first group, one constant p may describe neither group well. More precise updating under that model can conceal a change in the process. Separate relevant populations or build a model that represents the differences when the question requires it.

Before seeing outcomes, ask what data the prior would predict. A prior that implies implausible completion rates deserves reconsideration even if its parameter values look harmless. After fitting, compare observed features with predictions from the model. [[stats-check-model]] develops this check; [[stats-partial-pooling]] extends sharing across related groups while allowing their probabilities to differ.

## Advanced notes: uncertainty and decisions are separate

A posterior does not validate recruitment, measurement, causal assumptions, or the chosen likelihood. An interval calculated from it describes uncertainty under those assumptions. Report meaningful sensitivity and important sources of uncertainty the model leaves out, rather than treating a numerical posterior as the full state of knowledge.

A launch decision also requires consequences. Two teams with the same posterior can choose different actions because failure costs, reversibility, and alternatives differ. [[stats-choose-consequences]] connects probability statements to that choice. Use updating when new evidence should revise a stated belief, and keep the prior, observation process, posterior, and intended decision visible together.

## Sources and further reading

The examples are original fictional cases. These sources explain the underlying models and checks.

- [Proof of Beta–Binomial conjugate updating](https://statproofbook.github.io/P/bin-post)
- [Stan: prior and posterior predictive checks](https://mc-stan.org/docs/stan-users-guide/posterior-predictive-checks.html)
