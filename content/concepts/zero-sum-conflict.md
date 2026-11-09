---
id: zero-sum-conflict
type: concept
title: Zero-Sum Conflict
summary: Recognize when one participant's gain necessarily offsets another's loss, choose strategies within that constraint, and distinguish a genuine change in the game from a promise of mutual benefit.
status: published
tags:
  - structural-traps
  - strategic-and-game-theoretic
  - zero-sum-games
  - minimax
  - conflicting-interests
verses:
  - systems-thinking
attribution: Original Patternverse field-guide synthesis. The worked scenario and explanatory diagram are hypothetical. Qualitative comparisons state their assumptions; attributed theory and research are distinguished from practical editorial guidance.
---

## A recognizable situation

Lena prepares to take a penalty kick. Marco, the goalkeeper, knows she usually shoots left. She wants a goal; he wants to prevent one. Revealing her intention would help him, while keeping it uncertain could help her.

Someone suggests they communicate more and find an outcome that benefits both. That might improve their relationship. It cannot make this same kick both a goal and not a goal.

This hypothetical scene isolates a conflict that cooperation alone cannot dissolve: their immediate objectives directly oppose each other.

## The underlying pattern

**A two-player zero-sum game has payoffs that add to zero at every possible outcome.** Improving one player's payoff necessarily reduces the other's by the same amount. A constant-sum game has the same strategic structure after shifting the payoff baselines. [Fischer's game-theory notes](https://webspace.maths.qmul.ac.uk/felix.fischer/teaching/opt/notes/notes9.pdf)

The memorable test is: **Does a gain here necessarily mean an offsetting loss there?**

“Payoff” means the value used to represent a player's preferences. A fixed pot of money does not automatically establish constant-sum satisfaction: people may value its uses differently or incur different costs. Nor does intense hostility prove that interests are completely opposed.

The mathematical foundation is von Neumann's 1928 minimax theorem. For finite two-player zero-sum games, allowing randomized strategies and evaluating expected payoffs, each player's best protection against an opponent's choices meets at a common game value. This is a conditional mathematical result, not a prediction that people always play optimally. [Von Stengel's historical and mathematical account](https://arxiv.org/html/2205.11196v6)

## What keeps it going

Lena wants a goal; Marco wants the same kick stopped. For this narrowly defined outcome, an improvement for one is an equal worsening for the other. Neither intention requires hostility outside the contest.

Each chooses left or right without observing the other’s current choice. Assume both know that a matching dive makes a save more likely and an unmatched dive makes a goal more likely. They care only about this kick, with no future favors, shared rewards, or side payments. Physical execution remains uncertain.

Marco wants to match Lena’s direction; Lena wants to avoid his. A predictable change from left to right gives the opponent a new pattern to exploit. Neither fixed direction settles the conflict.

The formal **minimax** principle concerns protecting against an opponent’s best response. In finite two-player zero-sum games, mixed strategies can secure an equilibrium value. This guarantees a conditional expectation within the model, not success on a particular attempt or equal chances in every contest.

![Hypothetical qualitative illustration. Lena’s shot and Marco’s dive each have Left and Right choices. Matching directions favor a save; different directions favor a goal. Marco wants to match while Lena wants to avoid a match. Physical execution is uncertain, so cells describe relative chances rather than certain results. The comparisons show alternative choices, not successive moves; neither participant observes the other’s current choice. Change: Keep choices privately unpredictable while recognizing the opposed objectives. Limitation: No strategy guarantees this kick. Unequal directional effectiveness changes suitable mixing.](../assets/structural-traps/zero-sum-penalty.svg "Hypothetical illustration. Compare the same choice pair from both perspectives: Marco favors a match and Lena a mismatch. This choice comparison describes opposed objectives without promising a goal or save. Balanced private randomization fits only the stipulated symmetric case.")

## Why the obvious responses fail

**“Always choose the other direction.”** A permanent switch merely supplies a new predictable action. It helps only while the goalkeeper continues responding to the old pattern.

**“Take turns winning.”** An agreement can distribute wins, but does not increase their combined score. Compliance also requires an explanation: what makes someone accept a deliberate loss when their modeled objective rewards avoiding it?

**“Just compromise.”** Some allocations can be divided; a single binary outcome cannot. A lottery can distribute chances without guaranteeing either participant their desired result.

**“Expand the pie.”** This requires an identifiable new benefit, reduced cost, or additional resource. Renaming a transfer as mutual benefit changes no payoffs.

## Possible ways out

**Protect against exploitation within the existing game.** A mixed strategy chooses actions randomly according to specified probabilities. Here private independent randomization can prevent the opponent from exploiting a predictable direction. The appropriate probabilities depend on the actual payoff table; fifty-fifty is not a general prescription. [Fischer's explanation of security levels and equilibrium](https://webspace.maths.qmul.ac.uk/felix.fischer/teaching/opt/notes/notes9.pdf)

**Choose a legitimate allocation procedure.** For divisible rival claims, parties or an authorized decision-maker can agree on shares, adjudication, rotation, or a lottery. These procedures settle who receives what. They require authority or acceptance, may impose costs, and do not eliminate the distributive loss.

**Check whether the conflict was misclassified.** Ask what is actually scarce and whether participants value additional issues differently. In Meegan's student experiments, a grade distribution containing many high grades increased low-grade predictions for a later student, despite grading against standards rather than a fixed quota. A policy reminder reduced some of these predictions. This supports a bias in that judgment task; it does not establish that any particular real conflict is imaginary. [Original study](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2010.00191/full)

**Change the objectives or boundaries.** Opponents may both value avoiding injury, saving dispute costs, or learning. Agreements addressing those benefits can help both under a wider payoff account. They change or correct the original model. If all relevant payoffs really remain zero-sum, simultaneous improvement is impossible.

## A worked example

### Replace a visible pattern with a private choice

Lena usually shoots left. Announcing that she will now always shoot right simply supplies Marco with another predictable direction. More communication about the intended kick would help the opponent adapt.

For an illustrative symmetric case, assume the two directions are equally effective when matched and equally effective when unmatched. Lena privately chooses between them without a pattern Marco can exploit. Marco likewise avoids a predictable dive. Independent, balanced randomization then leaves neither able to improve the chance of their preferred outcome by changing strategy alone.

The symmetry assumption is doing real work. If Lena’s right shot is weaker, or Marco covers one side better, an appropriate mixture need not be balanced. The example explains strategic uncertainty; it does not prescribe a real athlete’s technique.

One kick still ends in a goal or no goal. An equilibrium does not promise the favorable result, and uncertainty in execution remains separate from uncertainty about choices.

### Change the scope only when there is a real shared gain

Lena and Marco could agree on safer training conditions or share the cost of practice equipment. Those agreements can benefit both because they add objectives beyond the result of this kick. They do not make scoring and preventing this same goal compatible.

If a conflict concerns a divisible budget, reducing negotiation costs can likewise help both even when the division itself remains opposed. Identify which part is fixed-sum before treating the whole relationship as such.

## Limits and lookalikes

A fixed allocation is not yet a complete strategic model. Dividing an unchanged fund gives constant-sum holdings, but predicting agreement also requires rules about proposals, rejection, and alternatives. If rejection destroys the fund, the possible totals are no longer constant.

The two-player analysis should not be transferred casually to several parties: coalitions introduce other strategic possibilities. Unknown preferences, asymmetric information, additional actions, and changing skill also require revising the penalty model.

Repeated interaction does not by itself make opposing score totals mutually improvable. Relationships can create additional interests, but those interests must enter the analysis explicitly. Practical interventions above are editorial synthesis, not universal guarantees.

## Related patterns

[[the-prisoners-dilemma|The Prisoner's Dilemma]] contains a mutually beneficial cooperative outcome that individual incentives undermine. That possibility distinguishes it from genuine zero-sum opposition.

[[battle-of-the-sexes|Battle of the Sexes]] combines conflicting preferences with shared gains from coordinating. Disagreement over which outcome to choose does not imply that all outcomes have the same total payoff.

[[congestion-problems|Congestion Problems]] can produce avoidable delay. Reducing wasted time may benefit several participants; allocating a fixed share of a resource and reducing its waste are different questions.

## Sources and further reading

- [Felix Fischer, _Non-Cooperative Games_, lecture 9](https://webspace.maths.qmul.ac.uk/felix.fischer/teaching/opt/notes/notes9.pdf). Compact definitions of zero-sum and constant-sum games, security levels, and equilibrium.
- [Bernhard von Stengel, _Zero-Sum Games and Linear Programming Duality_](https://arxiv.org/html/2205.11196v6) (published 2024). Advanced mathematical treatment, including the minimax theorem's origins and assumptions. The historical attribution here follows this account rather than a direct reading of the 1928 paper.
- [Daniel V. Meegan, _Zero-Sum Bias: Perceived Competition Despite Unlimited Resources_](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2010.00191/full) (2010). Original grade-prediction experiments; evidence about perceived scarcity, not proof that actual scarce resources can always be shared without loss.
