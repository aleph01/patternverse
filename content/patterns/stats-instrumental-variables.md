---
id: stats-instrumental-variables
type: pattern
title: 'Use an Instrument Under Defensible Assumptions'
summary: 'Investigate treatment variation induced by a credible external source when ordinary adjustment cannot resolve confounding.'
status: published
verses:
  - statistics
---

People choose whether to participate in a training program. Their motivation affects both participation and later performance, making a simple participant comparison difficult to interpret. Suppose invitations were randomly allocated, but not everyone invited attended. The invitation may provide a source of treatment variation with a different causal argument.

An instrumental-variable design uses a variable that changes treatment receipt and satisfies additional assumptions linking it to outcomes. The instrument is not simply a predictor that happens to correlate with treatment. Its credibility comes from how it was generated and why alternative routes to the outcome can be excluded.

## State the causal role of the instrument

In the invitation example, random assignment supports independence from baseline causes of the outcome. Relevance requires that invitations actually change attendance. An exclusion restriction would require the invitation to affect the outcome only through the treatment being analyzed. If the invitation itself motivates people or supplies useful information, that restriction may fail.

With a binary invitation and treatment, additional assumptions such as monotonicity can support a local average treatment-effect interpretation for people whose participation is changed by the invitation. That effect need not equal the effect for everyone or for those who always participate.

Under a suitable simple design, the ratio of the invitation-outcome contrast to the invitation-treatment contrast illustrates the instrumental-variable logic. A small denominator can make inference unstable, especially when it is imprecisely estimated. Instrument strength depends on the first-stage signal relative to its uncertainty, not just the size of the treatment-rate difference. The ratio should not be used without the design assumptions that give it meaning.

## Challenge the alternative pathways

Draw a causal model and explain possible direct effects, common causes, selection, and measurement problems. An assignment lottery is often easier to defend than an instrument discovered because its statistical test looked promising. Nevertheless, even a randomized encouragement requires attention to what the encouragement actually does.

A second example might use a policy rule that changes access to a program. The relevant question is whether that rule affects outcomes through other channels and whether the people whose treatment changes support the target interpretation. Institutional details are part of the identification argument.

## Worked example: divide the invitation effect by the participation change

Suppose a fictional study randomly assigns **100 people** to receive a training invitation and **100** to receive no invitation. Anyone can attend, so invitation and participation differ. In the invited group, **60 attend** and mean later performance is **54**. In the uninvited group, **20 attend** and mean performance is **50**. Assume complete outcome follow-up and no interference between people.

| Assigned group | Attended; mean performance |
| --- | --- |
| No invitation, n = 100 | 20; 50 |
| Invitation, n = 100 | 60; 54 |

The invitation-to-attendance contrast, often called the first stage, is **60 / 100 − 20 / 100 = 0.40**. The invitation-to-outcome contrast is **54 − 50 = 4 points**. The simple Wald instrumental-variable ratio is therefore **4 / 0.40 = 10 performance points**. Divide by a proportion difference, 0.40, rather than by the number forty.

The intuition is that invitation changes attendance for about 40 out of every 100 people. If their average gain is ten points, their contribution averaged across all 100 is **0.40 × 10 = 4 points**. Dividing the four-point invitation effect by 0.40 works backward through that argument. It needs the causal assumptions below; it is not a way to turn any association into a treatment effect.

![A causal diagram links a randomized invitation to attendance and attendance to performance, while motivation affects attendance and performance. A dashed alternative invitation-to-performance route marks the exclusion threat. The worked ratio is a four-point outcome contrast divided by a 0.40 attendance contrast, giving ten points.](../assets/statistics/instrument-pathways.svg "Original fictional aggregate data. Random invitation, relevance, exclusion, monotonicity, consistency and no interference are needed for the stated local interpretation. The ratio alone establishes none of those assumptions and supplies no uncertainty interval.")

To interpret ten as a local average effect of participation, specify the assumptions. Random invitation must be independent of relevant potential outcomes and participation types. Invitations must change attendance. An invitation must affect performance only through the defined participation intervention, not through motivational messages, useful advice, or another direct route. Monotonicity rules out people who would attend only when not invited. Consistency and an appropriate no-interference assumption connect the assigned study to the interventions being discussed.

Under that interpretation, the target concerns people whose participation is changed by invitation: the compliers. It need not equal the effect for always-attenders, never-attenders, everyone invited, or the whole population. Under randomization and monotonicity, the observed attendance fractions suggest **20% always-attenders, 40% compliers, and 40% never-attenders** as estimated population shares. They do not identify which specific individuals are compliers.

Why does the ratio work in the simplified argument? With exclusion, invitation has no performance effect on people whose attendance does not change. If invitation changes participation for a fraction 0.40 and their average effect is ten points, the average invitation effect is **0.40 × 10 = 4**. The observed invitation contrast and attendance contrast connect through these assumptions, rather than through the algebra alone.

Now consider a hypothetical first stage of only **0.02** with the same four-point outcome contrast. The numerical ratio becomes **200**. This does not establish an enormous credible training effect. Weak treatment variation makes the denominator difficult to estimate and can make ordinary ratio-based inference unreliable. Use methods suitable for weak instruments when needed, and do not construct an interval merely by dividing outcome-interval endpoints by an estimated denominator.

A two-percentage-point first stage can be estimated precisely in a sufficiently large study; its size alone does not establish weak identification. Examine a design-appropriate first-stage diagnostic and uncertainty. A conventional F threshold is not a universal guarantee of reliable inference.

The fictional counts make the arithmetic visible, but a real report must quantify both contrasts’ uncertainty and justify the invitation mechanism. A strong first stage still does not establish exclusion. Use [[stats-draw-causal-model]] to inspect competing pathways and [[stats-choose-assignment-unit]] to check whether invitation or training effects can spread across assigned units.

## Advanced notes: strength does not establish validity

A strong relationship with treatment does not prove the exclusion restriction or independence assumptions. Overidentification tests, where available, do not certify every instrument. Conversely, a plausible instrument can be too weak to yield informative estimates in the available sample.

Use inference procedures appropriate to weak instruments when that threat is material. Selecting instruments after inspecting favorable outcomes introduces additional concerns. Report the first-stage relationship and uncertainty, the causal assumptions, and the population to which the effect refers.

Do not treat an instrumental-variable result as automatically superior to a carefully designed adjusted comparison. They rely on different assumptions and may estimate different effects. Prefer the argument that is substantively defensible for the question and available evidence.

Use this pattern when a credible external assignment mechanism exists and important confounding remains unresolved. The deliverable is a transparent identification argument with an interpretable local or structural target, not merely a two-stage regression output.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [The Effect](https://www.theeffectbook.net/ch-InstrumentalVariables.html)
- [Stock and Yogo: Testing for Weak Instruments in Linear IV Regression](https://www.nber.org/papers/t0284)
- [Angrist and Imbens: Identification and Estimation of Local Average Treatment Effects](https://www.nber.org/papers/t0118)
