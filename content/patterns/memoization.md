---
id: memoization
type: pattern
title: Memoization
summary: Remember a function’s completed results under equivalent inputs so later calls can reuse them instead of repeating the calculation.
status: published
aliases:
  - Memoisation
tags:
  - software-engineering
  - performance-and-scalability
  - computation-reuse
verses:
  - software-engineering
attribution: Original Patternverse explanation, program, and illustrations; historical memo functions and modern implementations are attributed in Sources.
---

## Purpose and problem

A publishing tool estimates when a project can finish. Packaging needs both assets and templates; both depend on parsing the same source. A direct recursive calculation follows each dependency and calculates parsing twice. Larger dependency networks can repeat whole branches many times.

The calculation is correct, but it keeps answering questions it has already answered. The team wants to preserve its clear recursive rules while avoiding repeated work. Remembering answers introduces a second responsibility: deciding when a previous answer still means the same thing.

## Core idea

**Memoization associates a function’s completed result with the inputs that produced it.** A wrapper looks up the input before executing the calculation. A hit returns the remembered result; a miss computes, stores, and returns it.

Think of a function with a notebook indexed by its arguments. The notebook changes how the answer is obtained, while preserving the answer’s meaning. Donald Michie’s 1968 memo-function paper is a historical foundation for this rule-and-table combination.

Memoisation is an alternative spelling. Memoization is a form of caching, not a synonym for every cache. It can support top-down dynamic programming by reusing overlapping subproblems. Bottom-up tabulation instead chooses an evaluation order and fills a table iteratively. Some literature uses “tabulation” more broadly, so check the actual mechanism.

![Five project tasks form an acyclic dependency graph. Publish depends on package; package depends on assets and templates; both depend on parse. Parse finishes at minute 2, assets at 5, templates at 6, package at 7, and publish at 9. The shared parse result is computed once and reused.](../assets/software-engineering/memoization-dependencies.svg "Arrows mean the upper task needs the lower task’s result, not execution over time. Values are earliest finish times in minutes with unlimited parallel resources. In the sequential cold calculation, five task bodies run and the second request for task 0 hits the memo table.")

## How it works

### Equivalent inputs must imply reusable results

The key must account for every dependency that can change the answer. Arguments alone suffice for a deterministic calculation over immutable values. Reading a mutable global configuration, current permissions, or a changing database adds dependencies that a simple argument key does not capture. Include a stable snapshot/version or restrict the cache’s lifetime accordingly.

A miss runs the original function and records its successful return. Recursive calls must pass through the memoized entry point; wrapping only the outer call leaves internal repetition intact. A completed-result table does not resolve cycles or automatically represent in-progress work.

Keep absence distinct from valid results such as zero or `False`. Returning a remembered mutable list also returns shared state; callers could change what future calls receive. Prefer immutable results, or define copying and ownership explicitly. Required side effects must not disappear merely because a later call hits the table.

### Choose an owner and a lifetime

A cache may belong to one computation, one object, or a longer-lived service. More retained keys allow more reuse but consume memory and retain referenced objects. A bounded policy can evict entries and cause recomputation; eviction must preserve correctness.

Python’s memoization wrappers require hashable arguments and expose cache statistics and clearing. Their thread-safe bookkeeping permits duplicate execution on concurrent misses. Memoization therefore does not promise one execution per input across threads, processes, eviction, or clearing. Sharing in-flight work needs additional coordination.

## Worked example

### Estimate one immutable project

Each task has a duration in integer minutes and prerequisite indices. Its earliest finish is its own duration plus the largest prerequisite finish, or zero prerequisite time when none exist. Tasks can run in parallel without resource contention. This is an estimate over declared durations, not a scheduler or a wall-clock guarantee.

Save this complete Python 3.11+ program as `memoization.py`; run `python3 memoization.py`. Input pairs must be well formed. Dependencies must refer to earlier tasks, making the graph acyclic. Construct the snapshot without concurrent input edits.

```python
from functools import cache


def make_estimator(tasks):
    snapshot = tuple((minutes, tuple(deps)) for minutes, deps in tasks)
    for index, (minutes, deps) in enumerate(snapshot):
        if type(minutes) is not int or minutes < 0:
            raise ValueError("duration must be nonnegative integer minutes")
        if any(type(dep) is not int or not 0 <= dep < index for dep in deps):
            raise ValueError("dependencies must refer to earlier tasks")

    @cache
    def finish(index):
        minutes, deps = snapshot[index]
        previous = max((finish(dep) for dep in deps), default=0)
        return minutes + previous

    def estimate(index):
        if type(index) is not int or not 0 <= index < len(snapshot):
            raise IndexError("unknown task")
        return finish(index)

    return estimate, finish.cache_info, finish.cache_clear


tasks = [(2, []),       # 0: parse
         (3, [0]),      # 1: assets
         (4, [0]),      # 2: templates
         (1, [1, 2]),   # 3: package
         (2, [3])]      # 4: publish
estimate, info, clear = make_estimator(tasks)
print(f"publish: {estimate(4)} minutes; cache misses: {info().misses}")
print(f"package: {estimate(3)} minutes; cache misses: {info().misses}")
tasks[0] = (20, [])
print("original snapshot:", estimate(4), "minutes")
updated, _, _ = make_estimator(tasks)
print("updated snapshot:", updated(4), "minutes")
clear()
print("cached entries after clear:", info().currsize)
try:
    estimate(99)
except IndexError as error:
    print(error)
try:
    make_estimator([(1, [0])])
except ValueError as error:
    print(error)
```

The first two lines print `publish: 9 minutes; cache misses: 5` and `package: 7 minutes; cache misses: 5`. The package query reuses an existing answer without another cache miss. The next lines print `original snapshot: 9 minutes`, `updated snapshot: 27 minutes`, and `cached entries after clear: 0`. Invalid inputs report `unknown task` and `dependencies must refer to earlier tasks`. In this single-threaded calculation, five misses mean five task-body executions; the uncached recursion would execute six bodies for publish because parsing repeats. Requesting package afterward executes no additional body. After snapshot construction, the first calculation visits each reachable task and dependency link; later hits skip that task’s body.

The key is a task index, interpreted within one estimator’s frozen snapshot. Editing the original input cannot change that snapshot. A fresh estimator owns a different table and returns 27 minutes after parsing grows from 2 to 20 minutes.

![Two estimator instances own separate immutable snapshots and memo tables. Snapshot S1 has parsing duration 2 minutes and caches task key 4 as finish time 9 minutes. Snapshot S2 has parsing duration 20 minutes and caches the same task key 4 as 27 minutes. Editing the caller’s input does not change S1.](../assets/software-engineering/memoization-scope.svg "The effective identity includes the estimator’s snapshot ownership as well as the task index. Clearing entries permits recomputation over the same snapshot; it does not reread the caller’s mutable input.")

`cache` has no automatic size bound, but this estimator can retain at most one entry per validated task. Clearing releases entries, not the closed-over snapshot. Drop all returned handles when the estimator is no longer needed so its objects can become collectible. The example supplies no persistence, cross-process sharing, cancellation, or concurrent execution policy.

### Reusing a UI calculation

An editor repeatedly filters an unchanged document as unrelated selection state changes. Memoizing the filtered result can avoid that work. React’s `useMemo` uses declared dependencies compared with `Object.is`; mutating a dependency in place can conceal a relevant change, while recreating an equivalent object can force recalculation. Its cache is an optimization that React may discard, not durable application state.

## When to use it

Look for expensive repeated calls with equivalent inputs, or a recursive dependency graph with overlapping subproblems. Verify reuse with cache statistics and representative timing; a high hit count alone does not quantify saved time.

Keep direct calculation when it is cheap or inputs rarely repeat. For a finite acyclic problem, an iterative dynamic-programming pass may be simpler and avoid recursion depth. Memoization does not repair an inefficient recurrence with too many distinct states.

## Tradeoffs and common mistakes

Key construction, hashing, equality, lookup, and retained results have costs. Large argument objects or long-lived method caches can retain more memory than expected. Set limits or scope ownership to the problem being solved.

Do not mistake object identity for an immutable version, cache permission-dependent answers under incomplete keys, or use reuse to enforce “run once.” After an error, partial subproblem results may remain; caching exceptions or failures requires a deliberate policy. Python `cache` records successful results, not raised exceptions. Long recursive chains can still exceed the call-stack limit even when every result is remembered.

## Related patterns

[[cache-aside|Cache-Aside]] specifies application-managed cache lookup, source loading, and invalidation. Memoization focuses on reusable function evaluations.

[[data-result-caching|Result Caching]] extends the equivalence and freshness problem to computed query answers and reporting contexts.

[[flyweight|Flyweight]] shares intrinsic representation to reduce duplicated state. Memoization primarily avoids repeated calculation, although its returned objects may also be shared.

## Sources

- [Donald Michie: “Memo” Functions and Machine Learning, Nature 218, 19–22, 1968](https://www.nature.com/articles/218019a0) — historical memo-function rule/table design; [original paper scan](https://www.cs.utexas.edu/~hunt/research/hash-cons/hash-cons-papers/michie-memo-nature-1968.pdf).
- [Abelson, Sussman, and Sussman: Structure and Interpretation of Computer Programs, exercise 3.27](https://web.mit.edu/6.001/6.037/sicp.pdf) — argument-keyed tables and recursive memoized calls; also uses “tabulation.”
- [MIT 6.006: Dynamic Programming I](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/b6d4083131dd16e7d97f56d04b6e858f_MIT6_006F11_lec19.pdf) — overlapping subproblems, bottom-up evaluation, and acyclic dependency analysis.
- [Python: functools](https://docs.python.org/3/library/functools.html) — cache keys, retention, clearing, result semantics, and concurrent-miss behavior.
- [React: useMemo](https://react.dev/reference/react/useMemo) — dependency comparison, purity, and optimization-only lifecycle.

The project estimator, input-snapshot comparison, editor situation, and diagrams are original teaching examples.
