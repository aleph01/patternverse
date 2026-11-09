---
id: blackboard
type: pattern
title: Blackboard
summary: Let independent knowledge sources build partial solutions in a shared workspace while a controller selects useful contributions from its current state.
status: published
aliases:
  - Blackboard Architecture
  - Blackboard System
verses:
  - software-engineering
tags:
  - application-architecture
  - cooperative-problem-solving
  - opportunistic-control
attribution: "Blackboard architecture is established in the Hearsay-II work of Erman, Hayes-Roth, Lesser, and Reddy; Daniel Corkill's Blackboard Systems; and Pattern-Oriented Software Architecture, Volume 1. Original Patternverse explanation, bounded document example, code, and illustrations."
---

## Purpose and problem

A document-analysis program combines text clues, page structure, and document-type hypotheses. Some pages contain useful words but little layout evidence; others contain tables that help interpret uncertain text. The next useful operation depends on what has already been found.

A fixed sequence either runs unnecessary analysis or buries increasingly complicated branching in one coordinator. Letting every specialist call every other specialist spreads those decisions across the system. The program needs independent expertise while maintaining a coherent, inspectable account of the developing solution.

## Core idea

**Blackboard** has three central parts: a shared workspace containing evidence and partial solutions, independent **knowledge sources** that contribute expertise, and a **control component** that chooses useful work. Specialists communicate through the workspace rather than calling one another. Corkill emphasizes that shared storage alone does not make a blackboard system. [Blackboard Systems](https://dancorkill.com/pubs/ai-expert.pdf).

The mental model is **a developing solution that makes different contributions useful at different times**. An update may enable another specialist or change which existing opportunity deserves attention. The controller repeatedly considers the current situation, rather than merely advancing a fixed pipeline.

![A shared blackboard holds input features, intermediate evidence, and a document hypothesis. Independent text, layout, and combination knowledge sources read snapshots and propose additions. A separate controller chooses an eligible source and commits its contribution.](../assets/software-engineering/blackboard-collaboration.svg "Solid arrows show knowledge contributions and board access. Dashed arrows show the controller's selection of work; specialists do not call one another.")

## How it works

### Knowledge, representation, and control

Knowledge sources agree on the meaning of board entries: what is observed, what is hypothesized, and what supports a conclusion. They can use different internal techniques. Their applicability conditions should be cheaper to evaluate than the work they propose.

A real agenda commonly contains **activations**: a knowledge source paired with a particular evidence context, not just a module name. The controller ranks eligible activations, executes one or more, and reassesses after changes. [Corkill's account](https://dancorkill.com/pubs/ai-expert.pdf) distinguishes knowledge sources from their activations.

The Hearsay-II speech-understanding system illustrates partial interpretations at multiple abstraction levels and heuristic selection of promising actions. Its hypotheses were not simply final answers waiting in a queue. [Original Hearsay-II paper](https://mas.cs.umass.edu/Documents/Erman_Hearsay80.pdf).

### Progress and stopping are explicit decisions

Define a success criterion, what counts as progress, and when to stop searching. No eligible action means the current configuration is stalled; it does not prove that the problem is impossible. Exhausting a computation budget is different again.

Board ownership also matters. Serial execution permits a controller to validate an addition before making it visible. Concurrent execution needs an explicit policy for stale snapshots, incompatible updates, and revisions. A shared dictionary is not a concurrency protocol.

![With text and layout features present, layout and text sources are eligible while combination is blocked. The controller chooses layout, then text, then the newly enabled combination source. Their additions remain on the board until the declared goal is met.](../assets/software-engineering/blackboard-agenda.svg "The example chooses the highest-priority eligible source and rechecks after every commit. Priority is a scheduling preference, not a probability that a hypothesis is true.")

## Worked example

### Combine two clues without wiring a pipeline

The toy document has tokens including `TOTAL` and three equal, positive row lengths. Here row lengths count cells, not physical widths. A text specialist proposes an invoice candidate; a layout specialist reports a table-like structure. A combination specialist can support the candidate only after both contributions exist.

These are deliberately small stand-ins for richer analyses, not OCR or a validated document classifier. Save the following three files together and run `python3 main.py`. They use Python 3.8 or later and its standard library.

**controller.py — shared state and scheduling**

```python
from dataclasses import dataclass
from types import MappingProxyType
from typing import Callable


@dataclass(frozen=True)
class KnowledgeSource:
    name: str
    priority: int
    ready: Callable
    produce: Callable


def solve(initial, sources, goal, budget=10):
    if type(budget) is not int or budget < 0:
        raise ValueError("Budget must be a nonnegative integer")
    sources = tuple(sources)
    if len({source.name for source in sources}) != len(sources):
        raise ValueError("Source names must be unique")
    board, fired, trace = dict(initial), set(), []
    while True:
        snapshot = MappingProxyType(dict(board))
        if goal(snapshot):
            return "solved", board, trace
        ready = [source for source in sources
                 if source.name not in fired and source.ready(snapshot)]
        if not ready:
            return "stalled", board, trace
        if len(trace) >= budget:
            return "budget", board, trace
        chosen = min(ready, key=lambda source: (-source.priority, source.name))
        patch = dict(chosen.produce(snapshot))
        if not patch or board.keys() & patch.keys():
            raise ValueError("Contributions must add new keys only")
        board.update(patch)
        fired.add(chosen.name)
        trace.append(chosen.name)
```

**sources.py — independent procedures and applicability conditions**

```python
from controller import KnowledgeSource


def text_clue(board):
    words = {word.upper() for word in board["tokens"]}
    return {"candidate": "invoice" if "TOTAL" in words else "unknown"}


def layout_clue(board):
    lengths = board["row_lengths"]
    table = len(lengths) >= 2 and len(set(lengths)) == 1 and lengths[0] > 0
    return {"has_table": table}


SOURCES = [
    KnowledgeSource(
        "combine", 100,
        lambda b: b.get("candidate") == "invoice" and b.get("has_table") is True,
        lambda b: {"interpretation": "invoice-supported"},
    ),
    KnowledgeSource("text", 10, lambda b: "tokens" in b, text_clue),
    KnowledgeSource("layout", 20, lambda b: "row_lengths" in b, layout_clue),
]
```

**main.py — one problem instance and its goal**

```python
from controller import solve
from sources import SOURCES


initial = {"tokens": ("ITEM", "TOTAL"), "row_lengths": (3, 3, 3)}
goal = lambda board: board.get("interpretation") == "invoice-supported"
status, board, trace = solve(initial, SOURCES, goal)
print(status, board.get("interpretation"))
print(" -> ".join(trace))
# solved invoice-supported
# layout -> text -> combine
```

Although combination is listed first and has priority 100, it initially cannot act. Layout runs before text because its priority is higher. Source name breaks ties. Each addition changes the next eligibility check; combination becomes eligible only after both clues exist. If table evidence is supplied initially, text can enable combination directly. No source calls another.

The controller owns writes, copies the initial mapping, and rejects empty contributions or overwritten keys. Its read-only snapshots are shallow, so this example requires immutable fact values, such as the tuples and strings shown. Python's [MappingProxyType](https://docs.python.org/3/library/types.html#types.MappingProxyType) prevents assignment through the proxy, not mutation of objects stored inside it.

Each source runs at most once per problem in this simulation. A production system may activate the same source repeatedly for different evidence contexts. The budget counts executed contributions, not seconds. With budget two, both clues remain but the result is `budget`; without layout evidence, it is `stalled`. Neither means a supported interpretation was found. `solved` means the example's goal predicate passed, not that the hypothesis is objectively correct.

## When to use it

Blackboard helps when several kinds of expertise contribute partial results and useful execution order depends on emerging evidence. Interpretation, planning, and recognition tasks can have this shape. Adding expertise is easier when its contract concerns board representations rather than a network of direct calls.

Use a normal function, explicit workflow, or pipeline when the required sequence is already clear. A collection of independent calculations that only shares a cache usually does not need opportunistic scheduling.

## Tradeoffs and common mistakes

**The representation becomes a shared commitment.** Specialists still couple to board schemas and semantics. Record provenance, supporting evidence, and revision identity when conclusions may be disputed. Store competing hypotheses explicitly instead of silently replacing one with another. This example's append-only policy rejects replacement; it does not resolve uncertainty.

**Control can dominate the design.** Repeated eligibility scans and ranking cost work. Poor priorities can spend the budget on unhelpful actions or starve useful ones in a continuing system. Trace selection decisions and test stopping behavior, not just successful answers.

**Termination is not correctness.** Preventing repeated no-progress activations helps bound execution, but cannot establish that the available expertise is sufficient. Keep incomplete and successful results distinguishable.

**Failures and side effects need ownership.** The example is single-threaded with pure contributors; exceptions abort the run. External calls need their own timeout, cancellation, and cleanup policy. An activation budget cannot interrupt a hung source or roll back an external effect.

## Related patterns

[[pipes-and-filters|Pipes and Filters]] connects successive transformations. Blackboard keeps intermediate results available and chooses subsequent work from the developing shared state.

[[mediator|Mediator]] centralizes object interactions. A blackboard controller additionally selects knowledge contributions around a shared problem representation.

[[observer|Observer]] can notify interested sources about board changes. Notification alone does not choose which activation should run or establish a useful stopping criterion.

[[strategy|Strategy]] can supply interchangeable scheduling policies while keeping specialist knowledge separate from control.

## Sources

[Daniel Corkill's *Blackboard Systems*](https://dancorkill.com/pubs/ai-expert.pdf) explains the model, activations, and control. Erman, Hayes-Roth, Lesser, and Reddy's [1980 Hearsay-II paper](https://mas.cs.umass.edu/Documents/Erman_Hearsay80.pdf) describes cooperative interpretation and heuristic scheduling. Buschmann, Meunier, Rohnert, Sommerlad, and Stal catalog Blackboard in [*Pattern-Oriented Software Architecture, Volume 1*](https://www.oreilly.com/library/view/pattern-oriented-software-architecture/9781118725269/9781118725269_c02.xhtml); the accessible preview establishes that architectural placement.

The document scenario, code, scheduling values, and illustrations are original teaching material. They model bounded, serial cooperation without learned recognition, calibrated confidence, durable storage, or concurrent execution.
