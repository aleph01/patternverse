---
id: data-self-service-data-discovery
type: pattern
title: Self-Service Data Discovery
summary: "Publish searchable, maintained information that helps people find suitable data, understand its limits, and follow an appropriate access route before querying."
status: published
aliases: []
tags:
  - data-engineering
  - ownership-lifecycle
verses:
  - data-engineering
attribution: Original Patternverse field-guide explanation and illustrative
  examples; sources are linked in the article.
---

A new analyst needs to know how much the company collected last month after refunds. Searching the warehouse produces dozens of tables: orders, payment events, finance extracts, and several objects named `revenue_final`.

Someone knows which one to use. Finding that person takes longer than writing the analysis.

**Self-Service Data Discovery publishes searchable, maintained information that helps people find data, assess its suitability, and follow an appropriate access route without depending on informal introductions.**

The purpose extends beyond locating a table. A useful discovery experience helps someone decide whether a dataset answers their question, understand its limitations, and identify the next step.

## Make the dataset understandable before it is queried

A schema explains the available columns. It rarely explains enough about their meaning.

An `amount` field might represent an order value, an authorized payment, a settled capture, or a refund. A date might describe when something happened, when it was recorded, or when a reporting period ended.

Discovery needs both technical metadata and business context.

| Information | What it helps the reader establish |
|---|---|
| Purpose and grain | What does one record represent? |
| Definitions and units | What do the measures and categories mean? |
| Coverage and exclusions | Which populations, dates, and events are represented? |
| Operational evidence | How current is the usable data? |
| Ownership and lifecycle | Who supports this dataset, and is it still recommended? |
| Access and examples | How can it be used appropriately? |

These details should describe a clearly identified asset, including its environment and interface version where relevant. Two tables with the same short name in different systems must remain distinguishable.

The catalog can be a dedicated platform, a repository-backed index, or a federated collection of product pages. Its usefulness depends on the evidence it exposes and maintains.

## Example: choose collections instead of booked orders

Consider three illustrative search results for “net collections by day.”

| Candidate | Meaning | Suitability |
|---|---|---|
| Orders | One order line; booked merchandise value | Does not measure collections |
| Payment events | Individual captures and refunds | Useful detail requiring appropriate processing |
| Net collections | Daily settled captures minus refunds, by merchant and currency | Candidate for the requested operational report |

The selected entry explains that each row represents one merchant, UTC activity date, and currency. Pending payments are excluded. Different currencies must remain separate unless an explicit conversion method is applied.

For one merchant-day, settled captures of USD 120 and refunds of USD 20 produce net collections of USD 100. A pending USD 50 authorization does not increase that result. In this illustrative organization, Finance owns the derived net-collections product, while Payments owns its capture and refund inputs.

An example record makes those distinctions easier to understand than a description such as “daily payment data.”

![A search for net collections compares orders, payment events, and daily net collections by grain and meaning. The selected dataset exposes ownership and freshness information, followed by a route to inspect its definition, limitations, and access instructions.](../assets/data-engineering/self-service-data-discovery.svg "A consumer asks for net collections by day. Catalog results distinguish Orders at order-line grain with booked amounts, Payment events at event grain requiring aggregation, and Net collections at day-by-merchant-by-currency grain with settled captures minus refunds. The last is the candidate suited to this illustrative question. Its entry identifies Payments as the owner and reports daily data through October 27. Discoverable metadata helps evaluate fit and find an access route; it does not itself grant permission to read the data.")

*The selected result fits this illustrative question. Its catalog listing does not itself authorize access or establish every aspect of data quality.*

The entry also says which team supports it, when daily publication is expected, and whether late refunds restate previous dates. Those details determine whether a consumer can safely reuse it for a recurring report.

## Search using the language consumers bring

People often know their question before they know the producer’s terminology.

Useful discovery connects familiar phrases to documented concepts, descriptions, examples, and related assets. Searching “money collected after refunds” should help locate the relevant collections definition even if its physical name is `fct_merchant_cash_activity`.

DataHub provides a concrete implementation: its search can match asset names, descriptions, tags, glossary terms, owners, and column names, with filters such as platform, domain, and owner. [DataHub search documentation](https://docs.datahub.com/docs/how/search)

Vocabulary still needs care. “Revenue,” “bookings,” and “collections” may be related concepts with materially different definitions. Treating them as interchangeable synonyms can make search more convenient while producing incorrect analysis.

Result summaries should expose the distinctions that help readers choose. Filters for coverage, supported lifecycle state, owner, and asset type can reduce noise. Ranking by popularity alone can keep an old, widely used dataset above its replacement.

Examples should also be selective. A reviewed query demonstrating the intended grain is more useful than an unexplained list of historical SQL statements.

## Example: discover a public dataset without assuming unrestricted use

A researcher finds a dataset whose title appears relevant to a cross-country comparison. Before downloading it, they need to establish geographic coverage, available years, measurement definitions, and permitted uses.

A matching title cannot establish those conditions.

The World Bank Data Catalog implements several parts of this discovery path. Its documentation describes keyword search, filters including country and license, and dataset pages containing metadata and resource links. Some resources also provide programmatic access. [World Bank catalog guide](https://datacatalog.worldbank.org/getting-started)

The catalog’s FAQ separately explains that listed datasets can have restrictions and that not every dataset is freely shareable. [World Bank catalog FAQ](https://datacatalog.worldbank.org/faq)

The reusable principle is that a result should carry enough context to evaluate both relevance and the route to use it. A listing may appropriately lead to a download, an API, a request process, or an explanation of restrictions.

For internal discovery, the same distinction applies. Visibility of a dataset description and permission to read its records are separate decisions.

## Example: recognize a popular dataset that has stopped updating

An analyst finds `customer_activity_v1`, a dataset referenced by many dashboards. Its catalog description was edited yesterday.

The underlying data, however, stops in June.

A recent metadata edit says something about documentation maintenance. It does not establish recent data delivery.

The entry needs separately labeled evidence: metadata refresh time, latest successful publication, and the business-time coverage of the published data. Where freshness has not been measured, that uncertainty should remain visible.

Data.gov makes the metadata layer explicit. Its dataset pages expose publisher-provided descriptions, identifiers, resource links, access information, and metadata dates. Its guide also explains that agencies maintain the underlying datasets and that the catalog does not control their quality or availability. [Data.gov user guide](https://data.gov/user-guide/)

In the internal example, the old entry should identify its deprecated state, replacement, migration guidance, and support deadline. Retaining a searchable historical record can help existing consumers migrate, while clearly directing new work toward the maintained interface.

## Combine automation with accountable curation

Automated ingestion can collect schemas, locations, lineage, usage, and operational signals. Producers still need to explain intended meaning, appropriate uses, exclusions, and support commitments.

Assign responsibility for both kinds of information. A connector failure needs technical attention; a misleading business definition needs a domain owner.

Connect metadata updates to dataset changes. A new column, changed grain, retired interface, or altered update schedule should trigger corresponding documentation work.

Feedback also needs a route. Consumers should be able to report a broken link, ambiguous definition, or missing example to an accountable team. Useful answers can then become maintained documentation rather than disappearing into private messages.

Metadata may itself be sensitive. Define who can see asset names, schemas, previews, and access instructions. Use synthetic or appropriately protected examples when showing real records would expose unnecessary information.

## Maintain evidence behind trust signals

A “recommended” or “certified” badge should have a defined scope, responsible owner, and review basis.

A dataset might be recommended for operational collections reporting while unsuitable for another purpose. A badge cannot communicate that distinction without supporting context.

Likewise, a successful quality check yesterday does not establish that today’s release passed. Where possible, link operational evidence to the relevant release, time, and checks.

Evaluate discovery through realistic tasks: can a newcomer select the right dataset, explain its grain, identify its limits, and reach a working access route? Search-result counts and catalog size reveal little about those outcomes.

## Costs, useful situations, and limits

This pattern is especially useful across growing organizations, multiple platforms, frequently changing datasets, and domains whose terminology differs.

Operating costs include metadata ingestion, search infrastructure, connector maintenance, documentation, ownership reviews, and access-workflow support. The largest recurring cost is often keeping meaning and lifecycle information current.

Start with important, supported datasets and make incomplete coverage visible. An enormous index of poorly described assets can increase confusion.

Expert help remains valuable for novel questions, conflicting definitions, and unfamiliar analytical methods. Discovery should make routine choices easier and route difficult ones to the right people.

## Related patterns

[[data-shared-business-vocabulary|Shared Business Vocabulary]] makes datasets findable through meaningful terms and visible distinctions.

[[data-named-dataset-stewardship|Named Dataset Stewardship]] supplies accountable contacts. [[data-explicit-data-contracts|Explicit Data Contracts]] documents expectations consumers can assess before adoption.

[[data-capture-lineage-at-transformation|Capture Lineage at Transformation]] explains upstream dependencies and provenance, while [[data-dataset-deprecation-and-retirement|Dataset Deprecation and Retirement]] keeps obsolete assets from becoming traps for new consumers.
