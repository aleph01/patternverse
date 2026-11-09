---
id: 'shared-services'
type: 'pattern'
title: 'Shared Services'
summary: 'Pool recurring services across organizational units, with clear service ownership and commitments to the units they serve.'
status: 'published'
verses:
  - organizational-design
---

**Core question:** How can several organizational units share recurring services without losing dependable support for their own work?

## What it is for

Imagine a hypothetical manufacturer with three divisions. Each maintains a small team processing supplier invoices. They use different forms, struggle to cover absences, and repeatedly solve similar problems. Combining the work looks sensible, but division managers worry that a remote queue will replace people who understand their business.

Shared Services addresses both concerns. It pools selected capabilities in a provider serving several units, with explicit commitments about what customers receive and what they must contribute. It applies across divisions, regions, agencies, or member organizations that need similar support while retaining distinct operating responsibilities.

## The core idea

**Give a shared provider responsibility for delivering defined services to multiple organizational units, and make that provider accountable for service quality as well as cost.**

The provider owns service delivery; the receiving units retain defined business decisions. Moving staff into one department is insufficient. Users need a recognizable service, a way to request it, agreed expectations, and influence over improvements.

A functional department groups specialists by discipline. Shared Services adds a delivery relationship with identifiable internal customers. A divisional organization gives units responsibility for business results; shared services can support those units without duplicating every capability inside each division. Outsourcing is a separate choice about who supplies the work: a shared provider can operate internally or involve external suppliers.

## How it works

![Three divisions retain business decisions and send approved requests to one shared service provider. A service agreement defines scope, inputs, timing, and priorities; the provider returns completed work and reports quality, delays, and costs for joint review.](../assets/organizational-design/shared-services.svg)

**Define the service boundary.** Name what is included, what remains local, and who owns the complete process. In the manufacturer illustration, divisions authorize purchases and confirm delivery. The shared team processes approved invoices and handles payment administration. An unclear purchase approval returns to the responsible division rather than becoming an informal decision by service staff.

**Assign ownership on both sides.** A service owner manages staffing, delivery methods, quality, and improvement. Each receiving unit names someone responsible for its inputs and service needs. A process owner may coordinate changes spanning both sides, without taking over every business decision.

**Agree the operating commitments.** Describe required inputs, expected completion times, quality measures, opening hours, and routes for urgent cases. Make capacity and priority rules visible. An agreement that promises every unit immediate service cannot resolve competing deadlines.

**Make requests and performance visible.** Use a common entry point and track work through completion. Review errors, waiting time, user effort, and outcomes alongside cost. Units need enough information to distinguish a provider backlog from missing approvals on their own side.

**Set funding and change rules.** A central budget, agreed contributions, or charges tied to use can fund the provider. Each creates different incentives; none substitutes for capacity planning. Representatives of the receiving units should help review priorities and proposed changes.

**Provide an exception route.** Define who can approve variations, resolve priority conflicts, and authorize extra capacity. Repeated exceptions should trigger service redesign or a deliberate local arrangement. Otherwise, unofficial workarounds quietly become the real service model.

## Why it works

Pooling similar work can support specialist expertise, more reliable cover, common tools, and improvements that benefit several units at once. A recurring problem is investigated once instead of separately in every division.

Explicit service relationships also expose dependencies. The provider can plan against known demand, while units can challenge poor delivery using agreed expectations. Common processes make comparisons easier and reduce avoidable variation.

These advantages depend on enough similarity and volume to justify the overhead. They also depend on cooperation: standardizing the provider’s work achieves little if every receiving unit supplies incompatible inputs. Benefits must exceed the added handoffs, management effort, and cost of moving to the new arrangement.

## Examples

### Siemens: a service organization alongside operating businesses

Siemens’ corporate description, consulted in October 2026, places Global Business Services alongside its operating businesses and states that GBS serves Siemens units and external customers. Its service portfolio includes finance and procurement, human resources, and other business services. [Siemens, _Businesses and services_](https://www.siemens.com/en-us/company/about/businesses/) and [Global Business Services](https://www.siemens.com/en-us/company/about/businesses/global-business-services/)

A concrete view of responsibility appears in Siemens’ August 2026 recruitment description for an application governance and service manager within GBS. The role owns an application portfolio’s lifecycle, connects business stakeholders with providers and technical teams, and leads service reviews using performance measures. This describes an intended role, rather than independently verified performance. [Siemens, _IT Application Governance & Service Manager_, 12 August 2026](https://jobs.siemens.com/de_DE/externaljobs/JobDetail/517831)

The pattern illustrated is a distinct delivery organization supporting multiple businesses, with named ownership and review of services. Serving external customers extends beyond the internal arrangement discussed here. These sources establish service scope and responsibilities; they do not establish a measured saving caused by shared services.

### UK government: shared delivery requires common authority

The UK government’s Global HR Design guidance, published as its 2024 principles, describes five shared-service clusters. Departments within each cluster work toward common operating models and shared systems for transactional HR, finance, and commercial work. This is a transformation arrangement, not evidence that every department had completed migration. [Cabinet Office, _Global HR Design Principles 2024_](https://www.gov.uk/government/publications/global-hr-design/global-hr-design-principles-2024-html)

The National Audit Office’s March 2026 review reported progress in planning, procurement, and governance, but identified important gaps. There was no single central owner with a clear mandate to secure departmental onboarding, while inconsistent system configurations and data convergence threatened interoperability. [National Audit Office, _Update on government shared services_, 6 March 2026](https://www.nao.org.uk/reports/update-on-government-shared-services-2026/)

The consequence is instructive: grouping customers and buying shared technology leaves consequential decisions about standards and participation to be settled. In this case, the auditor identified those unresolved dependencies as delivery risks. The example supports the need for workable authority across service boundaries; it does not demonstrate that the intended benefits had been achieved.

## Useful when

- **Several units repeat substantially similar work.** Separate teams maintain comparable processes, tools, or specialist skills.
- **Small local teams struggle with coverage.** Demand varies, expertise is scarce, or absences interrupt routine support.
- **Inconsistent execution causes avoidable friction.** Units need comparable information, dependable processing, or common service standards.
- **Units can agree their contributions.** They can supply consistent inputs, accept priority rules, and participate in service review.

## Common mistakes and limits

**Measuring only the provider’s savings.** A cheaper center may shift data entry, corrections, and chasing work onto its customers. Assess total effort and the result users receive.

**Standardizing away necessary differences.** Distinguish avoidable variation from requirements tied to a unit’s work. Some services need local specialists or explicitly supported variants.

**Creating an unresponsive monopoly.** Mandatory use without feedback or escalation can leave units dependent on a provider they cannot influence. Give service reviews authority to change priorities and address failures.

**Moving fragmented processes unchanged.** Consolidation preserves confusion when approvals, data, and ownership remain inconsistent. Transition also consumes capacity: training, migration, and temporary parallel operation need resources.

**Concentrating failure.** A common service can interrupt many units at once. Cover, recovery arrangements, and clear incident communication become part of the provider’s responsibility.

Embedding support locally may fit better when work is highly distinctive, closely entwined with daily decisions, or too small to justify a separate service relationship.

## Related patterns

- [[divisional-organization|Divisional Organization]] gives units responsibility for business outcomes; shared services supplies selected capabilities across those boundaries.
- [[teamwork-clarify-decision-rights|Clarify Decision Rights]] distinguishes provider choices, customer decisions, and issues requiring joint resolution.
- [[teamwork-optimize-the-whole|Optimize the Whole]] helps prevent a service center’s local targets from increasing delays or effort elsewhere.
