---
id: stats-factorial-interactions
type: pattern
title: 'Vary Factors Together to Reveal Interactions'
summary: 'Use a joint experimental design when the effect of one factor may depend on another.'
status: published
verses:
  - statistics
---

A bakery tests a hotter oven using its current recipe, then tests a new recipe at the old temperature. Neither change seems helpful. Yet the new recipe might work exceptionally well in the hotter oven. The separate tests never observed that combination.

An interaction means that the effect of one factor depends on the level of another, on the outcome scale being considered. A factorial design varies factors jointly so the study can estimate those conditional effects. The response is useful when evaluating combinations, not merely several isolated changes.

## Interactive example

![Temperature raises yield by 2 units for the old recipe and 17 for the new; their difference is 15.](../assets/statistics/stats-factorial-preview.svg 'Temperature changes yield by 2 units with the old recipe and 17 with the new recipe, giving an additive interaction contrast of 15 units in the fictional example.')

The first two bars show temperature effects within each recipe. The third shows how much those effects differ. Run the example to change the four combination yields; Reset restores the fifteen-unit interaction.

```patternverse-widget
{
  "src": "stats-factorial.html",
  "title": "Factorial interaction explorer",
  "height": 900,
  "fallback": "Temperature changes yield by 2 units with the old recipe and 17 with the new recipe, giving an additive interaction contrast of 15 units in the fictional example."
}
```

## Observe the combinations you need

Consider four fictional average yields: old recipe at low temperature, 60; old recipe at high temperature, 62; new recipe at low temperature, 58; new recipe at high temperature, 75. Heating improves the old recipe by two units and the new recipe by seventeen.

The interaction is the difference between those improvements: **17 − 2 = 15 yield units**. High temperature helps the new recipe fifteen units more than it helps the old recipe. The chart’s first two bars show the changes within each recipe; its third bar compares those changes. They are not the four original yields. Reporting one average temperature effect would hide a decision-relevant difference.

A two-by-two factorial experiment tests two factors, each at two levels: old/new recipe and low/high temperature. It includes all four combinations, assigns experimental units by chance, and repeats combinations enough times to assess variability. Those repeats are called replication. It makes the interaction estimable in a way the two separate tests do not. Plot the conditional means and their uncertainty to make the pattern visible.

A second application is testing a reminder and a simplified signup form. Their effects could reinforce each other, duplicate each other, or interfere. A joint design can distinguish these possibilities when the sample size and assignment process support the required comparisons.

## Design for the question and the resources

Factorial experiments can estimate several effects efficiently, but adding factors increases the number of combinations. Fractional factorial designs deliberately observe a subset. Their usefulness depends on which effects become indistinguishable and which higher-order effects can plausibly be neglected. The missing combinations are a design choice with consequences, not free information.

Replication matters because the observed cell means contain noise. An appealing interaction plot from a few observations is a hypothesis, not automatically a stable result. Plan the precision required for the interaction, which may differ from that required for an average main effect.

## Advanced notes: interactions depend on scale

An interaction on an absolute-difference scale need not be an interaction on a ratio scale. For example, a constant proportional improvement can create different absolute improvements at different baselines. Choose the scale for its meaning and inspect what the conclusion implies on scales relevant to the decision.

The existence of an interaction also does not make every average effect meaningless. An average can be exactly the target for a population with a specified mix of conditions. State the weighting and show important conditional differences so that the average is not mistaken for a universal response.

Use this pattern when interventions are bundled, process settings may reinforce one another, or stakeholders ask “Does this work differently under another condition?” Distinguish deliberately designed interaction tests from a large post hoc search through subgroups. The former creates information for a defined question; the latter requires additional care about discovery and confirmation.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [NIST Engineering Statistics Handbook](https://www.itl.nist.gov/div898/handbook/pri/section2/pri212.htm)
- [NIST Engineering Statistics Handbook](https://www.itl.nist.gov/div898/handbook/pri/section5/pri594.htm)
