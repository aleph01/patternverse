---
id: stats-partial-pooling
type: pattern
title: 'Stabilize Small-Group Estimates with Partial Pooling'
summary: 'Estimate related groups jointly so sparse groups can borrow information while retaining genuine differences.'
status: published
verses:
  - statistics
---

A company ranks branches by customer satisfaction. One branch has nine positive responses out of ten. Another has 800 out of 1,000. The first percentage is higher, but it rests on far less information. A ranking that treats both percentages as equally stable invites exaggerated judgments about small groups.

There are two simple extremes. Estimate every branch separately, and sparse branches can produce highly variable results. Give every branch the same estimate, and meaningful differences disappear. Partial pooling uses a model of related groups to learn between these extremes.

## Interactive example

![One observation with mean 6 is pulled toward the population center 0, giving a pooled estimate about 0.83.](../assets/statistics/stats-pooling-preview.svg 'With observation SD 5, population mean 0, population SD 2, and observed mean 6, the fixed normal-means example gives a pooled mean about 0.83 at n=1 and 5.65 at n=100.')

The bars compare a separate group estimate, the population center, and the pooled estimate for that same group. Run the example to change the group size or observed mean; Reset restores one observation with mean six.

```patternverse-widget
{
  "src": "stats-pooling.html",
  "title": "Partial pooling explorer",
  "height": 720,
  "fallback": "With observation SD 5, population mean 0, population SD 2, and observed mean 6, the fixed normal-means example gives a pooled mean about 0.83 at n=1 and 5.65 at n=100."
}
```

## Share information through a population model

A hierarchical model represents group-specific quantities as related through a common population distribution. Each group's estimate is informed by its own observations and by what the model learns about the collection of groups. Under many common models, weakly informed groups move more toward the population pattern than strongly informed groups do.

This is not a fixed rule to subtract ten points from extreme percentages. The amount and direction of sharing depend on the outcome model, group information, between-group variation, covariates, and priors. Report uncertainty as well as the adjusted estimate.

For the branch example, a binomial hierarchical model can estimate satisfaction probabilities without treating a single response as decisive. If branches genuinely differ substantially, the learned distribution can permit more separation. If differences are modest relative to sampling noise, greater pooling may be supported.

## A transparent worked model

The explorer uses a simpler model with bell-shaped Normal distributions. Individual observations have known standard deviation (SD) 5; the group means have a known population center of 0 and SD 2. Standard deviation describes spread: these two values concern scatter within groups and differences between group means, respectively. A group supplies n observations with average y.

The pooled estimate, the posterior mean under this model, gives some weight to y and the rest to the population center of zero. The data weight is **4 × n / (25 + 4 × n)**; 4 comes from the squared population SD, 2², and 25 from the squared observation SD, 5².

With one observation and y = 6, the data weight is 4 / 29 ≈ 0.138. The estimate is **0.138 × 6 + 0.862 × 0 ≈ 0.83**. With 100 observations and the same sample mean, the data weight is 400 / 425 ≈ 0.941, giving **0.941 × 6 + 0.059 × 0 ≈ 5.65**. The average of 100 independent observations carries more information under this model, so more weight goes to the group’s own mean.

These numbers are illustrative assumptions, not a fitted analysis of branch percentages. A real hierarchical model would often estimate population parameters and propagate their uncertainty. The toy example fixes them to make the sharing mechanism visible.

## When sharing is defensible

Groups need a meaningful relationship for the model. Branches with fundamentally different services may require covariates, separate populations, or a different hierarchy. Exchangeability means treating groups as comparable conditional on the modeled information; it does not mean asserting that they are identical.

Consider instrument offsets measured in several laboratories. If the laboratories use a common process with modest differences, sharing can stabilize an offset estimated from a few readings. If one laboratory uses a different instrument technology, pulling its estimate toward the same population may be inappropriate without representing that difference.

## Advanced notes: estimation and ranking differ

Shrinking estimates does not resolve all uncertainty about rankings. Two group means can have broad overlapping uncertainty even when their posterior means have an order. If the decision concerns identifying the best branch, analyze the uncertainty relevant to that decision rather than sorting a table and forgetting it.

With few groups, information about the population distribution can be weak, making prior assumptions consequential. Examine alternative reasonable priors and predictive implications. A convenient hierarchical specification can also omit dependence among groups or overlook a systematically different subgroup.

Partial pooling is useful for schools, laboratories, locations, participants, repeated trials, and other structured data. It improves the relationship between local evidence and shared information when the model is defensible. It cannot repair biased sampling, misleading measurements, or an incorrect causal comparison.

Use this pattern when the smallest groups repeatedly occupy both the top and bottom of a ranking, subgroup estimates look implausibly extreme, or independent estimation wastes information about related units. Keep the original data, pooled estimates, uncertainty, and assumptions visible together.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [Stan methods guide and case studies](https://mc-stan.org/learn-stan/case-studies/pool-binary-trials.html)

