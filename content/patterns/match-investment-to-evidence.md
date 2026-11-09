---
id: "match-investment-to-evidence"
type: "pattern"
title: "Match Investment to Evidence"
summary: "Separate evidence that a problem matters from evidence that a proposed solution will work."
status: "published"
aliases: ["Confidence Determines Speed vs. Quality"]
tags: ["decision-making", "thinking-tools", "match-investment-to-evidence"]
verses: ["decision-making"]
attribution: "Adapted from Brandon Chu’s Confidence determines Speed vs. Quality in Product Management Mental Models for Everyone; the minimum-quality safeguards here are an explicit Patternverse qualification. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

A community theater wants to build an online costume-booking system. Everyone agrees that the current arrangement is frustrating. Nobody has yet checked whether the main problem is finding costumes, knowing their condition, arranging collection, or returning them on time. The team debates how polished the new system should be before establishing what it needs to solve.

Match investment to evidence by separating two questions: how well established is the problem, and how well supported is the proposed solution? Confidence about one does not answer the other. Strong evidence of a painful problem can justify serious inquiry while leaving several possible solutions open.

This pattern adapts Brandon Chu’s “Confidence determines Speed vs. Quality” heuristic from his product-management mental models. The title here emphasizes the practical decision: how much to commit, and to what kind of work. Minimum quality, accessibility, consent, and safety remain constraints rather than variables to sacrifice for speed.

## Name the two claims

Write the problem claim so that evidence could support or challenge it. “Costume coordinators lose several hours each week resolving conflicting reservations” is clearer than “the booking experience is bad.” Record who experiences the problem, how often, and what it prevents.

Then write the solution claim separately: “A shared booking system with condition records will reduce those conflicts without adding more administration.” This claim includes a mechanism and a possible cost. It is not established merely because the problem is real.

For each claim, record the strongest evidence, the weakest assumption, and what would change your assessment. Interviews may establish frustration but not its frequency. A successful demonstration may show usability in a quiet session but not whether volunteers will keep records current during a busy production week.

## Choose the next commitment

If the problem itself is poorly established, a small inquiry may be more useful than building. The theater can inspect recent reservation conflicts and speak to coordinators from different productions. The purpose is to learn whether the proposed problem deserves attention and how it varies.

If the problem is clear but the solution remains uncertain, compare or test approaches. Perhaps a shared calendar and a collection checklist solve most conflicts. Perhaps physical labeling matters more than software. A bounded trial can distinguish these possibilities without committing to a complex system.

When both problem and solution have substantial support, investment in reliability, maintainability, and a better overall experience may be justified. Evidence does not eliminate risk, but it changes what the team can reasonably commit to.

These are judgment calls rather than thresholds calculated from a confidence score. State what each stage is meant to establish, the resources it can use, and the condition for increasing, revising, or stopping the investment.

## Quality has a floor

A rough prototype can be appropriate for learning, but “rough” should describe deliberate scope choices. It does not excuse exposing personal information, misleading participants, creating unusable access, or leaving people dependent on a system that cannot fulfill its promise.

The theater might test a limited booking workflow with five volunteers using fictional reservations before moving real productions onto it. That trial can omit advanced reporting. It still needs understandable instructions, an appropriate way to handle information, and a clear explanation that the existing booking arrangement remains authoritative during the test.

Reducing scope often creates speed more responsibly than reducing care. Identify which quality attributes are needed for a fair test and which can wait. A trial that is too unreliable to interpret produces weak evidence, however quickly it was launched.

## Apply it to personal projects

A learner wants to purchase an expensive recording setup because practicing presentations feels ineffective. The problem claim might be that they cannot identify distracting habits from memory. The solution claim is that high-quality recordings will help them improve.

A recording on existing equipment could test whether reviewing a short talk reveals useful changes. If the learner never reviews the recording, better equipment may not address the actual obstacle. If review helps but poor audio conceals important details, a targeted upgrade becomes easier to justify.

The method does not require turning every personal choice into a research project. The amount of inquiry should fit the stakes and cost. Its value is noticing when enthusiasm for a solution has borrowed certainty from an independently real problem.

## Inspect evidence that appears stronger than it is

Repeated requests from the same small group may not establish a widespread need. A prototype’s popularity may reflect novelty or politeness. A successful trial in one setting may rely on support that will not exist elsewhere. Record these limitations rather than translating every positive signal into a higher confidence number.

Look for evidence against the preferred interpretation. What would you expect to see if the problem were smaller, or if another solution worked better? Who has not been included in the inquiry? What burden would the proposed change transfer to them?

[[look-for-the-decisive-unknown|Look for the Decisive Unknown]] helps identify an uncertainty that could change the next commitment. [[prefer-the-smallest-useful-experiment|Prefer the Smallest Useful Experiment]] helps design a proportionate test. [[impact-effort-matrix|Impact–Effort Matrix]] helps compare several possible initiatives once their estimates are sufficiently meaningful.

End with an investment decision, not a declaration of confidence: what will be done next, within what limit, to learn or deliver what? Keep the two claims and their evidence separate in the output. That distinction makes it possible to change the solution without pretending the problem has disappeared.

## Sources

- [Brandon Chu: Product Management Mental Models for Everyone](https://blackboxofpm.substack.com/p/product-management-mental-models-for-everyone-31e7828cb50b), including “Confidence determines Speed vs. Quality.” The investment framing, minimum-quality qualification, and worked examples here are original Patternverse adaptations.

## Practice — Choose the Next Investment

**Purpose:** Separate evidence that a problem matters from evidence that a proposed solution will work.

**Time:** About 15 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Choose the Next Investment"
:output result

!show {
About 15 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
claims = !form {
:title "Separate the two claims"
problem = !ask {
What problem matters to whom, with what consequences?
}
solution = !ask {
What proposed solution should address it, through what mechanism?
}
floor = !ask {
Which quality, access, privacy, consent, or safety requirements must every test preserve?
}
}
problem_evidence = !form {
:title "Inspect problem evidence"
support = !ask {
What evidence supports the problem claim?
}
weakness = !ask {
What is its weakest assumption or most important counterevidence?
}
standing = !choose {
How established is the claim?
- weak: "Insufficiently established"
- mixed: "Mixed or limited evidence"
- substantial: "Substantial support in the relevant context"
}
}
solution_evidence = !form {
:title "Inspect solution evidence"
support = !ask {
What evidence supports this solution rather than merely the problem?
}
weakness = !ask {
What assumption or context limit remains?
}
standing = !choose {
How established is the solution claim?
- weak: "Insufficiently established"
- mixed: "Mixed or limited evidence"
- substantial: "Substantial support in the relevant context"
}
}
investment = !form {
:title "Choose what to commit"
stage = !choose {
Which next commitment fits your evidence and constraints?
- inquire: "Investigate whether the problem deserves attention"
- test: "Test or compare a bounded solution"
- deliver: "Invest in reliable delivery and improvement"
- stop: "Stop or reframe the proposal"
}
basis = !ask {
Why does that commitment fit? Confidence is not an automatic threshold.
}
scope = !ask {
What work and resource limit will you authorize or propose?
}
decision_rule = !ask {
What observation would justify more investment, revision, or stopping?
}
}
result = {claims: claims, problem_evidence: problem_evidence, solution_evidence: solution_evidence, investment: investment}
!show {
Your proposed investment stage: {{investment.stage}}
Scope and limit: {{investment.scope}}
Increase, revise, or stop using: {{investment.decision_rule}}
}
-> end
```
