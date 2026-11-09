---
id: 'embedded-finance'
type: 'pattern'
title: 'Embedded Finance'
summary: 'Integrate financial services into an existing customer workflow.'
status: 'published'
verses:
  - business
---

## What it is for

A restaurant needs working capital while reviewing its sales. A merchant needs to manage the money coming into its store. A traveler wants insurance while booking a trip. Each need appears inside an activity the customer is already carrying out.

Embedded Finance makes the relevant financial service available within that activity. A business adds payments, an account, credit, or insurance to its existing product, often working with financial providers that supply the underlying service.

The opportunity is to make the main task easier and earn additional income from serving the financial need that accompanies it.

## The core idea

**Put the financial service where the customer already encounters the need.**

The platform brings distribution, customer relationships, and knowledge of the surrounding task. The financial provider brings the capabilities and authorizations required for its assigned activities. In some arrangements, an appropriately authorized company within the platform's own group performs part of that role.

The customer might see a single product experience, but the arrangement still contains distinct responsibilities: who holds funds, issues a loan, underwrites insurance, makes eligibility decisions, handles disputes, and provides support.

The pattern describes how a service reaches customers. It does not prescribe one particular financial product or revenue model.

## How it works

![A customer completing a task encounters a financial feature inside an existing platform. An appropriately authorized provider performs the assigned financial activities. Context, authorization, and continuing support connect the arrangement.](../assets/business/embedded-finance.svg 'Service relationships are shown; the arrows do not prescribe the route of money.')

A platform first identifies a financial need closely connected to its main product. Payments may help customers complete a purchase. An account may help merchants manage proceeds. Financing may help a business buy stock. Insurance may address risks associated with a booking.

The platform integrates the service into the relevant workflow, with appropriate enrollment, permissions, disclosures, and customer choice. A financial provider or authorized affiliate performs the agreed activities behind it. The parties allocate revenue, costs, operational work, and responsibility through their arrangement.

The relationship continues after the initial transaction. Customers need access to account information, repayments, claims, refunds, or complaints. A convincing checkout feature with an unclear support route is an incomplete service.

Embedding can be shallow or extensive. A referral to a separate application creates a different experience from an account managed inside the platform. The more closely the financial feature connects to the underlying task and its continuing administration, the more strongly it expresses this pattern.

## Why it works

**Context improves relevance.** Someone arranging a trip can judge an insurance offer against a specific booking. Someone managing restaurant sales can consider financing against an actual operating need.

**An existing relationship reduces some distribution work.** The platform already has customers and recurring interactions. It can introduce an additional service through that relationship, although financial enrollment and eligibility requirements still apply.

**Integration can reduce repeated work.** Relevant business information may already be available, subject to permitted uses. Connected transaction flows can also simplify reconciliation, account management, or repayment.

**The main product can become more useful.** A platform that helps customers receive, manage, and deploy money can take on a larger role in their operations. That value depends on the service working well throughout its life, including when something goes wrong.

## Famous examples

### Shopify Balance — financial accounts inside merchant operations

Shopify Balance brings a financial account into the environment merchants use to operate their stores. Eligible US merchants can manage funds and expenses alongside their commerce activity, connecting money management with the business that generates the money.

Shopify's documentation identifies Stripe and bank partners in the underlying account and card arrangements. Shopify itself is not a bank. The example illustrates how a commerce platform can provide an integrated financial experience while other organizations perform defined financial activities. [Shopify Balance](https://www.shopify.com/balance)

### Toast Capital — financing connected to restaurant sales

Toast provides restaurant technology and payment processing. Toast Capital gives eligible customers access to loan offers through that existing relationship. Toast identifies processing volume and time on the platform among the factors relevant to eligibility.

The loans are issued by WebBank and remain subject to credit approval and availability restrictions. Automated repayments use a fixed percentage of daily card sales processed through Toast, subject to the loan agreement. The integration connects financing with the restaurant's operating and payment workflow; a fixed loan fee still represents a borrowing cost. [Toast Capital: getting started](https://support.toasttab.com/en/article/Getting-Started-with-Toast-Capital)

### Airbnb — travel insurance within the booking journey

Airbnb offers optional travel insurance and assistance services for eligible stays. Customers can encounter the option at checkout and, when eligible, add it after booking within the applicable deadline. Policy information is accessible through the reservation.

In the US offering, Airbnb Insurance Agency LLC sells the product, Generali US Branch underwrites it, and Generali handles claims. Coverage depends on the policy's terms and exclusions. The pattern connects insurance distribution to a particular trip while retaining a distinct insurer and claims process. [Airbnb travel insurance](https://www.airbnb.com/e/travelinsurance/)

## The economics

Consider a fictional software platform that embeds payments. These figures illustrate the mechanism; they are not market rates or the economics of the companies above.

| Monthly payment activity                         |     Amount |
| ------------------------------------------------ | ---------: |
| Customer payment volume                          | $1,000,000 |
| Merchant fees at an assumed 2.8%                 |    $28,000 |
| Financial and processing partner costs           |   −$22,000 |
| Platform's remaining share                       |     $6,000 |
| Support, disputes, and allocated operating costs |    −$1,500 |
| Allocated integration maintenance                |    −$1,000 |
| Contribution before other overhead and tax       | **$3,500** |

The million dollars processed is transaction volume. It is not the platform's income. The remaining $6,000 share also carries costs before it becomes contribution.

Other financial products require different calculations. Lending must account for funding, servicing, and credit losses according to who bears them. An insurance premium is not automatically platform revenue; the distributor may receive a commission. Customer account balances are not revenue.

Assess the effect on the main product separately. Better retention or more completed purchases may add value, but those gains require evidence. They should not be assumed simply because a financial feature has been introduced.

## Useful when

- A recurring financial need appears naturally within an existing customer workflow.
- The business already has a relevant customer relationship and distribution channel.
- Integration can reduce meaningful work, such as repeated data entry, reconciliation, or repayment administration.
- The service can support customers through its full life, including disputes, claims, and closure.
- Expected income can cover partner costs, integration, support, and the risks assigned to the business.

## Common mistakes and limits

**Treating integration as authorization.** A software connection does not itself permit a business to perform every financial activity. Responsibilities depend on the product, arrangement, and jurisdiction.

**Confusing convenience with a good customer outcome.** An easily accepted loan can still be expensive. Insurance can still exclude the event a traveler worries about. Customers need understandable terms and a meaningful choice.

**Assuming existing data can be reused freely.** Access to transaction or customer information does not settle whether a particular financial use is permitted, appropriate, or reliable.

**Leaving responsibility unclear.** Customers should know which organization supplies the financial service and where to seek help. Partner outages, failed payouts, and unresolved claims affect the platform's relationship even when another company performs the underlying activity.

**Ignoring concentration and exit costs.** Depending heavily on one financial partner can make changes difficult. Moving accounts, repayment arrangements, or customer support obligations may require much more work than replacing an ordinary software integration.

## Related patterns

[[revenue-sharing|Revenue Sharing]] explains one way the platform and financial provider divide income. Embedded Finance establishes the distribution arrangement; revenue sharing can fund it.

[[cross-selling|Cross-Selling]] adds a relevant offer to an existing customer relationship. Embedded Finance is a particular application in which the additional offer is a financial service integrated into the workflow.

[[leverage-customer-data|Leverage Customer Data]] can support relevant offers and operating decisions. Financial uses still require appropriate permissions and controls.

[[merchant-of-record|Merchant of Record]] assigns the seller role for a transaction. Embedded Finance concerns how financial services reach customers; a platform can use one pattern, both, or neither.
