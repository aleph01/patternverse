---
id: model-view-controller
type: pattern
title: Model-View-Controller
summary: Separate application state and rules, presentation of that state, and interpretation of user input so each responsibility can change without absorbing the others.
status: published
aliases:
  - MVC
  - Model View Controller
verses:
  - software-engineering
tags:
  - presentation
  - interaction
  - separation-of-concerns
attribution: "Model-View-Controller originated with Trygve Reenskaug; historical interpretation follows Reenskaug and Krasner and Pope, with supporting Martin Fowler, Rails, and Python documentation. Original Patternverse seat-counter example, code, and native illustrations."
---

## Purpose and problem

A workshop screen has a reservation count, a remaining-seats display, and reserve/cancel controls. Initially, each control edits its own displayed number. Reserving seats updates one label but leaves another stale; a second input path also forgets the capacity check.

The interface needs consistent rules, several useful representations, and input behavior that can change independently. Adding more event handlers to the screen makes these responsibilities harder to locate. A new display should not require copying the reservation rules, and a new input device should not change them.

## Core idea

**Model-View-Controller (MVC)** separates three roles. The **model** owns meaningful state and its operations. A **view** represents that state. A **controller** interprets user interaction and invokes the appropriate behavior.

The mental model is **state and rules; representation; interaction**. Reenskaug's [retrospective](https://jpaulgibson.synology.me/~jpaulgibson/TSP/Teaching/Teaching-ReadingMaterial/Reenskaug03.pdf) describes the original goal of helping users inspect and edit information from multiple perspectives. Krasner and Pope's [Smalltalk-80 cookbook](https://ics.uci.edu/~redmiles/ics227-SQ04/papers/KrasnerPope88.pdf) explains the three-way separation.

MVC and Model View Controller are aliases here. Model-View-Presenter and Model-View-ViewModel are related designs, not additional names for this article. MVC also does not prescribe one universal triangle of messages: classic desktop MVC and request-oriented web MVC differ in how input and refresh are coordinated.

![User input reaches a controller, which translates reserve or cancel into a model operation. The model owns reservation state and capacity rules. After the operation, the composition code takes one snapshot and passes it to two views: a reserved-seat summary and a free-seat display. The controller does not format either view.](../assets/software-engineering/model-view-controller-roles.svg "The three roles separate responsibilities. These arrows describe this example's calls and data flow, rather than a mandatory message diagram for every MVC framework.")

## How it works

### Keep meaning independent of its display

The model is more than a database row. Here it knows that reservations cannot exceed capacity or fall below zero. It can enforce those rules without a window, browser, or controller. Larger applications may place such behavior across several domain objects and application services.

Views choose labels, layout, formatting, and which facts to show. They may compute presentation values from valid model state; they should not become the only place that enforces a business rule. The controller translates an input convention, such as digit text and an action name, into a model operation. Parsing UI text and deciding whether enough seats exist are different responsibilities.

### Choose a synchronization policy

Classic Smalltalk MVC commonly updates dependent views after model changes. Fowler's [GUI Architectures](https://martinfowler.com/eaaDev/uiArchs.html) distinguishes observer-based synchronization from explicit application flow, and cautions that MVC terminology covers important variations.

This example uses an explicit refresh in the composition code after each action. Both renderers receive one frozen snapshot, so they format the same state. This demonstrates the roles without reproducing Smalltalk's controller scheduling, widget hierarchy, or dependency machinery. A change made elsewhere will require another refresh; there is no automatic subscription.

With observers, define who subscribes and unsubscribes, when notifications occur, and which UI thread renders them. A notification does not make several displays update atomically. Rendering failure also does not automatically undo a completed model operation.

### Separate durable state from interaction state

One application instance owns this in-memory model and controller. The demonstration processes inputs sequentially. MVC itself supplies no transaction isolation, persistence, request ordering, or protection against concurrent reservations in different processes.

Temporary input text and error messages belong on the presentation side; they do not need to become domain facts. In a web application, request parsing and authentication also do not replace authorization at the protected operation. Views rendering HTML need the appropriate output escaping; the example emits plain text only.

![Two displays first render the same snapshot with two reserved seats out of three and one free seat. A request to reserve two more is rejected by the model before state changes. A fresh snapshot still contains two reserved seats, and both displays remain consistent.](../assets/software-engineering/model-view-controller-update.svg "The model rejects an invalid change before mutation. Re-rendering reads the resulting state; views do not invent or repair a different reservation count.")

## Worked example

### Two representations of one seat counter

Previously, input handlers adjusted separate labels. Now one model owns the count, a controller handles input, and two pure view functions format a snapshot. Save these files together and run `python3 demo.py` with Python 3.10+.

Capacity and model commands use positive whole numbers of seats, excluding booleans. The input adapter accepts one to six ASCII digits; zero is parsed but rejected by the model. The capacity is three seats. All changes are local to this process, not bookings in a shared reservation service.

**seats.py — state, input interpretation, and two views**

```python
from dataclasses import dataclass


def positive(value):
    if type(value) is not int or value <= 0:
        raise ValueError("Positive seat count required")


@dataclass(frozen=True)
class Snapshot:
    reserved: int
    capacity: int

    @property
    def available(self):
        return self.capacity - self.reserved


class SeatModel:
    def __init__(self, capacity):
        positive(capacity)
        self._capacity = capacity
        self._reserved = 0

    def snapshot(self):
        return Snapshot(self._reserved, self._capacity)

    def reserve(self, count):
        positive(count)
        if self._reserved + count > self._capacity:
            raise ValueError("Not enough seats")
        self._reserved += count

    def cancel(self, count):
        positive(count)
        if count > self._reserved:
            raise ValueError("Cannot cancel unreserved seats")
        self._reserved -= count


class SeatController:
    def __init__(self, model):
        self._model = model

    def handle(self, action, raw):
        if type(raw) is not str or not raw.isascii() or not raw.isdecimal() or len(raw) > 6:
            return "Enter 1–6 ASCII digits"
        count = int(raw)
        try:
            if action == "reserve":
                self._model.reserve(count)
            elif action == "cancel":
                self._model.cancel(count)
            else:
                return "Unknown action"
        except ValueError as error:
            return str(error)
        return "Updated"


def summary_view(state):
    return f"Reserved: {state.reserved}/{state.capacity}"


def availability_view(state):
    return f"Free: {state.available}"
```

**demo.py — assemble the roles and explicitly refresh both views**

```python
from seats import SeatModel, SeatController, summary_view, availability_view


model = SeatModel(3)
controller = SeatController(model)


def draw():
    state = model.snapshot()
    print(summary_view(state), "|", availability_view(state))


draw()
print("reserve 2:", controller.handle("reserve", "2"))
draw()
print("reserve 2:", controller.handle("reserve", "2"))
draw()
print("reserve many:", controller.handle("reserve", "many"))
print("cancel 1:", controller.handle("cancel", "1"))
draw()
# Reserved: 0/3 | Free: 3
# reserve 2: Updated
# Reserved: 2/3 | Free: 1
# reserve 2: Not enough seats
# Reserved: 2/3 | Free: 1
# reserve many: Enter 1–6 ASCII digits
# cancel 1: Updated
# Reserved: 1/3 | Free: 2
```

Python documents [frozen dataclass instances](https://docs.python.org/3/library/dataclasses.html#frozen-instances). Here the snapshot contains only integers. An old snapshot stays old; it is not a live binding to the model. The model snapshot exposes the remaining-seat calculation; renderers only format values and do not choose commands.

### Request-oriented web MVC

In Rails, a router selects a controller action, which processes the request and makes model data available for output. The [controller guide](https://guides.rubyonrails.org/action_controller_overview.html#introduction) and [view guide](https://guides.rubyonrails.org/action_view_overview.html) describe that request/response collaboration and template rendering. It should not be confused with long-lived Smalltalk widgets observing a model. Framework conventions may combine responsibilities differently while preserving the central separation.

## When to use it

Use MVC when several displays share meaningful state, input policies vary, or business behavior needs testing independently of UI machinery.

A small static display or a simple form may need only a few clearly separated functions. Creating three folders adds little if state, rules, and rendering still depend on one another indiscriminately.

## Tradeoffs and common mistakes

**Moving everything into a controller.** Coordination can become a second business layer. Keep domain decisions independently usable; delegate larger application operations deliberately.

**Duplicating authoritative state.** A display value may be a projection or draft, but it should not silently become a competing source of truth. Name stale snapshots and refresh boundaries explicitly.

**Confusing feedback with completion.** A model can change successfully while rendering fails. Retry presentation from the resulting state rather than blindly repeating the reservation command. MVC supplies no rollback or exactly-once guarantee.

## Related patterns

[[domain-model|Domain Model]] organizes business state and behavior. It can provide MVC's model, but MVC is a presentation separation rather than a rule that every application needs a rich domain object graph.

[[observer|Observer]] can notify views about model changes. It is one synchronization mechanism; the example deliberately uses explicit refresh instead.

[[service-layer|Service Layer]] coordinates application use cases shared by different clients. Controllers adapt UI or request input to those operations rather than duplicating their orchestration.

## Sources

Reenskaug's [*The Model-View-Controller: Its Past and Present*](https://jpaulgibson.synology.me/~jpaulgibson/TSP/Teaching/Teaching-ReadingMaterial/Reenskaug03.pdf), an author retrospective hosted as a teaching copy, and Krasner and Pope's [1988 Smalltalk-80 cookbook](https://ics.uci.edu/~redmiles/ics227-SQ04/papers/KrasnerPope88.pdf) establish the historical roles. Fowler, Rails, and Python sources linked above support the synchronization, framework, and implementation distinctions.

The seat-counter scenario, input grammar, code, and illustrations are original teaching material.
