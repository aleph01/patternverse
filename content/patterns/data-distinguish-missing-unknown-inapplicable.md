---
id: data-distinguish-missing-unknown-inapplicable
type: pattern
title: Distinguish Missing, Unknown, and Inapplicable
summary: "Record why a value is absent, distinguishing missing evidence from unknown information and legitimate inapplicability so validation and calculations preserve the intended meaning."
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

Preserve the meaning of absent values so that collection problems, unavailable information, and legitimate non-applicability lead to different decisions.

A delivery report contains several blank transit durations. An analyst replaces them with zero so that the dashboard will display a complete average.

Some blanks concern physical shipments whose durations are unknown. Another belongs to a digital download, for which physical transit does not apply. A third appeared because an export omitted an expected field.

The replacement makes the column easier to calculate with while making its meaning less accurate.

Distinguish Missing, Unknown, and Inapplicable treats absence as information worth modeling. A value can be unavailable for different reasons, and those reasons affect validation, follow-up, and reporting.

## A blank does not explain itself

The three words describe related but different things.

**Missing** describes an absence in the available representation: an expected field, record, or value is not present.

**Unknown** means the value applies, but is not known in the relevant context.

**Inapplicable** means the question has no meaningful value for this record.

These are not three mutually exclusive database types. A missing value may be explained as unknown or inapplicable. When no explanation is available, the model should preserve that uncertainty rather than invent a cause.

Other explanations may matter too: information was not requested, a respondent declined to answer, a result is pending, or a source cannot support the field.

The practical question is:

> Is there a meaningful value here, and what do we know about its absence?

## The same blank can require different handling

Consider an illustrative dataset with one record per completed fulfillment. Four records concern physical shipments; one concerns a digital delivery.

| Fulfillment | Mode | Transit hours | Recorded explanation |
|---|---|---:|---|
| F-101 | Physical | 24 | Known |
| F-102 | Physical | 48 | Known |
| F-103 | Physical | — | Carrier reports duration unknown |
| F-104 | Digital | — | Physical transit inapplicable |
| F-105 | Physical | — | Field omitted; reason unclassified |

The two known durations support a mean of thirty-six hours.

They do not establish the average across all four physical shipments. Only two of those four have recorded durations, so measurement coverage is fifty percent.

The digital fulfillment belongs outside the physical-transit population. Its absent duration is expected, rather than a collection defect.

![An absent transit duration can have different explanations. Unknown means a physical shipment’s duration is unavailable. Inapplicable means a digital fulfillment has no physical transit duration. Unclassified absence means the expected field was omitted without an explanation.](../assets/data-engineering/distinguish-missing-unknown-inapplicable.svg "A missing transit duration can mean unknown physical transit, inapplicable digital fulfillment, or unexplained source omission. These require different handling.")

Each explanation suggests different work. The unknown duration may require further evidence. The digital record requires no invented transit measurement. The unexplained omission requires investigation of the source and ingestion process.

Replacing all three blanks with zero produces an average of 14.4 hours. That calculation asserts values the evidence never supplied.

## Aggregation can hide the difference

Database behavior does not settle the business question.

PostgreSQL documents that `AVG` calculates over non-null inputs. It also distinguishes `COUNT(*)`, which counts rows, from `COUNT(value)`, which counts non-null values. [Aggregate functions](https://www.postgresql.org/docs/current/functions-aggregate.html).

If all three absent durations are stored as SQL nulls, a simple average returns thirty-six hours. That is the mean of the recorded values, but its label should make the limited coverage clear.

Conversely, `COALESCE(transit_hours, 0)` changes the calculation by supplying zero where no duration was recorded.

Neither approach establishes the full population’s mean. The useful report may need the observed average, the number of applicable records, the number measured, and a breakdown of absence reasons.

Even a coverage percentage does not establish representativeness. Shipments with unavailable durations may differ systematically from those with complete records.

The pattern protects the distinction between a measured result and the limits of its evidence.

## HL7 FHIR: absence has a vocabulary

HL7 FHIR provides a documented implementation of explicit absence reasons.

Its **DataAbsentReason** vocabulary distinguishes `unknown` from `not-applicable`. It also includes more specific reasons such as `asked-unknown`, `not-asked`, `asked-declined`, `temp-unknown`, `masked`, `unsupported`, `error`, and `not-performed`. [FHIR R5 DataAbsentReason](https://hl7.org/fhir/R5/valueset-data-absent-reason.html).

These distinctions describe different circumstances. A procedure that was not performed is different from one whose result is unknown. A source that cannot represent a field is different from a source deliberately withholding information.

The vocabulary is useful because an absent observation alone cannot communicate those differences.

A general business system need not adopt every FHIR code. It can use a smaller vocabulary suited to its domain. The important mechanism is to record a supported explanation instead of forcing every absence into one undifferentiated blank.

## Omission and explicit null can request different actions

The distinction also matters when updating data.

JSON Schema’s documentation explicitly distinguishes an absent property from a property whose value is `null`. Whether a property is required and whether it accepts null are separate schema decisions. [JSON Schema object properties](https://json-schema.org/understanding-json-schema/reference/object).

An interface can assign those representations different meanings. **JSON Merge Patch** does so: omitting a property leaves it unchanged, while specifying null removes that property from the target object. [RFC 7396](https://datatracker.ietf.org/doc/html/rfc7396).

For an existing contact record:

| Merge-patch payload | Effect |
|---|---|
| `{}` | Leave the existing contact phone unchanged |
| `{"contact_phone": null}` | Remove the contact-phone property |

A client that automatically converts omitted fields into nulls can therefore turn a partial update into unintended deletion.

These are the semantics of that patch format, not universal meanings for JSON null. Another API may use explicit null to mean unknown, reject it entirely, or require a separate operation to clear a value.

The interface contract must establish which interpretation applies.

## Represent absence without pretending to know its cause

A common design pairs a nullable value with an explicit status or absence reason.

For example, a transit measurement can contain a numeric value when known, or no numeric value alongside a reason such as unknown or not applicable. An additional local category can preserve an unexplained omission.

The representation needs consistency rules. A record should not simultaneously contain twenty-four transit hours and declare that physical transit is inapplicable. A known measurement should satisfy the field’s normal type, unit, and range constraints.

Zero and false remain legitimate values. A confirmed count of zero differs from an unavailable count. A recorded negative answer differs from an unanswered question.

Avoid embedding absence codes inside the ordinary value domain when they can be mistaken for observations. Sentinel values such as `-1`, placeholder dates, and strings such as `"N/A"` can escape their intended context and enter calculations or comparisons.

A typed value and a documented reason make that boundary easier to enforce.

## What must remain true

**Applicability needs a rule.** A digital fulfillment is outside the physical-transit question because of the defined business model. It should not be classified as inapplicable merely because its duration is absent.

**Reasons need evidence.** An ingestion process cannot infer that someone declined to answer simply because a field is blank.

**Transformations must preserve distinctions.** Collapsing several source reasons into null loses information unless their meanings remain available elsewhere.

**Time matters.** Pending information can later become known. A previously inapplicable field can become applicable after a record changes. Updates should revise value and reason coherently.

**Validation must be conditional.** Requiring a duration for every physical shipment may be appropriate for a completed reporting dataset. Requiring one for digital fulfillment creates artificial errors.

**Imputed values need identification.** An estimated duration can support a particular analysis, but it should remain distinguishable from a supplied observation and from the original absence.

## More meaning requires maintenance

Explicit absence reasons add fields, validation rules, interface decisions, and reporting categories. People collecting the data also need explanations they can apply consistently.

The pattern is especially useful when absence affects eligibility, follow-up, completeness measures, or interpretation. It is less useful to introduce a large reason hierarchy when consumers need only a simple, well-understood distinction.

Common mistakes include treating every blank as zero, assuming every null means unknown, and classifying legitimate non-applicability as poor data quality.

Another is demanding more precision than the source supports. “Reason not supplied” can be the most accurate available description.

The design should help people distinguish what is known, what remains unresolved, and which questions do not apply.

## Related patterns

[[data-shared-business-vocabulary|Shared Business Vocabulary]] establishes the meanings of absence reasons and applicability rules.

[[data-explicit-data-contracts|Explicit Data Contracts]] specifies how omission, null, and reason codes cross an interface.

[[data-separate-source-facts-from-derived-interpretations|Separate Source Facts from Derived Interpretations]] preserves original absence information alongside estimates or inferred explanations.

[[data-business-invariant-checks|Business Invariant Checks]] enforces consistency between values, reasons, and record context.

[[data-model-lifecycle-states-explicitly|Model Lifecycle States Explicitly]] distinguishes information that is pending from information that has reached a settled outcome.
