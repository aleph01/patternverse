---
id: data-bounded-contexts
type: pattern
title: Bounded Contexts
summary: The conflicting meanings of active customer establish why model
  boundaries matter.
status: published
aliases: []
tags:
  - data-engineering
  - meaning-boundaries
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

**What it is for**

Keep business meanings and rules coherent within a defined boundary, while making relationships with other models explicit.

A software company wants a single customer table. Sales needs commercial relationships and renewal opportunities. Billing needs payer details, invoices, and outstanding balances. Service access needs workspaces, users, and permissions.

The table grows. Its `status` column becomes especially troublesome. Does “active” mean an established commercial relationship, an account with no overdue invoices, or a workspace whose users can sign in?

Each interpretation makes sense somewhere. Combining them into one field creates a model that nobody can use without exceptions.

Bounded Contexts gives each model a clear scope. Within that scope, its terms have agreed meanings and its rules fit together. Connections to other contexts are deliberate translations rather than assumptions that matching words describe identical things.

## A boundary around meaning

Eric Evans introduced Bounded Context as part of Domain-Driven Design. The pattern establishes where a particular model applies, allowing teams to maintain a consistent language within that boundary. His accompanying Context Map pattern makes the relationships between models explicit. [Domain-Driven Design Reference](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf).

A context contains more than a collection of fields. It includes concepts, relationships, operations, and business rules.

Within billing, an account might have payment terms and outstanding invoices. Within service access, a workspace might have members and entitlements. The same company participates in both, but neither model must absorb every responsibility of the other.

Martin Fowler describes how apparently familiar concepts such as customer and product develop different meanings across a large organization. Bounded contexts preserve coherent local models while explicitly connecting them. [Bounded Context](https://martinfowler.com/bliki/BoundedContext.html).

The practical question is:

> Within what scope can people use this model without repeatedly correcting what its terms mean?

## One company, three useful models

![An illustrative software business has three contexts: Sales models commercial account AC-72, Billing models payer accounts BILL-19 and BILL-20, and Service Access models workspace WS-301. Explicit mappings connect the records without equating their states or business rules.](../assets/data-engineering/bounded-contexts.svg "Commercial account, payer accounts and service workspace have different identities and states; mappings connect the contexts.")

Consider an illustrative business customer, Northstar.

Sales represents Northstar as commercial account AC-72. Billing maintains two payer accounts because separate divisions pay different invoices. The service-access model contains workspace WS-301, funded through BILL-19.

Their states can legitimately differ:

| Context | Record | State |
|---|---|---|
| Sales | AC-72 | Established relationship |
| Billing | BILL-19 | Current |
| Billing | BILL-20 | Overdue |
| Service access | WS-301 | Enabled |

A universal customer status cannot express this situation clearly.

Suppose a pipeline joins records by company name, sees BILL-20’s overdue balance, and marks every Northstar workspace as suspended. The problem is not merely poor matching. It has imported a billing condition into access policy without establishing which payer funds which workspace or what suspension rules apply.

An explicit mapping identifies WS-301’s relationship to BILL-19. The access context then applies its own policy, which might include grace periods, contractual exceptions, or manual review.

Billing publishes the relevant payment condition. Access decides its consequence for service use. That division of responsibility must itself be agreed; it is not a universal rule for every business.

## Translate relationships, not just column names

A boundary becomes useful when the integration preserves what each side means.

Renaming `customer_id` to `account_id` is insufficient if one side identifies a corporate group and the other identifies an individual payer.

The translation needs to establish the relationship: perhaps one commercial account maps to several payer accounts, with effective dates and a designated billing responsibility for each workspace.

Some integrations require only a small published interface. Others need a substantial translation component. The Anti-Corruption Layer pattern protects a local model by translating communication with a system whose semantics differ. Microsoft documents this as applicable to external and legacy integrations, including implementations within a monolith. [Anti-Corruption Layer](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer).

The translation should also preserve uncertainty. An unmapped account needs an explicit unresolved state or exception path. Silently treating it as the “closest” customer can turn incomplete integration into incorrect business action.

## “Available” depends on the decision

An illustrative retailer has twelve units of a product physically present in a warehouse. Five are reserved for accepted orders.

Warehouse operations reports twelve on hand. Order capture reports seven available to promise.

These are compatible measurements serving different decisions. Warehouse staff need to locate and handle physical stock. Order capture needs to avoid promising stock already committed elsewhere.

A shared column called `available_quantity` would obscure the distinction. Clear local concepts—`on_hand_quantity`, `reserved_quantity`, and `available_to_promise`—make the relationship discussable.

The contexts still need an integration agreement: which reservations count, how quickly changes propagate, and how damaged or restricted stock affects the calculation.

Bounded contexts do not make contradictory observations acceptable. If two systems both claim to report the same physical stock at the same instant and disagree, that remains a discrepancy to investigate.

The pattern accommodates different models of reality. It does not remove the need to reconcile claims about the same fact.

## Salesforce/MuleSoft: consistency within a federation

Salesforce Engineering’s published API federation design offers a documented application of the idea.

It describes grouping services and event streams within a bounded context, then exposing them through a consistent external API. Its rules address three concerns: shared semantics, consistent entity identifiers, and compatible schemas.

Services need not expose identical schemas. However, an identifier for a particular entity type must refer to the same entity within that context, and corresponding attributes must remain compatible.

The article connects this design to MuleSoft DataGraph, describing how API contracts and metadata about entity keys and references support federation. [API Federation: Growing Scalable API Landscapes](https://engineering.salesforce.com/api-federation-growing-scalable-api-landscapes-a0f1f0dad506/).

This illustrates an important balance. Bounded contexts permit different models across boundaries while demanding coherence inside them. Dividing an API landscape into named boxes achieves little if the services inside each box still disagree about identity and meaning.

## What makes the boundary hold

**The language must be shared by the people doing the work.** A glossary is useful when it reflects conversations, rules, code, and data. A centrally invented vocabulary that nobody uses provides weak protection.

**Responsibility must be explicit.** Teams need to know who defines a concept, changes its rules, publishes its interface, and resolves disagreements.

**Mappings need their own semantics.** A relationship can be one-to-many, temporary, incomplete, or historically revised. A common identifier does not prove that every attribute or lifecycle is shared.

**Timing must match the decision.** A delayed billing update may be acceptable for a trend report and unacceptable for a particular authorization decision. The boundary alone guarantees neither immediate consistency nor reliable delivery.

**Cross-context requirements need a protocol.** If a business outcome requires coordinated decisions, the design must provide that coordination or reconsider the boundary. Drawing separate boxes does not solve a shared invariant.

A bounded context is also not automatically one microservice, one database, or one department. Microsoft’s domain-analysis guidance establishes contexts before identifying service boundaries. [Domain analysis](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis).

## The cost of explicit differences

Separate models require mappings, interface tests, documentation, and ownership. Some information will be represented more than once. Events and copied data introduce questions about delay, replay, correction, and deletion.

Cross-context analytics also needs deliberate integration. A shared customer dimension can be useful, provided its identity and scope are defined. Local statuses should remain identifiable instead of disappearing into a misleading enterprise-wide flag.

The pattern helps when competing meanings repeatedly produce exceptions, when teams need different rules for related concepts, or when an external system would otherwise dictate the local model.

It offers less benefit when one small team already works with a simple, coherent model. Excessive splitting creates translation work without protecting meaningful differences.

Common mistakes include creating a context for every entity, copying the organization chart, and building separate services that still depend on unrestricted changes to one shared model.

Useful boundaries usually emerge through concrete disagreements: which identity matters, which rule applies, who decides, and what a change means. They should evolve as those answers become clearer.

## Related patterns

[[data-shared-business-vocabulary|Shared Business Vocabulary]] establishes consistent language within an agreed scope.

[[data-identity-crosswalks|Identity Crosswalks]] connect identifiers across models without equating every represented concept.

[[data-explicit-data-contracts|Explicit Data Contracts]] publish the meaning and delivery expectations of information crossing a boundary.

**Anti-Corruption Layer** implements translation that protects a local model from external assumptions.

[[data-conformed-dimensions|Conformed Dimensions]] support cross-context analysis through deliberately standardized descriptive context.
