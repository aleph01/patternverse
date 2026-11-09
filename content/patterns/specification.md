---
id: specification
type: pattern
title: Specification
summary: Give a domain matching rule its own object, so callers can reuse and combine the criterion independently of candidates and selection code.
status: published
aliases:
  - Domain Specification
  - Specification Pattern
verses:
  - software-engineering
tags:
  - domain-modeling
  - composable-rules
  - eligibility
attribution: "Specification as described by Eric Evans and Martin Fowler, with implementation context from official library and language documentation. Original Patternverse print-job policy, code, and illustrations."
---

## Purpose and problem

A print queue lists jobs that may run. A manual-release screen checks the same eligibility policy before accepting a selected job. Each caller contains its own conditional, and one forgets to exclude cancelled jobs. Updating the policy now requires finding every copied version.

Putting every possible eligibility rule on `PrintJob` creates another problem: the candidate accumulates methods for each caller's changing requirements. The candidate should describe a job; a separate criterion should express which jobs a particular operation accepts.

## Core idea

A **Specification** is a named, reusable criterion that answers whether a candidate satisfies a requirement. Separate the rule from both the candidate and the code that searches, validates, or otherwise uses it.

The mental model is **one criterion, many evaluations**. Evans and Fowler's original [Specifications paper](https://martinfowler.com/apsupp/spec.pdf) describes selection, validation, and building a candidate to meet requirements. It distinguishes hard-coded, parameterized, and composite implementations. Composition is useful when rules need AND, OR, and NOT; it is not required for every specification.

Domain Specification and Specification Pattern refer to this pattern here. It is distinct from a requirements document, API schema, or formal verification specification. Composite Specification names an implementation variant, rather than a second canonical article.

![The print-queue selector and manual-release validator both call is_satisfied_by on the same eligible-for-print specification. The candidate is a PrintJob snapshot, and the result is a Boolean. The specification defines acceptance while callers decide what to do with the result.](../assets/software-engineering/specification-reuse.svg "Selection keeps matching jobs; validation checks one proposed job. Both use the same acceptance criterion without moving selection or release effects into the rule.")

## How it works

### Name the requirement and its result

Use a domain name such as `eligible_for_print`, and define `is_satisfied_by(candidate)` as a Boolean operation. A failed match is an ordinary result. Malformed input or a failed dependency is a different condition; silently returning false can hide a defect or unavailable information.

The [Ardalis.Specification validation documentation](https://specification.ardalis.com/usage/use-specification-validation.html) demonstrates this candidate-to-Boolean contract. Its library also supports query-oriented specifications. That is one application of the idea, not a requirement to introduce a repository or a particular framework.

### Compose requirements without changing candidates

Small rules can express separate concerns. In this example, acceptance requires approval or a proof-copy exception, a page count within the limit, and absence of cancellation. The grouped policy is:

`(approved OR proof_copy) AND within_limit AND NOT cancelled`

AND requires both sides, OR accepts either side, and NOT reverses the result. Named composition methods make grouping explicit. The same candidate can be evaluated by several policies without acquiring policy-specific fields or methods.

Keep predicates free of side effects and explicit about their inputs. [Python's Boolean operators](https://docs.python.org/3/reference/expressions.html#boolean-operations) evaluate left to right and can skip the right operand. A policy must not rely on every predicate running to perform logging, mutations, or cleanup.

![A composed printing policy requires approved OR proof copy, at most 40 pages, and NOT cancelled. Job A has approval and exactly 40 pages and passes. B has 41 pages and fails. C is an unapproved proof copy within the limit and passes. D has neither approval nor the exception and fails. E is cancelled and fails despite approval.](../assets/software-engineering/specification-composition.svg "All three groups must hold. The OR exception satisfies the approval group only; it does not bypass the page limit or the cancellation rule.")

### Keep evaluation and query translation separate

The example composes Python callables. It does not build an inspectable expression tree, serialize a policy, or translate it to SQL. [Microsoft's data-access guidance](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/work-with-data-in-asp-net-core-apps) describes query specifications that can additionally control returned data shape; those capabilities require their own supported representation and evaluator.

If the same rule runs in memory and in a database, verify equivalent units, comparisons, and missing-value behavior. [PostgreSQL's logical operators](https://www.postgresql.org/docs/current/functions-logical.html) use true, false, and unknown: `NOT NULL` remains unknown. This example deliberately accepts complete, typed candidates and two-valued results.

## Worked example

### Reuse one printing policy

Before separation, the queue filter and release screen copied the conditional. Afterward, both receive the composed `eligible` specification. It decides eligibility; callers retain responsibility for listing or releasing jobs.

Save these files together and run `python3 demo.py` with Python 3.10 or later. Pages and page limits are positive whole counts. Approval, proof-copy, and cancellation fields are actual Booleans. The proof-copy exception is an original teaching policy.

**model.py — validated candidates and composable criteria**

```python
from dataclasses import dataclass
from typing import Callable


def positive_count(value):
    if type(value) is not int or value <= 0:
        raise ValueError("Count must be a positive integer")


@dataclass(frozen=True)
class PrintJob:
    job_id: str
    pages: int
    approved: bool = False
    proof_copy: bool = False
    cancelled: bool = False

    def __post_init__(self):
        if type(self.job_id) is not str or not self.job_id.strip():
            raise ValueError("A nonblank job ID is required")
        positive_count(self.pages)
        if any(type(flag) is not bool for flag in (
            self.approved, self.proof_copy, self.cancelled
        )):
            raise TypeError("Job flags must be Boolean")


@dataclass(frozen=True)
class Specification:
    predicate: Callable[[PrintJob], bool]

    def __post_init__(self):
        if not callable(self.predicate):
            raise TypeError("A predicate is required")

    def is_satisfied_by(self, candidate):
        if type(candidate) is not PrintJob:
            raise TypeError("PrintJob required")
        result = self.predicate(candidate)
        if type(result) is not bool:
            raise TypeError("Predicate must return Boolean")
        return result

    def and_(self, other):
        if type(other) is not Specification:
            raise TypeError("Specification required")
        return Specification(lambda job: self.is_satisfied_by(job) and other.is_satisfied_by(job))

    def or_(self, other):
        if type(other) is not Specification:
            raise TypeError("Specification required")
        return Specification(lambda job: self.is_satisfied_by(job) or other.is_satisfied_by(job))

    def not_(self):
        return Specification(lambda job: not self.is_satisfied_by(job))


def at_most_pages(limit):
    positive_count(limit)
    return Specification(lambda job: job.pages <= limit)
```

**demo.py — selection and validation share the criterion**

```python
from model import PrintJob, Specification, at_most_pages


approved = Specification(lambda job: job.approved)
proof = Specification(lambda job: job.proof_copy)
cancelled = Specification(lambda job: job.cancelled)
eligible = approved.or_(proof).and_(at_most_pages(40)).and_(cancelled.not_())
jobs = (
    PrintJob("A", 40, approved=True),
    PrintJob("B", 41, approved=True),
    PrintJob("C", 4, proof_copy=True),
    PrintJob("D", 4),
    PrintJob("E", 4, approved=True, cancelled=True),
)
print("selected:", [job.job_id for job in jobs if eligible.is_satisfied_by(job)])
print("validate C:", eligible.is_satisfied_by(jobs[2]))
print("exact limit:", at_most_pages(40).is_satisfied_by(jobs[0]))
print("over limit:", eligible.is_satisfied_by(jobs[1]))
print("cancelled:", eligible.is_satisfied_by(jobs[4]))
# selected: ['A', 'C']
# validate C: True
# exact limit: True
# over limit: False
# cancelled: False
```

A passes at exactly forty pages. C uses the proof exception. B exceeds the limit, D lacks approval or its exception, and E is cancelled. The filter preserves input order; the specification supplies no ranking.

[Frozen dataclasses](https://docs.python.org/3/library/dataclasses.html#frozen-instances) keep these candidate fields and wrapper references read-only through normal API use. They do not freeze a callable's captured dependencies. The supplied predicates are pure; arbitrary predicates could still read mutable state or raise exceptions, which this wrapper propagates.

## When to use it

Use Specification when a recognizable rule is reused across selection and validation, varies independently of candidates, or needs combinations of smaller criteria. A parameterized limit is useful when only a threshold varies.

A named predicate function or one method on the natural owner is sufficient for a stable, local check. Avoid building a rule framework for every conditional. A Boolean predicate also does not explain every failure; user-facing diagnostics need an additional contract.

## Tradeoffs and common mistakes

**An unbounded rule language.** Composition introduces indirection, nested calls, and debugging costs. Limit the vocabulary to real requirements; deeply nested expressions can exhaust recursion limits.

**Side effects disguised as tests.** Short-circuiting can skip later predicates. A network failure is not a failed business match, and changing external inputs can invalidate repeated evaluations.

**Assuming query equivalence.** Opaque functions cannot automatically become efficient database filters. Loading every record and filtering afterward may create significant memory and latency costs.

**Treating eligibility as authorization or a lock.** Passing a snapshot test does not reserve a job or commit a transition. The state owner must enforce current rules and concurrency protection at the write boundary. A composed policy should not let an OR exception accidentally bypass mandatory conditions.

## Related patterns

[[strategy|Strategy]] makes algorithms interchangeable. A specification can use that mechanism for a Boolean matching operation with a domain meaning.

[[composite|Composite]] gives leaves and groups a common interface. AND, OR, and NOT combinations are a useful specification application of that structure.

[[domain-service|Domain Service]] owns a broader domain operation. It may use specifications to identify eligible candidates and then apply a separate ranking or decision policy.

[[aggregate|Aggregate]] owns invariants and state transitions. Reusing a specification can help express a rule without transferring responsibility for enforcing it.

## Sources

Evans and Fowler's original [Specifications paper](https://martinfowler.com/apsupp/spec.pdf) establishes the pattern and implementation variants. Ardalis, Microsoft, Python, and PostgreSQL documentation linked above support the validation, query, and language details. No external specification framework is required by the example.

The print-job policy, Python implementation, and diagrams are original teaching material, not a complete print-release or access-control system.
