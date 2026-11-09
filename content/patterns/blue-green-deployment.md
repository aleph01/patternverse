---
id: blue-green-deployment
type: pattern
title: Blue-Green Deployment
summary: "Prepare a release in a separate production-capable environment, then switch incoming traffic to it while retaining the previous environment for a controlled return."
status: published
aliases:
  - Blue/Green Deployment
  - Blue Green Deployment
verses:
  - software-engineering
tags:
  - evolution-delivery
  - deployment
  - release-management
attribution: "Martin Fowler’s Blue Green Deployment, drawing on Humble and Farley’s Continuous Delivery, and AWS deployment, data-tier, and connection-draining documentation. Router model and illustrations are original teaching material."
---

## Purpose and problem

An order service needs a new release. Updating the running environment in place interrupts customers if startup fails, and recovery requires reconstructing the previous installation while requests are already failing. The team wants to validate the release before it becomes responsible for customer traffic, yet keep a quick return path.

The competing requirements are meaningful production validation, continuity of service, and recoverability. Blue-Green Deployment creates a separate destination for the candidate so that preparing a release and directing users to it become distinct operations.

## Core idea

**Prepare beside the live system; change the traffic destination.** Blue serves production while green receives the candidate release and its checks. Once green is ready, the routing layer sends new traffic there. Blue remains available for a defined recovery window instead of being overwritten immediately.

Blue/Green Deployment and Blue Green Deployment are naming variants. The colors identify environments, not permanent version numbers or required interface colors. On a later release, their roles can reverse. The essential structure is two switchable, production-capable environments; gradual traffic allocation is an optional rollout policy layered onto that structure.

![Before cutover, the router sends new requests to blue version 1 while green version 2 is validated. After cutover, new requests go to green; an already admitted request can still complete on blue. The shared compatible data store remains outside the application-environment boundary.](../assets/software-engineering/blue-green-deployment-cutover.svg "Changing the destination of new traffic does not move requests already executing. This example switches application environments while retaining one compatible shared data store.")

## How it works

Define the deployment boundary first: a service, application stack, or another independently routable unit. Reproduce relevant configuration, dependencies, credentials, and network access in the candidate environment. “Identical” means operationally comparable apart from the intended changes, not necessarily a permanently duplicated database or an entire second company infrastructure.

A deployment controller owns provisioning, release identity, readiness checks, promotion, and cleanup. The traffic router owns destination selection. Validate startup, important application behavior, dependency access, and sufficient capacity before promotion. A successful process check alone does not show that orders can complete or that a cold cache will survive production load.

Switch routing, then observe release-specific errors, latency, saturation, and business outcomes. Establish who can promote or restore traffic and what evidence permits each action. DNS caches, distributed load-balancer configuration, sticky sessions, and long-lived connections can delay convergence. A logical switch is not a promise that every client changes environments simultaneously.

Existing work needs an explicit drain policy. Stop admitting new requests to the old environment, allow bounded time for current work, and handle connections that exceed that limit. AWS Application Load Balancer’s deregistration documentation illustrates why stopping a target before requests finish can produce errors. WebSocket and streaming lifetimes may need different handling from short HTTP requests.

Separate background jobs and message consumers from web routing. An idle web environment can still send emails or claim jobs. Give those effects one deliberate owner, or use an explicitly designed coordination and deduplication scheme. Candidate verification must also avoid accidental production writes or notifications.

### Keep data compatibility outside the traffic switch

With a shared database, both application versions must understand the current schema and the values each can write. Apply compatible expansion before switching, migrate usages and data, and postpone destructive contraction until the old version is no longer needed. A database snapshot taken before promotion does not contain later customer transactions.

Separate data stores require synchronization, write-authority, and reconciliation rules for both forward promotion and return. Merely retaining the old application does not supply those rules. Routing rollback can restore old code; it cannot erase effects already committed by the candidate.

## Worked example

### Routing an order-service release

The original deployment replaces the live process directly. The revised design keeps blue and green environments behind a stable router. This complete Python 3.9+ standard-library model records which environment owns each admitted request. Schema numbers are illustrative compatibility versions, not migration commands.

```python
from dataclasses import dataclass


@dataclass
class Environment:
    schemas: set[int]
    ready: bool = False
    stopped: bool = False


class Router:
    def __init__(self):
        self.environments = {
            "blue": Environment({1}, ready=True),
            "green": Environment({1, 2}),
        }
        self.schema = 1
        self.active = "blue"
        self.pending = {}
        self.next_id = 0

    def check(self, name):
        env = self.environments[name]
        if env.stopped or not env.ready or self.schema not in env.schemas:
            raise RuntimeError("environment is not eligible")

    def route_to(self, name):
        self.check(name)
        self.active = name

    def begin(self):
        self.check(self.active)
        self.next_id += 1
        self.pending[self.next_id] = self.active
        return self.next_id

    def finish(self, request_id):
        return self.pending.pop(request_id)

    def stop(self, name):
        if name == self.active or name in self.pending.values():
            raise RuntimeError("environment still owns work")
        self.environments[name].stopped = True


def blocked(action, label):
    try:
        action()
    except RuntimeError:
        print(label)
    else:
        raise AssertionError("expected refusal")


if __name__ == "__main__":
    router = Router()
    blocked(lambda: router.route_to("green"), "unready promotion blocked")
    old = router.begin()
    router.environments["green"].ready = True
    router.route_to("green")
    new = router.begin()
    print(f"requests: {router.pending[old]} then {router.pending[new]}")
    blocked(lambda: router.stop("blue"), "drain required")
    assert router.finish(old) == "blue"
    router.route_to("blue")
    print(f"compatible rollback: {router.active}")
    router.route_to("green")
    assert router.finish(new) == "green"
    router.schema = 2  # Models a later schema contraction.
    blocked(lambda: router.route_to("blue"), "incompatible rollback blocked")
    router.stop("blue")
    assert router.environments["blue"].stopped
```

The program prints `unready promotion blocked`, `requests: blue then green`, `drain required`, `compatible rollback: blue`, and `incompatible rollback blocked`, in that order. A request admitted before promotion remains owned by blue. Once it completes, blue can receive new traffic again while schema 1 remains compatible. After the later schema change, returning to blue is refused and green stays active.

This is a sequential control model, not a deployment tool. Readiness and schema compatibility are supplied facts; a numeric schema match cannot prove semantic compatibility. There is no network, actual database, concurrent control plane, drain timer, or durable request recovery. In a real order service, returning to blue must preserve orders written while green was active, not restore an earlier copy of the order book.

![A recovery gate asks whether the retained old environment is ready, adequately provisioned, and compatible with current data. If it is eligible, route future traffic back and drain candidate work. If it is not, hold the return and use the separately planned recovery procedure; neither branch undoes committed effects.](../assets/software-engineering/blue-green-deployment-recovery.svg "Retaining old capacity makes a return possible. Eligibility and current data determine whether that return is safe; already committed effects need their own recovery policy.")

## When to use it

Use this when a routable application can be validated in parallel, recovery time matters, and temporary duplicate capacity is affordable. It is particularly useful when replacing an environment is more reliable than repairing an in-place installation.

A rolling update may be simpler when mixed versions are already supported and a whole second environment offers little benefit. A small service with an acceptable maintenance window may need only a rehearsed replacement and restore procedure. Neither infrastructure duplication nor a traffic switch compensates for incompatible state transitions.

## Tradeoffs and common mistakes

Temporary duplication costs money and operational attention. Shared databases, quotas, third-party rate limits, and networks remain common dependencies: two environments do not isolate all failures. Keep the retained environment warm enough to accept restored traffic and record when its recovery window closes.

Avoid assuming test traffic represents peak load, bypassing readiness to meet a release time, or deleting old capacity immediately after the first successful request. Plan session storage, cache warm-up, connection draining, and job ownership explicitly. Check that candidate secrets and permissions match their intended role.

Distinguish recovery of service from recovery of business effects. A defective release may already have emitted a message or changed an order. Detecting those effects and correcting them requires application-specific procedures beyond this deployment pattern.

## Related patterns

[[ml-canary-rollout-with-rollback|Canary Rollout with Rollback]] limits the candidate’s initial live exposure and expands only with evidence. Its existing model-serving article explains the policy; blue-green environments can provide the underlying capacity and routing destinations.

[[ml-shadow-deployment|Shadow Deployment]] exercises a candidate using copied requests while the incumbent remains responsible for user responses. It requires isolation of candidate side effects rather than a serving cutover.

[[feature-toggle|Feature Toggle]] controls behavior exposure inside deployed software. A new green release can still keep a feature disabled after infrastructure promotion.

[[data-expand-migrate-contract|Expand–Migrate–Contract]] supplies the compatibility transition that application and database versions often need during blue-green deployment and its recovery window.

## Sources

- Martin Fowler, [Blue Green Deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html): established pattern, alternating environments, routing return, and schema compatibility; points to Humble and Farley’s *Continuous Delivery*.
- AWS, [Blue/Green Deployment Methodology](https://docs.aws.amazon.com/whitepapers/latest/blue-green-deployments/introduction.html): environment boundaries, candidate validation, traffic switching, and temporary capacity.
- AWS, [Managing Data Synchronization and Schema Changes](https://docs.aws.amazon.com/whitepapers/latest/blue-green-deployments/best-practices-for-managing-data-synchronization-and-schema-changes.html): current data for both versions and separating schema changes from application deployment.
- AWS, [Application Load Balancer: Deregistration Delay](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html#deregistration-delay): request draining and premature connection termination.

The order-service router, compatibility checks, and both illustrations are original bounded teaching examples, not guarantees of a particular deployment platform.
