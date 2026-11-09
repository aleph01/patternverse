---
id: data-expand-migrate-contract
type: pattern
title: Expand–Migrate–Contract
summary: "Introduce a replacement alongside the old interface, migrate data and consumers, then remove the old representation after verifying that dependencies have moved."
status: published
aliases:
  - Expand-Contract
  - Expand and Contract
  - Parallel Change
  - Expand-Migrate-Contract
tags:
  - data-engineering
  - contracts-evolution
  - evolution-delivery
verses:
  - data-engineering
  - software-engineering
attribution: "Parallel Change / expand and contract as described by Danilo Sato, with database migration guidance from official GitLab and dbt documentation and Stripe's engineering account. Original Patternverse explanation, compatibility example, code, and illustrations; expanded from the existing article."
---

## Purpose and problem

A column rename looks trivial until deployment begins. New application instances expect `service_tier`, older instances still use `customer_tier`, and a monthly export runs code nobody remembered to update. Replacing the name everywhere at once creates a coordination problem larger than the rename itself.

The team needs to introduce the new interface without forcing every dependency to move immediately. During that interval, both interfaces must remain usable and agree on meaning. Removing the old one is a later decision requiring evidence about consumers, stored data, and recovery obligations.

## Core idea

**Make room, move usages, then remove the old shape.** Expand–Migrate–Contract, also called **Expand-Contract**, **Expand and Contract**, or **Parallel Change**, separates an incompatible interface change into supported intermediate states.

Danilo Sato's [Parallel Change](https://martinfowler.com/bliki/ParallelChange.html) describes three phases: expand the interface to support old and new forms, migrate usages, then contract by removing the old form. The pattern applies to object APIs, service operations, messages, and database schemas. “Parallel” means temporary coexistence, not a requirement to execute operations concurrently.

The phases need not equal three deployments. A substantial migration can require many releases, backfill batches, and consumer transitions. The migration phase cannot disappear just because the shorter name mentions only expansion and contraction.

![Expand supports both old and new interfaces. Migrate moves consumers while both remain available. A readiness gate checks data, consumers, and recovery obligations before Contract removes the old interface. Removing it is not an automatic consequence of adding the new one.](../assets/data-engineering/expand-migrate-contract.svg "The temporary state must be a supported operating state. Contraction follows evidence that required dependencies have moved, not merely successful deployment of the replacement.")

## How it works

### Separate compatibility from retirement

The provider owns the compatibility bridge and the rule for authoritative state. Consumer owners migrate their calls, queries, writers, and jobs. A migration owner coordinates readiness and eventual removal. Telemetry helps discover usage, but quiet traffic does not prove a monthly job or recovery tool is gone.

For an API rename, both names can delegate to one backing value. For two physical columns, define which is authoritative and how accepted writes keep the other current. A trigger or shared transactional path in one database can cover relevant writers. Across stores, two ordinary writes can fail independently; durable propagation, ordering, retries, and reconciliation need explicit design.

Capture live changes before or alongside bounded historical backfill. A snapshot of account A at revision 10 must not overwrite a live revision-11 update. Conditional versioned writes, database concurrency controls, or an ordered replay after a consistent snapshot can address this. Revision comparisons require a shared authoritative ordering, and deletions need protection against resurrection too.

Move reads and write authority deliberately. Confirm identities, values, deletions, semantic behavior, and consumer results at comparable source positions. A scheduled background migration is not a completed one. Throttle it against live-service objectives; even additive DDL can acquire locks.

## Worked example

### One backing value, two names

The tier rename preserves the meaning of `standard` and `premium`. This complete standard-library Python 3 example runs with `python3 parallel_change.py`. It demonstrates an in-memory API transition, not a two-column database migration. Both names reference one value, so it needs no dual-write mechanism. The declared consumer registry is illustrative migration evidence, not automatic dependency discovery.

```python
class AccountV2:
    def __init__(self, tier):
        self.service_tier = tier


class ExpandedAccount(AccountV2):
    @property
    def customer_tier(self):
        return self.service_tier

    @customer_tier.setter
    def customer_tier(self, value):
        self.service_tier = value


def old_reader(account):
    return account.customer_tier


def new_reader(account):
    return account.service_tier


def contract(account, known_consumers):
    if any(version != "new" for version in known_consumers.values()):
        raise RuntimeError("old or unknown consumers remain")
    return AccountV2(account.service_tier)


if __name__ == "__main__":
    account = ExpandedAccount("standard")
    assert old_reader(account) == new_reader(account) == "standard"
    print("expanded: standard through both names")

    account.customer_tier = "premium"
    assert new_reader(account) == "premium"
    consumers = {"web": "new", "monthly_export": "old"}
    try:
        contract(account, consumers)
    except RuntimeError:
        print("contract blocked: monthly_export remains old")
    else:
        raise AssertionError("premature contraction")

    consumers["monthly_export"] = "new"
    final_account = contract(account, consumers)
    assert new_reader(final_account) == "premium"
    print("contracted: premium")
    try:
        old_reader(final_account)
    except AttributeError:
        print("old interface removed")
    else:
        raise AssertionError("legacy name unexpectedly remains")
```

The four output lines report expansion through both names, blocked contraction, `contracted: premium`, and `old interface removed`. The old setter immediately affects the new reader because it delegates to the same storage. Updating `service_tier` likewise remains visible through the old property while the bridge exists.

The final class deliberately lacks `customer_tier`: an old reader fails after contraction. Returning a new object here assumes sequential execution; it does not transfer concurrent mutations, update persisted rows, drain running processes, or prove the registry complete. In production, missing consumers, cached schemas, background writers, and rollback clients are additional retirement obligations.

### Physical copies introduce another problem

In a two-column migration, a backfill may read revision 10 (`standard`) before a live update writes revision 11 (`premium`). An unconditional later copy restores stale data. With one authoritative revision order per account, a target can atomically accept only newer revisions; equal retries are harmless no-ops. Keep deletion revisions or equivalent tombstones where needed so older snapshots cannot recreate deleted records.

![A backfill holds account A at revision 10 with standard tier. A live update has already advanced the target to revision 11 with premium tier. A guard rejects the stale revision-10 write, leaving premium at revision 11. This versioned-copy example is separate from the single-value Python API bridge.](../assets/software-engineering/expand-contract-backfill.svg "Coexistence alone cannot keep copies consistent. The illustrated guard assumes comparable revisions from one authoritative source per account; ordered deletion handling and durable recovery remain separate requirements.")

Stripe's [subscription migration](https://stripe.com/blog/online-migrations) used staged writes, backfill, read comparison, read-path changes, write-path changes, and eventual removal. GitLab's [background migration guidance](https://docs.gitlab.com/development/database/batched_background_migrations/) requires small, idempotent jobs and explicit completion checks. These support the migration phase rather than replacing it with a waiting period.

A warehouse change from order grain to order-line grain needs a separate interface: O17's total of 1000 minor units may become lines of 400 and 600. Preserve the old order-level interface where aggregation is valid, then move reports according to the grain they need. [dbt model versions](https://docs.getdbt.com/docs/mesh/govern/model-versions) can maintain that transition window. An old total cannot reconstruct missing historical line detail.

## When to use it

Use the pattern when providers and consumers cannot change atomically: rolling service deployments, external clients, large persisted datasets, or widely shared reporting models. Recognizable signals include old binaries running alongside new ones and multiple owners with different release schedules.

For an internal function whose callers can change together, a direct refactoring may be clearer. A rehearsed maintenance-window migration may also cost less than prolonged coexistence. Choose a transition period because compatibility needs it, not as a default for every rename.

## Tradeoffs and common mistakes

**Two representations can become two truths.** Maintain one authority and cover administrative tools, batch jobs, and deletions. Never treat a pair of best-effort writes as a transaction. Retries and checkpoints alone do not prevent stale overwrites.

**Contraction can break recovery.** Reverting application code is useful only if old interfaces and current, representable data remain available. Recreating a dropped column does not restore its contents. GitLab's [column-removal guidance](https://docs.gitlab.com/development/database/avoiding_downtime_in_migrations/#dropping-columns) separates ignoring, dropping, and removing the ignore rule across releases to account for running processes and cached schemas.

**Temporary compatibility can become permanent.** Duplicate storage, extra writes, comparisons, and bridge code cost resources and attention. Assign owners and retirement criteria. Preserve authorization and data protections on both interfaces; expansion must not expose a new path that bypasses policy.

## Related patterns

[[data-incremental-replacement|Strangler Fig]] displaces legacy responsibilities through slices. Expand–Migrate–Contract can structure an interface transition within a slice.

[[data-additive-schema-evolution|Additive Schema Evolution]] creates room for compatible coexistence; it does not by itself migrate consumers or retire the old form.

[[data-replayable-backfills|Replayable Backfills]] supplies historical migration with repeatable progress and failure recovery.

[[data-source-to-target-reconciliation|Source-to-Target Reconciliation]] supplies evidence that relevant data agrees before cutover, including values and omissions rather than counts alone.

## Sources

- Danilo Sato, [Parallel Change](https://martinfowler.com/bliki/ParallelChange.html), 2014: established phases and expand-and-contract naming.
- [Prisma Data Guide](https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern): schema/client coexistence and ordered migration steps.
- [Stripe: Online migrations at scale](https://stripe.com/blog/online-migrations): the attributed subscription migration example.
- GitLab: [Batched background migrations](https://docs.gitlab.com/development/database/batched_background_migrations/) and [Avoiding downtime in migrations](https://docs.gitlab.com/development/database/avoiding_downtime_in_migrations/): idempotence, completion, and staged retirement.
- [dbt model versions](https://docs.getdbt.com/docs/mesh/govern/model-versions): consumer migration windows for changing model interfaces.

The account API, revision race, warehouse-grain scenario, code, and diagrams are original Patternverse teaching examples developed from the existing article.
