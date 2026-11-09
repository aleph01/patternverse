---
id: 'teamwork-clarify-decision-rights'
type: 'pattern'
title: 'Explicit Decision Rights'
summary: 'Specify who prepares, contributes to, authorizes, and carries out important decisions, with clear limits and routes for exceptions.'
status: 'published'
aliases:
  - Clarify Decision Rights
tags:
  - teamwork
  - collaboration
verses:
  - collaboration
  - organizational-design
attribution: 'Original Patternverse synthesis informed by the sources linked in this article. Invented cases are identified as hypothetical.'
---

**Core question:** Who may settle a particular question, whose input or agreement is required, and where does that authority end?

## What it is for

Imagine a hypothetical publisher considering a special edition for a major customer. Sales believes it can accept the order. Production controls the printing schedule. Finance expects to approve the margin. Each department understands its responsibilities, but nobody agrees who can commit the business when those responsibilities collide.

Another meeting may improve the proposal without resolving the authority problem.

Explicit Decision Rights makes important choices workable across teams, functions, business units, and governing bodies. It identifies who can decide, what others contribute, and when wider authorization is necessary. The arrangement can delegate ordinary choices locally while reserving particular commitments for broader review.

## The core idea

**Assign authority to defined decisions, distinguish advice from required agreement, and make the boundaries and exception route visible before options are debated.**

A general responsibility such as “own customer relationships” does not settle who can promise additional production capacity. Decision rights concern specific choices and categories of choices.

Bain’s RAPID framework distinguishes recommending, providing input, giving required agreement, deciding, and performing the resulting work. Its practitioner guidance emphasizes that clarifying the final decision-maker alone is insufficient: preparation, input, and sign-offs can also obstruct a decision. [Blenko and Davis-Peccoud, _Great Decisions—Not a Solo Performance_, 2011](https://media.bain.com/Images/DECISION_INSIGHTS_10_Great_decisions.pdf)

These distinctions are useful without adopting an acronym. Authority may belong to one person or a properly constituted group with an agreed decision rule. Shared responsibility for an outcome does not require everyone’s consent to every choice. Conversely, a role chart cannot grant authority its authors do not hold.

## How it works

![People contribute evidence and prepare a recommendation. An authorized person or body decides within an explicit remit, and named owners carry out the decision. Scoped approvals remain distinct from advice; choices beyond the remit use a named exception route.](../assets/teamwork/clarify-decision-rights.svg)

**Define the decision precisely.** Separate accepting the publisher’s special-edition order from changing the production schedule or approving additional spending. These connected choices may have different owners. For recurring decisions, define a category that people can recognize without renegotiating authority each time.

**Place authority deliberately.** Locate it where knowledge, accountability, and the ability to make the relevant tradeoff can meet. Name the authorized role and its remit. The sales lead might accept orders using available capacity and established terms; displacing another customer’s order requires a different decision. The legitimate authority-holder must endorse the allocation.

**Specify participation.** Identify who prepares the recommendation, whose knowledge must inform it, and who needs notification. Include people who will implement the choice and those who bear its effects. In Atlassian’s DACI guide, the Driver gets the process to a conclusion while the Approver actually decides; contributors advise rather than vote. [Atlassian Team Playbook, _DACI_](https://www.atlassian.com/team-playbook/plays/daci)

**Bound required approvals.** State exactly which condition an approver checks. Confirming that a proposal fits a spending allowance should not silently become authority to choose the customer proposition. If approval is essential, explain how a refusal, conflicting requirements, or unavailable approver gets resolved. A consultation deadline does not make silence consent.

**Set timing and escalation.** Give contributors a realistic opportunity to influence the proposal before commitment. Identify an authorized substitute or escalation route for absence, unresolved jurisdiction, or choices outside the remit. Urgency does not create unlimited powers. A collective decision needs membership, a voting or consent rule, and a way to handle deadlock.

**Connect the decision to execution.** Record the choice, material reasons, necessary conditions, and implementation owners where affected units can find them. Ensure the decision includes authority to commit the resources it requires. If another unit controls those resources, secure that commitment rather than assuming the decision binds them.

**Make reconsideration explicit.** Identify what warrants reopening the choice: changed facts, failed assumptions, or a breach of limits. Persistent disagreement alone should not produce endless informal appeals. Review recurring decisions for hidden approvals, conflicting mandates, and authority that has become detached from actual work.

## Why it works

The arrangement separates two questions that organizations often mix: whose knowledge should influence a choice, and whose judgment can settle it.

People can contribute strongly without acquiring a general veto. An authorized owner can conclude the process without pretending that everyone agrees. Explicit boundaries also let ordinary decisions proceed without repeatedly seeking senior permission.

These benefits depend on behavior. Leaders must respect legitimate delegation, contributors must have meaningful access, and decision-makers need sufficient competence and resources. If a director reverses choices through private conversations, the published allocation becomes misleading. Clarity makes authority inspectable; it does not guarantee wise or fair decisions.

## Examples

### GitLab’s published DRI arrangement, consulted October 2026

GitLab’s handbook assigns directly responsible individuals to projects and activities, combining final decision authority with consultation. It distinguishes product-feature prioritization, assigned to a Product Manager, from delivery, assigned to an Engineering Manager. The person responsible for an initiative need not manage all its contributors. [GitLab, _Directly Responsible Individuals_](https://handbook.gitlab.com/handbook/people-group/directly-responsible-individuals/)

The same account identifies circumstances requiring additional approval or another final decision-maker, including substantial financial, reputational, or cross-functional implications. In such cases, the DRI still has responsibility for moving the work forward and executing the eventual decision.

This illustrates a consequential separation: coordinating an initiative does not always mean holding every decision right within it. The published arrangement supplies both a default owner and exceptions. It documents GitLab’s stated approach at consultation, rather than establishing consistent implementation or proving a performance benefit.

### Apache’s release authority, consulted October 2026

The Apache Software Foundation assigns technical direction to project management committees, while its board retains foundation oversight. A committee governs its project collectively; its chair is not the sole project decision-maker. [ASF, _How the ASF Works_](https://www.apache.org/foundation/how-it-works/)

For a release vote to pass, ASF policy requires at least three positive binding votes and more positive than negative binding votes. Committee members cast binding votes; others are encouraged to participate with non-binding votes. Releases cannot be vetoed through a single negative vote. The policy also requires review and testing before affirmative binding votes. [ASF, _Release Policy_, release approval](https://www.apache.org/legal/release-policy.html#release-approval)

The arrangement separates participation from authorization and connects voting authority with review responsibilities. Having permission to change code is therefore different from authorizing an official release. This is a documented governance rule, not evidence that every release is problem-free or that this voting rule suits other organizations.

## Useful when

- **Decisions repeatedly reopen.** Participants disagree about whether a discussion actually authorized action.
- **Responsibilities overlap across units.** Customer promises, capacity, standards, or spending attract competing claims of authority.
- **Delegation exists only in principle.** Local owners still seek informal permission for ordinary choices.
- **Consultation turns into unanimous approval.** Nobody knows whose objections are advisory and whose agreement is required.

## Common mistakes and limits

**Documenting titles instead of choices.** A list of departmental owners can leave the disputed commitment unresolved.

**Giving every stakeholder a veto.** Necessary specialist approvals should have defined scope; broad participation can still remain advisory.

**Naming an owner without usable power.** Authority, resource commitments, and accountability need to fit together.

**Treating clarity as immunity from challenge.** New evidence, misconduct, or exceeded authority can justify intervention. Keep legitimate review available.

**Mapping everything.** Formalize consequential or troublesome decisions first. Documenting every routine choice creates maintenance work without equivalent value.

Some questions require collective legitimacy or specialized assurance. Others are so interdependent that separating decision domains exposes a need to redesign the work itself. Explicit rights clarify these constraints; they cannot remove them.

## Related patterns

- [[mission-command|Mission Command]] combines clear intent with delegated initiative; explicit rights define the choices and limits within that delegation.
- [[strategic-guardrails|Strategic Guardrails]] states boundaries and tradeoff principles; decision rights identify who interprets them and authorizes permitted exceptions.
- [[teamwork-own-the-outcome-together|Own the Outcome Together]] establishes shared responsibility for results while allowing particular choices to have distinct owners.
