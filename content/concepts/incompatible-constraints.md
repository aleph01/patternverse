---
id: incompatible-constraints
type: concept
title: Incompatible Constraints
summary: Establish which requirements cannot be satisfied together, then change an authorized requirement, resource limit, or assumption instead of searching endlessly within an empty feasible set.
status: published
tags:
  - structural-traps
  - dependency-and-feasibility
  - constraints
  - infeasibility
  - requirements
verses:
  - systems-thinking
attribution: Original Patternverse field-guide synthesis. The worked scenario and explanatory diagram are hypothetical. Qualitative comparisons state their assumptions; attributed theory and research are distinguished from practical editorial guidance.
---

## A recognizable situation

Mara wants to attend an evening performance after work. She cannot leave work early. The only available train that would get her there before the performance leaves before her shift ends.

She checks the same timetable again. Taking the train means leaving work before she is permitted to; finishing the shift means missing the required arrival. In this hypothetical plan, no other available transport meets the timing and budget limits.

The difficulty is not choosing between an attractive and an unattractive valid journey. No journey satisfies every requirement as stated.

## The underlying pattern

**Constraints are incompatible when no permitted option satisfies all of them simultaneously.** A constraint is a requirement or limit; a **feasible option** meets every applicable constraint. The **feasible set** contains all such options. Here, that set is empty.

The title is an editorial umbrella for an established mathematical idea: **infeasibility**. Mathematical optimization distinguishes finding an admissible option from finding the best admissible option. Boyd and Vandenberghe's _Convex Optimization_ provides a standard account; this article translates that distinction into everyday planning. The general idea is not a single psychological theory or one inventor's named dilemma. [Authors' teaching slides, sections 4.2–4.6](https://web.stanford.edu/~boyd/cvxbook/bv_cvxslides.pdf)

Keep **hard constraints**, which must hold for acceptance, separate from preferences, which rank acceptable options. A strongly desired feature becomes a hard constraint only when the decision actually excludes options without it. Calling every wish mandatory can manufacture an impossible brief.

## What keeps it going

Mara checks the work restriction and the arrival requirement separately. Each seems reasonable. Together with the available timetable, they rule out every permitted journey.

The last train that meets the arrival requirement departs before the earliest permitted departure from work. A later train respects work but misses the performance. Rearranging her packing or searching the same timetable cannot reverse that ordering.

This conclusion is conditional on the stated options. An actual alternative route, authorized early departure, later performance, or accepted late arrival would change the feasible set. Merely wishing for one does not make it available.

The distinction matters: a trade-off compares acceptable options; infeasibility means no option passes all the acceptance conditions. The second needs an authorized revision or a decision not to undertake the plan.

![Hypothetical qualitative illustration. Originally the last train meeting the arrival requirement leaves before Mara is allowed to leave work. The revised authorization moves her permitted departure before the same train, with work covered. The train and performance time do not change. Change: Authorize a covered earlier finish, or explicitly change another requirement. Limitation: Coverage has a cost. A feasible timetable is not a guarantee of punctual arrival.](../assets/structural-traps/incompatible-constraints-booklets.svg "Hypothetical illustration. Read each row as event order, not elapsed time. Authorized early departure makes the same train usable, while preserving the arrival requirement. A colleague covers work and punctual transport remains uncertain.")

## Why the obvious responses fail

**Keep searching the same options.** Search can uncover a missed route. Once the conflict has been established for all permitted routes, repeated checking cannot remove it.

**Split the difference.** Leaving a little early and arriving a little late may violate both hard requirements. It is a proposed change, not compliance with the original plan.

**Call one requirement more important.** Prioritizing the performance does not itself authorize leaving work. Whoever owns the restriction must accept the change.

**Treat an unsuccessful search as proof.** In complex cases, failure to find a plan may only mean the search stopped too soon. Google's CP-SAT documentation distinguishes proven `INFEASIBLE` from `UNKNOWN`, including when a time or resource limit interrupts a search. [Official statuses](https://developers.google.com/optimization/cp/cp_solver#cp-sat_return_values)

## Possible ways out

The following sequence is practical editorial synthesis. Establishing a conflict does not decide which person's requirement should give.

**Check the model.** Verify the work release time, travel connections, full journey, budget, and meaning of “before the performance.” An overlooked permitted route may resolve apparent incompatibility. A speculative lift or an unapproved absence is not yet an available option.

**Isolate a conflicting subset.** In a large plan, find which requirements cannot hold together. An **irreducible inconsistent subsystem**, or IIS, is a subset where removing any single included requirement or bound makes that subset feasible. It need not be the smallest conflict, and other conflicts can remain after it is repaired. [Gurobi's diagnosis guide](https://support.gurobi.com/hc/en-us/articles/360029969391-How-do-I-determine-why-my-model-is-infeasible)

**Change a genuine input or resource.** Another affordable service, additional transport budget, or an available lift could change the route options. Somebody must supply it, and the complete journey must fit. Paying more is not useful if no suitable service exists.

**Relax an authorized requirement.** A manager could approve an earlier finish with work covered. Mara could choose a later performance or accept missing the opening if entry rules permit. Name the lost work time, extra cost, inconvenience, or missed experience. Permission and practical feasibility are separate.

Optimization software calls selectable changes **feasibility relaxation**. Which requirements may move, and the penalties assigned to moving them, encode judgments rather than settle them. The cheapest modeled adjustment may not be acceptable or fair. [Infeasibility analysis](https://docs.gurobi.com/projects/optimizer/en/current/features/infeasibility.html)

**Decline the plan.** If all conflicting conditions remain fixed, Mara cannot honestly promise to satisfy them. Missing the event can be the available loss when neither timing nor resources can change.

## A worked example

### Change a requirement with the person who owns it

Mara initially searches later trains, then asks whether packing in advance could help. Neither changes the fact that the last qualifying train leaves before her authorized finish.

She checks the complete route and confirms that the timetable is current. In this hypothetical case, no affordable alternative reaches the performance in time. She shows her manager the conflict rather than promising both a full shift and an impossible departure.

The manager authorizes an earlier finish after a colleague agrees to cover the remaining work. The performance time and train remain unchanged. Mara's permitted departure now precedes the train, so the journey becomes feasible.

In the stipulated successful outcome, she takes the train and arrives in time. The new permission makes that journey allowable; it does not guarantee that the train runs punctually. Her colleague bears the coverage burden, and Mara accepts the agreed adjustment to her working time.

If coverage is unavailable, the manager may refuse. Mara then needs a different performance, another real travel option, accepted late arrival, or a decision not to attend. Finding a conflict does not oblige somebody else to absorb its cost.

### When every pair fits but the whole plan does not

Three simultaneous discussions each need a separate room, while only two rooms are available. Any pair fits; all three do not. Another room, staggered times, or an accepted sharing arrangement changes feasibility. More enthusiasm cannot supply the missing space.

## Limits and lookalikes

A disappointing feasible option is different from an impossible one. **Trade-offs** concern what acceptable choices gain and lose; **infeasibility** means no choice passes all current acceptance conditions. Relaxing constraints can turn the second problem into the first.

A proof applies to its model. Missing suppliers, mistaken prices, uncertain durations, or misunderstood requirements can change the conclusion. Conversely, a feasible spreadsheet may omit a real restriction. Keep counts integral where whole items are required, and distinguish estimates from guaranteed limits.

The journey establishes a conditional incompatibility: the last qualifying train leaves before the earliest permitted departure. It supplies no empirical estimate of how often schedule changes succeed and no moral rule deciding who should bear the adjustment.

## Related patterns

[[make-trade-offs-explicit|Make Trade-offs Explicit]] helps compare the losses after stakeholders permit requirements to change.

[[reframing-remove-constraints|Remove Constraints]] tests whether a restriction is necessary or merely assumed. Removing a genuine commitment requires authority, not just different wording.

[[resource-deadlock|Resource Deadlock]] involves tasks holding resources while waiting for one another. Here, nobody need hold anything: the specification itself exceeds available capacity.

## Sources and further reading

- [Boyd and Vandenberghe, _Convex Optimization_: teaching slides](https://web.stanford.edu/~boyd/cvxbook/bv_cvxslides.pdf). Foundational distinctions between feasibility, objectives, and optimality; see sections 4.2–4.6.
- [Gurobi: How do I determine why my model is infeasible?](https://support.gurobi.com/hc/en-us/articles/360029969391-How-do-I-determine-why-my-model-is-infeasible). Explains irreducible conflicts, multiple IISs, and why irreducible does not mean minimum size.
- [Gurobi: Infeasibility Analysis](https://docs.gurobi.com/projects/optimizer/en/current/features/infeasibility.html). Documents selectable relaxations and violation costs; these encode user choices rather than settle priorities.
- [Google OR-Tools: CP-SAT Solver](https://developers.google.com/optimization/cp/cp_solver). Official distinction between finding a solution, proving infeasibility, and stopping with an unknown result.
