---
id: front-controller
type: pattern
title: Front Controller
summary: Channel a web application's requests through a common processing entry point, then delegate request-specific work to selected handlers.
status: published
aliases:
  - FrontController
verses:
  - software-engineering
tags:
  - presentation
  - request-handling
  - dispatch
attribution: "Front Controller: Martin Fowler's Patterns of Enterprise Application Architecture and the Core J2EE Patterns catalog. Supporting Spring Framework and HTTP specifications. Original Patternverse request-dispatch simulation and native illustrations."
---

## Purpose and problem

A small booking website grows from a welcome page into order history, cancellations, and account settings. Each page starts by selecting a language, preparing request context, finding the relevant action, and translating failures into responses. One page forgets to record failures; another returns a different error format.

The team needs a consistent request lifecycle without placing every booking rule in one enormous controller. Copying the same setup into another page makes the inconsistency harder to remove.

## Core idea

**Front Controller** channels requests through a common entry point that coordinates shared processing and dispatches request-specific behavior to handlers. The mental model is **one request-processing doorway, many delegated actions**.

Fowler's [catalog entry](https://martinfowler.com/eaaCatalog/frontController.html) describes consolidating request handling and dispatching to commands. The [Core J2EE catalog](https://www.oracle.com/java/technologies/front-controller.html) places the pattern in presentation-tier processing, including navigation and error handling.

The name describes a logical role, not a requirement for one machine, process, or Singleton object. Several instances can implement the same processing contract. A router selects a destination; a Front Controller also coordinates the surrounding request lifecycle. An API gateway may provide an external service boundary, but does not automatically replace each application's presentation request handling.

![Several web paths enter a shared front controller. It creates request-local context, chooses an allowlisted handler, and delegates path-specific work. Handler results or recognized routing failures return through common completion handling. Domain operations remain behind the handlers. Only paths mapped to this entry point participate.](../assets/software-engineering/front-controller-dispatch.svg "Centralize the request lifecycle while delegating action-specific work. The shared entry point is a logical boundary, not one mandatory server instance.")

## How it works

### Establish the scope of the doorway

Web-server and framework configuration must actually map the intended requests through the controller. Static files, health endpoints, or another application may deliberately use different paths. Those exceptions need an explicit policy; central checks do not cover a bypass simply because a class is named FrontController.

A page-specific controller organizes one page or action. A Front Controller coordinates entry processing across those destinations. Spring MVC's [DispatcherServlet](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html) is a concrete framework example: it supplies shared processing while configurable components perform the work. It is an implementation, not another universal name for the pattern.

### Separate selection, execution, and completion

The entry pipeline can establish request context, apply common policies, select a handler, invoke it, and translate its result. Handlers adapt particular requests to application operations; they need not perform template rendering themselves.

Order is part of the contract. Resolve trusted identity before an operation needs it; establish locale before formatting output. Authentication may run in an outer filter chain, while operation-specific authorization still needs the protected resource and action. Front Controller alone is not an authorization guarantee.

Spring's [processing documentation](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/sequence.html) shows request attributes, locale resolution, handler selection, rendering, and exception resolution as distinct responsibilities. A framework may arrange filters, interceptors, and rendering differently; the pattern does not prescribe one universal pipeline.

### Keep request state local

A long-lived dispatcher can retain immutable configuration and dependencies. User identity, locale, and request data belong to an individual request context. Storing the current user on the shared dispatcher risks mixing concurrent requests.

Resources acquired for a request need an owner and cleanup boundary, including failure paths. An error response does not roll back a completed business operation or guarantee that a client received it. Retries, transactions, and durable audit delivery require separate policies.

![An unknown path produces a 404 without calling a handler. A known path with the wrong recognized method produces a 405 with an Allow value. A selected handler that raises an exception produces a generic 500, with its request ID retained in internal diagnostics. All three cases reach the simulation's shared audit completion step.](../assets/software-engineering/front-controller-outcomes.svg "Routing misses and handler failures have distinct outcomes. Common completion processing also runs for the illustrated failures.")

## Worked example

### A bounded request-dispatch simulation

Previously, each page performed setup and error translation. Now `FrontController` constructs context and handles routing and failures around small delegated functions. Save both files together and run `python3 demo.py` with Python 3.10+; no packages are required.

Inputs are already-parsed requests with exact paths and recognized GET or POST methods. Language is an illustrative field: `fr` selects French; all other values fall back to English. Handlers return plain-text `Response` values. There is no HTTP listener, URL decoding, authentication, or template engine.

**dispatch.py — a shared entry point and request-local context**

```python
from dataclasses import dataclass
from itertools import count


@dataclass(frozen=True)
class Request:
    method: str
    path: str
    language: str = "en"


@dataclass(frozen=True)
class Context:
    request_id: str
    language: str


@dataclass(frozen=True)
class Response:
    status: int
    body: str
    headers: tuple[tuple[str, str], ...] = ()


class FrontController:
    def __init__(self, routes, audit, failures):
        self._routes = dict(routes)
        self._audit = audit
        self._failures = failures
        self._ids = count(1)

    def handle(self, request):
        context = Context(
            f"r{next(self._ids)}", "fr" if request.language == "fr" else "en"
        )
        response = Response(500, "Internal error")
        try:
            allowed = sorted({
                method for method, path in self._routes if path == request.path
            })
            if not allowed:
                response = Response(404, "Not found")
            elif request.method not in allowed:
                response = Response(
                    405, "Method not allowed", (("Allow", ", ".join(allowed)),)
                )
            else:
                response = self._routes[(request.method, request.path)](context)
                if not isinstance(response, Response):
                    raise TypeError("Handler must return Response")
        except Exception as error:
            self._failures.append((context.request_id, type(error).__name__))
            response = Response(500, "Internal error")
        finally:
            self._audit.append((context.request_id, response.status))
        return response
```

**demo.py — delegated actions and distinct failure paths**

```python
from dispatch import FrontController, Request, Response


def welcome(context):
    return Response(200, "Bienvenue" if context.language == "fr" else "Welcome")


def orders(context):
    return Response(200, f"Orders [{context.language}]")


def broken(context):
    raise RuntimeError("Backend unavailable")


audit, failures = [], []
controller = FrontController({
    ("GET", "/"): welcome,
    ("GET", "/orders"): orders,
    ("GET", "/broken"): broken,
}, audit, failures)
for request in [Request("GET", "/", "fr"), Request("GET", "/orders"),
                Request("GET", "/missing"), Request("POST", "/orders"),
                Request("GET", "/broken")]:
    response = controller.handle(request)
    print(response.status, response.body, dict(response.headers).get("Allow", "-"), sep=" | ")
print(audit)
# 200 | Bienvenue | -
# 200 | Orders [en] | -
# 404 | Not found | -
# 405 | Method not allowed | GET
# 500 | Internal error | -
# [('r1', 200), ('r2', 200), ('r3', 404), ('r4', 405), ('r5', 500)]
```

The 405 includes the allowed method, following [HTTP's requirement](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.6). The exception body remains generic; the failure recorder retains the request ID and exception class, not sensitive exception text. Real diagnostics normally need protected logging with more context.

The simulation is sequential. IDs are local counters, and the in-memory recorders are assumed to work. The audit entries are not durable or an exactly-once guarantee. A transport adapter would also need complete HTTP behavior, including its HEAD/OPTIONS policy and response serialization.

### One framework, many application controllers

In Spring MVC, different annotated controllers can handle different application requests behind DispatcherServlet. A new order action need not copy locale resolution or exception infrastructure. Adding a path still requires an intentional mapping and the appropriate application authorization; common infrastructure does not supply those decisions automatically.

## When to use it

Use Front Controller when many requests share a lifecycle, navigation and error policies vary accidentally, or framework delegates should be configured through one processing mechanism.

A tiny endpoint with no meaningful shared behavior may need only a direct handler. Most web frameworks already provide a front controller; configure and extend it before adding a second competing dispatcher.

## Tradeoffs and common mistakes

A central entry point can accumulate business rules and path-specific conditionals. Delegate application behavior and keep route configuration deliberate. Never turn an untrusted route string directly into an arbitrary class, module, or file name.

Shared code amplifies mistakes as well as fixes: incorrect policy ordering can affect every mapped request. Test rejected paths and failure completion, not only successful dispatch.

Logical centralization does not impose serial execution or one deployed replica. Conversely, replicas do not make shared mutable request state safe. Cleanup, logging failures, asynchronous completion, and responses already sent need explicit framework-specific handling.

## Related patterns

[[model-view-controller|Model-View-Controller]] separates model, view, and input responsibilities. A web MVC system can place individual request controllers behind a Front Controller.

[[command|Command]] can represent delegated actions behind a stable execution interface. The example uses callables rather than command classes.

[[chain-of-responsibility|Chain of Responsibility]] can organize filters or candidate handlers. Its continuation rules differ from selecting one destination in a route table.

[[service-layer|Service Layer]] coordinates application use cases. Request handlers adapt input to those operations instead of making the entry dispatcher own business workflows.

## Sources

Fowler's [Front Controller](https://martinfowler.com/eaaCatalog/frontController.html) and Oracle's [Core J2EE Patterns entry](https://www.oracle.com/java/technologies/front-controller.html) establish the pattern. The linked Spring documentation provides a concrete implementation and processing sequence; RFC 9110 supports the demonstrated method-error response.

The booking-site situation, Python simulation, request paths, and illustrations are original teaching material.
