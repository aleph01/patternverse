---
id: "proxy"
type: "pattern"
title: "Proxy"
summary: "Stand in for another object to mediate access while preserving its useful interface."
status: "published"
tags:
  - "gof-design-patterns"
  - "object-oriented-design"
  - "structural"
  - "proxy"
verses:
  - "software-engineering"
attribution: "Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package."
---

An image browser shows thousands of thumbnails. Loading every full-resolution image at startup would make opening a folder slow and consume unnecessary memory. Yet the display code wants an image-like object it can ask to render. Proxy supplies a representative that can respond through the expected interface while controlling when the real subject is accessed.

The same idea appears when the subject is remote, access is restricted, or requests can be served from a cache. The proxy stands between client and subject. Its primary responsibility is mediation: deciding whether, when, or how a call reaches the underlying object.

![The client asks a lazy image proxy to render. The proxy loads its real image on first demand, then delegates.](/diagrams/gof/proxy.svg "The client asks a lazy image proxy to render. The proxy loads its real image on first demand, then delegates.")

### A compatible interface with different access behavior

The client usually sees the subject's useful contract. A proxy may hold a subject reference, enough information to create it, or an address for reaching a remote subject. It can perform work before delegation, replace delegation with an equivalent local result, or defer subject creation.

Compatibility should not imply that every operational property is identical. A remote proxy can preserve method names while introducing latency, timeouts, and network failure. A lazy proxy may fail when first used rather than when constructed. Those differences should remain understandable to callers.

The pattern is therefore most effective when the interface expresses the consequences that matter. It can hide transport details without pretending transport has no consequences.

### Loading images on demand

A LazyImage proxy stores an image path and lightweight metadata. When the browser asks for dimensions, it can answer from metadata if that satisfies the contract. When the user requests a detailed render, the proxy loads the real image, remembers it, and delegates rendering.

Before the proxy, folder loading constructs every full image. Afterward, it creates inexpensive representatives and loads only images that need their full content. Client rendering code continues to work through the image interface.

Several details remain. If two callers trigger loading concurrently, should only one load occur? If loading fails, should later access retry or return the remembered failure? When memory is constrained, can the proxy release its loaded image and reload it later?

The file might also change after metadata is read. A proxy that caches dimensions indefinitely could present inconsistent information. A version or invalidation rule may be needed. Lazy access moves work in time; it does not eliminate lifecycle and consistency decisions.

### A remote catalog representative

A client application uses a ProductCatalog interface to fetch product information. A RemoteCatalogProxy translates calls into requests to a service and reconstructs results. Callers work with application-level product values rather than network request objects.

This can keep transport code localized. However, a sequence of many small method calls may produce many network round trips. A design appropriate for an in-process object can be inefficient as a remote contract. A batch operation might better express the task.

Retry behavior also requires care. Retrying a read may be acceptable under the chosen consistency model, while retrying an operation that changes state can duplicate effects unless its semantics support safe repetition. The proxy should not add invisible retries indiscriminately.

A remote representative can expose asynchronous results, cancellation, and typed failures where appropriate. These do not weaken the pattern. They make the mediation boundary honest about what accessing the subject entails.

### Several reasons to stand between caller and subject

A protection proxy checks whether a caller may invoke an operation before delegating. A virtual proxy delays expensive creation. A remote proxy represents a subject elsewhere. A caching proxy returns reusable results when its validity rules permit them.

These variants share the access-mediation role, but they need different contracts and tests. Caching introduces staleness and invalidation. Protection needs an authoritative enforcement boundary; a convenience proxy that callers can bypass is insufficient as the only guard. Remote access needs explicit failure handling.

Combining variants can be reasonable, but wrapper order matters. A cache placed before caller-specific access checks could return a value without consulting the intended check. The architectural enforcement policy must guide composition, rather than relying on the presence of a wrapper with a reassuring name.

A useful review question is whether callers can explain what the proxy may defer, reuse, or reject. If those possibilities are surprising, the access contract needs more work.

### Neighboring designs

Decorator typically adds optional responsibilities to an object. Proxy primarily controls access to a subject. Both may use a compatible wrapper interface, and a caching or logging wrapper can plausibly be discussed from either perspective. The distinction comes from its purpose and ownership.

Adapter intentionally translates into a different expected interface. A remote proxy may use translation internally, but its public role is representing the subject. Facade gives callers a simpler view of a subsystem rather than standing in for one subject.

Proxy is useful when mediation has a clear purpose and a clear promise. The wrapper can reduce client complexity, but its hidden work should never obscure the latency, consistency, authorization, or failure behavior on which correctness depends.

## Pattern details

**Category:** Structural · **Difficulty:** Intermediate

### Use when

- Access requires lazy creation or a controlled boundary
- A remote or expensive subject needs a local representative

### Not ideal when

- Mediation would make critical latency or failure behavior misleading
- The proxy bypasses the authoritative enforcement boundary

### Prerequisites

- Basic familiarity with objects, interfaces, composition, and inheritance

## Related patterns

[[decorator|Decorator]] · [[adapter|Adapter]] · [[facade|Facade]]

## Source

Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package.

[Canonical GoF reference](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-software-9780201633610)
