---
id: leader-election
type: pattern
title: Leader Election
summary: Select one participant to hold a coordination role for an authority term, with explicit rules for replacement and for rejecting obsolete authority.
status: published
aliases: []
tags:
  - software-engineering
  - distributed-data
  - coordination
  - leadership
verses:
  - software-engineering
attribution: Leader Election guidance from Microsoft, the Raft paper by Diego Ongaro and John Ousterhout, Apache ZooKeeper, etcd, Kubernetes, and Martin Kleppmann. Original Patternverse election and publication simulation with native illustrations.
---

## Purpose and problem

Three scheduler replicas can publish the manifest naming a completed dataset. Running all three independently can produce conflicting publications. Permanently assigning replica A avoids competition until A fails; then nobody takes over. Letting B take over whenever A stops answering creates another danger: A may merely be paused or partitioned and resume later.

The application needs replaceable coordination without treating silence as proof that a process is dead. It must also define what an elected leader may do, and where obsolete authority is rejected.

## Core idea

**Choose a leader under a shared protocol; enforce its authority where work matters.** Leader Election selects a participant for a coordination role and allows replacement when that role becomes unavailable.

The example below numbers election rounds with increasing integers called **terms**. A higher term identifies a newer round, not a wall-clock duration. Different coordination protocols can represent authority differently.

Election is not synonymous with consensus, a lease, or a distributed mutex. Consensus protocols can include elections; a coordination service can expose election through leases or ephemeral records. None of those choices automatically protects an independent destination from a delayed old write.

Prefer a proven coordination service or protocol implementation. The useful abstraction is an authority term and lifecycle, not a Boolean `is_leader` stored indefinitely in application memory.

![In a fixed three-member group A, B, and C, an isolated C receives only its own vote and cannot win. A receives A and B's votes in term one and wins with two of three. Each voter can choose only one candidate per term, so another candidate cannot assemble a different majority in that term.](../assets/software-engineering/leader-election-votes.svg "The quorum is calculated from all three configured members, not just reachable members. Majority intersection and retained one-vote-per-term state prevent different winners in one term under this model's assumptions.")

## How it works

### Separate selection from progress

In a quorum-based election, candidates seek votes for a term. A majority of the full membership must agree. Intersecting majorities prevent different winners in one term when voters retain their decisions. Raft adds log-freshness rules, persistent state, heartbeats, and randomized election timeouts; majority counting alone is not Raft.

Safety and availability differ. A minority partition must not redefine itself as the whole group and elect independently. Without sufficient reachable members, election can stop. Progress requires suitable communication and failure assumptions; a timeout alone cannot prove a crash. Membership changes need their own safe protocol.

A different implementation can delegate selection to an existing coordinator. ZooKeeper's recipe uses ephemeral sequential proposals and watches a predecessor to avoid waking every contender. etcd associates election leadership with a lease and exposes ownership checks within its transaction boundary. Kubernetes uses Lease objects for component leader election. These are implementation approaches, not interchangeable timing guarantees.

### Carry authority through handover

A leader may lose coordination authority while retaining CPU time, open connections, and queued requests. A destination can remember the newest authority installed there and reject operations carrying older authority. This rejection is called **resource-side fencing**. The authority check and protected mutation must be atomic, and the remembered authority must survive relevant failures.

The handover boundary matters: electing B does not inform every external resource. In the example, B first installs its newer term at the publication register. Only then does that register reject A. A term is not proof of correct business data, and fencing does not deduplicate repeated operations within one term.

![A wins term one and publishes manifest-A. After a partition B wins term two with B and C. A's old election result still exists. B installs term two at the destination and publishes manifest-B; the destination rejects A's later term-one write and retains manifest-B.](../assets/software-engineering/leader-election-handover.svg "Election and destination handover are separate boundaries. The register rejects obsolete writes after installing the newer authority. It does not stop the old process, authenticate callers, or establish publication correctness by itself.")

## Worked example

### Three voters and one protected publication register

Save `election.py` and `demo.py` together; run `python3 demo.py` with Python 3.11+. This deterministic, sequential simulation has fixed membership, trusted unique identities, and positive integer terms, not wall-clock durations. Each call models an atomic voter or register operation. Successful results are historical observations, not permanent permission to write.

```python
from dataclasses import dataclass


class StaleLeader(Exception):
    pass


@dataclass
class Voter:
    term: int = 0
    voted_for: str | None = None

    def vote(self, candidate, term):
        if term < self.term:
            return False
        if term > self.term:
            self.term, self.voted_for = term, None
        if self.voted_for not in (None, candidate):
            return False
        self.voted_for = candidate
        return True


@dataclass(frozen=True)
class Elected:
    candidate: str
    term: int
    votes: tuple[str, ...]


class Election:
    def __init__(self, members):
        members = tuple(members)
        if (not 1 <= len(members) <= 7 or
                any(not isinstance(name, str) or not name for name in members) or
                len(set(members)) != len(members)):
            raise ValueError("Expected 1–7 distinct nonempty member names")
        self.voters = {name: Voter() for name in members}
        self.quorum = len(members) // 2 + 1

    def campaign(self, candidate, term, reachable):
        if candidate not in self.voters or type(term) is not int or term < 1:
            raise ValueError("Invalid candidate or term")
        reachable = set(reachable)
        if candidate not in reachable or not reachable <= self.voters.keys():
            raise ValueError("Reachable set must include self and only members")
        votes = tuple(sorted(name for name in reachable
                             if self.voters[name].vote(candidate, term)))
        if len(votes) >= self.quorum:
            return Elected(candidate, term, votes)
        return None


@dataclass
class Register:
    term: int = 0
    owner: str | None = None
    value: str | None = None

    def install(self, elected):
        if (elected.term < self.term or
                (elected.term == self.term and elected.candidate != self.owner)):
            raise StaleLeader("Obsolete or conflicting authority")
        self.term, self.owner = elected.term, elected.candidate

    def write(self, elected, value):
        if (elected.term, elected.candidate) != (self.term, self.owner):
            raise StaleLeader("Destination rejects obsolete authority")
        self.value = value
```

`demo.py` keeps A's old result after B wins a newer term. Publication attempts use that result's term and identity:

```python
from election import Election, Register, StaleLeader


election = Election(("A", "B", "C"))
print("isolated C elected:", election.campaign("C", 1, ("C",)) is not None)
a = election.campaign("A", 1, ("A", "B"))
assert a is not None
print("elected:", a.candidate, a.term, a.votes)
register = Register()
register.install(a)
register.write(a, "manifest-A")

b = election.campaign("B", 2, ("B", "C"))
assert b is not None
print("replacement:", b.candidate, b.term, b.votes)
register.install(b)
register.write(b, "manifest-B")
try:
    register.write(a, "manifest-A-late")
except StaleLeader:
    print("stale A rejected")
print("stored:", register.value)
```

Outputs are `isolated C elected: False`, `elected: A 1 ('A', 'B')`, `replacement: B 2 ('B', 'C')`, `stale A rejected`, and `stored: manifest-B`. Vote tuples identify distinct voters. A's retained result remains term one; it cannot bypass the installed term-two guard.

The model omits network communication, clocks, election retries, process roles, persistence, log replication, and Raft's log-freshness condition. Recreating voters could forget votes; recreating the register could forget its fence. Only trusted results from this election scope may install authority. Production needs authenticated coordination, durable monotonic state, safe restore, and atomic destination enforcement. This code is an executable explanation, not a consensus library or crash-recovery implementation.

## When to use it

Use election when replicas need one active coordinator for a defined scope, can tolerate handover pauses, and have a dependable authority mechanism. Scope leadership per partition or job group if a global leader would unnecessarily serialize independent work.

If tasks can be independently claimed from a queue or designed to tolerate duplicate execution, election may add little. One reliable database transaction can also coordinate some workloads more simply.

## Tradeoffs and common mistakes

Leadership introduces coordination load, failover delay, and a concentration of responsibility. Short timeouts can cause churn; long ones delay replacement. Monitor authority changes, renewal failures, quorum loss, and stuck handovers. Define resignation and cleanup without letting an old owner release its successor's authority.

Do not count duplicate responses as distinct votes, silently shrink membership during a partition, or treat election success as authorization forever. Authorization must cover the election scope and protected mutations. Guard every relevant destination path; an unfenced deletion can bypass an otherwise safe publication register.

Liveness also needs operational ownership. A correctly blocked minority is unavailable by design, while a stale process can remain operationally active. Neither condition is repaired by an optimistic status label.

## Related patterns

- [[data-leases-with-fencing-tokens|Leases with Fencing Tokens]] combines temporary ownership and resource-side rejection. It can support a leader's authority but is distinct from choosing the leader.
- [[pessimistic-offline-lock|Pessimistic Offline Lock]] reserves edit ownership across requests; it does not by itself define a replicated election protocol.
- [[idempotent-receiver|Idempotent Receiver]] protects repeated effects within an ownership term. Fencing obsolete terms does not supply that protection.
- [[saga|Saga]] coordinates a multi-step business outcome. Electing its active executor does not provide durable workflow progress or compensation recovery.

## Sources

- [Microsoft: Leader Election](https://learn.microsoft.com/en-us/azure/architecture/patterns/leader-election) establishes the coordination role, replacement problem, and implementation choices.
- [Ongaro and Ousterhout: Raft, extended paper](https://raft.github.io/raft.pdf), sections 5.1–5.4 and Figure 2, separates election from replication and documents majority, term, persistence, and log-freshness rules.
- [ZooKeeper: Leader Election recipe](https://zookeeper.apache.org/doc/current/recipes.html#sc_leaderElection) describes ephemeral sequential proposals and predecessor watches.
- [etcd: Concurrency API](https://etcd.io/docs/v3.6/dev-guide/api_concurrency_reference_v3/) documents lease-backed election and transaction-scoped leadership checks; [Kubernetes: Leases](https://kubernetes.io/docs/concepts/architecture/leases/) gives a documented application context.
- [Kleppmann: How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) explains delayed old owners and destination-side fencing.

The three-voter trace, register simulation, code, and illustrations are original teaching material, not a Raft implementation.
