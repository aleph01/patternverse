---
id: 'facilitation'
type: 'pattern'
title: 'Facilitation'
summary: 'Help another team overcome a capability gap while it retains ownership, then reduce assistance as it can proceed for itself.'
status: 'published'
verses:
  - organizational-design
---

**Core question:** How can one team help another get past an obstacle without becoming its permanent problem-solver?

## What it is for

Imagine a hypothetical delivery team introducing automated tests. Its members understand their product but struggle to choose useful checks and interpret failures. A neighboring team has experience. It could build the tests for them, but the recipients would still need help whenever the product changed.

Facilitation makes the interaction about helping the receiving team proceed for itself. Experienced colleagues explain, demonstrate, ask questions, and work alongside team members while they apply the unfamiliar approach.

The pattern operates between teams across an organization. It fits an obstacle that can be reduced through learning or guided problem-solving, provided the receiving team has the time and authority to act. Here, facilitation means a team interaction extending beyond the conduct of a single meeting.

## The core idea

**Help another team develop the ability to do its own work, while keeping responsibility for that work with the receiving team.**

The purpose is deliberately unequal: one side primarily helps, and the other primarily develops a capability. Both may learn, but they have different responsibilities in the engagement. Team Topologies defines Facilitation as one team helping and mentoring another. [Team Topologies, _Key Concepts_](https://teamtopologies.com/key-concepts)

An Enabling Team is an organizational home for expertise and learning support. Facilitation is the relationship through which that support happens. A platform team can also facilitate adoption, or an experienced delivery team can help a neighboring team, without either becoming a dedicated enabling team.

The helper may contribute real work, but completing tasks is insufficient if the recipient remains dependent. Facilitation also differs from discovering an uncertain answer together, where both teams need substantial new understanding, and from providing a service that recipients continue to consume. [Team Topologies, _Finding Software Boundaries for Fast Flow_, May 2023, page 21](https://teamtopologies.com/s/Finding-software-boundaries-for-fast-flow-Team-Topologies-and-Domain-Driven-Design-mini-book-MB81-v1.pdf)

## How it works

![Three interaction modes address different needs: facilitation helps a receiving team gain capability, collaboration brings teams together for shared discovery, and X-as-a-Service provides a supported capability for continuing consumption. Choose the relationship by the obstacle, and review it as the need changes.](../assets/organizational-design/facilitation.svg)

**Agree what help is needed.** Start with observed difficulty and the receiving team’s goal. In the testing illustration, the problem might be choosing checks that expose meaningful failures, rather than learning every feature of a testing tool. Confirm that missing knowledge is the obstacle; teaching cannot supply absent permissions or capacity.

**Make a limited agreement.** Name the participants, available time, scope, review point, and evidence that assistance can decrease. A useful goal describes what the team should be able to do: design and maintain relevant tests, for example. Participation requires space in the delivery plan, not an additional obligation fitted around unchanged commitments.

**Separate help from authority.** The receiving team owns its product, priorities, and implementation decisions. Helpers own the quality and relevance of their guidance. Identify any decisions requiring another owner’s approval. A specialist who also has formal review authority should make that role explicit rather than let advice quietly become a compulsory sign-off.

**Let recipients do the thinking and work.** Demonstrate where necessary, then pair, observe, and offer feedback as team members make decisions. Ask them to explain choices and handle unfamiliar cases. Use real work when practical, with safe examples or environments where experimenting on a live service would be inappropriate.

**Keep learning visible.** Record reasoning, examples, and unresolved questions where the team can find them. Involve enough members that the capability does not disappear when one person is absent. Feed recurring difficulties back to relevant tool owners or leaders, distinguishing knowledge gaps from problems in the surrounding system.

**Test a reduction in help.** Move from active demonstration toward questions, observation, and occasional advice. At review, examine what the receiving team can handle without intervention. Extend assistance for a defined remaining need, change the approach, or close the engagement. A fixed date alone proves neither readiness nor failure.

## Why it works

An expert’s finished solution can hide the reasoning that made it possible. Working alongside recipients exposes decisions, feedback, and corrections while they still matter. People can connect unfamiliar methods to systems they already understand.

Keeping ownership with the recipient gives learning an immediate purpose. Reducing assistance then provides evidence of whether capability has actually moved. The desired result is a team that can act with less intervention, rather than a helper who completes more requests.

This depends on relevant expertise, patient communication, and permission to admit uncertainty. Helpers need enough involvement to understand the situation. Recipients need practice and room to make decisions. When delivery pressure continually pushes experts to take over, short-term output can preserve the dependency the engagement was meant to reduce.

## Examples

### Target’s Dojo in 2015

David Laribee’s firsthand retrospective describes helping scale Target’s DevOps Dojo in 2015. Product teams undertook six-week challenges supported by expert coaches. The teams worked toward continuous delivery through short iterations; coaches paired, asked questions, supplied explanations, and brought in specialists when necessary. Their intended contribution was skills transfer that teams could sustain after leaving. [Laribee, _DevOps Dojos at Extreme Scale_](https://nerdnoir.com/blog/devops-dojos-at-extreme-scale)

Laribee and Joel Tosi also encouraged framing the challenge around a small product outcome, so building a delivery pipeline served real work. The approach extended to Target’s Learning & Development team creating resources for its wider organizational change.

This illustrates facilitation through practical assistance tied to the receiving team’s work, including outside software engineering. The six-week format belonged to that arrangement; it is not a universal duration. The account reports the practitioners’ experience and intentions, rather than measuring every team’s independence afterward or describing Target’s present structure.

### Microsoft’s remote Dojo coaching in 2021

Microsoft’s June 2021 DevOps Dojo account describes a coaching arrangement combining concepts, discussion, application, and technical labs. Before the pandemic, several coaches traveled to deliver sessions. Remote delivery then used two full-time captains alongside specialists who contributed for the parts matching their expertise. [Microsoft Dojo Community, _DevOps Dojo—Experiential Learning_, 23 June 2021](https://devblogs.microsoft.com/devops/devops-dojo-experiential-learning/)

The account includes coaches adjusting explanations for different audiences and changing activities in response to participants’ questions and feedback. This required more than publishing training materials: the supporting group had to coordinate suitable expertise and respond to difficulties as people practised.

The arrangement illustrates organized helping through guided application. It also exposes the helper’s staffing cost: relevant expertise had to be available when needed. It is a historical training example, not evidence that every cohort consisted of intact delivery teams or that all recipients subsequently worked independently. The facilitation interpretation concerns the helping relationship, not a claim of formal Team Topologies adoption.

## Useful when

- **A learnable gap blocks work.** The team needs a capability that experienced colleagues can help it acquire.
- **Advice has not become usable practice.** People understand the explanation but struggle when applying it to their own work.
- **Experts repeatedly take over.** Immediate problems are solved while recipients remain dependent.
- **The team can participate.** It has time, suitable work, and authority to use what it learns.

## Common mistakes and limits

**Mistaking rescue for capability building.** Helpers can complete urgent work without teaching much. Make the intended tradeoff explicit, especially during incidents.

**Arriving with a prescribed cure.** Observe the obstacle before promoting a favored tool or method. Recipients’ context should shape the assistance.

**Helping without agreement.** Unrequested intervention can feel like inspection. Agree the purpose, responsibilities, and boundaries with the receiving team.

**Counting attendance.** Workshops and documents are inputs. Look for the ability to make relevant decisions and perform work with less prompting.

**Coaching around structural defects.** Repeated permissions problems, overloaded responsibilities, or an unusable platform require action from their owners. More facilitation can otherwise become another burden.

Some expertise should remain with permanent specialists and be consumed as a service. Where neither side understands the answer, joint discovery may be more appropriate than a helping relationship. End or redesign assistance when its original purpose no longer fits.

## Related patterns

- [[enabling-team|Enabling Team]] supplies a continuing source of focused expertise; Facilitation describes a particular helping engagement.
- [[time-limited-collaboration|Time-Limited Collaboration]] brings complementary teams into shared discovery, rather than primarily helping one acquire an established capability.
- [[x-as-a-service|X-as-a-Service]] supports continuing consumption. Facilitation can help adoption while the service provider retains responsibility for the shared capability.
