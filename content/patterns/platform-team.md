---
id: 'platform-team'
type: 'pattern'
title: 'Platform Team'
summary: 'Own shared capabilities as an internal product that helps other teams deliver with less complexity and coordination.'
status: 'published'
verses:
  - organizational-design
---

**Core question:** How can teams use shared capabilities without repeatedly building them themselves or waiting for a central group to do the work?

## What it is for

Imagine a hypothetical retailer with teams responsible for checkout, its catalog, and customer accounts. Each team maintains deployment scripts, monitoring, and environment setup. They solve similar problems differently and spend time understanding infrastructure instead of improving their services.

Moving all that work to a central queue might remove duplication while making every release depend on another team’s availability.

A Platform Team offers a different arrangement: shared capabilities that consuming teams can use through clear interfaces, supported by people who own their usefulness and reliability. The pattern applies across several delivery teams, particularly where recurring technical needs distract from their business responsibilities.

## The core idea

**Give a team continuing ownership of shared capabilities as an internal product, judged by how well other teams can deliver with them.**

The users are other teams. Their experience includes finding the right capability, understanding it, getting started, operating it, and obtaining help. Software, documentation, support, and the interface all belong to the offering.

Team Topologies defines the platform in terms of an internal product that accelerates stream-aligned delivery. Its guidance recommends starting with the smallest useful combination of tools, services, and documentation, rather than assuming a large custom system is necessary. [Team Topologies, _Key Concepts_](https://teamtopologies.com/key-concepts/) and [_Organization Dynamics with Team Topologies_, July 2020, page 15](https://teamtopologies.com/s/Organization-Dynamics-with-Team-Topologies-Mini-book-MB80.pdf)

Infrastructure responsibility alone does not establish this relationship. A platform needs recognizable consumers and a useful service boundary. An enabling team primarily helps others acquire capabilities; a platform team maintains something they can continue to consume. A larger platform can involve several teams with distinct responsibilities.

## How it works

![Three delivery teams retain responsibility for their customer services while consuming a shared deployment capability through a self-service interface. A platform team owns the internal product, including documentation, reliability, support, and improvement based on consumer feedback.](../assets/organizational-design/platform-team.svg)

**Start with a recurring user problem.** Observe teams trying to complete a concrete task. In the retailer illustration, releasing a service might require repeated setup and troubleshooting. Establish whether the difficulty is common enough to justify shared investment and which parts actually cause delay.

**Choose the smallest useful offering.** It might combine an existing hosted service, a supported configuration, documentation, and modest automation. Build custom components where they improve the consuming experience, rather than because central ownership makes them possible.

**Define ownership on both sides.** The platform team owns its supported capability, interfaces, reliability, upgrades, and support. Delivery teams retain responsibility for their applications and customer outcomes. Clarify incidents crossing that boundary: a broken deployment service and a defective application release require different owners who may need to cooperate.

**Make routine use independent.** Provide discoverable interfaces, clear instructions, examples, and understandable failure messages. Self-service should let users complete ordinary tasks without waiting for a platform engineer. Pair with early consumers to learn what works, then improve the offering instead of turning every integration into permanent joint work.

**Run it as a continuing product.** Give someone responsibility for priorities and the user experience. Balance new capabilities against maintenance and reliability. Publish supported versions, service expectations, planned changes, and migration routes. Coordinate suppliers and underlying services without exposing every detail to every consumer.

**Provide support and an exception route.** Teams need somewhere to report problems, request improvements, and explain needs outside the supported path. Distinguish common requirements from genuinely local ones. Agree who authorizes exceptions and who supports the resulting arrangement.

**Measure the consuming experience.** Examine task completion, time spent waiting, reliability, support demand, and repeated work removed. Adoption can help reveal usefulness, but mandatory adoption alone proves little. A platform is successful when teams can achieve their outcomes more dependably, not simply when its feature list grows.

## Why it works

A shared capability can turn specialist knowledge into something several teams can use without mastering its underlying machinery. Delivery teams spend less attention on recurring support concerns and more on their own domains.

A dependable interface also changes the dependency. Teams still rely on a provider, but routine progress need not depend on personal coordination with its staff. Common improvements can benefit many consumers at once.

These advantages depend on usability, reliability, and fit. A poorly designed abstraction can add confusing steps or conceal information needed during failure. The provider also concentrates risk: a common outage or disruptive upgrade can affect many teams. Maintenance, recovery, and communication are therefore part of the product.

## Examples

### Spotify’s supported development paths in 2020

Spotify’s August 2020 engineering account describes its Platform organization addressing fragmented tooling through supported development paths. Its developer portal, Backstage, made recommended tools discoverable, while tutorials explained how to use them together. The account was written from the perspective of product management within the team responsible for documentation and discoverability. [Spotify Engineering, _How We Use Golden Paths to Solve Fragmentation in Our Software Ecosystem_, 2020](https://engineering.atspotify.com/2020/8/how-we-use-golden-paths-to-solve-fragmentation-in-our-software-ecosystem)

New engineers used these tutorials during onboarding, generating feedback on both the instructions and the underlying tools. The author noted that complaints about long tutorials could reveal an overly complicated development path: shortening the document would not fix the workflow.

The arrangement illustrates product ownership extending beyond infrastructure into discovery, guidance, and learning from users. Documentation owners also needed to update instructions when tooling changed. This is a dated firsthand account of responsibilities and intended benefits, rather than independent proof that a portal alone improved delivery.

### Netflix’s centralized tooling in 2018

Netflix’s May 2018 engineering account describes centralized teams, including Cloud Platform and Engineering Tools, creating reusable infrastructure and tooling. Development teams retained responsibility across their services’ lifecycle, supported by common capabilities rather than handing operation to a separate group. [Netflix TechBlog, _Full Cycle Developers at Netflix—Operate What You Build_, 17 May 2018](https://netflixtechblog.com/full-cycle-developers-at-netflix-a08c31f83249)

The central teams considered whether new needs were shared across development teams. Common problems could warrant joint investment; unusually specific requirements might remain with the delivery team. Supported tools formed a recommended development path whose adoption was encouraged through a better experience rather than mandated.

This historical arrangement demonstrates the boundary between shared capability ownership and responsibility for individual services. It also makes a tradeoff visible: allowing local alternatives can produce parallel solutions that later need to converge. The authors describe their experience and its limits; the source does not establish a universal rule for adoption or Netflix’s current structure.

## Useful when

- **Several teams repeat the same technical work.** Similar setup, maintenance, or troubleshooting consumes capacity across services.
- **Specialist detail overwhelms delivery teams.** They need a capability without becoming experts in all its internals.
- **Central assistance has become a routine queue.** Common tasks could instead be completed through a dependable interface.
- **There is a sustainable provider.** Shared demand justifies ownership, support, and maintenance beyond an initial project.

## Common mistakes and limits

**Building before understanding consumers.** A technically impressive platform can miss the tasks teams actually struggle with. Start with observed needs and test the experience with real users.

**Turning the team into a request desk.** Some assistance is necessary, especially during adoption. Repeated routine requests should inform improvements to the interface or documentation.

**Mandating use before making it workable.** Where common controls are necessary, make them usable and provide an accountable exception process. A requirement to adopt does not remove the provider’s responsibility to improve.

**Absorbing every shared concern.** An unlimited remit creates an overloaded team and unclear boundaries. Separate responsibilities where needed and retire capabilities that no longer earn their cost.

**Moving responsibility without agreement.** Delivery teams need to know what the provider guarantees and what they still own, particularly during incidents and upgrades.

A dedicated platform team may be unnecessary where a few well-chosen external services and clear guidance suffice. Highly specialized needs may also fit a different team or a local solution better than a common abstraction.

## Related patterns

- [[stream-aligned-team|Stream-Aligned Team]] owns a continuing customer stream; a platform team supports that ownership by making recurring capabilities easier to consume.
- [[shared-services|Shared Services]] pools defined services across units. Platform Team places particular emphasis on an internal product and interfaces that reduce coordination during use.
- [[teamwork-optimize-the-whole|Optimize the Whole]] keeps platform priorities focused on the consuming teams’ results rather than the provider’s local activity measures.
