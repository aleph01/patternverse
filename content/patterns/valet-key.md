---
id: valet-key
type: pattern
title: Valet Key
summary: Authorize a client to obtain a short-lived, narrowly scoped grant that the resource service validates during direct data access.
status: published
tags:
  - software-engineering
  - security
  - delegated-access
verses:
  - software-engineering
attribution: "Valet Key pattern: Microsoft Azure Architecture Center. Provider semantics: Azure Storage, Amazon S3, and Google Cloud Storage official documentation. Original Patternverse export-download example, bounded grant model, and native illustrations."
---

## Purpose and problem

An engineering portal generates large export archives. Its workers relay downloads from storage to the browser, consuming resources after access has already been authorized.

Giving the browser the application’s storage credential would remove that relay but grant far more authority than one download needs. The system needs a limited delegation that storage can enforce without the application remaining in the transfer path.

## Core idea

**Authorize the request, issue a constrained grant, then let the client access the resource directly.** The application controls grant issuance. The resource service validates the grant and enforces its scope during access. The application keeps its broader credentials private.

Microsoft catalogs this as **Valet Key**. Azure shared access signatures and provider-signed URLs are implementations. The resource service must enforce the grant’s restrictions.

Think **small authorization exchange; direct data transfer**. Restrict the resource, operation, and validity window as narrowly as the service supports. The resource remains protected without giving the client an account-wide secret.

![The client first requests an export download from the application. The application authenticates and authorizes the request, then returns a grant restricted to GET on export E7 for a short window. The client presents that grant directly to storage. Storage validates it and returns archive bytes directly to the client; those bytes do not pass through the issuing application.](../assets/software-engineering/valet-key-delegation.svg "Grant issuance and data transfer are separate paths. The application retains broad signing or delegation authority; storage enforces the limited grant. Direct access is deliberate, and its restrictions must survive every request the resource service accepts.")

## How it works

### Keep issuance privileged and scope explicit

The issuer authenticates the client and checks current application permission before granting access. It resolves the destination from trusted ownership metadata, rather than signing an arbitrary object name supplied by the caller. Restrict the issuer’s own storage permissions as well as the grants it creates.

Use the provider’s supported signing or delegation tools. Resource identifiers, verbs, signed headers, and expiry must agree with the eventual request. A token scoped to a container or prefix can authorize many objects; a read grant must not accidentally include write or delete authority.

The resource service validates the presented credential independently of the application’s user session. Google Cloud Storage explicitly documents that anyone possessing an active signed URL can use it. Treat such grants as bearer secrets: deliver them over TLS, protect browser exposure, and remove them from logs, analytics, and shared diagnostics. CORS configuration enables browser access; it is not a substitute for storage authorization.

### Define lifetime and transfer semantics

A short lifetime limits exposure but must accommodate network delay and retries. Amazon S3 documents that presigned URLs can be reused until expiry, and that temporary signing credentials may expire sooner. Neither a URL nor a short TTL inherently provides single-use access.

Expiry also need not terminate a transfer already started. S3 checks expiry at request time and allows a download begun before expiry to continue. A later retry can fail. Define renewal and resume behavior instead of assuming expiry is a stream-cancellation mechanism.

Revoking an application permission may prevent new grants while an already issued grant remains usable. Immediate individual revocation depends on the provider and grant type. Azure distinguishes ad hoc SAS from service SAS associated with stored access policies; those controls are not interchangeable across all SAS types. Plan the actual revocation mechanism and its blast radius.

## Worked example

### One export, one read operation, sixty seconds

The portal authorizes Alice for export `E7`, selects its object key, and issues a read grant at virtual second 100. Storage accepts that grant for `GET` on the exact key while `100 <= time < 160`. The client can repeat the read during that interval, but cannot use the grant for another export or for `PUT`.

This complete Python 3 program is a **sequential, in-memory delegation model**. A random opaque ticket and a storage-side ledger stand in for resource validation. It is not a signed-URL implementation or a cloud SDK. `grant_download` is a trusted administrative operation, not a public client endpoint; `alice` stands for an identity already authenticated by trusted infrastructure.

Save as `valet_key.py` and run `python3 valet_key.py`. The clock uses virtual seconds owned by the storage fixture, not timestamps submitted by the client. Archive bytes are teaching payloads, not ZIP files. Tokens are never printed.

```python
import secrets


class Storage:
    def __init__(self, clock):
        self._clock = clock
        self._objects = {"exports/E7.zip": b"archive E7",
                         "exports/E8.zip": b"archive E8"}
        self._grants = {}

    def grant_download(self, key, ttl_seconds):
        if (type(key) is not str or key not in self._objects
                or type(ttl_seconds) is not int or ttl_seconds <= 0):
            raise ValueError("invalid grant")
        token = secrets.token_urlsafe(24)
        if token in self._grants:
            raise RuntimeError("token collision")
        start = self._clock()
        self._grants[token] = (key, start, start + ttl_seconds)
        return token

    def access(self, token, method, key):
        if any(type(v) is not str or not v for v in (token, method, key)):
            raise PermissionError("not permitted")
        grant = self._grants.get(token)
        if grant is None:
            raise PermissionError("not permitted")
        bound_key, start, end = grant
        if method != "GET" or key != bound_key or not start <= self._clock() < end:
            raise PermissionError("not permitted")
        return self._objects[key]


class Broker:
    def __init__(self, storage):
        self._storage = storage
        self._owners = {"E7": "alice", "E8": "bob"}

    def download(self, subject, export):
        if (any(type(v) is not str or not v for v in (subject, export))
                or self._owners.get(export) != subject):
            raise PermissionError("not permitted")
        key = f"exports/{export}.zip"
        return key, self._storage.grant_download(key, 60)


if __name__ == "__main__":
    clock = {"seconds": 100}
    storage = Storage(lambda: clock["seconds"])
    key, ticket = Broker(storage).download("alice", "E7")

    def show(label, method="GET", target=key):
        try:
            print(label, storage.access(ticket, method, target).decode())
        except PermissionError:
            print(label, "denied")

    show("download")
    show("other", target="exports/E8.zip")
    show("write", method="PUT")
    show("reuse")
    clock["seconds"] = 159
    show("before-expiry")
    clock["seconds"] = 160
    show("expired")
```

The six lines are `download archive E7`, `other denied`, `write denied`, `reuse archive E7`, `before-expiry archive E7`, and `expired denied`. Reuse is allowed; changing the object or verb does not broaden the stored grant. At exactly second 160, the same ticket cannot start another modeled read.

The broker never receives archive bytes. The ledger is illustrative server state, with no durable storage or expired-entry cleanup. The program does not implement TLS, real authentication, streaming, provider credential revocation, or concurrent authorization. Hosting these classes together does not protect issuance from hostile code in the same interpreter.

![A ticket issued at virtual second 100 permits GET on exports/E7.zip until but not including second 160. GET for E8 and PUT for E7 are denied. Reuse and a new GET at second 159 succeed. A new GET at second 160 is denied. This is a request-admission window, not a promise to cancel an existing transfer.](../assets/software-engineering/valet-key-scope.svg "Resource, verb, and time are independent restrictions. The example permits repeated reads, and storage receives no user identity with the ticket. Possession must therefore be protected; expiry does not erase previously downloaded bytes.")

### Uploads need a separate publication decision

For uploads, choose a server-controlled destination and validate the resulting content before exposing it to readers. A private quarantine area can separate accepted bytes from approved content. S3 documents that a presigned upload can replace an existing object at its key. Create-only behavior, size limits, checksum requirements, and single-use semantics need explicit provider support; a write grant does not establish them automatically.

## When to use it

Use Valet Key when large or frequent transfers burden the application, storage can enforce sufficiently narrow grants, and the application adds little value while forwarding the bytes.

A proxy can be simpler when every byte must be transformed, inspected, or metered before delivery. Direct client identity at storage may already meet the requirement without issuing another credential.

## Tradeoffs and common mistakes

The application loses per-request control over the direct transfer path. Storage must supply appropriate audit evidence, capacity controls, and restrictions. If authorization must refer to immutable content, bind an object version where supported; a key alone may later name different bytes.

Common mistakes include broad prefixes, excessive TTLs, exposed signing credentials, logging URLs, and assuming grants are single-use or instantly revocable. Token possession does not prove that an upload completed or that its content is safe.

## Related patterns

[[gatekeeper|Gatekeeper]] screens requests before private business execution. It can protect grant issuance, while the authorized transfer intentionally goes directly to the resource service.

[[externalized-authorization|Externalized Authorization]] can decide whether to issue a grant. Storage may later enforce that grant without consulting the application’s latest policy on each transfer.

[[reference-monitor|Reference Monitor]] concerns unavoidable mediation. Direct storage access still needs enforcement at storage; bypassing the application does not mean bypassing authorization.

[[proxy|Proxy]] mediates access through a representative. Valet Key can remove the application’s byte-relay role after it delegates a narrow capability.

## Sources

- [Microsoft Azure Architecture Center: Valet Key](https://learn.microsoft.com/en-us/azure/architecture/patterns/valet-key) — established pattern, delegated direct access, scope, and applicability.
- [Azure Storage: Shared access signatures](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview) — delegation scopes and different SAS/policy forms.
- [Amazon S3: Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) — methods, reuse, credential lifetime, request-time expiry, and upload replacement.
- [Google Cloud Storage: Signed URLs](https://docs.cloud.google.com/storage/docs/access-control/signed-urls) — bearer possession, signing permissions, and direct-resource access.

The portal, opaque-ticket simulation, payloads, and diagrams are original teaching material.
