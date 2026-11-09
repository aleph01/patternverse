---
id: health-endpoint
type: pattern
title: Health Endpoint
summary: Expose a small, explicit health contract that an external observer can use to make routing, startup, or recovery decisions.
status: published
aliases:
  - Health Check API
  - Health Endpoint Monitoring
tags:
  - software-engineering
  - reliability
  - health-checks
  - observability
verses:
  - software-engineering
attribution: Health Check API is catalogued by Chris Richardson; Health Endpoint Monitoring is documented by Microsoft. Kubernetes, Spring Boot and AWS establish operational distinctions. Original Patternverse lifecycle example and native illustrations.
---

## Purpose and problem

An order service still has a running process and an open port, but its database pool is unusable. A load balancer keeps sending orders to it. Meanwhile, another instance is healthy but still loading its local index; restarting it repeatedly only delays recovery.

Operators need more than proof that a process exists. They need a small, machine-readable signal with a declared meaning, and an observer that knows what action that signal justifies.

## Core idea

**Expose a deliberate health interface and have an external observer interpret it.** Chris Richardson catalogs the interface as Health Check API. Microsoft's Health Endpoint Monitoring describes the endpoint together with its periodic observer. These are searchable catalog names for the same pattern family.

A health response is evidence about specified conditions at one moment. It is not a promise that the next business request will succeed. The endpoint reports; a load balancer, orchestrator, or monitor owns routing, restart, and alert policy.

![An external prober calls an instance's health endpoint. The handler reads declared local lifecycle and dependency observations and returns a small status. The observer applies configured timing and thresholds before changing routing, startup gating, or restart behavior. The endpoint does not perform those actions itself.](../assets/software-engineering/health-endpoint-contract.svg "A reported observation and an operational action are separate steps. Define what is checked, where the probe runs, and which consumer owns the response to failure.")

## How it works

### Separate the questions before selecting checks

**Liveness** asks whether the instance can make the local progress its recovery policy requires. A failure can justify a restart, after the observer's configured thresholds. **Readiness** asks whether it should receive new traffic now. **Startup** gives initialization its own success condition and time allowance.

Kubernetes startup probes suppress liveness and readiness probing until startup succeeds. Readiness failure affects service routing; it does not itself restart the container. The same generic `/health` result should not accidentally drive incompatible actions.

Spring Boot cautions against putting shared external dependencies into liveness: restarting every instance does not repair a shared database. Readiness dependency policy also requires judgment. Include a dependency only when its absence genuinely makes the instance unsuitable for the traffic being routed; optional features may degrade independently.

### Keep the observation meaningful and bounded

Probe the relevant serving path. A separate management listener can answer while the application's request path is broken. Conversely, a shallow handler on the main listener proves responsiveness of that path, not correctness of every worker or dependency.

Make checks cheap, read-only, and bounded. Give dependency operations their own timeouts and release connections on every outcome. Periodically sampled state can reduce probe cost, but needs timestamps and an explicit staleness policy. `Cache-Control: no-store` addresses compliant HTTP caches; it does not refresh an application's own cached observations.

Restrict network access and authorize detailed diagnostics. Return only what the probe needs; avoid credentials, connection strings, and exception dumps. Verify the actual probe can reach the chosen listener without login redirects.

## Worked example

### One listener, three deliberately different signals

This Python 3.11+ example serves real HTTP on loopback. The state callback returns one atomic tuple: initialized, required-dependency-available, and draining. Initialization is a lifecycle flag; dependency availability is injected, not a real database test.

Save `health.py` and `demo.py` together; run `python3 demo.py`. The handler does no remote I/O. Its liveness check means only that this request loop can answer. Startup reflects initialization; readiness additionally requires the chosen dependency and excludes draining.

```python
from http import HTTPStatus


def health_app(snapshot):
    def app(environ, start_response):
        path = environ["PATH_INFO"]
        method = environ["REQUEST_METHOD"]
        if method not in ("GET", "HEAD"):
            status = 405
        elif path == "/livez":
            status = 200
        elif path in ("/startupz", "/readyz"):
            initialized, dependency_ok, draining = snapshot()
            ok = initialized
            if path == "/readyz":
                ok = ok and dependency_ok and not draining
            status = 200 if ok else 503
        else:
            status = 404
        body = b"ok\n" if status == 200 else b"unavailable\n"
        headers = [("Content-Type", "text/plain"),
                   ("Content-Length", str(len(body))),
                   ("Cache-Control", "no-store")]
        if status == 405:
            headers.append(("Allow", "GET, HEAD"))
        start_response(f"{status} {HTTPStatus(status).phrase}", headers)
        return [] if method == "HEAD" else [body]
    return app
```

```python
from threading import Lock, Thread
from urllib.error import HTTPError
from urllib.request import ProxyHandler, build_opener
from wsgiref.simple_server import make_server, WSGIRequestHandler
from health import health_app


class Quiet(WSGIRequestHandler):
    def log_message(self, *args):
        pass


lock = Lock()
state = (False, False, False)


def snapshot():
    with lock:
        return state


with make_server("127.0.0.1", 0, health_app(snapshot),
                 handler_class=Quiet) as server:
    client = build_opener(ProxyHandler({}))
    base = f"http://127.0.0.1:{server.server_port}"

    def probe(path):
        try:
            response = client.open(base + path, timeout=1)
        except HTTPError as error:
            response = error
        with response:
            response.read()
            return response.status

    worker = Thread(target=server.serve_forever,
                    kwargs={"poll_interval": 0.01})
    worker.start()
    try:
        phases = [("starting", (False, False, False)),
                  ("ready", (True, True, False)),
                  ("dependency down", (True, False, False)),
                  ("recovered", (True, True, False)),
                  ("draining", (True, True, True))]
        for label, value in phases:
            with lock:
                state = value
            print(label, *(probe(p) for p in
                  ("/livez", "/startupz", "/readyz")))
    finally:
        server.shutdown()
        worker.join()
```

The five output lines are `starting 200 503 503`, `ready 200 200 200`, `dependency down 200 200 503`, `recovered 200 200 200`, and `draining 200 200 503`. Columns are liveness, startup, and readiness HTTP statuses. The demo queries all three directly; an orchestrator using startup gating would normally wait before probing the other two.

![Five lifecycle phases show liveness, startup, and readiness responses. Starting gives 200, 503, 503; ready gives three 200 responses; a required dependency outage gives 200, 200, 503; recovery gives three 200 responses; draining gives 200, 200, 503. Readiness loss does not imply a liveness failure or an automatic restart.](../assets/software-engineering/health-endpoint-lifecycle.svg "These are the example's status decisions, not a universal health schema. Each request reads its own snapshot; independent probes can straddle state transitions. No router or restart controller is implemented.")

The server owns its listener; the main thread shuts it down, joins its worker, and closes client responses. The one-second client I/O timeout is not a complete end-to-end deadline. `wsgiref` is a reference server, not a production deployment choice. There is no real dependency checker, freshness enforcement, TLS, authentication, routing controller, or restart logic here.

### Draining during replacement

Before shutting down a real instance, mark it unready, allow routing changes to propagate, and finish or explicitly terminate owned requests within the shutdown budget. The endpoint alone does not drain connections. Already routed work and in-flight requests can remain after a readiness change.

## When to use it

Use Health Endpoint when an external system needs a stable signal to distinguish a running process from an instance suitable for a specific operational decision. Existing platform health groups may already provide the interface; define their membership and consumers rather than adding another endpoint.

A process-existence check may suffice when that is genuinely the only condition being managed. Business correctness still needs request metrics and, where justified, synthetic transactions that exercise the actual service contract.

## Tradeoffs and common mistakes

Deeper checks detect more failures but can amplify dependency load or withdraw every instance together. Check the consumer's all-unhealthy behavior: AWS Application Load Balancer documents fail-open routing when all registered targets are unhealthy. An unready result is not a universal guarantee of zero traffic.

Tune intervals, timeouts, and failure/recovery thresholds together. Frequent checks cost resources; slow detection and stale observations delay action. Avoid flapping and success matchers that accidentally accept a login page or redirect. A green endpoint can coexist with failed business operations, and a dead or unreachable process may produce no HTTP response at all.

## Related patterns

[[timeout|Timeout]] bounds a probe's wait and dependency checks; expiry is an observation, not proof of the failure's cause.

[[data-circuit-breakers|Circuit Breaker]] reacts to outcomes on a dependency path. An endpoint provides declared health evidence, which may cover a narrower path.

[[load-shedding|Load Shedding]] refuses work under capacity pressure. Readiness is a coarser instance-routing signal and should not casually replace request-level admission policy.

[[scoped-resource-management|Scoped Resource Management]] gives probe connections and other acquired resources an explicit cleanup owner.

## Sources

- [Chris Richardson: Health Check API](https://microservices.io/patterns/observability/health-check-api.html) — established interface and external client roles.
- [Microsoft: Health Endpoint Monitoring](https://learn.microsoft.com/en-us/azure/architecture/patterns/health-endpoint-monitoring) — check depth, cost, staleness, reachability, and security.
- [Kubernetes: Liveness, readiness and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) — distinct decisions, startup gating, and configured failure behavior.
- [Spring Boot: Endpoints](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html#actuator.endpoints.kubernetes-probes) — dependency selection, serving-path checks, and lifecycle state.
- [AWS: Target group health checks](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html) — periodic routing checks and all-unhealthy fail-open behavior.
- [Python: wsgiref](https://docs.python.org/3/library/wsgiref.html) — reference HTTP server, WSGI application contract, and production limits.
- [IETF: RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2.5) — response `no-store` semantics for HTTP caches.

The order-service situation, injected lifecycle policy, HTTP experiment, and native diagrams are original teaching material.
