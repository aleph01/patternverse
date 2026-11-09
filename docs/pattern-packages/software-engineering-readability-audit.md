# Software Engineering readability audit

Reviewed 30 October 2026. Most of the collection reads well: concrete openings lead to recognizable design moves, assumptions are usually explicit, and related-pattern comparisons generally explain a useful difference. **94 of 118 articles have no material finding in this structured pass. The other 24 have localized recommendations; ten of those are wording or description polish.** A collection-wide rewrite would lose useful precision without addressing the main problems.

The highest-value revisions are to shorten sideways code reading, show the key application trace before long implementations, and introduce a few specialist terms more gently. No high-severity conceptual readability defect was confirmed. The findings below concern presentation and explanatory order; they are not claims that the examples execute incorrectly.

## Scope and reference standard

The audit covers all **95 expansion articles and 23 GoF articles**, across the twelve problem-oriented software collections and the intact GoF collection. Collection membership and the authoring sidecars agree on the same 118 IDs, with no omissions or duplicate audit rows.

Articles were selected by membership and canonical identity, not by filename prefix. This includes Bounded Context (`data-bounded-contexts`), Publish-Subscribe (`data-publish-subscribe-distribution`), Event Sourcing (`data-event-sourcing`), Consumer-Driven Contract Tests (`data-consumer-driven-contract-tests`), Strangler Fig (`data-incremental-replacement`), Expand–Migrate–Contract (`data-expand-migrate-contract`), Canary Release (`ml-canary-rollout-with-rollback`), Shadow Traffic (`ml-shadow-deployment`), and the other existing Data IDs listed in the article assessment.

The reference is the [approved GoF editorial standard](gof-editorial.md), supported by its [saved review](gof-editorial-review.json). [Strategy](../../content/patterns/strategy.md) demonstrates concrete situation → small design move → short implementation → interpreted result. [Builder](../../content/patterns/builder.md) demonstrates introducing a richer problem, then explicitly narrowing the code to the completion boundary it teaches. These are examples to learn from, not a requirement to use identical prose.

The assumed reader understands ordinary functions, objects, and application code, but need not know each catalog's terminology. Every article received a structured source pass over its summary, opening, central move, mechanism responsibilities, example framing, tradeoff framing, related-pattern comparison, and figure text. Follow-up readings concentrated on the passages and implementations discussed below. Long code listings were not all verified line by line for technical correctness.

Approximate whitespace counts, excluding fenced code, give a median of **1,012 words for GoF and 1,202 for the expansion**. Median physical code lines, including blanks, are **32 and 69** respectively. These measurements explain where to look; they do not establish reading difficulty. No reading-level score was used to assign a verdict.

## Findings in priority order

### R7 Medium: Wrap incidental code that is much wider than its reading area

**Location:** [Active Record, line 140](../../content/patterns/active-record.md#L140), with similar cases in [Data Mapper, line 153](../../content/patterns/data-mapper.md#L153) and [Unit of Work, line 81](../../content/patterns/unit-of-work.md#L81).

The Active Record demonstration puts its entire table definition and two constraints on one 165-character line. At 390 pixels the code area is 365 pixels wide, while this block's scroll width is 1,508 pixels: **4.13 times the visible width**. It also overflows at desktop width. Data Mapper reaches 1,322 pixels in the same phone reading area. Horizontal scrolling works and is keyboard-focusable; this is a source-formatting burden, not a clipped or inaccessible code container.

**Reader impact:** The reader must pan across incidental schema details while also following the record's save/rollback behavior. Several validation predicates likewise hide their final conditions offscreen. A phone screenshot shows the effect in the [local evidence](../../.local/software-readability-audit/captures/active-record-390-schema.png).

**Suggested rewrite of the declaration:**

```python
db.execute("""
    CREATE TABLE tasks (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL
            CHECK(length(title) BETWEEN 1 AND 80),
        done INTEGER NOT NULL
            CHECK(done IN (0, 1))
    )
""")
```

Use the same approach for long SQL calls and parenthesized Boolean conditions. Preserve the complete code, constraints, selectable text, syntax highlighting, and scrolling fallback. Do not shrink the font or introduce visual soft wrapping that damages copyable indentation.

### R1 Medium: Put the small application trace ahead of implementation machinery

**Location:** [Unit of Work, lines 61–187](../../content/patterns/unit-of-work.md#L61); also Repository, CQRS, Event Sourcing, Transactional Outbox, and Saga.

Unit of Work has a good explanation of tracking versus committing, but its first implementation block is 82 physical lines. The reader encounters validation, lifecycle flags, `_check`, and repeated-registration guards before the short demonstration that registers three changes. On the phone, that first block is about 2,110 pixels tall. Repository similarly presents the domain model and both implementations before the unchanged caller.

This detail is legitimate. The problem is the route through it, rather than the mere presence of validation or cleanup.

**Reader impact:** A reader can understand the prose yet struggle to recognize the pattern inside the code. The application's use of the abstraction arrives after the machinery that supports it.

**Suggested replacement introduction for Unit of Work:**

> One maintenance operation changes three labels: rename A, add B, and remove C. Registering these intentions changes only the pending registry; it writes no SQL. Calling `commit()` applies all three within one database transaction. If adding B fails, the earlier update to A is rolled back too. Follow `_changes`, `_register`, and `commit` in the implementation below. The remaining checks enforce the example's input and single-use lifecycle rules.

Show the short application call or trace immediately after this paragraph, then retain the complete implementation and the existing failure demonstration. For Repository, show `candidates(repo)` before the two adapters. For CQRS, Event Sourcing, Outbox, and Saga, lead with the already documented state/result trace before connection modes, bounds, and fixture mechanics. Keep correctness conditions next to the operations they qualify; do not hide them in a distant disclaimer.

### R2 Medium: Make Canary Release's decision visible before its fixture arithmetic

**Location:** [Canary Release, lines 49–57](../../content/patterns/ml-canary-rollout-with-rollback.md#L49).

The worked example introduces 100 requests, buckets 0–99, four shares, positions 3/13/23, multiples of 20, positions 50/100, two percentage gates, equality handling, a minimum sample, and label completeness before showing what the controller decides. All of those rules support the simulation, but the release decision is simpler than its data generator. The [phone capture](../../.local/software-readability-audit/captures/ml-canary-rollout-with-rollback-390-worked.png) shows how much numerical setup precedes the code.

**Reader impact:** The reader must retain several denominators and independent rules before reaching the useful contrast between candidate-specific and fleet-wide evidence.

**Suggested lead, moving the existing result forward:**

> The candidate serves 10 requests in the first window and none fail, so the controller advances. In the next window it serves 25 requests and three fail: 12%, above the 5% failure limit. The controller restores future traffic to the incumbent. It cannot retract the 35 candidate requests already served.

| Window | Candidate requests | Candidate failures | Candidate failure rate | Decision          |
| ------ | -----------------: | -----------------: | ---------------------: | ----------------- |
| 1      |                 10 |                  0 |                     0% | Advance           |
| 2      |                 25 |                  3 |                    12% | Restore incumbent |

Then explain that the program generates these counts deterministically using request positions. Keep the separate prediction-quality gate, missing-label hold, threshold equality, and teaching-only limits in the subsequent policy explanation. The existing later comparison with the combined 5% endpoint rate remains valuable.

### R3 Medium: Label positional output where readers compare it

**Location:** [Proactor, line 156](../../content/patterns/proactor.md#L156) and [Memoization's worked example](../../content/patterns/memoization.md#L50).

Proactor presents results as `B 2 b'ok' None False`, `A 3 b'hel' None True`, and further rows inside one prose sentence. The next sentence explains the columns, so the information is present. However, readers repeatedly decode `None` and the final Boolean to distinguish requested cancellation from an actually canceled operation—the most important distinction in the example.

**Suggested presentation, preserving the existing outcomes:**

| Owner | Bytes | Data     | Final result        | Cancellation requested |
| ----- | ----: | -------- | ------------------- | ---------------------- |
| B     |     2 | `b'ok'`  | Success             | No                     |
| A     |     3 | `b'hel'` | Success             | Yes                    |
| C     |     0 | `b''`    | Canceled            | Yes                    |
| D     |     0 | `b''`    | Success: stream EOF | No                     |

> A's cancellation request did not prevent its successful short read. C's final outcome is canceled. D's zero-byte success represents end of stream. The model retains request slots until completion dispatch, then releases them.

Retain the separate `retained requests: 2` and `remaining: 0` observations. In Memoization, replace a bare `9 5` presentation with **“Publish finishes at 9 minutes; five cache misses so far”**, then **“Package finishes at 7 minutes; still five cache misses.”** Preserve the later explanation that these are single-threaded task-body executions, not measured latency.

### R4 Medium: Give unfamiliar mechanism names an ordinary-language handle first

**Location:** [Leader Election, lines 26–48](../../content/patterns/leader-election.md#L26) and [Reactor, line 28](../../content/patterns/reactor.md#L28).

Leader Election relies on “authority term,” “obsolete generations,” and “resource-side fencing” before giving a compact definition of their relationship. The later A/B handover and figure explain it, so this is sequencing and vocabulary friction, not a missing stale-leader policy. Reactor similarly begins with “a synchronous event demultiplexer” before introducing a selector's concrete job.

**Suggested replacement bridge for Leader Election:**

> In the example’s quorum-based election, each leadership round has an increasing number, called a term. An old leader can resume after a newer one has been elected, so the destination must also know which term it accepts. Once B installs term 2 at the publication register, that register rejects A's term-1 writes. This destination-side rejection is called fencing. Electing B alone does not update the register or stop A's process.

Keep the atomic check-and-write requirement, durable authority state, and limits of the example immediately afterward.

**Suggested Reactor opening:**

> Register the sockets and the events each handler needs. A selector waits until one or more sockets are ready, and the dispatcher calls their registered handlers. Each handler attempts a small amount of nonblocking I/O, keeps any unfinished record state, and returns to the loop. The selector fills the formal event-demultiplexer role.

Retain readiness versus completion and Reactor versus Proactor as substantive distinctions.

### R6 Low: Expand incidental abbreviations without building a glossary detour

**Location:** [API Composition, line 56](../../content/patterns/api-composition.md#L56) and [Data Mapper, line 29](../../content/patterns/data-mapper.md#L29).

API Composition assumes “validated immutable DTOs” and “positive owner-local revisions.” Data Mapper uses DTO and ETL while distinguishing broader data mapping. These are small obstacles, but a reader should not need another lookup to understand the example's input contract.

**Suggested API Composition rewrite:**

> The asynchronous functions stand in for read APIs. Each returns validated, immutable response records—data transfer objects, or DTOs—with valid IDs, nonnegative totals in integer euro cents, positive version numbers maintained by that service, and labels the caller is allowed to see. The composer checks requested IDs and missing results; it does not implement network decoding or authentication.

For Data Mapper, use **“conversion of data transfer objects (DTOs) or an extract-transform-load (ETL) transformation”** at first mention. CQRS already introduces its DTO terminology, so no equivalent finding is assigned there.

### R5 Low: Remove catalog-maintenance narration from the design explanation

**Location:** [Publish-Subscribe, line 35](../../content/patterns/data-publish-subscribe-distribution.md#L35), [Presentation Model, line 30](../../content/patterns/presentation-model.md#L30), and the other seven articles marked R5 in the assessment.

Examples include “This article retains the existing `data-publish-subscribe-distribution` ID” and “This article uses `presentation-model` as the canonical ID.” These are authoring facts, not design concepts. The same interruption appears as former-title or search-alias narration elsewhere.

**Reader impact:** The central explanation briefly becomes a record of repository maintenance. This is polish, not a reason to remove established aliases or technical distinctions.

**Suggested rewrites:**

> Publish-Subscribe is also called Pub/Sub or Publisher-Subscriber. Each independent interest has its own subscription; workers sharing one subscription divide that interest's work.

> Presentation Model gives editable UI state and behavior a home outside the widgets. It is also called Model-View-ViewModel (MVVM); binding conventions vary by framework.

Keep historical pattern naming when it teaches something, such as Fowler's Strangler names. Move canonical-ID, previous-catalog-title, and search-index details to the existing metadata sidecar.

### R8 Low: Use object identity rather than desktop position in alternative text

**Location:** [Test Data Builder, line 129](../../content/patterns/test-data-builder.md#L129), and the `<desc>` in both `test-data-builder-isolation.svg` variants.

The description says **“Adding fragile to the left order changes only that list.”** The desktop figure puts Order A on the left; the phone figure puts it above Order B. The visible labels are clear, but the shared alternative description assumes a layout that does not hold at both widths.

**Suggested replacement:**

> One immutable order builder produces Order A and Order B, each with its own empty notes list. Adding fragile to Order A changes only A's list. Configuring an express variant creates a separate builder recipe and leaves the base recipe standard.

Apply the same wording to the article alt text and both SVG descriptions when editing later. The [phone evidence](../../.local/software-readability-audit/captures/test-data-builder-390-isolation.png) confirms the vertical arrangement. The audit makes no asset changes.

## Strong examples to retain

- **Strategy:** An actual choice between two delivery policies, explicit cents/kilograms, and a small callable boundary. The explanation says why the conditional matters without treating every conditional as a design problem.
- **Builder:** The prose explicitly narrows the rich report scenario before showing a smaller implementation. The copied tuple makes result ownership visible.
- **Humble Object:** A 23-line example connects extracted decisions with a real input/output seam. The adapter check is distinguished from real toolkit wiring.
- **Parameterized Test:** Named boundary cases explain what varies, independently written expectations protect the assertion, and the two-method/twelve-subtest distinction is explicit.
- **Federated Identity:** Two issuers sharing an email and subject string make identity association understandable. IdP and RP are expanded where introduced.
- **Message Translator:** Kilograms, grams, and carrier status codes show why renaming fields cannot establish semantic compatibility.
- **Backpressure:** The blocked write gives feedback a visible consequence: the next chunk is not requested. The later arithmetic explains where backlog moves.

## Shared editorial improvements

Use a small **problem → changed collaboration → observed result** spine in every long example. The implementation may remain detailed; orient the reader before asking them to inspect it. Use pattern-specific verbs and names to point to the critical path.

Keep validation, consistency, lifecycle, security, and failure qualifications. Group incidental input ranges separately from the causal trace, and place a qualification beside the guarantee it limits. Do not replace accurate engineering explanations with an unqualified happy path.

Introduce a technical term with its concrete job, then use the established term consistently. A short parenthetical expansion is usually enough for peripheral acronyms. Preserve meaningful aliases, while removing statements about how the repository stores them.

Treat output as part of the explanation. Name quantities and units directly. Use a table when comparing several positional fields or denominators. Keep existing explanatory captions that tell readers what an arrow or result does—and does not—mean.

Format the most frequently read code paths for the article column, checking phones explicitly. Break long SQL, function calls, and conditions at syntactic boundaries; keep runnable text and an accessible scrolling fallback. Do not adopt a blanket line limit or reduce type size to fit more characters.

Keep the eight shared sections as navigation, but avoid repeating an entire definition in each. The collection's recurring “mental model” phrasing is a useful signpost here; no rewrite is recommended merely to vary that wording.

## Revision plan

1. **First pass: remove avoidable reading work.** Wrap the widest Active Record/Data Mapper/Unit of Work lines; bring the short Unit of Work/Repository/CQRS/Event Sourcing/Outbox/Saga traces forward; lead Canary with its observed decision. Preserve example behavior and run the corresponding existing validators after any later edits.
2. **Second pass: clarify interpretation.** Add the Proactor result table and named Memoization results. Introduce term/fencing/selector jobs before their formal vocabulary. Expand DTO/ETL where needed.
3. **Final polish: keep prose about the pattern.** Remove catalog bookkeeping from nine central explanations; make Test Data Builder's alternative text layout-independent. Update affected authoring descriptions and recheck responsive figures if these edits are implemented.

No revision is requested for the 94 articles marked Clear. That means no material issue was identified in this structured pass, rather than a claim that every sentence is beyond improvement.

## Article-by-article assessment

**Clear** means the reviewed explanation has no material readability finding. **Reorder, Define, Clarify output, and Wrap code** identify a specific local revision. **Polish** identifies a small wording or description change. Canonical IDs are exposed here for implementation traceability, rather than proposed as public article prose.

### Application Architecture

| Article and canonical ID                                                                                                             | Assessment | Observation                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [Layers](../../content/patterns/layers.md) · `layers`                                                                                | Clear      | The duplicated website/batch fee makes the dependency problem concrete; logical layers and physical tiers are distinguished. |
| [Ports and Adapters](../../content/patterns/ports-and-adapters.md) · `ports-and-adapters`                                            | Clear      | The stock example gives incoming and outgoing ports recognizable jobs; storage substitution has a visible result.            |
| [Microkernel](../../content/patterns/microkernel.md) · `microkernel`                                                                 | Clear      | Optional document analyzers explain the extension boundary; the application/OS distinction prevents a misleading analogy.    |
| [Pipes and Filters](../../content/patterns/pipes-and-filters.md) · `pipes-and-filters`                                               | Clear      | Celsius selection before Fahrenheit conversion makes stage order meaningful rather than decorative.                          |
| [Blackboard](../../content/patterns/blackboard.md) · `blackboard`                                                                    | Clear      | The evolving document hypothesis explains why a controller chooses work rather than following a fixed pipeline.              |
| [Modular Monolith](../../content/patterns/modular-monolith.md) · `modular-monolith`                                                  | Clear      | Customer eligibility gives module ownership a purpose; one release boundary remains explicit.                                |
| [Microservices](../../content/patterns/microservices.md) · `microservices`                                                           | Clear      | Independent releases lead into a lost-reply scenario; pending versus rejected outcomes are distinguished.                    |
| [Dependency Injection](../../content/patterns/dependency-injection.md) · `dependency-injection`                                      | Clear      | Construction and use are separated through a concrete price source; connection ownership is explained.                       |
| [Functional Core, Imperative Shell](../../content/patterns/functional-core-imperative-shell.md) · `functional-core-imperative-shell` | Clear      | The replenishment example connects pure decisions with validation before output is opened.                                   |

### Domain Modeling and Business Logic

| Article and canonical ID                                                                     | Assessment | Observation                                                                                                             |
| -------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| [Domain Model](../../content/patterns/domain-model.md) · `domain-model`                      | Clear      | Capacity, cancellation, and duplicated counters make the need for object-owned rules understandable.                    |
| [Entity](../../content/patterns/entity.md) · `entity`                                        | Clear      | Two cameras and a rename separate stable identity from labels and current attributes.                                   |
| [Value Object](../../content/patterns/value-object.md) · `value-object`                      | Clear      | Shared date mutation supplies a convincing problem; replacement values and the excluded checkout date are explained.    |
| [Aggregate](../../content/patterns/aggregate.md) · `aggregate`                               | Clear      | Package weights expose the shared invariant; the root and persistence boundary have distinct responsibilities.          |
| [Domain Service](../../content/patterns/domain-service.md) · `domain-service`                | Clear      | Choosing among suitable rooms makes the ownerless domain operation concrete without inventing a service layer.          |
| [Domain Event](../../content/patterns/domain-event.md) · `domain-event`                      | Clear      | Dispatch facts are distinguished from commands and later reactions; occurrence time and delivery remain separate.       |
| [Specification](../../content/patterns/specification.md) · `specification`                   | Clear      | The queue and release screen show why the same criterion is reused; composition is presented as optional.               |
| [Bounded Context](../../content/patterns/data-bounded-contexts.md) · `data-bounded-contexts` | Polish     | Sales, Billing, and Access give the language boundary a strong example; remove canonical-ID maintenance narration. [R5] |
| [Service Layer](../../content/patterns/service-layer.md) · `service-layer`                   | Clear      | Website and administrator entry points share one booking operation and its transaction outcome.                         |
| [Transaction Script](../../content/patterns/transaction-script.md) · `transaction-script`    | Clear      | A small stock issue justifies procedural organization; the name is separated from database transaction guarantees.      |

### Persistence and Transactions

| Article and canonical ID                                                                                    | Assessment | Observation                                                                                                               |
| ----------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| [Repository](../../content/patterns/repository.md) · `repository`                                           | Reorder    | The contract is clear, but show the unchanged caller before the two full storage implementations. [R1]                    |
| [Data Mapper](../../content/patterns/data-mapper.md) · `data-mapper`                                        | Define     | The start-plus-duration mapping is clear; expand DTO/ETL and wrap the one-line schema. [R6, R7]                           |
| [Active Record](../../content/patterns/active-record.md) · `active-record`                                  | Wrap code  | The task owns its rule and SQL clearly; the one-line schema is over four phone code widths. [R7]                          |
| [Unit of Work](../../content/patterns/unit-of-work.md) · `unit-of-work`                                     | Reorder    | Tracking versus committing is clear in prose; move the short registration/commit trace ahead of lifecycle machinery. [R1] |
| [Identity Map](../../content/patterns/identity-map.md) · `identity-map`                                     | Clear      | Billing and shipping share one correction; the later direct SQL edit usefully distinguishes identity from freshness.      |
| [Lazy Load](../../content/patterns/lazy-load.md) · `lazy-load`                                              | Clear      | Titles versus bodies make deferral concrete; missing rows, valid NULL, and N+1 costs are distinguished.                   |
| [Optimistic Offline Lock](../../content/patterns/optimistic-offline-lock.md) · `optimistic-offline-lock`    | Clear      | Alice and Bob make stale edits recognizable; offline is explained without implying disconnected devices.                  |
| [Pessimistic Offline Lock](../../content/patterns/pessimistic-offline-lock.md) · `pessimistic-offline-lock` | Clear      | Long edits justify reservation before saving; the logical lock is distinguished from a held database transaction.         |
| [Database per Service](../../content/patterns/database-per-service.md) · `database-per-service`             | Clear      | The shared-table dependency is recognizable; private schemas versus physical servers are carefully distinguished.         |
| [CQRS](../../content/patterns/cqrs.md) · `cqrs`                                                             | Reorder    | Two models are explained well; put the seat-booking result before dense connection and validation preconditions. [R1]     |
| [Event Sourcing](../../content/patterns/data-event-sourcing.md) · `data-event-sourcing`                     | Reorder    | Command versus accepted fact is strong; lead the runnable example with its three-event reconstruction trace. [R1]         |
| [Transactional Outbox](../../content/patterns/data-transactional-outbox.md) · `data-transactional-outbox`   | Reorder    | The commit/publication gap is concrete; introduce the duplicate-publication trace before the connection details. [R1]     |

### Presentation and UI State

| Article and canonical ID                                                                                    | Assessment | Observation                                                                                                              |
| ----------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| [Model-View-Controller](../../content/patterns/model-view-controller.md) · `model-view-controller`          | Clear      | Two displays of one seat count make the three responsibilities visible; classic and web variants are qualified.          |
| [Model-View-Presenter](../../content/patterns/model-view-presenter.md) · `model-view-presenter`             | Clear      | The recording view makes toolkit independence observable; presenter decisions remain separate from model rules.          |
| [Presentation Model](../../content/patterns/presentation-model.md) · `presentation-model`                   | Polish     | Draft versus accepted name is a strong explanation; keep the MVVM relationship and remove canonical-ID narration. [R5]   |
| [Front Controller](../../content/patterns/front-controller.md) · `front-controller`                         | Clear      | Shared request preparation and delegated handlers explain more than routing alone; the simulation boundary is explicit.  |
| [Template View](../../content/patterns/template-view.md) · `template-view`                                  | Polish     | The product name demonstrates escaping clearly; remove the statement about a compact spelling being a search alias. [R5] |
| [Unidirectional Data Flow](../../content/patterns/unidirectional-data-flow.md) · `unidirectional-data-flow` | Polish     | Out-of-order search results justify owned state; the sentence about search aliases adds little to that explanation. [R5] |

### Messaging and Integration

| Article and canonical ID                                                                                                   | Assessment | Observation                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| [Publish-Subscribe](../../content/patterns/data-publish-subscribe-distribution.md) · `data-publish-subscribe-distribution` | Polish     | Independent subscription queues are clear; remove the old-ID and former-title maintenance sentence. [R5]                   |
| [Request-Reply](../../content/patterns/request-reply.md) · `request-reply`                                                 | Clear      | Reordered stock answers explain conversation state; request IDs, deadlines, and unknown stock have explicit meanings.      |
| [Correlation Identifier](../../content/patterns/correlation-identifier.md) · `correlation-identifier`                      | Clear      | Two prices for one order explain why order ID alone is insufficient; envelope identity is distinguished.                   |
| [Content-Based Router](../../content/patterns/content-based-router.md) · `content-based-router`                            | Clear      | Review-before-express precedence supplies an understandable routing decision and unmatched-message policy.                 |
| [Message Translator](../../content/patterns/message-translator.md) · `message-translator`                                  | Clear      | Kilograms to grams and carrier codes reveal semantic conversion beyond renaming fields.                                    |
| [Anti-Corruption Layer](../../content/patterns/anti-corruption-layer.md) · `anti-corruption-layer`                         | Clear      | Active supplier records versus sellable stock show why vocabulary protection matters beyond format conversion.             |
| [Splitter](../../content/patterns/splitter.md) · `splitter`                                                                | Clear      | Order lines establish meaningful child work; stable identities and all-input validation qualify the handoff.               |
| [Aggregator](../../content/patterns/aggregator.md) · `aggregator`                                                          | Clear      | Repeated packing results explain correlation and completeness; reported quantity is distinguished from fulfilled quantity. |
| [Idempotent Receiver](../../content/patterns/idempotent-receiver.md) · `idempotent-receiver`                               | Clear      | The repeated mug receipt links operation identity with atomic effect protection; duplicate delivery is not hidden.         |
| [Dead Letter Channel](../../content/patterns/data-dead-letter-queues.md) · `data-dead-letter-queues`                       | Clear      | Retry exhaustion leads to retained recovery ownership; the channel is distinguished from successful business completion.   |
| [Competing Consumers](../../content/patterns/competing-consumers.md) · `competing-consumers`                               | Clear      | One stream and interchangeable workers are distinguished from independent interests; redelivery remains explicit.          |

### Distributed Data and Coordination

| Article and canonical ID                                                         | Assessment | Observation                                                                                                                            |
| -------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [Saga](../../content/patterns/saga.md) · `saga`                                  | Reorder    | Compensation is correctly explained as new work; preview the failed carrier and resumed compensation before the long coordinator. [R1] |
| [API Composition](../../content/patterns/api-composition.md) · `api-composition` | Define     | Batch calls and identity matching are concrete; translate DTOs and owner-local revisions into ordinary response-record language. [R6]  |
| [Leader Election](../../content/patterns/leader-election.md) · `leader-election` | Define     | The stale-leader problem is strong; define term and resource-side fencing before relying on them. [R4]                                 |
| [Lease](../../content/patterns/lease.md) · `lease`                               | Clear      | A paused worker motivates expiry; milliseconds and the exact renewal boundary make the model interpretable.                            |

### Concurrency and Resource Management

| Article and canonical ID                                                                                          | Assessment     | Observation                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [Reactor](../../content/patterns/reactor.md) · `reactor`                                                          | Define         | Readiness and partial records are well distinguished; introduce the selector's job before synchronous event demultiplexer. [R4] |
| [Proactor](../../content/patterns/proactor.md) · `proactor`                                                       | Clarify output | Initiation versus completion is clear; replace the dense positional output sentence with a labeled result table. [R3]           |
| [Active Object](../../content/patterns/active-object.md) · `active-object`                                        | Clear          | Queued invocations, future results, and one state owner are explicit; the stock rejection leaves a visible next outcome.        |
| [Monitor Object](../../content/patterns/monitor-object.md) · `monitor-object`                                     | Clear          | Caller-thread execution and condition rechecking are clear; notification is distinguished from immediate lock handoff.          |
| [Producer-Consumer](../../content/patterns/producer-consumer.md) · `producer-consumer`                            | Clear          | A bounded handoff separates reception and parsing; result ordering is distinguished from processing order.                      |
| [Thread Pool](../../content/patterns/thread-pool.md) · `thread-pool`                                              | Clear          | Reusable workers and a rolling submission window explain separate limits; filesystem work provides a suitable context.          |
| [Resource Pool](../../content/patterns/resource-pool.md) · `resource-pool`                                        | Clear          | Borrow/reset/return ownership is explicit; the tiny buffer example is honestly presented as coordination, not speed advice.     |
| [Scoped Locking](../../content/patterns/scoped-locking.md) · `scoped-locking`                                     | Clear          | The missing unlock is a concrete failure; scope cleanup is separated from lock ordering and rollback.                           |
| [Scoped Resource Management](../../content/patterns/scoped-resource-management.md) · `scoped-resource-management` | Clear          | Nested file and gzip lifetimes explain reverse cleanup order and partial acquisition without hiding ownership.                  |

### Reliability and Failure Handling

| Article and canonical ID                                                                                                                   | Assessment | Observation                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| [Timeout](../../content/patterns/timeout.md) · `timeout`                                                                                   | Clear      | A shared 300 ms budget is easier to follow than independent waits; expiry is separated from stopped remote work.          |
| [Exponential Backoff with Jitter](../../content/patterns/data-exponential-backoff-with-jitter.md) · `data-exponential-backoff-with-jitter` | Clear      | Synchronized workers explain jitter; the example accounts for attempts, waiting, and total elapsed time.                  |
| [Circuit Breaker](../../content/patterns/data-circuit-breakers.md) · `data-circuit-breakers`                                               | Clear      | Closed/open/half-open meanings are explained; cooldown permits a probe rather than proving recovery.                      |
| [Bulkhead](../../content/patterns/data-workload-isolation.md) · `data-workload-isolation`                                                  | Polish     | Backfill versus live capacity makes isolation clear; keep the useful distinction and remove earlier-title narration. [R5] |
| [Queue-Based Load Leveling](../../content/patterns/queue-based-load-leveling.md) · `queue-based-load-leveling`                             | Clear      | Eight reports and a two-per-tick budget demonstrate smoothing; queue storage is separated from new throughput.            |
| [Backpressure](../../content/patterns/data-backpressure.md) · `data-backpressure`                                                          | Clear      | Awaited completion visibly gates the next read; queued versus unfinished work is carefully distinguished.                 |
| [Load Shedding](../../content/patterns/load-shedding.md) · `load-shedding`                                                                 | Clear      | Two-unit and one-unit operations make the admission decision concrete; fit is not confused with priority.                 |
| [Health Endpoint](../../content/patterns/health-endpoint.md) · `health-endpoint`                                                           | Clear      | Startup, liveness, and readiness have different consumers and meanings; status-code columns are explicitly identified.    |

### Performance and Scalability

| Article and canonical ID                                                                           | Assessment     | Observation                                                                                                                       |
| -------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [Cache-Aside](../../content/patterns/cache-aside.md) · `cache-aside`                               | Clear          | Two reads and an invalidating write explain ownership; disposable copies and authority remain distinct.                           |
| [Memoization](../../content/patterns/memoization.md) · `memoization`                               | Clarify output | The immutable project graph explains equivalence; name minutes and cache misses directly in the output. [R3]                      |
| [Materialized View](../../content/patterns/data-materialized-views.md) · `data-materialized-views` | Clear          | Generation, count, and currency units are identified; stale, failed, and recovered refreshes are meaningfully different.          |
| [Sharding](../../content/patterns/data-horizontal-sharding.md) · `data-horizontal-sharding`        | Polish         | Stable buckets and changing placement are clear; remove the former-title sentence while retaining partitioning distinctions. [R5] |
| [Batching](../../content/patterns/batching.md) · `batching`                                        | Clear          | The 42-to-27 ms arithmetic explains fixed overhead; collection delay is explicitly additional.                                    |
| [Request Coalescing](../../content/patterns/request-coalescing.md) · `request-coalescing`          | Clear          | One departing waiter tests shared-work ownership; coalescing is distinguished from completed-result caching and batching.         |

### Security and Access Boundaries

| Article and canonical ID                                                                                          | Assessment | Observation                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| [Reference Monitor](../../content/patterns/reference-monitor.md) · `reference-monitor`                            | Clear      | A forgotten export check motivates complete mediation; the simulator's lack of hostile-code isolation is explicit.        |
| [Gatekeeper](../../content/patterns/gatekeeper.md) · `gatekeeper`                                                 | Clear      | Exposure and privilege are separated clearly; syntax validation and private business authorization have different limits. |
| [Federated Identity](../../content/patterns/federated-identity.md) · `federated-identity`                         | Clear      | The same email across two issuers makes identity association concrete; IdP and RP are expanded on introduction.           |
| [Externalized Authorization](../../content/patterns/externalized-authorization.md) · `externalized-authorization` | Clear      | Deciding versus enforcing access is clear; PDP and PEP are introduced with their responsibilities.                        |
| [Valet Key](../../content/patterns/valet-key.md) · `valet-key`                                                    | Clear      | One export, operation, and interval make delegation concrete; the ledger model is distinguished from signed URLs.         |
| [Audit Logging](../../content/patterns/audit-logging.md) · `audit-logging`                                        | Clear      | The credit change supplies an accountability question; committed changes and denied attempts have distinct evidence.      |

### Testing and Testability

| Article and canonical ID                                                                                                                | Assessment | Observation                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| [Test Double](../../content/patterns/test-double.md) · `test-double`                                                                    | Clear      | The real checkout and controlled payment gateway explain the seam; stub/spy roles are separated from library naming. |
| [Test Data Builder](../../content/patterns/test-data-builder.md) · `test-data-builder`                                                  | Polish     | The threshold and fresh notes lists are clear; replace left order in the figure description with Order A. [R8]       |
| [Consumer-Driven Contract Tests](../../content/patterns/data-consumer-driven-contract-tests.md) · `data-consumer-driven-contract-tests` | Clear      | Adding a field versus renaming a required field demonstrates consumer dependence without requiring live services.    |
| [Humble Object](../../content/patterns/humble-object.md) · `humble-object`                                                              | Clear      | A small shipping-label function shows the extracted decision and leaves adapter wiring as separate evidence.         |
| [Golden Master / Approval Testing](../../content/patterns/golden-master-approval-testing.md) · `golden-master-approval-testing`         | Clear      | A reviewed baseline and one-cent change explain the mechanism; normalization and approval do not imply correctness.  |
| [Parameterized Test](../../content/patterns/parameterized-test.md) · `parameterized-test`                                               | Clear      | Named tariff boundaries make case data readable; two methods versus twelve subtests is explained accurately.         |

### Evolution and Delivery

| Article and canonical ID                                                                                           | Assessment | Observation                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [Strangler Fig](../../content/patterns/data-incremental-replacement.md) · `data-incremental-replacement`           | Polish     | Catalog-before-invoices makes slices concrete; preserve historical pattern names but remove catalog URL-maintenance narration. [R5] |
| [Expand–Migrate–Contract](../../content/patterns/data-expand-migrate-contract.md) · `data-expand-migrate-contract` | Clear      | Two names for one backing value explain supported intermediate states; the limits of this non-database example are clear.           |
| [Branch by Abstraction](../../content/patterns/branch-by-abstraction.md) · `branch-by-abstraction`                 | Clear      | Vendor rate replacement explains releasable coexistence; branch is explicitly separated from a long-lived source branch.            |
| [Feature Toggle](../../content/patterns/feature-toggle.md) · `feature-toggle`                                      | Clear      | Deployed receipt alternatives separate deployment from exposure; trusted account context and fallback behavior are explicit.        |
| [Blue-Green Deployment](../../content/patterns/blue-green-deployment.md) · `blue-green-deployment`                 | Clear      | An admitted request stays with its old environment; rollback is qualified by schema compatibility and drain ownership.              |
| [Canary Release](../../content/patterns/ml-canary-rollout-with-rollback.md) · `ml-canary-rollout-with-rollback`    | Reorder    | The central release decision is clear; lead with the 0/10 then 3/25 trace before fixture-generation rules. [R2]                     |
| [Deployment Pipeline](../../content/patterns/deployment-pipeline.md) · `deployment-pipeline`                       | Clear      | Promoting identical tested bytes is concrete; the artifact digest defeats reuse of evidence under an unchanged build name.          |
| [Shadow Traffic](../../content/patterns/ml-shadow-deployment.md) · `ml-shadow-deployment`                          | Polish     | The deadline changes the comparison set, not the model; remove canonical-ID maintenance narration. [R5]                             |

### GoF Design Patterns

| Article and canonical ID                                                                                 | Assessment | Observation                                                                                                             |
| -------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| [Abstract Factory](../../content/patterns/abstract-factory.md) · `abstract-factory`                      | Clear      | Mixed widget families make compatibility concrete; the family choice is distinct from selecting each product.           |
| [Adapter](../../content/patterns/adapter.md) · `adapter`                                                 | Clear      | The mail submission contract explains conversion and its limits; acceptance is not confused with delivery.              |
| [Bridge](../../content/patterns/bridge.md) · `bridge`                                                    | Clear      | Shapes and rendering backends supply two independent dimensions; the example acknowledges contract growth.              |
| [Builder](../../content/patterns/builder.md) · `builder`                                                 | Clear      | Incomplete reports motivate a real completion boundary rather than a cosmetic fluent API.                               |
| [Chain of Responsibility](../../content/patterns/chain-of-responsibility.md) · `chain-of-responsibility` | Clear      | Focused controls give receiver selection a concrete order and stopping rule.                                            |
| [Command](../../content/patterns/command.md) · `command`                                                 | Clear      | Menu, shortcut, and undo share an operation; representation is distinguished from execution and reversibility.          |
| [Composite](../../content/patterns/composite.md) · `composite`                                           | Clear      | Nested editor groups make recursive uniform operations visible; leaf child-management tradeoffs remain explicit.        |
| [Decorator](../../content/patterns/decorator.md) · `decorator`                                           | Clear      | Compression and encryption make wrapper order observable; the contract is more than a matching method name.             |
| [Facade](../../content/patterns/facade.md) · `facade`                                                    | Clear      | Repeated project-export orchestration gives the interface a useful purpose; cleanup remains a responsibility.           |
| [Factory Method](../../content/patterns/factory-method.md) · `factory-method`                            | Clear      | A stable publishing workflow and varying exporter explain the overridable creation point.                               |
| [Flyweight](../../content/patterns/flyweight.md) · `flyweight`                                           | Clear      | Trees separate shared species data from positions; intrinsic and extrinsic state are grounded immediately.              |
| [Interpreter](../../content/patterns/interpreter.md) · `interpreter`                                     | Clear      | Task-filter expressions give a small grammar concrete meaning without requiring a textual parser.                       |
| [Iterator](../../content/patterns/iterator.md) · `iterator`                                              | Clear      | List, cursor, and file sources justify traversal abstraction; ownership and mutation policies are acknowledged.         |
| [Mediator](../../content/patterns/mediator.md) · `mediator`                                              | Clear      | The settings dialog centralizes meaningful collaboration rules instead of merely inserting a middle object.             |
| [Memento](../../content/patterns/memento.md) · `memento`                                                 | Clear      | The editor owns coherent restoration; the caretaker's role does not require knowing internal fields.                    |
| [Observer](../../content/patterns/observer.md) · `observer`                                              | Clear      | Document-title subscribers explain notifications; ordering dependencies are identified as a remaining risk.             |
| [Prototype](../../content/patterns/prototype.md) · `prototype`                                           | Clear      | Duplicating a shape while replacing identity clarifies shallow/deep copying decisions.                                  |
| [Proxy](../../content/patterns/proxy.md) · `proxy`                                                       | Clear      | Lightweight image representatives make deferred access concrete; mediation does not promise invisible failure behavior. |
| [Singleton](../../content/patterns/singleton.md) · `singleton`                                           | Clear      | The scanner gives instance scope a purpose while exposing the separate costs of global lookup.                          |
| [State](../../content/patterns/state.md) · `state`                                                       | Clear      | Upload operations depend on a visible lifecycle; racing transitions remain a coordination concern.                      |
| [Strategy](../../content/patterns/strategy.md) · `strategy`                                              | Clear      | The delivery rule stays separate from checkout; a small example demonstrates selection and its contract.                |
| [Template Method](../../content/patterns/template-method.md) · `template-method`                         | Clear      | Importer variation is placed inside a shared correctness sequence; subclass responsibilities remain explicit.           |
| [Visitor](../../content/patterns/visitor.md) · `visitor`                                                 | Clear      | Expression operations demonstrate type-specific dispatch; adding operations versus element types is distinguished.      |

## Rendering evidence and limits

The isolated snapshot was checked at **1440 × 1000** and **390 × 844** CSS pixels. All **236 article route checks** completed; every page had the eight expected H2 sections. No page-wide horizontal overflow was detected. All **418 responsive SVG loads** succeeded, with 209 figures per width and the phone variants selected at 390 pixels. All figures had nonempty alternative text.

The article body measured **19.44 px on desktop and 16.8 px on phone**. All overflowing code containers were keyboard-focusable. The smallest measured SVG label was approximately **13.96 px on desktop and 14.19 px on phone**. Font size alone does not establish comprehension, but no unreadable shrinking of the desktop diagram into the phone column was observed.

Native SVG text bounds were measured in all **418 variants**. No label extended outside its viewBox. One bounding-box intersection was flagged in Sharding's desktop handoff footer, between “Bucket 6 keeps its identity; the owner changes” and “Old B copy: absent.” Visual review shows distinct, legible lines: their text boxes overlap slightly, rather than the visible letters obscuring one another. Slightly more spacing is optional polish, not a confirmed obscured-label defect.

Manual visual review used phone opening sheets for twelve articles, desktop reference captures, selected code views, and full-size figures. Captures include the confirmed code-width and layout-dependent-description issues. The screenshot set is broader than the manually inspected sample; route and geometry checks should not be mistaken for human inspection of every figure. Sticky navigation can appear inside tall element screenshots; it is page chrome, not native SVG content.

The report and its structured companion follow the existing `docs/pattern-packages` review convention:

- [Structured audit and all 118 assessments](software-engineering-readability-audit.json).
- [Browser measurements](../../.local/software-readability-audit/browser-checks.json).
- [SVG label measurements](../../.local/software-readability-audit/svg-label-checks.json).
- [Local source inventory and fingerprints](../../.local/software-readability-audit/inventory.json).
- [Local captures](../../.local/software-readability-audit/captures/).

The suggested SQL-formatting rewrite was checked against the original schema for eight boundary and null cases; accepted and rejected outcomes matched. Report links and all 118 assessment entries were checked.

The audit is editorial judgment for the stated audience, not measured learning outcomes or a readability certification. Phone checks are browser emulation, not physical-device testing. All example programs were not rerun; this is not a complete code-correctness or external-source accuracy audit. Embedded explorer controls and alternate states were not exercised. The preview uses an isolated source/content snapshot, not a new production build. Local evidence links rely on the retained `.local` directory.

All **118 audited article fingerprints remained unchanged**. Article content, application code, collections, and assets were not edited. Only the audit report and its companion record were added to documentation; evidence and preview files remain under `.local`. Nothing was published, deployed, pushed, or submitted as a pull request.
