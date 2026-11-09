---
id: 'dependency-mapping'
type: 'pattern'
title: 'Dependency Mapping'
summary: 'Make cross-unit dependencies explicit so people can see prerequisites, shared constraints, and the consequences of change.'
status: 'published'
verses:
  - organizational-design
---

**Core question:** What does each unit depend on, and where could one change disrupt the wider work?

## What it is for

Imagine a hypothetical housing association preparing a new repairs service. The operations team is testing scheduling, the service desk is preparing call routing, and procurement is finalizing the contractor list. Each reports progress against its own plan.

Both operations and the service desk need the approved list. A procurement delay therefore affects two apparently separate workstreams and the pilot they must support together. Individual progress reports do not make that relationship obvious.

Dependency Mapping creates a shared account of such relationships across teams, functions, programs, suppliers, or partner organizations. It helps people examine work as a connected arrangement, including connections that cross reporting lines.

The aim is to understand where progress or continued operation relies on another contribution, then use that understanding to make choices.

## The core idea

**Represent what depends on what, with enough information about ownership and uncertainty to trace the consequences across unit boundaries.**

A dependency exists when work or a capability relies on something else: an input, decision, service, specialist capacity, or completed activity. The map makes those relationships explicit rather than leaving them scattered across local plans.

It can show sequencing, such as approval before a pilot, or continuing reliance, such as several services depending on one support function. Label these meanings rather than mixing them into unexplained arrows.

An organization chart shows reporting relationships. A dependency map shows reliance. A task list shows activities; the map shows how they connect. Coordinating an individual handoff remains necessary, but mapping reveals chains, shared prerequisites, and wider exposure that one handoff conversation may miss.

## How it works

![An approved contractor list from procurement enables both repair-scheduling tests and service-desk call routing. Both contributions feed pilot readiness. Arrows run from prerequisite to dependent work; the procurement request remains unconfirmed rather than appearing as an agreed commitment.](../assets/organizational-design/dependency-mapping.svg)

**Bound the question.** Choose an outcome, service, or change whose dependencies need attention. Set the level of detail accordingly. A repairs pilot needs a different map from an organization-wide review of critical services. Expand the boundary when a consequential dependency leads outside the initial scope.

**Choose meaningful elements and connections.** Represent contributions or capabilities people can recognize, with their responsible units. Use a clear arrow convention, such as prerequisite to dependent work, and label what crosses the connection. “Procurement supports operations” is less useful than “approved contractor list enables scheduling tests.”

**Check both ends.** Involve people who understand the supplying and receiving work. Establish what is needed, what makes it usable, and whether the relationship is necessary or merely assumed. Mark uncertain or disputed connections. Atlassian’s published Dependency Mapping play similarly identifies affected systems, owners, impacts, risks, and continuing feedback. [Atlassian’s Dependency Mapping guidance](https://www.atlassian.com/team-playbook/plays/dependency-mapping)

**Attach actionable information.** Record contacts, needed timing, current forecasts, agreement status, and the consequence of failure where relevant. Keep detailed records behind a readable overview. Distinguish a requested contribution from a confirmed commitment; drawing a line does not reserve another unit’s capacity.

**Inspect the network.** Trace upstream prerequisites and downstream effects. Look for several activities waiting on the same input, chains spanning many units, and circular arrangements where each party waits for the other. Check shared resources separately: two activities may have no direct handoff yet compete for the same specialist.

**Connect findings to authority.** Unit owners confirm their own commitments. A map steward maintains the representation and brings unresolved connections to attention. Decisions about competing priorities, funding, or scope belong to the designated authorities. The steward cannot settle them merely by changing the picture.

**Review changes and exceptions.** Revisit affected connections when scope, timing, ownership, or availability changes. Decide whether to resequence, reduce scope, find another supply route, or remove a dependency. Keep an escalation route for unresolved issues and appropriate access controls for sensitive information. Retire obsolete connections as the work changes.

## Why it works

Separate units can report accurately while leaving the combined result poorly understood. Mapping shifts attention to relationships: what one unit’s progress enables elsewhere and which assumptions several plans share.

Tracing a change through connected work can expose consequences before they become local surprises. A common prerequisite may deserve attention earlier than an isolated activity, even when both appear equally incomplete in a status report. Repeated dependencies can also reveal where organizational boundaries create avoidable coordination work.

These benefits depend on the map reflecting real work and informing decisions. A diagram alone establishes neither capacity nor delivery confidence. Critical-path claims require credible sequencing and duration information; a general dependency map does not supply those automatically.

## Examples

### Crossrail — connecting staged railway completion, 2019–2022

The National Audit Office’s May 2019 investigation found that Crossrail’s handover schedule lacked a sufficiently detailed, integrated account of remaining work, sequencing, and dependencies across contracts. Its absence left a gap in the information available to manage completion risks. [NAO’s _Completing Crossrail_, paragraphs 2.24–2.27](https://www.nao.org.uk/wp-content/uploads/2019/05/Completing-Crossrail.pdf)

In a September 2022 account, delivery participant WSP described developing a migration plan showing the logic needed to reach milestones on one page. It connected dependencies around signalling, rolling stock, station readiness, and staged capability, giving technical and non-technical stakeholders a common view of the route toward completion. [WSP’s account of Crossrail systems integration](https://www.wsp.com/en-au/insights/how-systems-integration-made-crossrail-a-reality)

The mapping contribution was to connect separately managed elements around achievable operating stages. WSP’s favorable account describes its own work; it does not establish that mapping alone caused the railway’s eventual opening.

### UK Space Agency and Policy Lab — mapping service reliance, 2018

A July 2018 Government Office for Science blog described Policy Lab working with the UK Space Agency on an interactive map of dependencies between critical national infrastructure and space services. The work drew on a review of global navigation satellite systems and systems-thinking techniques. UKSA used the map to engage stakeholders and explain the importance of space services. [The government’s account of the collaboration](https://foresightprojects.blog.gov.uk/2018/07/12/working-together-to-design-future-facing-policy/)

Here the map concerned continuing reliance across services and institutions, rather than a sequence of project tasks. It gave stakeholders a way to examine connections beyond their immediate organizational responsibilities. The account reports improved stakeholder understanding; it does not demonstrate that infrastructure resilience increased or establish how the map is maintained today.

## Useful when

- Units report progress independently, yet the shared result repeatedly stalls between them.
- A proposed change may affect teams, services, or partners its owner cannot identify confidently.
- Several initiatives draw on the same specialist, supplier, approval, or underlying service.
- Leaders need to decide whether to coordinate a recurring dependency or redesign work to reduce it.

## Common mistakes and limits

**Drawing unexplained lines.** Distinguish prerequisites, continuing service reliance, and competition for capacity. They call for different responses.

**Treating the map as a promise.** Confirm commitments with authorized people. Preserve unknowns and disagreements instead of making the diagram look settled.

**Mapping everything equally.** Excess detail can hide consequential connections. Use a readable overview with deeper views where needed.

**Mistaking connections for root causes.** A delay may reflect resources, incentives, or policy constraints that the map alone cannot explain.

**Creating a reporting burden without decisions.** Maintaining a map consumes time. Use it to investigate changes and resolve choices, rather than demanding constant updates for their own sake.

Highly uncertain work may need provisional relationships and frequent revision. Tight deadlines, incompatible priorities, or an unresponsive supplier require action beyond representing the dependency more clearly.

## Related patterns

- [[teamwork-coordinate-dependencies-early|Coordinate Dependencies Early]] turns particular dependencies into usable handoff agreements; mapping exposes the wider network around those agreements.
- [[boundary-objects|Boundary Objects]] explains how a shared representation can support different groups’ work. A dependency map can serve that purpose when those groups actively use it.
- [[integrator-roles|Integrator Roles]] assigns responsibility for the combined result. An integrator can use the map to investigate tradeoffs and obtain decisions across separately owned contributions.
