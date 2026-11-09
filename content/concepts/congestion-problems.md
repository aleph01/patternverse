---
id: congestion-problems
type: concept
title: Congestion Problems
summary: Recognize when individually attractive choices crowd a shared resource, then distinguish the cost a user experiences from the additional delay imposed on others.
status: published
tags:
  - structural-traps
  - strategic-and-game-theoretic
  - congestion
  - externalities
  - shared-capacity
verses:
  - systems-thinking
attribution: Original Patternverse field-guide synthesis. The worked scenario and explanatory diagram are hypothetical. Qualitative comparisons state their assumptions; attributed theory and research are distinguished from practical editorial guidance.
---

## A recognizable situation

Commuters leaving the same workplace can use a narrow shortcut or a wider detour. The shortcut is quick when lightly used, but each additional commuter slows those already on it. The detour is less sensitive to this small group’s use. The example keeps the travelers and departure window fixed.

They propose spreading across both routes. A commuter assigned the detour notices that joining the shortcut would still save personal travel time. That move delays the commuters already there by more, in total, than it saves the newcomer.

In this hypothetical situation, an individually attractive choice makes the group’s overall travel worse.

## The underlying pattern

**A congestion problem arises when using a shared resource makes it less useful for other users, while each user chooses mainly according to their own costs and benefits.** Roads, computing resources, popular facilities, and service windows can share this structure.

The additional delay imposed on others is a **congestion externality**: a consequence that the person making the choice does not fully bear.

Wardrop's 1952 traffic principles distinguish individually attractive route choices from minimizing total journey time. The standard Wardrop model treats each traveler as negligible; the small-group commuter example below instead counts each person's effect explicitly. [Kelly's account of network traffic](https://www.statslab.cam.ac.uk/~frank/PAPERS/PRINCETON/pcm0052.pdf)

Rosenthal's 1973 paper established pure-strategy equilibrium existence for a class of finite congestion games: players select resources and sum their costs, using common resource-cost functions determined by user counts. The result establishes that a stable choice profile exists under those assumptions, not that it minimizes everyone's combined cost. [Original paper](https://ranger.uta.edu/~weems/NOTES6319/PAPERSONE/rosenthal1973.pdf)

## What keeps it going

A commuter deciding where to travel counts their own journey time. They do not automatically bear the extra delay their arrival imposes on other shortcut users. This unpriced effect on others is a **congestion externality**.

For the benchmark, commuters select routes for one departure window without observing current choices. They know how use affects travel times and minimize their own time. Demand is fixed; there are no later rewards or agreements enforcing the proposed split.

A **Nash equilibrium** is a route allocation where no commuter can shorten their journey by switching alone. A **system optimum** minimizes the group’s total travel time. These can differ: an extra shortcut user may still save time personally while adding more combined delay to those already there.

This does not mean the shortcut should be empty or that a coordinator can simply demand equal route shares. The useful allocation depends on the actual delay relationships, and a proposed allocation must remain feasible and attractive enough to follow.

![Hypothetical qualitative illustration. A commuter switching to the shortcut saves personal time while existing shortcut users together incur more added delay. A load-dependent charge can attach that external cost to the decision. Roads, travelers, and the departure window stay fixed in the illustration. Change: Attach imposed delay to the route choice, or allocate access through a feasible alternative. Limitation: Measurement, collection, differing means, access, and diversion matter. No road capacity is added.](../assets/structural-traps/congestion-courier-routes.svg "Hypothetical illustration. The two upper cards compare the switcher’s saving with others’ combined delay without inventing travel times. A charge changes private decision cost rather than capacity. It requires defensible measurement and the example’s common valuation of time; longer-term induced demand is a separate mechanism.")

## Why the obvious responses fail

**Recommend the currently fastest route.** Its time can change when people follow the recommendation. Compare the cost after switching, including the new user.

**Ask everyone to choose efficiently.** The two-route split remains vulnerable to an individual saving time at others' expense.

**Rely only on better information.** Accurate information can help users choose, but knowing about the externality does not make them bear it. The original equilibrium already assumes everyone knows the time functions.

**Add capacity without reassessing choices.** Expansion can help, but changes where people go and possibly whether they travel. A fixed-demand comparison is not a prediction of long-term demand; induced demand adds a different feedback mechanism. Check the whole network rather than assuming that a local improvement translates directly into total time saved.

## Possible ways out

These practical intervention families are editorial synthesis. Establish who uses the resource, when, and which costs their presence adds before selecting a remedy.

**Include the external cost in the decision.** Congestion charges or usage credits can make users consider costs they impose on others. This requires authority, measurement, collection, and defensible valuations. Pricing changes incentives; it does not create extra capacity. Revenue use, administration, and access for people with fewer alternatives matter. [Network-pricing framework](https://www.statslab.cam.ac.uk/~frank/PAPERS/PRINCETON/pcm0052.pdf)

**Allocate access directly.** Reservations, admission limits, or coordinated routing can produce a less crowded allocation without a charge. An operator must be able to implement the assignments. Limits may displace waiting outside the measured system or exclude users whose needs are greater than the allocation recognizes.

**Spread or reduce demand.** Flexible departure times, alternative services, or avoiding unnecessary work may reduce simultaneous load. Someone must accept inconvenience or reduced service. Moving demand helps only if the destination or later period has usable capacity.

**Expand or redesign the constrained resource.** More capacity, shorter service times, or better interoperability can reduce congestion. Verify actual changes in travel or completion times, costs, and demand. The relevant comparison includes users' responses to the new arrangement.

## A worked example

### Make added delay matter to the route choice

The commuters’ voluntary split unravels because a detour user can still save time by switching. The diagnosis concerns the delay placed on others, not a failure to understand that the shortcut is crowded.

The route operator introduces a load-dependent charge for shortcut use. For this illustration, the commuters weigh charges against travel time using the same value for a minute saved. In the hypothetical design, the charge reflects the additional delay imposed on existing users, converted using that common value. Physical routes and travel-time relationships remain the same; the newcomer now faces a private cost that includes the effect previously left to others.

Assume the operator can measure relevant use, collect the charge, and set it so that neither the assigned shortcut users nor detour users benefit by switching alone. The proposed efficient allocation is then an equilibrium of the changed cost structure. That is a conditional result, not an estimate of actual travel savings.

Money collected is a transfer, while delay is a time cost. Administration consumes resources and charging can disadvantage commuters with less money or no useful alternative. Revenue use, exemptions, access, and enforcement belong in the wider assessment.

If route conditions change or the operator charges an arbitrary amount, the desired allocation need not result. Reservations, staggered departures, or improved alternatives may be more workable. Each changes a different part of the situation; none supplies unlimited road capacity.

## Limits and lookalikes

A congestion game can have several equilibria and different total costs across them. The preference comparison here establishes a possible divergence between private and shared cost, not a unique predicted route split. Actual delay relationships are needed to identify either an equilibrium or an efficient allocation.

In a continuous Wardrop model, each traveler has negligible influence; used routes between the same origin and destination have equal minimum costs at equilibrium. In the commuter example, one additional person has a noticeable effect. Used routes can therefore have different current journey times without an attractive unilateral switch: joining changes the conditions on the route. Mixing individual-scale and negligible-user assumptions gives incorrect conclusions.

Real delays may depend on queues, incidents, vehicle types, or earlier departures. Values of time and available alternatives differ. An unchanging detour and a perfectly measured charge are assumptions, not infrastructure facts. A real trial would examine denied trips, spillovers, reliability, revenue use, and implementation costs alongside travel time.

## Related patterns

[[bottlenecks-and-capacity-constraints|Bottlenecks and Capacity Constraints]] concerns limits on completed output and accumulating work. Congestion additionally asks how users' choices distribute load and delay.

[[the-commons-dilemma|The Commons Dilemma]] also involves costs imposed through shared use. Congestion can degrade service during simultaneous use without depleting a persistent resource stock.

[[cold-starts-and-critical-mass|Cold Starts and Critical Mass]] examines participation making a service more useful. Congestion can reverse that relationship once additional participation impairs service.

## Sources and further reading

- [Rosenthal, “A Class of Games Possessing Pure-Strategy Nash Equilibria” (1973)](https://ranger.uta.edu/~weems/NOTES6319/PAPERSONE/rosenthal1973.pdf). Foundational finite congestion-game result, with explicit resource-cost assumptions.
- [Frank Kelly, _The Mathematics of Traffic in Networks_](https://www.statslab.cam.ac.uk/~frank/PAPERS/PRINCETON/pcm0052.pdf). Author's chapter proof explaining Wardrop equilibrium, total delay, and network pricing; its divisible-flow model differs from a small group of individual commuters.
- [City of Stockholm, _Facts and Results from the Stockholm Trial_ (December 2006)](https://www.planetizen.com/files/Final%20Report_The%20Stockholm%20Trial.pdf). Original evaluation covering observed traffic changes, measurement limits, and distributional consequences.
