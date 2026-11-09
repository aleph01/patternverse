---
id: agentic-verify-the-complete-behavior
type: pattern
title: 'Verify the Complete Behavior'
summary: 'Exercise the relevant path across interfaces, persistent state, and failures instead of treating isolated component success as the outcome.'
status: published
tags:
  - agentic-coding
  - integration-testing
  - verification
  - failure-behavior
verses:
  - agentic-coding
attribution: 'Original Patternverse synthesis of testing guidance and documented agent-harness experience. Cases are fictional; SQLite reference probes and serializer/handler calculations are distinguished from proposed browser journeys.'
---

## Purpose and problem

The parser accepts the file. The backend saves its test request. The screen renders its mocked success response. In the browser, confirmation fails—or appears to succeed until the page reloads.

Each check may be correct within its boundary while leaving the connection between boundaries untested. Verify the Complete Behavior asks whether the relevant user or system outcome survives the interfaces, state transitions, and failures it actually crosses. “Complete” describes a specified path and obligation, not every possible behavior of the system.

## Core idea

Trace an acceptance claim from its starting state through the real boundaries needed to fulfill it. Observe both what is presented and what persists. Include a representative rejection or interruption when the requirement promises behavior under failure.

An independent oracle establishes what should happen. This pattern establishes which path and effects were actually exercised. A response fixture, success toast, or passing component cannot stand in for a storage write and subsequent read unless that narrower scope is the claim.

## How it works

### Make the path and its observations explicit

Define the starting data, actor and permissions, input, action sequence, expected presentation, persistent result, and relevant side effects. Identify the implementation and dependency versions, configuration, storage, and worker or service boundaries. Name any substituted dependency and the behavior it cannot establish.

Use isolated fixtures so another test’s writes or cookies do not supply the apparent success. Seed only the test’s own data and retain a reliable cleanup boundary. Playwright’s [best practices](https://playwright.dev/docs/best-practices) support checking user-visible behavior, isolating tests and data, and awaiting observable conditions. Stable waiting reduces timing accidents; a fixed sleep does not prove that a background operation completed.

Observe the result after crossing the boundary at risk. An optimistic screen can show uncommitted data. Reloading helps only if it causes a fresh read rather than reusing local state or a stale cached response. Capture the request, response, and persistent state needed to distinguish those possibilities. For external messages, identify whether the test observed an adapter call, provider acceptance, or delivery; those are different claims.

### Use a proportionate portfolio

Select the least costly boundary that can expose a defect, and retain a few representative journeys across the assembled system:

| Check                  | Useful evidence                                                                   | What can remain untested                                   |
| ---------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Component              | Parser semantics, validation, serialization, or rendering under controlled inputs | Real connection to other components                        |
| Integration            | Actual request contract, storage transaction, or worker boundary                  | User interaction or wider orchestration                    |
| Representative journey | Actions through the assembled path and its resulting state                        | Other conditions, load, security, and unexercised failures |

Google’s [testing guidance](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html) explains the speed, reliability, and diagnostic costs of relying heavily on broad end-to-end tests. Use that tradeoff rather than a universal numerical ratio. A failed journey can locate a missing connection; a narrower check can then diagnose it and protect the repair.

Mocks make checks controllable but establish behavior against the substitute. A mock that always returns success cannot validate the real server’s request fields. Keep such tests for their useful scope and add evidence at the omitted boundary. Anthropic’s [long-running-agent account](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents) reports local checks missing complete web-app failures and explicit browser testing helping in that setting. It does not establish a general success rate or eliminate testing-tool limitations.

Attach results and omissions to the tested revision. After integration changes a relevant boundary, reassess the affected checks. A completed agent component task, reviewable patch, product acceptance, the team’s Definition of Done, integration, and release need distinct claims. Retain broader obligations in the existing task or backlog; neither a new ceremony nor one session per story is required.

## Worked examples

These cases are fictional. Their browser journeys are verification specifications, not executed importer UI tests. Disposable SQLite probes verify the stated storage outcomes; small serializer/handler references verify the field mismatch. Those narrower experiments do not establish the complete application path.

### Confirm, reload, and read the stored result

The create-only inventory contract retains existing stock, previews without writes, and confirms all valid rows or none. Quantities must be whole numbers at least zero. Each scenario starts in its own isolated state containing only `P100: 4`.

The valid file contains `P201,3` and `P202,2` under `sku,quantity`. Upload it, inspect both preview rows, confirm, and check the success presentation only after the server accepts the operation. Then reload, verify a fresh inventory request, and compare its displayed data with a separate persistent-state read:

| Observation                 | Required result                                           |
| --------------------------- | --------------------------------------------------------- |
| After preview               | P201: 3 and P202: 2 shown; stored inventory still P100: 4 |
| After confirmation          | Stored inventory P100: 4, P201: 3, P202: 2                |
| After reload and fresh read | Same three products shown from persisted state            |

The rejection scenario changes the second imported quantity to `-1`. Preview must show data row 2, code `quantity_nonnegative`, and prevent normal confirmation. Also exercise the server’s rejection path directly; disabling a button alone does not protect storage. Confirmation must reject the invalid input without writes, and a fresh inventory read must still return only `P100: 4`.

SQLite reference runs retain the baseline during preview, persist the three-product result after valid confirmation, and retain the baseline after invalid confirmation with zero write calls. Reopening connections confirms those storage observations. The browser interactions, cache behavior, error presentation, and actual server revalidation remain to be exercised in the real application. This distinction prevents a database reference test from being reported as a passed user journey.

![A planned valid import journey crosses upload, preview, confirmation, storage, reload, and a fresh inventory read. A separate invalid-file path requires the row-2 error, rejected confirmation, and unchanged persistent inventory.](../assets/agentic-coding/behavior-journey.svg 'Fictional verification specification. SQLite reference probes check the declared stored states, but the browser journey is not executed. Reload must trigger a fresh read; a success display alone does not establish persistence. Each valid or invalid scenario has its own P100:4 baseline.')

### Join two passing components at the real request contract

Preview **PV7** refers to the valid file above. The confirmation handler expects `POST /imports/confirm` with `{preview_id: "PV7"}`. The browser serializer instead sends `{import_id: "PV7"}`.

The frontend’s isolated test receives a success response from a mock that ignores the body. The backend’s isolated test supplies the correct `preview_id` fixture. Both pass, but neither exercises the browser’s actual payload against the handler.

Connecting the serializer to a small handler reference returns **400**, code `preview_id_required`. Correcting only the field name returns **200** in that reference comparison. The input preview and contract stay unchanged. This identifies the missing boundary check; it does not prove the full application works.

In the real journey, inspect the outgoing body and server response, verify rejection leaves storage unchanged, and require the UI to show the failure rather than an optimistic “Imported.” After repairing the serializer, repeat confirmation through the actual handler, persistent write, reload, and read. Retain a focused serializer/contract check for diagnosis alongside the representative journey.

![An isolated frontend mock accepts import_id while the isolated backend fixture uses preview_id. Joining the actual serializer shape to the expected handler contract returns 400; changing the field to preview_id returns 200 in the reference model.](../assets/agentic-coding/behavior-contract.svg 'Same PV7 and confirmation endpoint throughout. Reference serializer/handler calculations expose the field mismatch; no real browser HTTP request or persistence path was executed. The corrected field needs confirmation through the complete application path.')

### Interrupt a worker against the selected failure policy

For background job **J1**, this example explicitly selects **all-or-nothing inventory changes**. Starting from `P100: 4`, the job should add P201: 3 and P202: 2 together. The job’s completion record belongs in the same transaction as those writes; a stale “running” label alone cannot establish what committed.

A disposable SQLite reference starts a worker process, opens a transaction, stages P201, and signals that it has reached the checkpoint before commit. Terminating that process there and opening a new connection leaves only `P100: 4`. J1’s previously recorded status remains `running`, so status reconciliation is still required. This is consistent with SQLite’s [atomic-commit mechanism](https://www.sqlite.org/atomiccommit.html), under its documented assumptions.

A controlled retry in the reference writes both products and J1’s `completed` record in one transaction. A fresh connection then reads all three products and the completion record. That checks this interruption point and retry sequence, not a real queue’s delivery or acknowledgement behavior.

A production check must also cover interruption after commit but before acknowledgement, using durable job identity and completion evidence to avoid blindly repeating effects. External notifications need their own delivery contract. Neither is tested by killing this reference worker before commit.

A different bulk-import product might deliberately commit batches and retain a completed prefix. Its interruption check should expect the specified prefix, durable progress, and defined resume behavior. Do not impose this example’s all-or-nothing policy on it—or excuse partial writes when the selected policy forbids them.

![J1 stages its first product inside an uncommitted transaction, is interrupted, and a fresh connection reads only the baseline with J1 still running. A controlled retry commits both products and the completion record together; later acknowledgement ambiguity remains outside the probe.](../assets/agentic-coding/behavior-interruption.svg 'Executed SQLite reference at one pre-commit process-termination point, not a production worker or power-loss test. The chosen policy is all-or-nothing. Fresh reads verify baseline after interruption and full inventory plus completion after the controlled retry; queue and external-message recovery remain unverified.')

## Assumptions for correctness

The environment and fixture must represent the boundary under test. Expected state needs an independent basis, and observations must distinguish persistent storage from caches or mocks. Fault injection must reach the intended point. Test data isolation must include shared workers and storage, not only a fresh browser page.

## When to use it

Use this pattern for features crossing UI/server/storage boundaries, optimistic presentation, asynchronous work, or specified rejection and recovery behavior. Keep a focused component check when the claim genuinely concerns only that component; expand scope when the outcome depends on connections beyond it.

## Tradeoffs and operating costs

Broad journeys can be slow, flaky, expensive to maintain, and poor at locating causes. Shared environments and external dependencies amplify these costs. Preserve useful request, state, and failure evidence for diagnosis; an automatic retry that eventually turns green should not erase an intermittent defect or its investigation obligation.

## Common mistakes and limitations

Passing mocked components is not evidence that their real contracts match. A toast, screenshot, HTTP status, or job label can omit the state that matters. One successful journey establishes neither load capacity, security, accessibility, every concurrency condition, nor every interruption point. State the exercised path and remaining coverage instead of promoting “the scenario passed” into “the system is verified.”

## Related patterns

[[agentic-agree-on-done|Agree on Done]] is a local draft distinguishing completion obligations; this article supplies evidence across the relevant system path.

[[agentic-establish-independent-checks|Establish Independent Checks]] is a local draft grounding the expected answer. This pattern determines which boundaries the check actually crosses.

[[agentic-coordinate-concurrent-work|Coordinate Concurrent Work]] is a local draft establishing shared semantics and integration responsibility before parallel implementations meet.

[[agentic-keep-work-recoverable|Keep Work Recoverable]] is a local draft separating source restoration from data and external-effect recovery; interruption checks examine those specified obligations.

## Sources and further reading

- [Playwright: Best Practices](https://playwright.dev/docs/best-practices) — user-visible checks, isolation, controlled dependencies, and condition-based waiting.
- [Google Testing Blog: Just Say No to More End-to-End Tests](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html) — the costs of broad checks and a portfolio of narrower evidence.
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents) — attributed experience with local checks and complete web-app behavior.
- [SQLite: Atomic Commit](https://www.sqlite.org/atomiccommit.html) — transaction boundaries, interruption recovery, and environmental assumptions.
