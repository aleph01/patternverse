---
id: 'demand-driven-production'
type: 'pattern'
title: 'Demand-Driven Production / From Push to Pull'
summary: 'Organize activity around actual customer demand.'
status: 'published'
verses:
  - business
aliases:
  - 'Demand-Driven Production'
  - 'From Push to Pull'
---

## What it is for

Use this pattern when a business repeatedly makes the wrong quantities, carries too much stock, or commits to particular products before it knows what customers want.

A warehouse can be full while customers are still waiting. The unpopular configurations are available; the popular ones are missing. Money has already been spent, but some of that investment will return only through discounts—or never return at all.

Demand-driven production changes what authorizes work. A confirmed order, an actual sale, or consumption by the next production stage becomes the signal to make or replenish something.

The business commits more of its resources when the need becomes visible.

## The core idea

In a push system, a production plan releases work based on expected demand. Products move forward through the system, sometimes accumulating while they wait for buyers or the next operation.

In a pull system, a downstream need authorizes an upstream response. The signal specifies what is required and in what quantity. That need might come from an external customer or another process inside the business. This is the defining mechanism of pull production. [Lean Enterprise Institute: Pull Production](https://www.lean.org/lexicon-terms/pull-production/)

Consider a hypothetical furniture company selling a table in twelve finishes.

It could manufacture finished tables in every finish and hope its forecasts match purchases. Alternatively, it could prepare shared table components in advance and apply the chosen finish after an order arrives.

The second approach preserves preparation while delaying the decision most likely to be wrong.

## The graphic

![Push production releases work from a forecast, then produces, stocks, and sells. Pull production starts with an order or actual consumption, sends a signal, makes or replenishes the required goods, and delivers. A hybrid prepares shared inputs before demand and finishes the specific product afterward.](../assets/business/demand-driven-production.svg)

The arrows show the sequence of events. In a physical production system, demand information can travel upstream while goods travel downstream.

## Three forms of pull

**Make to order.** Production of a particular item begins after a customer orders it. This reduces exposure to unsold finished goods, while making delivery time part of the customer’s purchase decision.

**Assemble or finish to order.** Common components are prepared beforehand. The order triggers the final configuration, assembly, or finishing. This works especially well when many products share the same underlying parts.

**Replenish what was consumed.** A controlled stock buffer serves immediate needs. Withdrawals generate instructions to replace what was taken. Pull therefore works with inventory as well as with individual customer orders; replenishment systems are a standard form of pull production. [Lean Enterprise Institute: Pull Production](https://www.lean.org/lexicon-terms/pull-production/)

These approaches can coexist within one business. The useful design question is where observed demand should begin controlling the next production commitment.

## Why it works

Finished inventory contains several bets: that somebody will want this product, in this configuration, at this location, before it becomes obsolete.

Delaying a specific commitment reduces the number of bets made with incomplete information. Shared components can serve several possible orders. A finished product may serve only one narrow preference.

Pull also connects production to consumption. A machine can manufacture efficiently while filling a warehouse with goods nobody currently needs. Requiring a demand signal gives the business a reason to stop producing, even when equipment could keep running.

The potential benefits include less money tied up in stock, fewer markdowns, and less handling and storage. The customer may also gain a wider choice of configurations because the business can offer options without stocking every finished combination.

Those benefits depend on reliable execution. A business that waits for orders must still respond within an acceptable time.

## Famous example: Toyota

Toyota demonstrates pull through replenishment between production stages.

When a later process takes parts from an earlier process, that withdrawal creates the need to replace them. Kanban communicates the requirement. Production is connected to what the following stage actually uses. [Toyota: Production System and Pull](https://global.toyota/en/company/plant-tours/production-system/)

Toyota also explains why this requires some advance preparation: making every component only after a vehicle order arrived would take too long. Its system holds limited quantities of parts and replenishes withdrawals through connected production loops. [Toyota: Just-in-Time](https://global.toyota/en/company/vision-and-philosophy/production-system/)

The lesson is about coordinated flow. Carefully managed buffers allow work to continue, while consumption controls replenishment. Copying the inventory levels without the supporting reliability and coordination would miss the mechanism.

## Famous example: Dell’s classic direct model

Dell’s classic model combined direct customer relationships with computers built to order.

Its fiscal 2004 report described how the direct model let the company understand customer requirements, build systems to order, and introduce relevant technology quickly. This is a historical example of the model that helped establish Dell’s position. [Dell: Fiscal 2004 Sustainability Report](https://i.dell.com/sites/doccontent/corporate/environment/en/documents/cr-report-2004.pdf)

The important production choice was to commit to a particular finished configuration after the customer’s requirements were known.

For computers, this can reduce the risk of holding finished machines with yesterday’s specifications or an unpopular combination of components. It also places heavy demands on component availability, order accuracy, and assembly speed.

The broader lesson: standardized inputs can support customer-specific outputs when final assembly waits for demand.

## Famous example: Amazon Kindle Direct Publishing

Amazon’s Kindle Direct Publishing illustrates the pattern through print-on-demand books.

KDP prints paperbacks on demand and deducts printing costs from royalties. Authors can therefore offer printed books without financing a print run or carrying that inventory themselves. [Amazon KDP: Paperback Printing Cost](https://kdp.amazon.com/en_US/help/topic/G201834340)

This changes the commitment required to make a title available. A niche book can remain in the catalog without its author deciding how many finished copies to warehouse.

The economics still include printing, preparation, and finding readers. Production capacity and materials must also exist before an order arrives. What changes is when the business commits those resources to a particular title.

## The economics

The relevant comparison is the total cost of serving demand.

Large batches may offer a lower manufacturing cost per unit. They can also create unsold goods, storage costs, markdowns, and obsolete inventory.

Smaller batches may cost more per item while reducing those losses. Their advantage grows when demand is uncertain, products lose value quickly, or there are many possible variants.

Cash flow can improve when production spending moves closer to the sale. Taking payment before fulfillment can strengthen that effect, although payment timing is a separate design choice.

As a business-model pattern, pull matters when this operating arrangement supports a valuable customer promise: more choice, less waste, fresher products, or competitive prices.

## Useful when

The pattern is especially useful when individual product demand is difficult to predict, but the business can respond quickly once that demand becomes clear.

It fits offerings with expensive finished inventory, many configurations, short commercial lives, or intermittent demand. Shared components and flexible equipment make it easier to delay commitment without delaying everything.

The central constraint is customer patience. If customers need immediate availability, the business may need finished stock, replenishment buffers, or a hybrid that postpones only the final steps.

## Common mistakes and limits

**Removing buffers before improving reliability.** Inventory can absorb late deliveries, defects, and equipment failures. Reducing it without addressing those problems can turn an inventory saving into missed orders.

**Treating every fluctuation as an instruction to change everything.** Demand signals need clear rules for quantities, priorities, and available capacity. Constant rescheduling can create its own waste.

**Abandoning forecasts.** Forecasts remain useful for staffing, equipment, supplier capacity, and long-lead materials. Pull changes how particular work is authorized within that prepared system.

**Moving the burden to suppliers.** A buyer’s stock reduction may simply leave suppliers holding more inventory. The economics should be assessed across the supply chain.

**Expecting demand signals to create capacity.** An order reveals a need. It does not make a scarce component arrive sooner or remove a production bottleneck.

## Related patterns

**Postponement** delays a product’s final differentiation until requirements are clearer. It is often the bridge between advance preparation and production triggered by an order.

[[mass-customization|Mass Customization]] uses repeatable processes and shared components to offer individual configurations. Pull helps connect those configurations to actual buyers.

[[long-tail|Long Tail]] makes many niche offerings economically accessible. Production on demand can reduce the inventory commitment required for each one.

**Pre-Sales / Pre-Orders** establish customer commitment before fulfillment. They can provide a production signal and funding, while creating an obligation to deliver.
