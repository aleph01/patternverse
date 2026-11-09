---
id: 'explicit-escalation-paths'
type: 'pattern'
title: 'Explicit Escalation Paths'
summary: 'Define when an issue needs wider help or authority, who receives it, how responsibility is accepted, and what happens if it remains unresolved.'
status: 'published'
verses:
  - organizational-design
---

**Core question:** When an issue exceeds ordinary ownership, how does it reach someone equipped to resolve it without being lost between people?

## What it is for

Imagine a hypothetical design agency where two account teams have promised the same specialist for the same week. Neither team can change the other’s commitment. They message several managers, each assuming someone else will settle the conflict. Both clients continue expecting delivery.

The missing element is a usable route from a local problem to a wider decision.

Explicit Escalation Paths makes that route known before the next urgent disagreement or failed handoff. It applies across teams, functions, business units, and governing bodies. The issue might require expertise, additional capacity, a decision outside delegated limits, or review of an unresolved objection.

## The core idea

**Specify the trigger, destination, response expectation, and ownership of an escalation, then close the loop with a decision or agreed next action.**

Escalation is a request for something the current arrangement cannot supply. It need not mean going to a more senior person. A specialist, neighboring team, duty role, or cross-unit forum may be the appropriate destination.

It also need not transfer final decision authority. GitLab’s leadership guidance describes bringing in another person as either an adviser or decision-maker when alignment or a serious tradeoff requires help. [GitLab, _Leadership: Effective Escalations_, consulted October 2026](https://handbook.gitlab.com/handbook/leadership/)

Explicit Decision Rights establishes who may decide. This pattern connects people to the right authority or support when the ordinary arrangement reaches its limits. Decide Close to the Work keeps suitable choices local; an escalation path makes that delegation more usable by providing a dependable boundary route.

## How it works

![An issue owner recognizes a trigger and sends context and a specific request to a named receiving role. The receiver acknowledges, confirms responsibility, and supplies help or a decision. No response or an unresolved issue follows an agreed fallback; the outcome returns to affected people for action and review.](../assets/organizational-design/explicit-escalation-paths.svg)

**Define recognizable triggers.** Use conditions such as conflicting commitments, missing authority, uncertainty requiring specialist judgment, material consequences beyond one unit, or an unanswered request approaching its deadline. Distinguish ordinary consultation from urgent escalation. Avoid making someone wait through routine stages when an agreed emergency trigger already applies.

**Name destinations by need.** Identify who can provide the missing expertise, capacity, coordination, or ruling. In the agency example, a delivery lead might allocate shared specialist time; the specialist’s line manager may only clarify availability. A contact who cannot settle the relevant tradeoff is not a complete path.

**Make receiving responsibilities real.** Publish the responsible role, a reachable channel, expected coverage, and an alternate. Assign time and authority to respond. A shared inbox needs somebody accountable for monitoring it. Different issues can require different response times; a scheduled policy forum is unsuitable for a commitment expiring that afternoon unless it has an urgent route.

**Send a decision-ready account.** Explain the issue, current impact, deadline, facts and uncertainties, actions already tried, and the help requested. Identify affected parties and competing recommendations where relevant. For the agency, include both client commitments and the available alternatives, rather than forwarding an argument between account teams.

**Separate acknowledgement from resolution.** Confirm that someone received the request, who coordinates it now, and who retains authority to decide. The original owner keeps agreed responsibilities until a handoff is accepted. Receiving advice does not automatically transfer ownership; accepting coordination does not automatically grant authority over every affected unit.

**Specify fallback and exception routes.** Define what happens if nobody acknowledges, the receiver lacks authority, or the issue remains unresolved. The next step could be a deputy, another specialist, a joint forum, or a higher authority. Include a suitable alternative where the normal recipient is implicated or cannot be approached fairly. Do not confuse wider notification with permission to act beyond existing powers.

**Return the result and learn.** Communicate the decision, reasoning, implementation owners, and review point to affected people. Record any remaining uncertainty and follow-up. Review repeated escalations for unclear boundaries, missing capability, overloaded recipients, or recurring conflicts that need structural correction. Check contact details and coverage when people or roles change.

## Why it works

A known route reduces the need to discover the organization while a problem is worsening. Clear triggers can encourage timely requests, while a specific destination reduces indiscriminate copying of senior managers.

Accepted handoffs make responsibility observable. Fallback rules also distinguish a request awaiting attention from one actively being handled. Closing the loop reconnects the wider decision with the people who must act on it.

These benefits depend on response capacity and credible authority. A beautifully documented path still fails if recipients cannot act, or people are punished for using it. Escalation should expose a limitation in the current arrangement without automatically turning it into personal blame.

## Examples

### Google’s on-call routes in its 2016 SRE book

Google’s published account describes an alerting system that tracks human acknowledgement. If none arrives within a configured interval, its “Escalator” sends the notification to the next configured destination, such as the secondary on-call engineer. [Krabbe, _Tracking Outages_](https://sre.google/sre-book/tracking-outages/)

A related chapter describes access to partner development teams and a formal incident-management protocol for situations involving multiple teams or an uncertain duration. [Spadaccini, _Being On-Call_](https://sre.google/sre-book/being-on-call/)

The arrangement separates two problems: obtaining an accountable response and obtaining the expertise or coordination needed to resolve the issue. Acknowledging an alert does not establish that the underlying outage is solved. The fallback destination can be another operational role rather than a manager.

These are practices documented in a book first published in 2016, not verification of Google’s current tooling. They illustrate routing and coordination mechanisms without establishing that every notification received a timely or effective response.

### NASA’s formal-dissent route, consulted October 2026

NASA’s NPR 7120.5F, with Change 4, specifies a route for formal dissent in space-flight programs and projects. Disagreeing parties jointly document agreed facts, differing positions, impacts, and recommendations when time permits. The issue goes to the next level of involved authority, while the level above that is notified. Urgent cases allow an oral presentation followed by documentation. [NASA, _NPR 7120.5F_, section 3.4](https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_7120_005F_&page_name=Chapter3)

The decision is recorded and returned to the dissenter and notified managers. An unsatisfied dissenter can appeal further, potentially to the Administrator. The requirements also call for discussion without suppression or retribution.

This is an explicit route for contested judgment, rather than unanswered notifications. Joint documentation preserves different views as the issue moves, and the returned decision makes its disposition visible. The requirements establish the formal arrangement; they do not prove consistent implementation or successful resolution in every case.

## Useful when

- **Issues circulate without an accepted owner.** Several people are informed, but nobody is responsible for the next step.
- **Local authority cannot settle a shared commitment.** Capacity, priorities, or constraints cross unit boundaries.
- **People wait too long to ask for help.** They fear blame or cannot recognize when escalation is appropriate.
- **Availability is unreliable.** Travel, absence, or changing shifts leaves requests without a dependable fallback.

## Common mistakes and limits

**Equating escalation with broadcasting.** More recipients do not establish who must respond or what is needed.

**Automatically handing every issue upward.** Use expertise or coordination where that is sufficient, preserving local authority when appropriate.

**Treating acknowledgement as closure.** Track the unresolved decision or work separately from receipt of the request.

**Routing to a name without coverage.** Maintain alternates and explicit handover responsibilities.

**Using escalation to win an argument privately.** Give affected parties appropriate visibility and preserve competing evidence. Legitimate confidential routes need their own safeguards.

Too many escalations can overload scarce decision-makers and undermine delegation. Too few can hide unresolved risk. If the same issue repeatedly travels the route, revise the ownership, resources, or shared rules rather than adding another layer of referral.

## Related patterns

- [[teamwork-clarify-decision-rights|Explicit Decision Rights]] identifies which recipients may advise, allocate resources, or make the required decision.
- [[delegated-domains|Delegated Domains]] defines the limits and dependencies that escalation paths connect across.
- [[consent-decision-making|Consent Decision-Making]] needs an agreed route when a qualifying objection cannot be resolved within the group’s mandate.
