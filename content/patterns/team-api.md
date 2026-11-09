---
id: 'team-api'
type: 'pattern'
title: 'Team API'
summary: 'Make a team’s responsibilities, offerings, and interaction expectations explicit and easy for other teams to use.'
status: 'published'
verses:
  - organizational-design
---

**Core question:** How can other teams know what we own, what we offer, and how to work with us?

## What it is for

Imagine a hypothetical university media team. One department asks it to film a conference, another needs editing, and a third wants advice on recording lectures. Requests arrive through personal messages, corridor conversations, and the team’s manager. Colleagues cannot tell which services are available, what information to supply, or whether a reply means the work has been accepted.

The team spends time explaining its boundaries while requesters depend on knowing the right person.

A Team API makes that working interface discoverable. It applies wherever a team repeatedly interacts with other teams, departments, or partners. The name borrows from software interfaces; the result can be a maintained page explaining how to work with people. Software endpoints are only one possible part of what a team offers.

## The core idea

**Publish and maintain a clear interface describing what the team owns, what it offers, and how others can work with it.**

The Team Topologies authors describe a Team API as a specification of how to interact with a team. Their template covers purpose, ownership, service expectations, current work, communication channels, and present or anticipated relationships with other teams. [The authors’ Team API template](https://github.com/TeamTopologies/Team-API-template)

A useful Team API connects those descriptions to real routes and expectations. It helps someone decide whether this is the appropriate team, what kind of interaction fits, and what happens next.

It differs from an internal team charter by addressing the people who need to work across its boundary. It also describes more than a service catalog. A team might provide a routine service, collaborate temporarily on a new problem, or help another team learn a capability. Each relationship can need a different arrangement.

## How it works

**Make ownership understandable.** Describe the team’s purpose, responsibilities, and significant boundaries in terms outsiders recognize. Include adjacent owners where a frequent ambiguity exists. The university team might own shared recording facilities and editing support while departments retain responsibility for course content and permission to publish it.

**Describe usable offerings.** State what people can obtain or accomplish, who can use it, and the relevant limits. Separate established services from experiments or possible future work. An offer of recording advice differs from a promise to supply a camera operator for every event. Link detailed instructions instead of reproducing them all in the overview.

**Provide clear ways to engage.** Identify routes for routine requests, questions, proposed joint work, and urgent problems. Explain the information each needs: desired outcome, relevant context, timing, and constraints. Give people a way to ask for help when they cannot classify their need. The interface should reduce searching without making form completion a barrier to conversation.

**Set credible expectations.** Explain how requests are reviewed, how priorities are decided, and how acceptance is communicated. Distinguish acknowledgment, assessment, scheduling, and completion. A first reply within two working days says nothing by itself about when filming can happen. Publish availability and response expectations only when the team can support them.

**Describe important team relationships.** Record which teams interact, why, and how. Routine use of a stable capability may require little coordination; discovering a new offering may need close collaboration. Learning support may be temporary. Include a review point for relationships likely to change rather than presenting every arrangement as permanent.

**Keep authority and exceptions explicit.** Identify who can accept commitments, change priorities, or resolve disputed ownership. A published page cannot grant powers the team does not hold. Provide routes for incidents, unusual requests, and conflicts that exceed the ordinary process. Explain how an exception affects existing work instead of letting private promises silently override the queue.

**Maintain and test the interface.** Name an editor and involve the people delivering the work and using it. Review changes to scope, capacity, contacts, and relationships. Ask a neighboring team whether it can identify the right route and understand the next step. Recurring questions are evidence that the description, the operating arrangement, or both need attention.

## Why it works

Working with another team otherwise requires reconstructing information from conversations, scattered pages, and past experience. A maintained interface makes that knowledge available before someone submits a request or promises a delivery date elsewhere.

It also makes differences discussable. A requester expecting immediate delivery can see that the team offers an assessment first. The team can expose capacity limits and prioritization rules instead of resolving every demand through personal negotiation.

The intended benefit is less avoidable clarification and more predictable interaction. This depends on the description matching actual behavior. A clear page attached to an unreliable process merely makes the mismatch easier to see; the team must still address it.

## Examples

### GitLab’s Data Team — published request and response arrangements, consulted October 2026

GitLab’s Data Team handbook describes a central shared service with finite capacity. It provides different request templates, including general support and larger project proposals, and routes new requests through team triage. It states a first-response objective of two business days for new issues. Expedited requests have a separate route through the shared data channel, with a reason and a link to the request. [GitLab’s Data Team working arrangements](https://handbook.gitlab.com/handbook/enterprise-data/how-we-work/)

These details expose the distinction between requesting work, receiving an initial response, and obtaining priority. A colleague can identify an entry route and an exception path without finding a particular engineer. Viewed as a Team API, the handbook makes interaction expectations available across the organizational boundary. That is an interpretation of the published arrangement, rather than a claim that GitLab labels this page a Team API or consistently meets every objective.

### Alfa — choosing the right boundary for Team Interaction Practices, April 2025

In a 29 April 2025 engineering retrospective, Grahame Williams described Alfa’s adoption of Team APIs under the name Team Interaction Practices. The intended documents identified current and upcoming partner teams and communication channels. Individual documents made sense for platform teams, but Alfa found them less relevant for stream-aligned teams in its other product areas. It therefore moved toward descriptions at product-area level. [Alfa’s firsthand account](https://medium.com/engineering-at-alfa/breaking-down-the-big-rock-enabling-enterprise-software-flow-fffaa0c1e44c)

Williams reported that some product areas appeared to function well without published descriptions, and suggested that existing conversations or a sufficiently simple structure might explain this. The example shows a practical limit: the useful interface may sit around a product area rather than every team. This is the author’s dated assessment, not proof that documentation is unnecessary in other settings.

## Useful when

- Colleagues need personal introductions to discover ownership or request help.
- Different channels produce conflicting promises or invisible work.
- Teams confuse a response with acceptance or a service offer with unlimited capacity.
- Relationships are changing and neighboring teams need to understand the new responsibilities and interaction modes.

## Common mistakes and limits

**Publishing aspirations as operating promises.** Describe what is supported now and identify proposals as proposals.

**Using the interface to refuse conversation.** Documentation should help people engage. Unfamiliar or ambiguous needs require an accessible human route.

**Turning the page into a complete manual.** Keep the overview readable and connect it to maintained details.

**Defining commitments unilaterally.** Involve affected teams and the authorities responsible for capacity and priorities. A team cannot settle contested ownership by editing its description.

**Requiring a document for every box on the chart.** Simple relationships may already be clear. Choose a boundary and level of detail that justify the upkeep.

Severe overload, incompatible priorities, and unstable ownership need organizational decisions. A Team API can reveal those conditions and explain how to raise them, but cannot resolve them through clearer wording alone.

## Related patterns

- [[x-as-a-service|X-as-a-Service]] describes routine consumption of a supported capability. A Team API can explain that relationship alongside other interaction modes.
- [[time-limited-collaboration|Time-Limited Collaboration]] provides close joint work for discovery. A Team API can record its purpose, partners, and review point.
- [[teamwork-clarify-decision-rights|Explicit Decision Rights]] establishes who may commit resources, set priorities, or settle boundaries; the Team API makes the relevant routes visible to others.
