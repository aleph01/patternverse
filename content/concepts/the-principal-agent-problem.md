---
id: the-principal-agent-problem
type: concept
title: The Principal-Agent Problem
summary: Recognize when delegated work combines different interests with hard-to-observe actions, then design information, incentives, and decision rights around the work that actually matters.
status: published
tags:
  - structural-traps
  - information-incentive-and-commitment
  - principal-agent
  - hidden-action
  - performance-measurement
verses:
  - systems-thinking
attribution: Original Patternverse field-guide synthesis. The worked scenario and explanatory diagram are hypothetical. Qualitative comparisons state their assumptions; attributed theory and research are distinguished from practical editorial guidance.
---

## A recognizable situation

Nina asks an estate agent, Eli, to help sell her home. She wants a good net result and sound advice about whether to accept an offer. Eli wants to earn his fee and bring the sale to completion.

Under this hypothetical commission arrangement, Eli receives only a small share of any extra sale proceeds, while further marketing and negotiation require more of his time. An offer worth rejecting for Nina may be worth accepting from his perspective.

Eli also knows more about the local market. Nina cannot settle the problem simply by saying “get the best price”: she is relying on his expertise to judge what a better offer is likely to cost and whether it will arrive. The example illustrates a possible incentive conflict, not a claim about every agent.

## The underlying pattern

**The principal-agent problem arises when someone delegates decisions or work to another person whose interests differ, while relevant actions or information are difficult to observe or verify.** The delegating party is the **principal**; the person acting on their behalf is the **agent**.

The structure combines delegation, potentially divergent objectives, and an information or contracting limitation. Managers and employees, clients and advisers, and citizens and representatives can occupy these roles. Delegation also brings expertise and capacity; eliminating discretion can sacrifice those benefits.

Ross's 1973 paper is an early formal treatment of the principal's problem: selecting a payment arrangement while anticipating how the agent will respond under uncertainty. The underlying relationship and earlier economic analyses predate that paper. [Foundational treatment](https://gwern.net/doc/economics/mechanism-design/1973-ross.pdf)

The practical question is: **What does this arrangement make sensible for the person doing the work?**

## What keeps it going

Nina retains most of an additional sale gain; Eli receives only the agreed fraction. His extra time and selling effort are personally costly. Both benefit from a sale, but they need not prefer the same balance between price, delay, uncertainty, and work.

First Nina chooses an agent and accepts terms. Eli then undertakes marketing and advises her about offers. She decides whether to accept, but cannot directly observe all the evidence and judgments behind his recommendation. The final result also depends on buyers and market conditions. This single-sale illustration excludes future reputation effects and assumes the stated payment arrangement; actual contracts differ.

Agency problems can therefore concern hidden actions, selectively communicated information, or both. A principal can remain the formal decision-maker while depending heavily on an agent's advice. A signed instruction does not make that advice complete or their objectives identical.

An **incentive-compatible** arrangement makes an intended action one the agent prefers. It must also be acceptable to the agent and worth its cost to the principal. Those are separate requirements, not automatic effects of paying a commission or a bonus.

![Hypothetical qualitative illustration. Nina keeps most of a higher sale price; Eli receives only a small share and bears extra selling effort. His recommendation informs her acceptance decision, while market conditions also affect the sale. An independent paid assessment adds evidence before she chooses. Change: Improve the evidence supporting the principal’s retained decision and review the terms inducing advice. Limitation: Independent assessment is costly and fallible. Better information guarantees neither a higher price nor aligned interests.](../assets/structural-traps/principal-agent-maintenance.svg "Hypothetical illustration. Roles share an interest in selling but can rank price and delay differently. Independent evidence can reduce reliance on unsupported advice without removing the incentive conflict. Fees, imperfect assessment, market risk, and lost current offers remain.")

## Why the obvious responses fail

**“Explain that I want the best outcome.”** Eli can understand Nina's purpose and still face different personal costs and gains from another period of marketing.

**“Pay a higher unconditional fee.”** A payment added equally to every choice does not by itself change which choice is preferable in a simple money-and-effort model. Recruitment, retention, professional motivation, and contract acceptance can matter in richer settings.

**“Pay only for what is easy to count.”** A rapid sale can be counted without establishing a good price or suitable advice. Holmström and Milgrom show how rewards can redirect effort when duties compete for attention and important dimensions are poorly measured. Strong rewards can also impose unwanted risk. These are conditional results, not a claim that performance pay always fails. [Original paper](https://gwern.net/doc/economics/1991-holmstrom.pdf)

**“Supervise everything.”** Nina hired expertise partly because she lacks it. Checking every judgment can be costly and still fail to reveal whether advice was sound when it was given. A disappointing final price alone does not prove poor effort or misconduct.

## Possible ways out

**Improve the relevant information.** A principal can use inspection, independent checks, reliable records, or comparisons that help distinguish effort from circumstances. Establish what the information actually reveals and whether it can support an enforceable agreement. Monitoring needs a budget and may still leave uncertainty.

**Align rewards with valuable performance.** Bonuses, shared returns, professional recognition, or credible future opportunities can make desired actions more attractive. Two conditions differ: **incentive compatibility** means the desired action is worth choosing; **participation** means accepting the arrangement is worth more than the agent's alternative. Meeting one does not establish the other.

**Redesign the job and decision rights.** Separating easily counted production from maintenance or review can protect neglected work. Clear authority, adequate resources, and escalation rights can also help an agent act on the principal's goals. Separation introduces coordination costs and requires competent reviewers.

**Use several forms of accountability.** Outcome measures can be combined with process checks, professional standards, and informed judgment. This requires evaluating how the measures interact. Simply adding more indicators can create additional reporting work and new opportunities to manipulate appearances.

These are practical design families, not universal contract formulas.

## A worked example

### Reduce dependence on unsupported advice

Eli recommends accepting the current offer. Nina repeats that she wants a good price, but the request changes neither his commission share nor the cost of further selling effort. In this hypothetical case, those incentives—not a shortage of interested buyers already ruled out by evidence—create the concern.

Before deciding, Nina asks for the relevant comparable sales, documented buyer feedback, remaining marketing options, and the costs and risks of waiting. She commissions an independent assessment with a disclosed fixed fee that does not depend on accepting this buyer's offer. That assessor still needs competence and accountability; independence is not a guarantee of accuracy.

Assume the additional evidence is informative and affordable. Nina can now compare accepting with a defined further marketing period, rather than relying on a bare recommendation. In the stipulated continuation, she chooses further marketing because its prospects are worth its costs to her, and Eli carries out the agreed work.

This improves the information supporting her decision; it does not eliminate the original incentive difference. It does not guarantee a higher eventual price. The review costs money, waiting can lose the current buyer, and final outcomes still depend on the market. A credible review might instead confirm that accepting is sensible.

### What research contributes

Levitt and Syverson compared agents selling their own homes with agents selling clients' homes. Their historical observational study found differences in sale prices and time on the market consistent with an information-and-incentive explanation, after measured controls. It is not a randomized test, and does not establish the right contract or decision for Nina. [Author-hosted working paper](https://pricetheory.uchicago.edu/levitt/Papers/market%20distortion.pdf)

Lazear's Safelite study examined a switch from hourly wages to **piece rates**, payment per installation. It reported higher output and analyzed both within-worker change and workforce composition. Countable output, traceable defects, and quality-control arrangements mattered. This firm-specific observational study does not establish that piece rates suit expert advice or every occupation. [Original study](https://houdekpetr.cz/%21data/papers/Lazear%202000.pdf)

## Limits and lookalikes

**Moral hazard** concerns difficult-to-observe actions after agreement; **adverse selection** concerns private characteristics or information affecting participation before agreement. This article uses the broader agency lens: delegated expertise, possibly divergent interests, and limits on evaluating actions or advice. A particular case needs its more specific information mechanism identified.

A bad result alone does not identify poor effort. Nor does every disappointing delegation reveal conflicting incentives: missing tools, misunderstood instructions, or inadequate capacity can produce the same symptom.

Real agents may value professional standards, fairness, relationships, or the work itself. Principals can also supply poor incentives, withhold resources, or demand incompatible goals. The role label does not establish whose interests deserve priority. The hypothetical example illustrates a conditional response, not a description of employees in general.

## Related patterns

[[moral-hazard|Moral Hazard]] develops hidden actions after agreement. [[adverse-selection|Adverse Selection]] instead follows how private characteristics affect participation before agreement. [[multitask-incentive-distortion|Multitask Incentive Distortion]] adds competition for effort among several valuable duties. Each calls for a more specific diagnosis than delegation alone.

[[trust-games|Trust Games]] foregrounds vulnerability before another person's discretionary response. Agency analysis additionally examines ongoing delegated choices, measurement, and compensation.

[[bargaining-problems|Bargaining Problems]] concerns selecting terms. Agency analysis asks what actions those terms induce after acceptance.

[[bottlenecks-and-capacity-constraints|Bottlenecks and Capacity Constraints]] explains failure caused by insufficient throughput. Stronger incentives cannot create missing time, equipment, or expertise by themselves.

## Sources and further reading

- [Stephen A. Ross, _The Economic Theory of Agency: The Principal's Problem_](https://gwern.net/doc/economics/mechanism-design/1973-ross.pdf) (1973). Early formal statement of delegation, payment rules, agent response, and uncertainty.
- [Bengt Holmström and Paul Milgrom, _Multitask Principal-Agent Analyses: Incentive Contracts, Asset Ownership, and Job Design_](https://gwern.net/doc/economics/1991-holmstrom.pdf) (1991). Explains interactions between measurement, effort allocation, risk, and organisational design.
- [Edward P. Lazear, _Performance Pay and Productivity_](https://houdekpetr.cz/%21data/papers/Lazear%202000.pdf) (2000). Original Safelite analysis, including worker selection, quality controls, and limits to generalizing the case.

- [Steven D. Levitt and Chad Syverson, _Market Distortions When Agents Are Better Informed_](https://pricetheory.uchicago.edu/levitt/Papers/market%20distortion.pdf) (2005 working paper; published 2008). Direct study of information and incentives in real-estate agency; historical observational evidence, not a universal description of agents.
