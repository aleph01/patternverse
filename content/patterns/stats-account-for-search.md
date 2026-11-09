---
id: stats-account-for-search
type: pattern
title: 'Account for the Search That Produced the Finding'
summary: 'Interpret selected results in light of multiple comparisons, repeated looks, and analytical choices.'
status: published
verses:
  - statistics
---

A team tests twenty unrelated feature ideas and celebrates the one with a p value below 0.05. Even if none of the ideas has an effect, a search can produce a seemingly positive result. The selected result is not interpreted fairly by forgetting the nineteen other opportunities.

The response is to define the search and choose inference suited to it. Distinguish a planned primary comparison, a family of confirmatory comparisons, exploratory screening, repeated looks at accumulating data, and flexible choices made after seeing results. These create related but different problems.

## Interactive example

![Twenty independent tests of ideas with no effect, each with a 5% false-positive rate: 64.15% chance of at least one false positive.](../assets/statistics/stats-search-preview.svg 'With 20 independent true-null tests, each with false-positive probability 0.05, the probability of at least one false positive is 1-0.95^20, about 64.2%.')

The starting bar is the calculated probability under the stated assumptions. Running a simulation adds a second bar estimated from fictional experiments. Changing the test count or resetting clears that simulated estimate.

```patternverse-widget
{
  "src": "stats-search.html",
  "title": "Multiple-testing explorer",
  "height": 720,
  "fallback": "With 20 independent true-null tests, each with false-positive probability 0.05, the probability of at least one false positive is 1-0.95^20, about 64.2%."
}
```

## Count the opportunities for a false positive

Imagine all the tested ideas have no effect: their null hypotheses are true. Suppose each independent test nevertheless flags a result 5% of the time. One test avoids a false positive with probability 0.95. For twenty independent tests, avoiding every false positive has probability **0.95²⁰ ≈ 35.8%**. The remaining probability is **1 − 0.95²⁰ ≈ 64.2%** for at least one false positive. For m tests, the formula is 1 − 0.95^m. This is a property of the specified hypothetical procedure, not the probability that any particular reported discovery is false.

The interactive example displays this familywise probability and simulates independent null-test outcomes. Before a simulation has run, it shows only the theoretical bar; an unavailable simulated estimate is not zero. Changing the number of tests clears the earlier simulation because it describes a different experiment. It intentionally does not simulate effect sizes or claim to evaluate a real scientific study. Its purpose is to make the search mechanism visible.

For confirmatory families, familywise-error procedures can limit the chance of any false rejection under their conditions. For some screening tasks, false-discovery-rate control targets a different quantity: the expected false-discovery proportion, defined appropriately. Choose the objective for the scientific purpose and consequences rather than selecting whichever correction preserves a desired result.

## Repeated looks require their own procedure

An experiment checked after every new observation is not the fixed-sample experiment assumed by an ordinary one-time test. Prespecify analysis times and stopping rules, or use a suitable sequential procedure. Stopping when the first attractive result appears changes the operating characteristics.

An additional source of search is analytical flexibility: trying outcomes, transformations, exclusions, subgroups, and models. Not every reasonable choice belongs to one simple test family, but hiding the choices can still exaggerate evidence. Record the analysis path and distinguish planned analyses from discoveries.

## Advanced notes: multiplicity does not have one universal correction

The relevant family depends on the claim, design, and decision process. Treating every hypothesis ever studied as one family is usually not useful; treating a large coordinated search as one isolated test is also misleading. Explain the scope and error criterion explicitly.

Dependence among tests changes the simple independent-test formula. Procedures such as Bonferroni have properties that do not require independence, while other methods rely on specific dependence conditions. Hierarchical modeling can share information but should not be described as automatically solving every selection problem.

A promising exploratory result can still be valuable. Report it transparently and seek fresh evidence with a suitable plan. If the result is important enough to drive a costly decision, its evidence should reflect how it was selected.

Use this pattern whenever a result emerged as the best among many attempts or a study was watched until success. Preserve the search history, state the inferential target, and make the opportunity for selection part of the conclusion.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [Statistics Done Wrong](https://www.statisticsdonewrong.com/p-value.html)
- [Statistics Done Wrong](https://www.statisticsdonewrong.com/regression.html)
