---
id: test-double
type: pattern
title: Test Double
summary: Replace a production collaborator with a test-controlled substitute to supply specific responses or observe interactions while exercising the real subject.
status: published
aliases:
  - Imposter
verses:
  - software-engineering
tags:
  - testing-testability
  - controlled-collaborators
  - test-isolation
attribution: "Test Double and its variants as cataloged by Gerard Meszaros in xUnit Test Patterns (2007), with terminology explained by Martin Fowler. Original Patternverse checkout example, runnable tests, and illustrations."
---

## Purpose and problem

A checkout test contacts a payment provider. Sometimes it passes; sometimes the sandbox is unavailable. Exercising a declined card requires special accounts, and a mistaken configuration could send a real charge. The checkout decision is small, yet verifying it depends on credentials, network timing, and another team's environment.

The team needs to check how checkout handles approval, refusal, and uncertainty without making every test a live transaction. It also needs evidence that the real provider integration works. Combining both goals in every test makes failures slow to diagnose; removing the provider without preserving its relevant behavior creates false confidence.

## Core idea

**Keep the subject real; replace a collaborator for a specific test.** A Test Double occupies a dependency boundary and offers the behavior or observations that the scenario needs. The test controls this substitute, exercises the real subject, then checks results or interactions.

Gerard Meszaros catalogs the pattern in *xUnit Test Patterns*. His catalog also lists **Imposter** as an alias. A double can be an object, a supplied function, or a service substitute; it need not come from a mocking library. The compact model is **controlled surroundings, real decision**.

![Production checkout calls a payment adapter. In a focused test, the same real checkout calls a test double through the charge contract; the test arranges its response and verifies the returned status and recorded call. The real payment adapter and provider are outside this test.](../assets/software-engineering/test-double-boundary.svg "Only the collaborator changes. The test exercises checkout itself; its success does not establish that the production adapter can reach or correctly translate the provider.")

## How it works

### Choose the role the test needs

Following the [Meszaros/Fowler vocabulary](https://martinfowler.com/bliki/TestDouble.html), the names describe different uses:

| Role | What the test needs |
| --- | --- |
| Dummy | A required argument that this scenario never uses. |
| Stub | A prepared answer or exception that drives a path. |
| Spy | A record of calls to inspect after execution. |
| Mock | Expectations about interactions, configured before execution and verified. |
| Fake | A working, simplified implementation, such as an in-memory repository. |

These are roles, not necessarily separate library classes. An object can supply a stubbed response and record calls as a spy. Calling every replacement a “mock” obscures whether the test needs input control, observation, or a working alternative.

The application owns the dependency contract: arguments, units, outcomes, failures, and relevant side effects. Test setup supplies the double through a constructor or function parameter. A narrowly scoped patch is another installation technique; restore it afterward and patch where the subject looks up the dependency. Production behavior should not branch on an `is_test` flag.

The test owns the substitute's lifetime. Give each test fresh recorded calls and configured responses. Concurrent tests must not share mutable double state accidentally. A synchronous stand-in does not reproduce scheduling, cancellation, transaction isolation, or network races unless those behaviors are deliberately modeled.

## Worked example

### Approval, refusal, and an uncertain charge

Instead of constructing a payment client internally, checkout receives a gateway. This complete standard-library Python 3 program runs with `python3 test_double.py`. Amounts are positive integer USD cents, validated upstream for type and currency; this function checks the positive boundary. The gateway contract returns a receipt for approval, raises `Declined` for an explicit refusal, and may raise `TimeoutError` when the outcome is unknown.

```python
import unittest
from unittest.mock import create_autospec


class Declined(Exception):
    pass


class Gateway:
    def charge(self, order_id, amount_cents):
        raise NotImplementedError


def checkout(order_id, amount_cents, gateway):
    if amount_cents <= 0:
        raise ValueError("amount must be positive")
    try:
        receipt = gateway.charge(order_id, amount_cents)
    except Declined:
        return "declined"
    return f"accepted:{receipt}"


class CheckoutTests(unittest.TestCase):
    def setUp(self):
        self.gateway = create_autospec(
            Gateway, instance=True, spec_set=True
        )

    def test_approval(self):
        self.gateway.charge.return_value = "r-17"
        result = checkout("O17", 2500, self.gateway)
        self.assertEqual(result, "accepted:r-17")
        self.gateway.charge.assert_called_once_with("O17", 2500)

    def test_decline(self):
        self.gateway.charge.side_effect = Declined()
        self.assertEqual(checkout("O17", 2500, self.gateway), "declined")
        self.gateway.charge.assert_called_once_with("O17", 2500)

    def test_zero_amount(self):
        with self.assertRaises(ValueError):
            checkout("O17", 0, self.gateway)
        self.gateway.charge.assert_not_called()

    def test_timeout_is_not_a_decline(self):
        self.gateway.charge.side_effect = TimeoutError()
        with self.assertRaises(TimeoutError):
            checkout("O17", 2500, self.gateway)
        self.gateway.charge.assert_called_once_with("O17", 2500)


if __name__ == "__main__":
    unittest.main()
```

The output reports **4 tests, OK**. The first two use prepared replies and inspect calls afterward: stub and spy roles, despite the library's `mock` name. Zero cents never reaches the gateway. A timeout remains an exception rather than becoming a refusal, because a lost reply does not establish whether a charge occurred. This example does not retry, persist orders, or provide payment idempotency.

`create_autospec` checks the declared method shape and signature; `spec_set` rejects undeclared attributes. Neither validates monetary semantics or provider behavior. The real adapter must translate provider replies into this application contract and needs separate verification with safe provider facilities.

![Four checkout scenarios use a fresh gateway double. Approval returns accepted:r-17 and refusal returns declined, each after one charge call. Zero cents raises ValueError with no charge call. TimeoutError propagates after one attempted call and does not mean declined.](../assets/software-engineering/test-double-scenarios.svg "Assertions cover both the visible result and the relevant boundary interaction. The timeout test establishes checkout's handling of uncertainty, not the provider's eventual charge outcome.")

A second context needs a different role: a repository fake can store and retrieve several records during a service test. It supports meaningful state changes instead of a fixed reply. It still needs explicit duplicate, missing-record, and ordering semantics; a dictionary does not prove a database's locking or rollback behavior.

## When to use it

Use a double when an external collaborator makes a useful scenario expensive, unsafe, unavailable, or difficult to trigger. Typical signals include tests that send messages, need rare failures, depend on wall-clock time, or wait for remote environments. An injected clock returning a chosen instant is often enough; a miniature clock service is unnecessary.

Prefer real collaborators when they are fast, deterministic, and easy to construct. A value calculation rarely benefits from replacing every helper. Choose the smallest substitute that exposes the required condition, and retain tests of important production wiring.

## Tradeoffs and common mistakes

**A convincing substitute can still be wrong.** A fake that permits duplicate identifiers or a stub that returns a shape the provider never sends can keep tests green while integration fails. [Contract tests](https://martinfowler.com/bliki/ContractTest.html) compare relevant assumptions with the actual dependency. Integration tests additionally check real configuration and communication. Neither is supplied automatically by a double.

**Interactions can overspecify implementation.** Assert an important outgoing operation when it is the observable requirement. Requiring every internal helper call in a particular order can reject harmless refactoring. Conversely, checking only a returned status can miss an unwanted second charge. Pick observations that express the requirement.

**Replacement can hide the behavior under test.** Stubbing checkout's decision and asserting its configured answer tests setup rather than checkout. Replace its collaborator, leaving the decision real. Avoid unconfigured permissive doubles whose default return objects accidentally satisfy truth tests. Clean up patches and test-owned files, threads, or connections even after assertions fail.

## Related patterns

[[dependency-injection|Dependency Injection]] supplies collaborators from outside; Test Double uses that seam to select a test-specific substitute. Injection also serves ordinary production composition.

[[ports-and-adapters|Ports and Adapters]] defines application-facing contracts and technology adapters. Doubles can implement a port for focused tests, while real adapters remain separately testable.

[[strategy|Strategy]] replaces an algorithm for application behavior. Test Double substitutes behavior to control or observe a test; a production strategy is not automatically a double.

[[repository|Repository]] offers a domain-facing persistence boundary that a fake can implement. The fake cannot establish the real repository's storage guarantees.

## Sources

- Gerard Meszaros, [*xUnit Test Patterns*, Chapter 23: Test Double Patterns](https://www.informit.com/content/images/9780131495050/samplechapter/0131495054_CH23.pdf), 2007, pp. 522–528: established pattern, alias, replacement boundary, and cautions.
- Martin Fowler, [Test Double](https://martinfowler.com/bliki/TestDouble.html) and [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html): role vocabulary and state versus interaction verification.
- [Python `unittest.mock` documentation](https://docs.python.org/3/library/unittest.mock.html): autospec, strict attribute specifications, configured exceptions, call assertions, and patch scope.
- Martin Fowler, [Contract Test](https://martinfowler.com/bliki/ContractTest.html): checking assumptions about an external dependency independently of focused tests.

The checkout scenario, repository comparison, code, and illustrations are original teaching examples. No payment provider is contacted.
