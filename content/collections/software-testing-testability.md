---
id: software-testing-testability
type: collection
title: Testing and Testability
summary: Make behavior observable and scenarios controllable while keeping the limits of test evidence explicit.
status: published
verses:
  - software-engineering
items:
  - test-double
  - test-data-builder
  - data-consumer-driven-contract-tests
  - humble-object
  - golden-master-approval-testing
  - parameterized-test
---

These patterns examine how software can expose useful control and observation points for dependable tests.

[[test-double|Test Double]] substitutes a collaborator for a specific test so the real subject can encounter controlled responses or expose relevant interactions. Focused tests complement verification of the real dependency and production wiring.

[[test-data-builder|Test Data Builder]] creates real test inputs from reusable defaults while each test states the values that distinguish its scenario, with explicit ownership of mutable data.

[[data-consumer-driven-contract-tests|Consumer-Driven Contract Tests]] ground interface expectations in actual consumer execution and verify the same agreement against candidate providers before independent releases.

[[humble-object|Humble Object]] — Move decision-making out of a hard-to-test boundary and leave a small adapter that translates inputs, delegates behavior, and applies results.

[[golden-master-approval-testing|Golden Master / Approval Testing]] — Compare a reproducible observed result with an explicitly reviewed baseline, and require deliberate review when the result changes.

[[parameterized-test|Parameterized Test]] — Run one test structure against named sets of inputs and independently specified expectations, preserving useful failure reporting for every case.
