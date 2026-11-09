---
id: unidirectional-data-flow
type: pattern
title: Unidirectional Data Flow
summary: Send interaction events to an explicit state owner, update state through a controlled path, and derive the UI from the resulting state.
status: published
aliases:
  - UDF
  - One-way Data Flow
verses:
  - software-engineering
tags:
  - presentation
  - state-management
  - event-flow
attribution: "Established unidirectional UI state flow, illustrated by official Redux, Elm, and Android architecture documentation. Original Patternverse search-state example, code, and native illustrations."
---

## Purpose and problem

A search field, result list, and loading indicator each keep their own version of what is happening. Typing `ca` starts one request; typing `cat` starts another. The newer results arrive first, but the older callback replaces them. Meanwhile, another component clears the spinner without updating the error label.

The screen needs one coherent account of its current query, pending work, results, and failures. Directly changing neighboring widgets makes it difficult to explain which interaction produced the visible state.

## Core idea

**Unidirectional Data Flow (UDF)** gives state changes an explicit route: an event reaches a state owner, the owner produces updated state, and the UI renders that state. The view reports interactions rather than independently editing every representation of the same information.

Think **event → state transition → state → view**. Interaction creates another event. The direction describes responsibilities, not an absence of feedback.

Redux's [data-flow guide](https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow) explains state, actions, and rendering. Android's [UI-layer guidance](https://developer.android.com/topic/architecture/ui-layer) describes state flowing toward UI elements and events toward their owner. The pattern is also called One-way Data Flow. Redux and the Elm Architecture are concrete designs, not required dependencies or interchangeable names for the whole pattern.

![A user or service adapter supplies an event to the state owner. A controlled update produces a new UI state, which the view reads to render query, loading, results, and error consistently. The view sends subsequent interaction events back through the same entry path instead of directly changing shared state. Service work is outside the pure update in this example.](../assets/software-engineering/unidirectional-data-flow-cycle.svg "Events request or report a change; state describes what the view should show. The feedback loop uses explicit transitions instead of competing UI mutations.")

## How it works

### Define the owner and its state boundary

The owner may manage a widget, a screen, or a larger feature. UDF does not require every temporary value in an application to live in one global store. Identify which values must agree and give them a clear update authority.

Here one search state contains the query, request identifier, loading flag, results, and display error. Results do not live independently in the list widget while loading state lives elsewhere. Derived labels come from the same state value. Domain data can still have its own owner behind a service or repository.

### Make transitions inspectable

An action or message describes an interaction or completion. The Elm Architecture's [Model, Update, and View](https://guide.elm-lang.org/architecture/) provide one recognizable arrangement. A reducer-style update computes the next state from the previous state and a message.

The example uses pure updates and immutable values. That is a useful realization, not a universal requirement that every UDF implementation use a reducer or one particular immutability library. Python's [frozen dataclasses](https://docs.python.org/3/library/dataclasses.html#frozen-instances) prevent ordinary field assignment; these states contain only strings, integers, booleans, and tuples of strings.

With a deterministic update, replaying the same initial state and message sequence reproduces the same state transitions. That does not reproduce external services, database history, or rendered pixels automatically. An in-memory action list is not event sourcing.

### Route effects and completions deliberately

Network calls, timers, and storage access belong outside this pure update. Redux's [side-effect guidance](https://redux.js.org/usage/side-effects-approaches) explains why reducers and asynchronous work have separate roles. An adapter starts work and sends its eventual result back as another event.

Completion order needs its own policy. The example accepts a completion only while its request ID is current and pending. Redux Toolkit's [request-ID example](https://redux.js.org/toolkit/api/createAsyncThunk) illustrates a similar explicit guard. This prevents stale results from replacing newer intent; it neither cancels old network work nor makes server operations transactional.

Real integrations also need ownership of subscriptions and tasks. Closing a screen should release observers and cancel or disregard late work. Process events through a defined ordering boundary; immutable snapshots alone do not make concurrent read-modify-write operations safe. Notification or rendering failure does not undo a completed state transition.

![Search ca becomes request 1, then search cat becomes request 2. A successful completion for request 2 installs cat results and ends loading. Request 1 then completes, but its identifier is stale, so the update returns the existing state and the cat results remain visible.](../assets/software-engineering/unidirectional-data-flow-stale.svg "Latest search intent wins because the update checks request identity and pending state. One-way flow alone does not choose this ordering policy.")

## Worked example

### A search state with stale-result rejection

Previously, callbacks edited labels and the result list directly. Now they must supply messages to `update`; a pure view formats the resulting state. Save both files together and run `python3 demo.py` with Python 3.10+; no packages are required.

Queries are strings trimmed to at most 80 Unicode code points. An empty query clears the screen and invalidates previous work. Every search intent increments a screen-local request ID, even a repeated query. The initial state and update results are the supported state construction path.

**search.py — messages, controlled transitions, and a view**

```python
from dataclasses import dataclass, replace


@dataclass(frozen=True)
class State:
    query: str = ""
    request_id: int = 0
    loading: bool = False
    results: tuple[str, ...] = ()
    error: str = ""


@dataclass(frozen=True)
class Search:
    query: str


@dataclass(frozen=True)
class Loaded:
    request_id: int
    results: tuple[str, ...]


@dataclass(frozen=True)
class Failed:
    request_id: int
    message: str


def update(state, event):
    if isinstance(event, Search):
        if type(event.query) is not str or len(event.query.strip()) > 80:
            raise ValueError("Query must be text of at most 80 characters")
        query = event.query.strip()
        return State(query, state.request_id + 1, bool(query))
    if isinstance(event, (Loaded, Failed)):
        if type(event.request_id) is not int or event.request_id <= 0:
            raise ValueError("Positive request ID required")
        if event.request_id != state.request_id or not state.loading:
            return state
        if isinstance(event, Loaded):
            if type(event.results) is not tuple or any(type(x) is not str for x in event.results):
                raise ValueError("Results must be a tuple of strings")
            return replace(state, loading=False, results=event.results, error="")
        if type(event.message) is not str or not event.message.strip():
            raise ValueError("Display message required")
        return replace(state, loading=False, results=(), error=event.message)
    raise ValueError("Unknown event")


def view(state):
    if state.loading:
        return f"Loading {state.query} [{state.request_id}]"
    if state.error:
        return state.error
    if not state.query:
        return "Type a query"
    return ", ".join(state.results) or "No matches"
```

**demo.py — simulate user intent and out-of-order completions**

```python
from search import State, Search, Loaded, Failed, update, view


state = State()
for event in [
    Search("ca"),
    Search("cat"),
    Loaded(2, ("cat", "caterpillar")),
    Loaded(1, ("car", "cart")),
    Search("dog"),
    Failed(3, "Search unavailable"),
    Search(""),
]:
    state = update(state, event)
    print(view(state))
# Loading ca [1]
# Loading cat [2]
# cat, caterpillar
# cat, caterpillar
# Loading dog [3]
# Search unavailable
# Type a query
```

The composition owns `state`; neither the view nor a completion callback receives permission to mutate it. After a nonempty Search, an adapter would capture that query and ID, start retrieval, and later dispatch Loaded or Failed. This demo supplies completions manually and performs no network work.

The ID check also ignores duplicate terminal completions after loading ends. Failed carries a prepared display message rather than raw exception details. Unknown event types fail explicitly, a teaching contract choice rather than Redux's convention for unrecognized actions.

### A form can use the same direction

A settings screen can send FieldEdited and SaveRequested messages to its owner and render dirty, saving, and error state. It need not use a global store. A successful local transition is not proof of a durable save; service completion must be represented separately.

## When to use it

Use UDF when several UI elements share state, callbacks produce hard-to-reconstruct changes, or transitions need focused tests. Explicit ownership is especially useful when asynchronous results can conflict with newer interactions.

A local value with one owner may need only a callback. Add store machinery when it solves a coordination problem.

## Tradeoffs and common mistakes

Messages and state transitions add ceremony. Keep boundaries cohesive rather than routing every keystroke through one application-wide manager.

Do not mutate nested state through shared references or keep independent copies of authoritative results in widgets. Also avoid starting work while rendering: repeated rendering can otherwise repeat requests.

One-way flow does not supply debouncing, cancellation, request ordering, authorization, or persistence. The local ID check protects this feature's presentation state under sequential processing; it is not a cross-process concurrency token or a server-side access check.

## Related patterns

[[presentation-model|Presentation Model / MVVM]] gives UI state and behavior a widget-independent home. UDF adds an explicit direction and ownership rule for changes to that state.

[[functional-core-imperative-shell|Functional Core, Imperative Shell]] can separate a pure update from adapters that perform effects. It is one implementation strategy rather than the definition of every UDF system.

[[observer|Observer]] can deliver updated state to views. Subscription delivery alone does not identify the state owner or define event ordering.

[[domain-event|Domain Event]] records a meaningful domain occurrence. A UI Search intent or loading failure is not automatically such a fact, nor an event-sourced history.

## Sources

The linked Redux concepts and effects guides, Elm guide, and Android UI architecture documentation establish the recurring roles. Redux Toolkit supports the explicit request-identity distinction; Python documents the chosen immutable-value mechanism.

The search scenario, form context, Python simulation, request policy, and illustrations are original teaching material.
