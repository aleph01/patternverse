---
id: agentic-keep-a-traceable-change-history
type: pattern
title: 'Keep a Traceable Change History'
summary: 'Connect purpose, coherent changes, decisions, and revision-specific evidence so later readers can reconstruct what changed and why.'
status: published
tags:
  - agentic-coding
  - version-control
  - traceability
  - code-review
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis of version-control and engineering review guidance. Issues, decisions, history labels, reviews, and releases are fictional; source-snapshot reference checks are identified separately.'
---

## Purpose and problem

Stock that used to be rejected is now overwritten. The issue says “CSV import,” the commit says “finish feature,” and the agent’s summary describes an earlier preview. The code reveals the assignment but leaves the important question unanswered: was replacement deliberate, accidental, or introduced after review?

Keep a Traceable Change History connects a change’s purpose and decisions to its implementation, evidence, and integrated version. Future readers should be able to reconstruct the relevant story without recovering an entire agent conversation.

## Core idea

Keep a short, inspectable chain: **intent → coherent change → evidence at a version → integration and artifact identity**. Each relationship answers a different question. A commit records a source snapshot and ancestry; its message and linked decision explain purpose. A passing check supports only the behavior and version it exercised.

The [Git object model](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects) includes a source tree, parents, author/committer information, and a message. It does not automatically capture the product rationale, external dependencies, or deployed configuration. Those need deliberate records.

## How it works

### Give each record a job

A story expresses a desired outcome; an agent task bounds delegated work. A checkpoint preserves a recoverable state, possibly unfinished. A commit groups a source change; a pull request or equivalent review record exposes proposed changes and discussion. A release identifies an offering made available, while an artifact version identifies particular built bytes. These records can have many-to-many relationships: one story may span several tasks and pull requests, and one release may contain many stories.

Connect them with stable identifiers and accessible links. Record consequential rationale briefly beside the change and link longer decisions with their status and supersession history. Retain enough context that an expired issue tracker or restricted conversation does not erase the meaning. Google’s [description guidance](https://google.github.io/eng-practices/review/developer/cl-descriptions.html) emphasizes explaining the change and its reason for later readers, including decisions invisible in source.

Write an intent-based subject, then the necessary reason, behavioral consequence, evidence, and limitation. “Allow confirmed CSV rows to replace stock” is more useful than “agent updates.” Keep relevant tests with their implementation. Separate unrelated cleanup by purpose, including within the same file; [Google’s small-change guidance](https://google.github.io/eng-practices/review/developer/small-cls.html) explicitly includes related test code in a coherent change.

### Preserve the state that was assessed

Evidence should name the source revision, relevant dirty changes, comparison base, fixture or command, result, and material environment assumptions. A branch name or a green screenshot can outlive the state it described. Before integration, compare the description with the final diff, changed tests, and current base; update scope, decisions, and verification limits. Keep earlier results as historical observations rather than silently relabeling them.

Integration may preserve commits, squash them, or rewrite them through rebasing. GitHub documents these different [merge outcomes](https://docs.github.com/en/pull-requests/reference/pull-request-merges). Preserve a mapping from the reviewed base/head to the integrated revision and its checks. For release, retain the source revision, artifact digest, relevant build/configuration identity, and release record; source identity alone does not identify running bytes or settings.

### Clean up owned local work carefully

Unpublished, unreviewed work that nobody depends on can often be amended or reorganized into meaningful changes. Inspect ownership and dependencies first, preserve useful decisions, and verify the resulting intermediate and final states. Git’s [history guidance](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History) distinguishes this freedom from rewriting pushed work. Shared or reviewed history needs explicit coordination; a corrective follow-up is often clearer than replacing evidence-bearing commits.

Use the repository’s supported workflow. In this repository that means GitButler, whose [commit-editing documentation](https://docs.gitbutler.com/features/branch-management/commits) describes amendments, splits, and their effects on later commits. Tool capability does not authorize altering another contributor’s work. Never infer current approval from an old revision: GitHub’s [stale-approval protections](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) are configurable, not universally enabled.

Use existing backlog, review, and release records in the team’s Agile workflow. Acceptance criteria define product behavior; the Definition of Done defines shared completion obligations. An agent may stop with a reviewable proposal, which still needs review, integration, and any release decision. Neither one commit nor one agent session automatically completes the story.

## Worked examples

All identifiers below are fictional, including commit labels. Executed checks use disposable source snapshots and reference functions, not real commits, pull requests, CI runs, or releases.

### Find the decision behind an overwrite

Issue **IMP42** originally specifies new SKUs only. An explicitly accepted revision **D7** supersedes that rule: confirmation replaces quantities for listed SKUs and preserves absent SKUs, because this workflow imports authoritative counts. This is a hypothetical product-policy change, not permission to change the earlier rule silently.

From baseline **H0**, **C1** adds a preview and its checks; **C2**, a child of C1, adds confirmation and its checks. Initial inventory is `P100: 4, P900: 8`; the CSV contains `P100,99` and `P201,3`. Reference **T1** verifies the preview identifies replacement and creation without changing inventory. **T2** verifies confirmation yields `P100: 99, P201: 3, P900: 8`.

C2’s proposed message preserves the decision:

```text
Allow confirmed CSV rows to replace stock

IMP42 / D7: authoritative counts replace listed SKUs;
SKUs absent from the file remain unchanged.
Evidence: T1 and T2 at C2. Failure atomicity is unverified.
```

The fictional review **R2** records H0..C2 and its evidence. Integration **M2** maps that reviewed head into shared history, with separate integration evidence **I2**. Release **REL7** names M2, artifact **A7**, and configuration **CFG2**. In real records these symbolic labels need resolvable revision and artifact identities.

A later investigation follows REL7 back through M2, R2, and C2 to D7. It finds the decision introducing replacement and a retained check for absent stock. That explains intended behavior; it does not prove D7 remains appropriate or explain every production incident. The reference functions verify the sample state effects, not release, persistence, or failure atomicity.

![A fictional trace connects IMP42 and accepted decision D7 to preview commit C1 and confirmation commit C2 with their evidence. Review R2 names H0..C2; integration M2 and release REL7 retain separate revision, artifact, and configuration identities.](../assets/agentic-coding/history-trace.svg 'All history and release labels are fictional. Labeled connectors distinguish purpose, parent-to-child ancestry, assessed range, integration mapping, and release identity. Only the source-snapshot reference checks were executed; this is not a deployment record.')

### Separate a feature from a helper rename

An unshared local change **MIXED** combines confirmation replacement with renaming `parseRows` to `readRows`. Both `import.mjs` and `import.test.mjs` contain changes for both purposes. Splitting source from tests would leave incomplete units.

Construct **B** first: confirmation implementation plus T2’s replacement and absent-stock assertions, retaining the old helper name. Construct **N** next: rename the helper and every caller, including test imports, preserving those assertions. B’s checks pass before N; after N the same behavioral expectations pass again. The rename depends on B’s file state and makes no intended policy change.

In the disposable reference, B and N load successfully, and the final files are byte-identical to the independently specified MIXED files. That guards against losing work during this particular split. It does not establish complete behavioral equivalence or execute a history rewrite. If already shared or reviewed, arrange the change with collaborators rather than applying this local cleanup casually.

![The same fictional final files are organized first as one mixed change, then as B containing confirmation plus its behavioral tests, followed by N containing the helper rename and all source and test references.](../assets/agentic-coding/history-split.svg 'B and N change the same final files as MIXED. The split changes purpose boundaries, keeps checks with behavior, and preserves assertions during the rename. Disposable snapshots passed their checks and matched final bytes; no actual commits were split.')

### Correct a summary that describes the preview

Before integration, summary **S1** still says “preview only; no confirmation writer,” citing T1 at C1. The proposed head is now C2. A reader could approve an apparently read-only change while overlooking its writer.

Compare H0..C2 for full scope and C1..C2 for what changed after S1. The latter adds confirmation and T2. A reference content digest differs between C1 and C2, and inspection confirms C2 exports a writer. A digest detects different bytes; the diff and checks explain their significance. These content digests are not Git commit IDs.

Replace the current description with **S2**: “Preview and confirmation; D7 permits replacement of listed SKUs; absent SKUs remain. T1 and T2 passed at C2; integration checks pending.” Retain S1 as explicitly superseded if its historical context matters. Request assessment of the current range and affected behavior; update the eventual integration mapping when it exists. Editing a summary neither performs that review nor makes integration evidence appear.

![Superseded summary S1 describes C1 and cites T1, while the actual proposed head C2 adds a confirmation writer. Corrected S2 names H0..C2, D7, current T1 and T2 results, and pending integration checks.](../assets/agentic-coding/history-summary.svg 'The proposed head stays C2 while its record is corrected. Source comparison and reference results establish the mismatch; the updated description records the present scope without retroactively claiming old evidence or an approval.')

## Assumptions for correctness

Identifiers must resolve to retained artifacts and decisions. Evidence needs trustworthy provenance and a stated scope. Preserve required fixtures, configuration references, and access over the useful lifetime of the change. A perfectly linked record can still document an incorrect decision or insufficient check.

## When to use it

Use this pattern when several sessions contribute to a feature, review changes its scope, release obscures source identity, or investigations repeatedly end in chat archaeology. A small correction may need only a clear message and one focused evidence link.

## Tradeoffs and operating costs

Descriptions and mappings require maintenance. Preserve decisions that affect future interpretation, not every abandoned wording or intermediate checkpoint. Squashing can improve readability while removing intermediate commits from the main history; retain essential rationale in the surviving record. More commits and longer messages are not quality measures.

## Common mistakes and limitations

Do not paste entire conversations, credentials, private payloads, or unnecessary personal data into durable history. Reference controlled evidence instead. Avoid vague “tests passed,” mutable branch names as sole anchors, detached tests, and stale summaries. A source revert does not undo external effects, and a clean history cannot certify the deployed system.

## Related patterns

[[agentic-keep-context-durable-and-discoverable|Keep Context Durable and Discoverable]] keeps knowledge findable across sessions; this draft anchors change rationale and evidence to history.

[[agentic-deliver-small-reviewable-changes|Deliver Small, Reviewable Changes]] chooses coherent units; this draft preserves their purpose and version relationships afterward.

[[agentic-keep-work-recoverable|Keep Work Recoverable]] retains restorable state and learning; a traceable record helps diagnosis but is not itself a backup or rollback mechanism.

[[agentic-review-intent-and-risk|Review Intent and Risk]] assesses consequential behavior and findings; this draft preserves which state that assessment concerned.

## Sources and further reading

- [Git: Git Objects](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects) and [Rewriting History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History) — snapshot identity, ancestry, and local versus shared history.
- [Google: CL descriptions](https://google.github.io/eng-practices/review/developer/cl-descriptions.html) and [Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html) — rationale, current descriptions, and coherent implementation with checks.
- [GitHub: Pull request merges](https://docs.github.com/en/pull-requests/reference/pull-request-merges) and [Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) — history transformations and configurable review protections.
- [GitButler: Commit Editing](https://docs.gitbutler.com/features/branch-management/commits) — editing operations; CLI usage was checked against the installed repository skill.
