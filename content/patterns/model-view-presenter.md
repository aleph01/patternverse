---
id: model-view-presenter
type: pattern
title: Model-View-Presenter
summary: Put a presenter between user gestures, application behavior, and screen updates so presentation decisions can be tested independently of GUI widgets.
status: published
aliases:
  - MVP
  - Model View Presenter
verses:
  - software-engineering
tags:
  - presentation
  - interaction
  - testability
attribution: "Historical MVP: Mike Potel, Taligent, 1996. Variant distinctions: Martin Fowler. Original Patternverse reservation-form example, code, and native illustrations."
---

## Purpose and problem

A reservation form has a quantity field, a Reserve button, an availability label, and an error message. Its click handler parses input, calls booking logic, decides whether the button should remain enabled, and rewrites several widgets. Testing an over-capacity request now requires launching the GUI. A second screen repeats the same presentation decisions with slightly different behavior.

The form needs real widgets, but most decisions do not require them. Moving only the booking rules into a model still leaves input handling and screen coordination trapped inside the window.

## Core idea

**Model-View-Presenter (MVP)** gives a presenter responsibility for responding to view events and coordinating application behavior with presentation. The **model** owns application state and business rules. The **view** supplies the toolkit-specific display and event wiring. The **presenter** handles the interaction on behalf of that view.

Think **widgets report gestures; the presenter coordinates; the model decides what is valid**. The presenter can be exercised with a recording view, making presentation behavior observable without a window.

MVP and Model View Presenter are aliases here, not synonyms for MVC or MVVM. Mike Potel's [1996 Taligent paper](https://www.wildcrest.com/Potel/Portfolio/mvp.pdf) describes a broader programming model including selections, commands, and interactors. The small example below demonstrates a later Passive View form of MVP, not the whole Taligent framework.

![A reservation view forwards quantity text to a presenter. The presenter commands the booking model and reads its remaining seats, then sends display text, button availability, and a message back to the view. In the Passive View example there is no direct model-to-view connection. A recording view implements the same render contract during tests.](../assets/software-engineering/model-view-presenter-roles.svg "The presenter owns presentation coordination. The booking model owns capacity rules; a real or recording view receives the same screen values.")

## How it works

### Choose how much synchronization the presenter owns

MVP has several established interpretations. Fowler's [GUI Architectures](https://martinfowler.com/eaaDev/uiArchs.html) traces the differences between Taligent, Dolphin, and later test-oriented designs. His [retirement note](https://martinfowler.com/eaaDev/ModelViewPresenter.html) splits his former MVP entry into two more precise patterns; it does not declare all MVP software obsolete.

In [Passive View](https://martinfowler.com/eaaDev/PassiveScreen.html), the presenter determines the displayed values and directs updates through a view contract. The view neither queries the domain model nor makes application-specific display decisions. Its remaining work includes assigning widget properties, forwarding events, layout, and accessibility.

In [Supervising Controller](https://martinfowler.com/eaaDev/SupervisingPresenter.html), simple mappings can stay in the view, often through binding. The presenter handles input and more complicated presentation behavior. This reduces manual wiring but leaves those mappings outside presenter-only tests. Neither variant is the universal MVP message diagram.

### Keep rules and display policy separate

The example's model rejects invalid reservation quantities. Its presenter parses UI text, selects status messages, and derives the Reserve button's enabled state from the remaining capacity. A disabled button is feedback, not enforcement: another caller or a queued click must still face the model's capacity check.

The view contract accepts one immutable screen value containing text, a boolean, and a message. This coarse update makes tests inspect a coherent presentation decision. It does not guarantee that real widgets repaint atomically. Python's [Protocol](https://docs.python.org/3/library/typing.html#typing.Protocol) expresses the required operation for type checkers; it does not enforce implementations at runtime.

### Own the lifetime and execution policy

The composition creates one presenter per form and supplies its model and view. A real view forwards events to that presenter; closing the form must detach handlers and cancel or disregard outstanding work. Keeping a presenter in a global container can accidentally retain its closed window.

This demonstration is synchronous and sequential. An asynchronous version must define UI-thread dispatch, which request wins, and how late results are ignored after disposal. Disabling a button alone does not resolve concurrent requests. Rendering failure does not reverse a successful booking; refresh the display rather than repeat the command.

![A three-seat model accepts a reservation of two seats, and the presenter renders one remaining seat with Reserve enabled. A second request for two is rejected without mutation. The presenter reads the unchanged remaining count and renders the same availability with an error message. The recording view captures that screen result without a GUI.](../assets/software-engineering/model-view-presenter-rejection.svg "A rejected request changes the feedback, not the booking count. Tests observe the presenter's complete screen result through the view contract.")

## Worked example

### A reservation form without a GUI dependency

Previously, a widget handler combined all three roles. Now the presenter depends on a small view contract, so a recorder can replace the window. Save these two files together and run `python3 demo.py` using Python 3.10+; no packages are required.

Quantities are whole seats. Model capacity must be positive, and the presenter accepts one to three ASCII digits. Zero parses successfully but fails the model's rule. The model is in memory, not a shared booking service.

**booking.py — model, screen contract, and presenter**

```python
from dataclasses import dataclass
from typing import Protocol


class BookingError(ValueError):
    pass


class Booking:
    def __init__(self, capacity):
        if type(capacity) is not int or capacity <= 0:
            raise BookingError("Positive capacity required")
        self._remaining = capacity

    @property
    def remaining(self):
        return self._remaining

    def reserve(self, count):
        if type(count) is not int or count <= 0:
            raise BookingError("Positive seat count required")
        if count > self._remaining:
            raise BookingError("Not enough seats")
        self._remaining -= count


@dataclass(frozen=True)
class Screen:
    availability: str
    reserve_enabled: bool
    message: str


class View(Protocol):
    def render(self, screen: Screen) -> None: ...


class ReservationPresenter:
    def __init__(self, model: Booking, view: View):
        self._model = model
        self._view = view

    def refresh(self, message=""):
        remaining = self._model.remaining
        self._view.render(Screen(
            f"Seats left: {remaining}", remaining > 0, message
        ))

    def reserve(self, raw):
        if type(raw) is not str or not raw.isascii() or not raw.isdecimal() or len(raw) > 3:
            self.refresh("Enter 1–3 ASCII digits")
            return
        try:
            self._model.reserve(int(raw))
        except BookingError as error:
            message = str(error)
        else:
            message = "Reserved"
        self.refresh(message)
```

**demo.py — a recording view substitutes for widgets**

```python
from booking import Booking, ReservationPresenter


class RecordingView:
    def __init__(self):
        self.frames = []

    def render(self, screen):
        self.frames.append(screen)


model = Booking(3)
view = RecordingView()
presenter = ReservationPresenter(model, view)
presenter.refresh()
for raw in ["2", "2", "many", "1", "1"]:
    presenter.reserve(raw)
for screen in view.frames:
    print(screen.availability, screen.reserve_enabled, screen.message or "Ready", sep=" | ")
# Seats left: 3 | True | Ready
# Seats left: 1 | True | Reserved
# Seats left: 1 | True | Not enough seats
# Seats left: 1 | True | Enter 1–3 ASCII digits
# Seats left: 0 | False | Reserved
# Seats left: 0 | False | Not enough seats
```

The recorder has no model reference and makes no display decisions. The final attempted click is deliberately delivered despite the disabled flag: the model still rejects it. In a toolkit adapter, `render` assigns the three values and the button handler forwards its current quantity text. Presenter tests do not verify that wiring, keyboard access, or layout; those need a small set of real-view checks.

### When binding is already useful

An assessment screen might bind simple measured values directly while a presenter selects a more complex warning treatment. That is the Supervising Controller choice. Retaining a reliable binding can be better than manually copying every field merely to satisfy a Passive View diagram.

## When to use it

Use MVP when screen event handlers contain substantial decisions, GUI startup makes tests slow or fragile, or the same interaction must work through different view implementations. A presenter per coherent form is often easier to understand than one per tiny label.

For a static display or a trivial form, clearly separated functions may suffice. A framework with effective declarative presentation state may already provide an equally testable separation.

## Tradeoffs and common mistakes

A presenter can become a large window-shaped service. Keep business invariants in the model and delegate application workflows rather than copying them into presenters. View contracts that expose concrete widgets erase much of the testing advantage.

Manual synchronization adds code. Avoid two competing update paths where both bindings and the presenter overwrite the same field. Changes made elsewhere require an explicit refresh or an owned subscription; this example has no automatic notifications.

A passing recorder test establishes presentation decisions, not a working GUI. It also supplies no persistence, authorization, transaction isolation, or protection against bookings from other processes. Handle those at the appropriate application and storage boundaries.

## Related patterns

[[model-view-controller|Model-View-Controller]] separates model, display, and input responsibilities. MVP typically has widgets forward gestures to a presenter; the precise distinction depends on the MVC and MVP variants being compared.

[[domain-model|Domain Model]] supplies independently meaningful state and rules. The presenter coordinates its use without becoming their sole owner.

[[observer|Observer]] can notify a presenter about external changes. The subscription needs cleanup, and notifications do not define repaint atomicity or request ordering.

## Sources

Potel's [*MVP: Model-View-Presenter — The Taligent Programming Model for C++ and Java*](https://www.wildcrest.com/Potel/Portfolio/mvp.pdf) establishes the historical programming model. Fowler's linked historical discussion, variant descriptions, and retirement note explain why the collaboration must be named precisely. Python's documentation supports the optional typed view contract.

The reservation scenario, recording view, code, and illustrations are original teaching material.
