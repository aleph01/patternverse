---
id: reference-monitor
type: pattern
title: Reference Monitor
summary: Mediate every protected access through a policy-enforcing mechanism that cannot be bypassed or altered by its subjects and is small enough for convincing analysis.
status: published
aliases:
  - Reference Monitor Concept
tags:
  - software-engineering
  - security
  - access-control
verses:
  - software-engineering
attribution: "Reference monitor concept: James P. Anderson, Computer Security Technology Planning Study, Volume II (1972), with NIST terminology. Original Patternverse report-archive example, behavioral simulator, and native illustrations."
---

## Purpose and problem

A report archive checks permissions in its browser controller. The export worker reads the same storage through another path and forgets that check. A user denied the page can still obtain the report as an export. The authorization rule was correct; its placement left a bypass.

Adding another check helps that route, but every new endpoint, background job, and administrative tool creates another opportunity for omission. The system needs an enforceable boundary around the resource, with trusted identity and policy facts, rather than a convention that each caller remembers to cooperate.

## Core idea

**Reference Monitor requires every relevant access to pass through a protected, analyzable access-validation mechanism.** A subject requests an operation on an object; the mechanism evaluates the applicable policy and controls whether that operation occurs.

Anderson’s 1972 report, section 4.1.1, states three requirements: protection against tampering, mandatory involvement in access, and sufficiently small scope for thorough testing. NIST describes these as tamper protection, complete mediation, and verifiability. Small code and passing tests alone do not establish them.

Think **subject → mediated operation → protected object**, with no alternate route around the decision. “Reference Monitor Concept” emphasizes the abstract requirements. A **security kernel** is a trusted implementation of the concept, not a synonym for any authorization function. Applying the idea to an application requires a stated resource boundary and threat model.

![Interactive reads and export requests both enter one logical enforcement boundary. The mechanism uses authenticated subject identity, requested operation, trusted object metadata, and current policy. Only an allowed operation reaches the report store; a denial returns no report. The store has no direct caller access within the declared boundary.](../assets/software-engineering/reference-monitor-boundary.svg "Complete mediation is a property of all access paths. A bypass through storage credentials, another service, or a privileged exception invalidates the claim even if this decision function is correct.")

## How it works

### Protect the decision and the path

Identify subjects, protected objects, permitted operations, and trusted administrators. Authentication establishes a subject’s identity; authorization decides what that subject may do. A caller-supplied username, tenant, or role is not authoritative evidence.

An enforcement point must control the resource operation. A separate policy evaluator can advise it, but an ignored “deny” result enforces nothing. Unknown operations, missing rules, and unavailable required policy evidence should not silently grant access.

Prevent subjects from modifying the mechanism, policy, or authoritative attributes, or acquiring raw access behind it. Process isolation, privilege separation, operating-system controls, and restricted storage credentials may establish that protection. An underscore-prefixed Python field does not.

“One boundary” is logical, not necessarily one machine or singleton. Multiple enforcement points can collectively mediate a system, but all paths and relevant policy versions must be accounted for. Replication or an availability fallback must not create an unguarded route.

### Bind authorization to the operation

Check the exact object and action that will be used. Resolving a pathname, changing tenant ownership, or mutating policy between check and use can invalidate a decision. Use appropriate locking, transactions, stable object handles, or version validation for the resource’s semantics.

Define revocation precisely. Rechecking current policy can deny the next access, but cannot retract information already returned. A long-lived handle, cached permission, exported copy, or downstream service needs its own authorization-lifetime contract.

Decision records can support investigation without containing protected bodies. Protect those records and define logging-failure behavior where audit is mandatory. Audit supplements enforcement; observing an unauthorized read afterward does not prevent it.

## Worked example

### One archive, two access paths

The revised archive mediates both `read` and `export`. Alice may read tenant A reports; an auditor may export them. Permission to read does not imply permission to export, and neither grants access to tenant B.

This Python 3 program is a **closed-world behavioral simulator**, not a protected security kernel. Its normalized subject identifiers stand for identities already established by a trusted authenticator. The model owner controls configuration and state. Hostile code running in the same interpreter could bypass or modify these objects; real isolation is outside this program.

Save as `reference_monitor.py` and run `python3 reference_monitor.py`. Policy versions are integer identifiers, not timestamps. Report bodies are immutable strings. One lock serializes modeled decisions, body retrieval, revocation, and policy-availability changes.

```python
from threading import Lock


class AccessModel:
    def __init__(self):
        self._lock = Lock()
        self._tenants = {"R1": "A", "R2": "B"}
        self._bodies = {"R1": "A totals", "R2": "B totals"}
        self._grants = {("alice", "read"): frozenset({"A"}),
                        ("auditor", "export"): frozenset({"A"})}
        self._version, self._available = 1, True
        self._audit = []

    def access(self, subject, action, resource):
        if any(type(v) is not str or not v
               for v in (subject, action, resource)):
            raise PermissionError("denied")
        with self._lock:
            tenant = self._tenants.get(resource)
            allowed = bool(
                self._available and action in {"read", "export"}
                and tenant is not None
                and tenant in self._grants.get(
                    (subject, action), frozenset())
            )
            self._audit.append((self._version, subject, action,
                                resource, allowed))
            if not allowed:
                raise PermissionError("denied")
            return self._bodies[resource]

    def revoke(self, subject, action):
        with self._lock:
            self._grants.pop((subject, action), None)
            self._version += 1

    def set_policy_available(self, available):
        if type(available) is not bool:
            raise ValueError("boolean availability required")
        with self._lock:
            self._available = available
            self._version += 1

    def decisions(self):
        with self._lock:
            return tuple(self._audit)


if __name__ == "__main__":
    model = AccessModel()

    def show(label, subject, action, resource):
        try:
            print(label, model.access(subject, action, resource))
        except PermissionError:
            print(label, "denied")

    show("read", "alice", "read", "R1")
    show("export", "auditor", "export", "R1")
    show("reader-export", "alice", "export", "R1")
    show("cross-tenant", "alice", "read", "R2")
    model.revoke("alice", "read")
    show("revoked", "alice", "read", "R1")
    model.set_policy_available(False)
    show("unavailable", "auditor", "export", "R1")
```

The output is `read A totals`, `export A totals`, `reader-export denied`, `cross-tenant denied`, `revoked denied`, and `unavailable denied`. All six normalized requests produce decision records. After revocation, policy version 2 denies Alice’s next read. Version 3 denies an otherwise granted export when policy is unavailable.

Administrative methods are trusted model controls, not public client operations. The lock prevents modeled policy changes between decision and body retrieval; it does not supply authentication, process isolation, durable policy distribution, or tamper resistance. Immutable returned values avoid exposing a mutable store reference, but a previously allowed reader can retain the returned information.

![Under policy version 1, Alice’s read of tenant A report R1 is allowed. A serialized revocation installs version 2; Alice’s next read is denied. An unavailable policy state at version 3 denies the auditor’s otherwise permitted export. An earlier returned copy of A totals is not recalled.](../assets/software-engineering/reference-monitor-revocation.svg "These are the simulator’s policy transitions. Revocation orders future accesses at this model boundary; it does not erase a caller’s existing copy or define the lifetime of external handles.")

### Database enforcement has privileged exceptions

Row-security mechanisms can move checks closer to stored records. PostgreSQL documents that superusers and `BYPASSRLS` roles bypass row security, and table owners normally do too unless forced to participate. A service using such credentials cannot claim its row policies mediate every application access. The full credential and resource path matters more than the presence of a policy definition.

## When to use it

Use the concept when untrusted subjects share protected resources and omissions in distributed permission checks are unacceptable. Recognizable signals include inconsistent browser/API/export behavior, sensitive multi-tenant data, or extensible systems whose new paths must remain controlled.

For a small trusted tool with no meaningful privilege boundary, ordinary validation may suffice. Adding a class called “monitor” does not create a threat model or an enforcement boundary.

## Tradeoffs and common mistakes

Every mediated operation incurs decision and coordination costs. Larger policy languages, plugin hooks, and privileged exceptions increase the trusted surface and make assurance harder. Availability and caching choices also change when access can be revoked.

Common mistakes include trusting asserted identity, protecting only the user interface, checking one object and using another, failing open on policy errors, and declaring tamper protection because fields are private by convention. Verification must examine bypass paths and deployment privileges as well as allowed and denied test cases.

## Related patterns

[[proxy|Proxy]] can implement a protection wrapper, but interface mediation alone does not establish complete mediation or tamper protection.

[[data-policy-as-code|Policy as Code]] expresses and tests rules. Reference Monitor concerns whether their decisions are unavoidably enforced on protected operations.

[[data-row-and-column-level-access|Row- and Column-Level Access]] supplies data-specific enforcement. Its privileged bypasses and alternate access paths remain part of the boundary analysis.

[[monitor-object|Monitor Object]] synchronizes concurrent access to object state. Mutual exclusion is a different concern from security authorization; it is not an alias for Reference Monitor.

## Sources

- [James P. Anderson: Computer Security Technology Planning Study, Volume II](https://seclab.cs.ucdavis.edu/projects/history/papers/ande72.pdf), October 1972, section 4.1.1, printed pages 22–23 — historical concept and validation-mechanism requirements.
- NIST: [Reference monitor](https://csrc.nist.gov/glossary/term/reference_monitor), [reference monitor concept](https://csrc.nist.gov/glossary/term/reference_monitor_concept), and [security kernel](https://csrc.nist.gov/glossary/term/security_kernel) — design properties, abstraction, and implementation terminology.
- [PostgreSQL: Row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) — applicability and privileged bypass behavior.

The archive policy, simulator, controlled revocation/outage experiment, and diagrams are original teaching material.
