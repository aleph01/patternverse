---
id: "decision-matrix"
type: "pattern"
title: "Decision Matrix"
summary: "Make weighted comparisons inspectable, then test whether the result depends on fragile judgments."
status: "published"
aliases: []
tags: ["decision-making", "thinking-tools", "decision-matrix"]
verses: ["decision-making"]
attribution: "Weighted multi-criteria comparison is a broad decision-analysis tradition; ASQ documents this form. Not all weighted matrices are Pugh datum matrices. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

A community choir is choosing rehearsal software. One member wants better audio playback, another cares about accessibility, and the treasurer is watching the annual cost. The discussion circles because each person compares the options using a different idea of “better.” A decision matrix can make those judgments visible in one place, provided the numbers remain an account of preferences and evidence rather than a substitute for them.

The method lists options against criteria, gives the criteria relative weights, and scores each option on a consistent scale. Multiplying each score by its weight and adding the results creates a comparison under those assumptions. The important phrase is “under those assumptions.” A total is conditional on what was included, how the scales were defined, and whose priorities the weights represent.


![The choir software example scores A at 34 and B at 32. Raising the second criterion weight from four to five produces a 37–37 tie.](/diagrams/thinking-tools/decision-matrix.svg "A result depends on the weights. The choir software example scores A at 34 and B at 32. Raising the second criterion weight from four to five produces a 37–37 tie.")

## Decide what cannot be traded away

Some requirements should be checked before scoring. If a member must be able to use a screen reader, an inaccessible tool may be unsuitable regardless of how well it performs elsewhere. Treating access as one small weighted advantage could allow low price or attractive features to compensate for excluding someone.

The choir therefore checks mandatory requirements first: compatibility with members' devices, an accessible route through the essential tasks, and a cost ceiling. Only viable options proceed to the comparison. A failed constraint can prompt investigation or adaptation, but should not disappear inside the arithmetic.

Weighted comparison is a broad decision-analysis technique. ASQ describes a common practical form. Related approaches differ: a Pugh datum matrix compares alternatives with a reference design, while the weighted-rating version here assigns numerical judgments. Naming those differences avoids making every grid sound like the same formal method.

## Define the meaning of a score

Suppose the choir uses three criteria: ease of learning, rehearsal usefulness, and affordability. Higher scores must mean a better fit on every criterion. A cost score of five therefore means more affordable, not more expensive. Mixing directions can reverse an apparent conclusion without anyone noticing.

Weights describe relative importance within this particular comparison. The choir gives learning a weight of three, usefulness four, and affordability two. Two viable tools receive scores of 4, 3, 5 and 2, 5, 3 respectively. Their totals are 34 and 32: the first is ahead under the current model. Those numbers do not prove that a two-point difference has practical significance.

The arithmetic is deliberately simple. Its purpose is to expose a disagreement. Perhaps the second tool's usefulness score rests on one impressive feature that most singers will never use. Perhaps the first tool's ease score was supplied only by its existing users. A clearly labeled uncertainty can matter more than a precise-looking total.

## Ask what would change the result

A sensitivity review examines a plausible change in weights or scores. If the choir raises the usefulness weight from four to five, the totals become 37 and 37. The previous preference is therefore fragile with respect to a reasonable difference in priorities. That is useful information, not a failure of the matrix.

The next action might be a short rehearsal trial rather than another round of scoring. Members could attempt the same three tasks in both tools and record difficulties. The matrix identifies what the trial should learn: whether the extra functionality justifies the greater learning burden. It should not keep generating numbers when the disagreement concerns missing experience.

A robust preference is also possible. One option may remain attractive across every plausible weighting considered. In that case, more refinement may have little value. The group can document the assumptions, choose, and define when new evidence would justify reconsideration.

## Keep criteria distinct and proportionate

A long list can double-count the same benefit. “Simple interface,” “easy navigation,” and “quick to learn” may largely overlap, giving usability three separate votes. Combining them or explaining their differences makes the weighting more honest. Similarly, one dramatic but rarely used feature should not receive a high score merely because it is easy to demonstrate.

The method can help outside purchasing. Someone choosing between two evening courses might compare travel demands, relevance to a current project, and the kind of feedback offered. If one course provides a fundamentally different kind of experience, forcing every value onto one scale may be less illuminating than explicitly naming the trade-off. Some judgments deserve a conversation rather than another decimal place.

## A disciplined comparison, with a human decision

Use a matrix when there are a few viable alternatives and several consequential criteria. It is less helpful when the question itself is poorly framed, when requirements are still changing rapidly, or when one option clearly fails a nonnegotiable constraint. It can also become a negotiation device in which people adjust weights until their preferred option wins. Preserve the first assumptions and explain revisions instead of quietly editing toward a desired result.

The practice below compares two options on three participant-defined criteria, computes totals, and repeats the comparison with revised weights. Its bounded shape supports genuine arithmetic and sensitivity review with today's language. It is not an unrestricted spreadsheet, and it should not pretend to be one.

[[define-the-decision-before-comparing-options|Define the Decision Before Comparing Options]] improves the question before the grid. [[make-trade-offs-explicit|Make Trade-offs Explicit]] preserves values that a total might hide. [[look-for-the-decisive-unknown|Look for the Decisive Unknown]] helps turn a fragile result into a useful investigation.

## Sources

See ASQ's [decision matrix reference](https://asq.org/quality-resources/decision-matrix) for the basic comparison method. The choir example, arithmetic, constraint-first treatment, and participant-led sensitivity practice are independently developed.

## Practice — Compare Two Options on Three Criteria

**Purpose:** Make weighted comparisons inspectable, then test whether the result depends on fragile judgments.

**Time:** About 20 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Compare Two Options on Three Criteria"
:output result

!show {
About 20 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
context = !form {
:title "Establish viable options and criteria"
decision = !ask {
What outcome is this comparison meant to support?
}
option_a = !ask {
Name viable option A.
}
option_b = !ask {
Name viable option B.
}
constraints = !ask {
Which mandatory requirements have both options met? Stop and investigate if either is not viable.
}
criterion_one = !ask {
Name criterion 1; higher scores must mean a better fit.
}
criterion_two = !ask {
Name a distinct criterion 2; higher scores must mean a better fit.
}
criterion_three = !ask {
Name a distinct criterion 3; higher scores must mean a better fit.
}
}
weights = !form {
:title "Set relative weights"
one = !rate 1..5 {
Importance of {{context.criterion_one}}
}
two = !rate 1..5 {
Importance of {{context.criterion_two}}
}
three = !rate 1..5 {
Importance of {{context.criterion_three}}
}
}
scores_a = !form {
:title "Assess option A"
one = !rate 1..5 {
Fit of {{context.option_a}} on {{context.criterion_one}}
}
two = !rate 1..5 {
Fit on {{context.criterion_two}}
}
three = !rate 1..5 {
Fit on {{context.criterion_three}}
}
uncertainty = !ask {
Which score is least supported, and what evidence would improve it?
}
}
scores_b = !form {
:title "Assess option B"
one = !rate 1..5 {
Fit of {{context.option_b}} on {{context.criterion_one}}
}
two = !rate 1..5 {
Fit on {{context.criterion_two}}
}
three = !rate 1..5 {
Fit on {{context.criterion_three}}
}
uncertainty = !ask {
Which score is least supported, and what evidence would improve it?
}
}
total_a = weights.one * scores_a.one + weights.two * scores_a.two + weights.three * scores_a.three
total_b = weights.one * scores_b.one + weights.two * scores_b.two + weights.three * scores_b.three
!show {
Under the original weights: {{context.option_a}} = {{total_a}}; {{context.option_b}} = {{total_b}}. Equal totals are a tie. A larger total is conditional on these judgments, not an instruction to choose.
}
revised_weights = !form {
:title "Test a plausible alternative weighting"
!show {
Change at least one weight to another plausible value; keep the others if appropriate.
}
one = !rate 1..5 {
Importance of {{context.criterion_one}}
}
two = !rate 1..5 {
Importance of {{context.criterion_two}}
}
three = !rate 1..5 {
Importance of {{context.criterion_three}}
}
}
revised_a = revised_weights.one * scores_a.one + revised_weights.two * scores_a.two + revised_weights.three * scores_a.three
revised_b = revised_weights.one * scores_b.one + revised_weights.two * scores_b.two + revised_weights.three * scores_b.three
!show {
With revised weights: {{context.option_a}} = {{revised_a}}; {{context.option_b}} = {{revised_b}}.
}
judgment = !form {
:title "Interpret the comparison"
sensitivity = !ask {
Did the preference survive, reverse, or become a tie? What does that reveal?
}
choice = !ask {
What provisional choice or evidence-gathering action do you endorse?
}
review = !ask {
What new information would justify revisiting it?
}
}
result = {context: context, weights: weights, scores_a: scores_a, scores_b: scores_b, baseline: {a: total_a, b: total_b}, revised_weights: revised_weights, sensitivity: {a: revised_a, b: revised_b}, judgment: judgment}
!show {
Original weighted totals: {{context.option_a}} = {{total_a}}; {{context.option_b}} = {{total_b}}.
With revised weights: {{context.option_a}} = {{revised_a}}; {{context.option_b}} = {{revised_b}}.
Your provisional choice or inquiry: {{judgment.choice}}
Revisit when: {{judgment.review}}
}
-> end
```
