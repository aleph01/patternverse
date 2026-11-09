---
id: resource-deadlock
type: concept
title: Resource Deadlock
summary: Trace who holds each needed resource, break a closed chain of waiting safely, and change allocation rules to prevent the same deadlock from returning.
status: published
tags:
  - structural-traps
  - dependency-and-feasibility
  - resource-allocation
  - deadlock
  - concurrency
verses:
  - systems-thinking
attribution: Original Patternverse field-guide synthesis. The worked scenario and explanatory diagram are hypothetical. Qualitative comparisons state their assumptions; attributed theory and research are distinguished from practical editorial guidance.
---

## A recognizable situation

Cars have filled the streets around a small block. At each corner, a driver is waiting to enter a space occupied by a car waiting at the next corner. Nobody can move forward until somebody else moves first.

The drivers sound their horns. Traffic is stationary even though every driver wants to leave. In this hypothetical layout, there is no usable gap, exit, or ordinary reversing move within the permitted movements.

This is more specific than heavy traffic. The occupied spaces and required next spaces form a closed chain. Coffman and colleagues used traffic around a square as an example in their foundational survey of deadlocks. [Figure 1](https://uobdv.github.io/Design-Verification/Supplementary/System_Deadlocks-Four_necessary_and_sufficient_conditions_for_deadlock.pdf)

## The underlying pattern

**Resource deadlock occurs when a set of tasks cannot progress because each waits for resources held by other blocked tasks in the set.** Each holds something another needs, and nobody can reach the step that releases it.

The standard account comes from operating-systems research. Coffman, Elphick, and Shoshani's 1971 survey, _System Deadlocks_, consolidated earlier work, including Dijkstra's. It discusses physical equipment and traffic as well as computing; it did not invent every underlying idea. [Original paper](https://uobdv.github.io/Design-Verification/Supplementary/System_Deadlocks-Four_necessary_and_sufficient_conditions_for_deadlock.pdf)

Four necessary conditions are commonly called the **Coffman conditions**:

- **Mutual exclusion:** a relevant resource cannot serve competing tasks simultaneously.
- **Hold and wait:** a task retains resources while requesting more.
- **No preemption:** the procedure does not forcibly reclaim held resources.
- **Circular wait:** a chain of waiting returns to its starting task.

These describe the classical reusable-resource model. Allowing these conditions does not mean every execution deadlocks. The actual allocation and requests matter. [University of Illinois coursebook](https://cs341.cs.illinois.edu/coursebook/Deadlock)

## What keeps it going

Each car holds an exclusive resource: the road space it occupies. It cannot release that space by moving forward until it obtains the next space. That next space is held by another blocked car. Follow the requests around the block and they return to the first car.

The classical necessary conditions are **mutual exclusion** (space cannot be used by two cars at once), **hold and wait** (a car occupies one space while requesting another), **no preemption** (ordinary operation does not remove an occupying car), and **circular wait** (the requests close a chain). These terms describe the resource model, not a judgment about the drivers. [Coffman and colleagues](https://uobdv.github.io/Design-Verification/Supplementary/System_Deadlocks-Four_necessary_and_sufficient_conditions_for_deadlock.pdf)

Under the stated movement restrictions, no driver has an enabled forward move that begins releasing the chain. More patience does not make the spaces available. A traffic controller with a safe way to create a gap can change that state, but such a move lies outside the initially blocked procedure.

Real intersections have additional movements, changing signals, pedestrians, and safety requirements. Those details can make an apparent cycle releasable or make an imagined recovery unsafe. Establish actual holdings and permitted moves before declaring deadlock.

![Hypothetical qualitative illustration. A holds A and requests B; B holds B and requests C; C holds C and requests D; D holds D and requests A. No ordinary forward move is available. Authorized removal of A to a safe bay frees A, allowing D, C, and B to move before A can re-enter. Change: Create a safe release, then prevent new entry from closing the cycle again. Limitation: Safe geometry, authority, and compliance are assumed. No road-control specification is supplied.](../assets/structural-traps/resource-deadlock-workshop.svg "Hypothetical illustration. The upper arrows are requests for occupied spaces, not directions on a road map. The lower sequence creates a gap and keeps new entry from consuming it. A safe bay and controlled movement are additional capabilities, and A loses priority.")

## Why the obvious responses fail

**Wait longer.** Ordinary waiting ends when a holder can finish. In the closed cycle, each relevant holder is waiting for another blocked holder.

**Give every driver priority.** Priority cannot make occupied space vacant. Somebody needs a feasible movement or a safe release.

**Treat a timer as a solution.** An expired timer establishes delay. Recovery requires an action that actually frees a needed resource.

**Release and retry without coordination.** In computing, jobs can repeatedly relinquish and reacquire resources in conflicting orders without completing. That active failure is **livelock**, distinct from stationary deadlock. [Illinois coursebook](https://cs341.cs.illinois.edu/coursebook/Deadlock)

## Possible ways out

Deadlock theory distinguishes **prevention**, which rules out a necessary condition; **avoidance**, which checks whether an allocation preserves a feasible completion sequence; and **detection and recovery**, which acts after deadlock occurs. Each has different information needs and costs. [Foundational survey](https://uobdv.github.io/Design-Verification/Supplementary/System_Deadlocks-Four_necessary_and_sufficient_conditions_for_deadlock.pdf)

**Recover by creating a safe release.** In the traffic illustration, an authorized controller needs a genuinely usable way to remove one car from the occupied cycle. Reversing into other traffic is not an assumed option. In software, recovery may instead abort a transaction and release its locks. Lost progress, delay, and responsibility for the sacrificed turn must be considered.

**Prevent entry that creates blocked holdings.** Keeping an intersection clear until usable downstream space exists can prevent the illustrated traffic cycle if all relevant entries are controlled. It cannot empty an already blocked square. Safe signal timing, compliance, and actual road geometry need traffic-engineering judgment.

**Use one resource-acquisition order where the resources permit it.** Computer jobs can be required to acquire locks in one strict common order. Increasing ranks cannot close a cycle because returning to the first resource would require a lower rank. Hidden acquisition paths must follow the same order. This is not a proposal to assign arbitrary ranks to road positions. [Illinois coursebook](https://cs341.cs.illinois.edu/coursebook/Deadlock)

**Grant a whole bundle or check a safe sequence.** A resource manager can sometimes withhold partial allocations, or use declared maximum needs to preserve an order in which all jobs could finish. These require control and reliable demand information, and may reduce utilization or delay large requests. An unsafe allocation is not necessarily already deadlocked. [Operating-systems notes](https://www.cs.uic.edu/~jbell/CourseNotes/OperatingSystems/7_Deadlocks.html)

These interventions change allocation or permitted release. If every needed space remains occupied, every forward move requires another blocked holder, and no alternative movement or removal is allowed, the original closed cycle cannot progress.

## A worked example

### Create a gap, then keep it usable

The drivers first wait and signal their impatience. The controller traces the occupied spaces rather than assuming that changing the signal will allow movement. The same request returns to the first waiting car.

For this hypothetical recovery, a protected side bay is available beside Car A. It is not a through exit, and entering it requires an authorized movement unavailable under the ordinary forward-only procedure. The controller verifies that the bay and the controlled movement are usable, stops conflicting entry, and directs A out of the cycle.

A's former space is now free. The car behind can move into it, releasing its previous space; the next car can then move. The gap travels backward through the chain while cars move forward. The controller keeps new traffic from filling the gap until the cycle has cleared, then admits A when a usable route is available.

This is a stipulated sequence, not a road-control specification or measured success. A loses its original place and others wait during recovery. Without a safe bay, removal, or alternative route, the diagram cannot supply the missing physical capability. Future admission rules must prevent the same occupation pattern from recurring.

### A documented computing counterpart

PostgreSQL's documentation shows transactions updating two account rows in opposite orders. Each holds a lock needed by the other. PostgreSQL detects deadlock and aborts one transaction; applications must not rely on which one is selected. Consistent lock ordering prevents the illustrated cycle, while retrying an aborted transaction is recovery. This documents product behavior, not a success rate for traffic interventions. [PostgreSQL 18](https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-DEADLOCKS)

## Limits and lookalikes

**Contention** is competition for a busy resource whose holder can still finish. **Starvation** means a task keeps being denied service while others progress. Neither requires a waiting cycle.

For the classical single-instance resource model, a cycle in the allocation graph establishes deadlock. With several interchangeable instances, a cycle alone is insufficient: another holder might finish and release an instance. Check actual availability and possible completion sequences. [Operating-systems notes](https://www.cs.uic.edu/~jbell/CourseNotes/OperatingSystems/7_Deadlocks.html)

Human negotiations also involve preferences, authority, and alternatives that this model omits. Mutual refusal is not automatically resource deadlock. Establish who holds what, which requests are mandatory, and what releases remain possible before applying the label.

## Related patterns

[[circular-prerequisites-and-bootstrapping|Circular Prerequisites and Bootstrapping]] concerns missing starting conditions. Resource deadlock specifically involves existing allocations that obstruct one another.

[[scoped-locking|Scoped Locking]] ensures release when execution leaves a protected scope. It cannot help two tasks that never reach that exit because each waits inside it.

[[scoped-resource-management|Scoped Resource Management]] makes cleanup ownership explicit. Reliable release complements acquisition ordering; preventing forgotten cleanup does not itself prevent circular acquisition.

## Sources and further reading

- [Coffman, Elphick, and Shoshani, _System Deadlocks_ (1971)](https://uobdv.github.io/Design-Verification/Supplementary/System_Deadlocks-Four_necessary_and_sufficient_conditions_for_deadlock.pdf). Foundational survey of conditions, models, prevention, avoidance, and recovery; not an empirical intervention trial.
- [University of Illinois, CS 341: Deadlock](https://cs341.cs.illinois.edu/coursebook/Deadlock). Accessible explanation of allocation graphs, ordering, and livelock.
- [John Bell, Operating Systems: Deadlocks](https://www.cs.uic.edu/~jbell/CourseNotes/OperatingSystems/7_Deadlocks.html). Teaching notes explaining multiple instances, safe states, and policy costs.
- [PostgreSQL 18: Deadlocks](https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-DEADLOCKS). Official worked transaction example and the database's documented recovery behavior.
