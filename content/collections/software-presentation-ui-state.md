---
id: software-presentation-ui-state
type: collection
title: Presentation and UI State
summary: Separate user interaction, presentation, and application state with deliberate ownership and synchronization policies.
status: published
verses:
  - software-engineering
items:
  - model-view-controller
  - model-view-presenter
  - presentation-model
  - front-controller
  - template-view
  - unidirectional-data-flow
---

These patterns examine how interfaces interpret input, represent application state, and keep what users see aligned with the state and rules behind it.

[[model-view-controller|Model-View-Controller]] separates meaningful state and rules from their presentation and the interpretation of user interaction. It makes the refresh policy explicit while accommodating different desktop and web collaborations.

[[model-view-presenter|Model-View-Presenter]] moves interaction and screen coordination into a presenter, with Passive View and Supervising Controller variants that make different synchronization choices.

[[presentation-model|Presentation Model / MVVM]] gives drafts, selection, validation, and command availability a widget-independent home, with an explicit binding or mapping contract.

[[front-controller|Front Controller]] coordinates a shared web request lifecycle and delegates action-specific work behind an intentionally mapped entry point.

[[template-view|Template View]] keeps HTML structure in a template and supplies request-specific presentation data through an explicit rendering contract.

[[unidirectional-data-flow|Unidirectional Data Flow]] routes events to an explicit state owner and derives the UI from controlled state transitions, with deliberate policies for asynchronous completions.

Compare the presentation responsibilities with the business behavior in [[software-domain-modeling-business-logic|Domain Modeling and Business Logic]] and the wider structure in [[software-application-architecture|Application Architecture]].
