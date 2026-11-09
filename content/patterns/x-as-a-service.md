---
id: 'x-as-a-service'
type: 'pattern'
title: 'X-as-a-Service'
summary: 'Provide a supported capability through a usable interface so other teams can make routine progress without repeated coordination.'
status: 'published'
verses:
  - organizational-design
---

**Core question:** How can one team depend on another’s capability without depending on its availability for every ordinary task?

## What it is for

Imagine a hypothetical retailer whose checkout team needs delivery estimates from fulfillment. Every new use requires a meeting, every test needs someone to prepare data, and every release waits for coordinated schedules. The capability exists, but using it consumes both teams’ attention.

X-as-a-Service changes that relationship. Fulfillment provides a supported way to obtain estimates; checkout can use it within understood limits. Teams still depend on each other’s work, but routine progress requires less personal negotiation.

The pattern applies between teams, across departments, or between organizational units. It is especially useful where a recurring need has become understandable enough to serve through a dependable boundary.

## The core idea

**Make a capability available through a clear, supported interface that consumers can use with minimal ongoing coordination.**

The “X” is whatever another team needs: hosting, a specialist calculation, a software library, or a defined operational service. Here, “as a service” describes an organizational interaction rather than a pricing model or a requirement to buy cloud software.

Team Topologies emphasizes self-service, understandable interfaces, service expectations, and continuing attention to users. An interface alone does not establish the relationship: consumers must actually be able to accomplish ordinary work through it. [Team Topologies, _X-as-a-Service: Effective Self-Service Non-Blocking Dependencies_, 2025](https://teamtopologies.com/news-blogs-newsletters/x-as-a-service)

A Platform Team describes continuing ownership of an internal product. X-as-a-Service describes how a provider and consumer interact; other team types can use it too. Close collaboration may establish or substantially revise the boundary, while service consumption becomes the normal mode once it works.

## How it works

![A consuming team retains its customer outcome and application decisions. A supported interface exposes behavior, limits, and failure information while a provider team owns the capability and its lifecycle. Routine use crosses the interface; feedback, support, and exceptional changes have separate routes.](../assets/organizational-design/x-as-a-service.svg)

**Define a useful offer.** Describe the task consumers can complete, its inputs and outputs, eligibility, and limits. In the retailer illustration, checkout needs a delivery window with a validity period and an explicit unavailable result, rather than access to fulfillment’s internal calculations.

**Assign responsibility on both sides.** The provider owns the capability, supported interface, maintenance, and agreed service behavior. The consumer owns its use and the outcome it delivers. Checkout decides how to present an estimate and what to show when it is unavailable. Neither side can declare the whole customer experience someone else’s problem.

**Make ordinary use independent.** Supply access, examples, documentation, test facilities, and understandable errors. The interface might be an API, a maintained library, or a standardized service process. Automation helps, but the practical test is whether ordinary use avoids repeated clarification or negotiation. Some onboarding or access approval may remain necessary.

**State service expectations.** Agree availability, capacity, response times, compatibility, and support where relevant. Distinguish the service’s operating hours from the hours when staff answer questions. Consumers need enough failure information to diagnose their own responsibilities and choose safe fallback behavior.

**Keep information moving.** Publish changes and known problems. Gather evidence from support requests, task completion, and direct user feedback. Service consumption reduces routine coordination; it still needs a relationship through which the provider learns about unmet needs.

**Handle exceptions deliberately.** Provide routes for incidents, unsupported requirements, and improvements. A provider should not silently accept unlimited bespoke work. A genuinely new need may justify temporary collaboration, a separately supported option, or a different boundary.

**Manage the lifecycle.** Fund maintenance and support beyond initial delivery. Give consumers notice, migration guidance, and an accountable route through breaking changes or retirement. A dependable service boundary is an ongoing responsibility.

## Why it works

The interface carries knowledge that would otherwise need repeated conversations. Consumers learn the behavior they need without mastering every implementation detail. Providers can improve the internals while preserving the supported promise.

This also changes how work waits. A consumer can complete a supported task without finding a particular person or entering another team’s planning cycle. One maintained capability can serve several consumers, spreading the cost of specialist work.

These benefits depend on fit and reliability. A confusing interface relocates effort into troubleshooting. A fragile shared service concentrates disruption. The useful measure is consumers’ ability to complete their work, including recovery from failure, rather than the number of interfaces published.

## Examples

### Trade Me’s service relationships after its 2019 reorganization

In a firsthand retrospective, Catherine Matheson and Amir Mohtasebi describe Trade Me’s structure introduced in 2019: squads aligned to value streams owned and evolved their applications. Most inter-squad interactions used X-as-a-Service, with one squad providing a service to others. Work spanning value streams sometimes prompted temporary collaboration. [Matheson and Mohtasebi, _Trade Me’s Journey Towards a Thinnest Viable Platform_](https://teamtopologies.com/industry-examples/trade-me-journey-towards-a-thinnest-viable-platform)

Their account also describes a move toward a hybrid microservices and monolithic architecture beginning in 2022. More operational responsibility moved to delivery teams, increasing the specialist detail they needed to handle. A dedicated platform team subsequently maintained common capabilities, including automatically supplied monitoring.

The arrangement shows service relationships operating both between delivery squads and around shared platform capabilities. Teams could usually work independently while retaining collaboration for unfamiliar shared work. The authors describe their own experience; this is a dated organizational account, not independent proof of causation or a claim about Trade Me’s current structure.

### British Columbia’s published hosting responsibilities in 2026

British Columbia’s private-cloud onboarding guidance, updated in March 2026, describes product teams using an OpenShift platform supported by Platform Services and Platform Operations. An initial meeting and training establish access and responsibilities; after provisioning, product administrators can manage access to their namespaces. [Province of British Columbia, _Onboard Your Team to Private Cloud Hosting_](https://digital.gov.bc.ca/technology/cloud/private/onboard/)

Product teams retain responsibility for building, deploying, monitoring, and maintaining their applications. Platform responsibilities include infrastructure, OpenShift maintenance, platform monitoring, and supporting tools. The guidance distinguishes ordinary support hours from after-hours help for platform incidents; it does not promise after-hours application support. It also specifies change communications and a route for negotiating custom requirements.

This illustrates the organizational agreement behind service consumption. Using a shared platform does not transfer application ownership, and initial human onboarding can coexist with more independent routine use. This is an interpretation of the published arrangement, not evidence of formal Team Topologies adoption or measured delivery gains.

## Useful when

- **The same requests recur.** Teams repeatedly ask for access, routine operations, or explanations that a supported interface could address.
- **Consumers need results without specialist internals.** Understanding the entire provider domain distracts from their own responsibilities.
- **Coordinated schedules block ordinary work.** A usable boundary could let teams deliver supported changes independently.
- **The offer can be sustained.** Recurring demand warrants maintenance, support, and explicit ownership.

## Common mistakes and limits

**Publishing an API and declaring success.** Missing examples, test data, access, or error explanations can preserve the dependency on personal help.

**Relabeling a queue.** If every routine use needs bespoke negotiation and scheduling, the interaction has not become independently consumable.

**Withdrawing from users.** Low coordination does not mean ignoring feedback, incidents, or changing needs. Support demand is evidence for improving the offer.

**Freezing an unsuitable boundary.** A service interface can slow changes that need joint discovery. Temporarily collaborate rather than endlessly extending an awkward contract.

**Hiding concentrated risk.** Shared outages, incompatible upgrades, and retirement can affect many consumers. Recovery and migration need owners and capacity.

Where work remains inseparable or requirements change together constantly, lasting team redesign may fit better. Occasional needs may not justify a continuing service at all.

## Related patterns

- [[platform-team|Platform Team]] owns an internal product; X-as-a-Service is one way other teams consume its capabilities.
- [[time-limited-collaboration|Time-Limited Collaboration]] helps discover or revise an uncertain boundary before returning to lower-coordination use.
- [[complicated-subsystem-team|Complicated-Subsystem Team]] maintains specialist internals that consumers can access through a supported interface without acquiring the same depth.
