---
id: 'integrator-roles'
type: 'pattern'
title: 'Integrator Roles'
summary: 'Assign a role to reconcile dependencies and tradeoffs across units so their separate contributions form a coherent shared result.'
status: 'published'
verses:
  - organizational-design
---

**Core question:** Who keeps the whole result coherent when its parts belong to different units?

## What it is for

Imagine a hypothetical furniture maker launching an office range. Design changes a tabletop’s dimensions, production revises packaging, and sales promises installation at the old delivery price. Each department can justify its choices, but the combined offer no longer fits the original cost and service commitments.

Another progress report may reveal that every department is busy without revealing whether the pieces still fit.

Integrator Roles gives someone explicit responsibility for that fit. The pattern applies across functions, business units, projects, regions, or partner organizations whose contributions must form one product, service, or operating result. The assignment can be continuing or limited to a particular undertaking.

## The core idea

**Assign a role to reconcile cross-unit dependencies and tradeoffs, with a clear mandate for the shared result and a route to settle conflicts.**

The integrator maintains a view that no contributing unit owns alone: what the combined result requires, where commitments conflict, and which changes affect several parts. Specialists retain responsibility for their contributions.

The role might be called a program lead, service owner, chief engineer, or incident commander. The title alone proves little. What matters is the actual mandate, access to information, relationships with contributing units, and ability to obtain decisions.

This differs from Vertical Integration, which changes ownership of value-chain activities. It also need not create a Matrix Organization: a coordination role does not automatically become a second line manager. Some integrators have delegated decision powers; others prepare and negotiate choices that designated authorities must settle.

## How it works

![Specialist units retain delivery responsibilities and work directly with one another. An integrator connects their commitments through a shared view of dependencies and tradeoffs. A named authority resolves matters beyond the role's mandate, and resulting commitments return to the units.](../assets/organizational-design/integrator-roles.svg)

**Define the result and boundary.** Identify the product, service, customer journey, or undertaking needing integration. State what the role must keep coherent and what remains elsewhere. The furniture launch needs compatible product specifications, packaging, costs, and delivery promises. Responsibility for that combination differs from supervising every designer or factory employee.

**Give the role a usable mandate.** Specify rights to obtain information, convene affected people, challenge incompatible proposals, and maintain the common plan. Define which tradeoffs the integrator may decide and which require agreement or escalation. Unit leaders need to recognize these powers. A sponsor’s support matters when an integrator must challenge a locally attractive commitment.

**Establish real unit commitments.** Name counterparts who understand each unit’s work and can negotiate within their authority. Confirm deliverables, capacity, dates, and acceptance conditions together. A date appearing in the integrator’s plan does not reserve a factory slot or delivery crew. Unresolved commitments should remain visible as unresolved.

**Maintain a shared picture.** Connect requirements, dependencies, decisions, risks, and changes in a form contributors can inspect. Focus attention on interfaces and consequences. A larger tabletop may change packaging, transport, installation effort, and the advertised offer. The integrator helps the relevant owners assess these effects before one change becomes several incompatible promises.

**Bring tradeoffs to the right people.** Convene the units affected, expose alternatives and consequences, and obtain a decision at the appropriate level. Record who accepted the compromise and what each unit will do. Where the mandate ends, escalate a clear question to the named authority rather than issuing instructions nobody is obliged to follow.

**Keep direct collaboration alive.** Designers and production specialists should solve ordinary interface questions together. The integrator supports those connections and intervenes where the wider result needs attention. Requiring every message to pass through one person creates a bottleneck and deprives specialists of context.

**Review fit and transfer knowledge.** Examine whether the combined result works, not merely whether individual milestones are green. Check changes, end-to-end tests, unmet commitments, and recurring disputes. Provide deputies, shared records, and explicit handovers. Adjust or retire the role when its scope changes or a simpler structure can sustain the required coordination.

## Why it works

Separate units can have different information, planning horizons, and success measures. A design improvement may create a delivery problem that neither unit can evaluate fully by looking only at its own work.

A recognized integrator gives these interactions continuing attention and provides a route from incompatible contributions to an explicit tradeoff. Shared information and credible commitments can reveal mismatches while there is still time to change them.

The benefits depend on expertise, trust, accessible information, and enough organizational backing to secure action. Coordination consumes capacity. An integrator cannot compensate indefinitely for contradictory incentives, unavailable resources, or boundaries that divide tightly coupled work in unworkable ways.

## Examples

### Toyota’s chief-engineer responsibilities in its 2012 announcement

Toyota’s April 2012 account placed development responsibility for product groups with chief engineers while reinforcing specialist teams responsible for bodies, chassis, powertrains, testing, and other technologies. It described moving chief engineers under product-planning general managers and giving them precedence in design reviews. [Toyota, _New Framework for Making Ever-Better Cars_, April 2012](https://global.toyota/en/detail/156949)

The arrangement connected responsibility for the product with continuing specialist development. A chief engineer’s view of customer needs and the vehicle had a recognized place alongside the technical teams’ responsibilities. Integration was supported by organizational placement and review authority, rather than an expectation that departments would spontaneously reconcile every choice.

This is a historical company announcement. Its claims about faster decisions and better products are not independent causal findings, and it does not establish the precise allocation of every technical or staffing decision. The integrator interpretation here concerns the described product-spanning role, not a claim that Toyota’s current structure is identical.

### Google’s incident-command roles in its 2016 SRE book

Google’s published incident-management account separates command, operational work, communication, and planning. The incident commander maintains the overall state, assigns responsibilities, and removes roadblocks, while the operations team handles system changes. Communication and planning roles address stakeholder updates and longer-term coordination. [Google, _Managing Incidents_](https://sre.google/sre-book/managing-incidents/)

The chapter also calls for a living incident document and an explicit, acknowledged transfer of command when responsibility changes. These arrangements preserve a shared view across responders and shifts without requiring the commander to perform every technical task.

This illustrates an integrator assignment created for a bounded situation. Its authority includes directing the response, which is stronger than merely convening a discussion. The account belongs to a book first published in 2016; it is not verification of Google’s current practice. The chapter’s worked incident story is illustrative and is not treated here as a measured real-world outcome.

## Useful when

- **Every unit finishes its part, yet the whole disappoints.** Requirements, handoffs, or customer commitments no longer match.
- **Tradeoffs cross recurring boundaries.** No unit can fairly settle the consequences alone.
- **Coordination depends on informal favors.** A sustained shared result needs recognized attention and backing.
- **Several specialties must remain distinct.** Reorganizing everyone into one department would sacrifice useful capability or flexibility.

## Common mistakes and limits

**Creating responsibility without leverage.** Information access, recognized counterparts, sponsor support, and decision routes must accompany the title.

**Adding a hidden line manager.** State the integrator’s powers so coordination does not produce conflicting instructions or unacknowledged reporting lines.

**Making the integrator everyone’s messenger.** Keep direct working relationships and shared records; use the role for consequential dependencies and tradeoffs.

**Relying on personal heroics.** Bound the workload and provide continuity. Relationships that exist only in one person’s memory are fragile.

**Measuring meetings instead of coherence.** Examine whether shared commitments hold and the combined result works.

A small group with stable interfaces may coordinate adequately without a dedicated role. At the other extreme, repeated mediation of nearly every task may indicate that team boundaries or incentives need redesign. Adding more integrators can also create overlapping mandates that require their own resolution.

## Related patterns

- [[shared-outcomes|Shared Outcomes]] gives the integrator and contributing units a result against which to judge local tradeoffs.
- [[teamwork-coordinate-dependencies-early|Coordinate Dependencies Early]] supplies the working agreements an integrator maintains across contributions.
- [[teamwork-clarify-decision-rights|Explicit Decision Rights]] distinguishes coordination, recommendation, approval, and final authority around the role.
