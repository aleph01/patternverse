---
id: federated-identity
type: pattern
title: Federated Identity
summary: Accept authentication assertions from explicitly trusted identity providers, then resolve the federated identity to a local account whose access the application controls.
status: published
aliases:
  - Identity Federation
tags:
  - software-engineering
  - security
  - authentication
verses:
  - software-engineering
attribution: "Federated Identity pattern: Microsoft Azure Architecture Center; federation terminology and requirements: NIST SP 800-63C-4; concrete protocol: OpenID Connect. Original Patternverse partner-portal example, post-validation simulation, and native illustrations."
---

## Purpose and problem

A partner portal serves engineers from several companies. Each company already manages its employees’ sign-in credentials, but the portal maintains another password database. Joiners need another account, password resets reach the wrong support team, and a departing employee’s portal account can outlive the employment relationship.

The portal needs to recognize people authenticated elsewhere while protecting its own reports. Sharing directory passwords or accepting an arbitrary “signed in” header would move the problem across a network without establishing trustworthy evidence.

## Core idea

**Delegate authentication to a trusted identity provider; consume its verifiable result at the application.** The identity provider, or **IdP**, authenticates the subscriber. The application, called the **relying party** or **RP**, verifies the resulting assertion and associates it with its own account and session.

Microsoft catalogs this as Federated Identity. **Identity Federation** names the broader mechanism. Single sign-on is a possible experience built on it, not a guarantee that every application shares one session. OpenID Connect and SAML are protocols for federation; OAuth authorization by itself is not a substitute for a user-authentication protocol.

Think **provider authenticates → application verifies → application decides access**. The trust relationship must identify which provider may assert which identities for this application. It is not permission to accept any token with a valid signature.

![Four summarized phases of an OpenID Connect code-flow sign-in: the portal starts a transaction bound to its browser session; the identity provider authenticates the user; a code callback and server token exchange let the portal verify the resulting identity; the portal creates its own session and applies local report permissions. The user’s credentials remain with the provider.](../assets/software-engineering/federated-identity-trust.svg "These arrows order summarized protocol phases. The code returns through the browser; the portal exchanges it over a protected back channel. Federation establishes an authenticated identity, while local account and resource rules still govern access.")

## How it works

### Establish trust before accepting a result

The RP configures approved issuers, protocol metadata, verification keys, client registration, and permitted callbacks. The IdP owns its authentication methods and credential lifecycle. The RP owns validation, local account association, session handling, and resource authorization. A broker can connect several providers, but introduces another trust and operations boundary.

For a concrete web implementation, use a maintained OpenID Connect library with authorization code flow and PKCE. Bind the transaction to the initiating browser and expected issuer, protect callback handling, and validate the response according to the protocol. RFC 9700 explains code-injection and redirect protections; PKCE binds code redemption to a transaction-specific verifier.

OIDC validation includes the expected issuer, cryptographic protection, intended audience, validity times, and applicable nonce checks. Follow the full protocol rules rather than selecting a few claims to inspect. Do not create a session from a decoded but unverified token, or treat an access token intended for another API as an ID token.

### Resolve identity and govern its lifetime

For the OIDC form, identify a person’s federated account by **`(issuer, subject)`**, not email alone. The same subject string can occur at two providers. Email can change or be reassigned. A verified email claim is still not a universal account-linking key.

Provision accounts and link additional identities through an explicitly authorized process. The RP may deny an authenticated but unprovisioned person. It may also map a recognized person to an account with no permission for the requested report. Authentication and authorization answer separate questions.

NIST distinguishes the RP session from the IdP’s session. Disabling an IdP account does not automatically erase every existing RP session. Define reauthentication, session expiry, local suspension, deprovisioning, and any supported logout notifications. Assertion expiry and local session expiry are different events.

## Worked example

### Two companies, one misleading email address

The portal originally uses email as its account key. North’s subject `17` and South’s subject `17` both arrive with `sam@example.test`; blindly merging them would give South’s user North’s report permission. The revised portal provisions two issuer-qualified links, `a1` and `b9`, and grants report access only to `a1`.

This complete Python 3 program models the **RP’s work after successful protocol validation**. Each `Login` fixture stands for normalized output from a trusted verifier. Constructing that class does not verify a signature, validate a token, or authenticate anyone. Never expose this fixture constructor as a public login interface.

Save as `federated_identity.py` and run `python3 federated_identity.py`. The example is sequential and in memory. Issuer strings are exact identifiers, subjects are opaque strings, and email is display metadata. There are no live providers, tokens, browser redirects, or session cookies in this program.

```python
from dataclasses import dataclass, replace

NORTH = "https://idp.north.example"
SOUTH = "https://idp.south.example"


@dataclass(frozen=True)
class Login:
    issuer: str
    subject: str
    email: str


class Portal:
    def __init__(self):
        self._links = {(NORTH, "17"): "a1", (SOUTH, "17"): "b9"}
        self._grants = {"a1": frozenset({"summary"})}
        self._reports = {"summary": "weekly totals"}

    def account(self, login):
        if (type(login) is not Login
                or any(type(v) is not str or not v
                       for v in (login.issuer, login.subject))):
            raise PermissionError("unlinked identity")
        account = self._links.get((login.issuer, login.subject))
        if account is None:
            raise PermissionError("unlinked identity")
        return account

    def summary(self, login):
        account = self.account(login)
        if "summary" not in self._grants.get(account, frozenset()):
            raise PermissionError("report denied")
        return self._reports["summary"]

    def revoke_reports(self, account):
        self._grants.pop(account, None)


if __name__ == "__main__":
    portal = Portal()
    north = Login(NORTH, "17", "sam@example.test")
    south = Login(SOUTH, "17", "sam@example.test")
    print("accounts", portal.account(north), portal.account(south))

    def show(label, login):
        try:
            print(label, portal.summary(login))
        except PermissionError:
            print(label, "denied")

    show("north", north)
    show("south", south)
    show("unlinked", Login(NORTH, "18", north.email))
    show("new-email", replace(north, email="new@example.test"))
    portal.revoke_reports("a1")
    show("revoked", north)
```

The six output lines are `accounts a1 b9`, `north weekly totals`, `south denied`, `unlinked denied`, `new-email weekly totals`, and `revoked denied`. Matching subject and email values do not merge the accounts. Changing North’s email keeps the `a1` link; removing its local report grant denies the next operation while account recognition still works.

The links and administrative revocation are trusted configuration in this simulation. There is no automatic account creation or email-based fallback. A production RP needs durable account-link ownership, authorization consistency, and lifecycle integration as well as a correctly configured protocol verifier.

![Five post-validation cases retain issuer-qualified identities: North subject 17 resolves to a1 and may read the summary; South subject 17 resolves to b9 and is denied; North subject 18 is unlinked and denied. North subject 17 still resolves to a1 after its email changes. After a1 loses its local report grant, it remains recognized but the next summary request is denied.](../assets/software-engineering/federated-identity-accounts.svg "Account recognition and resource permission remain separate. These fixtures assume protocol validation already succeeded. Neither a matching email nor a matching subject from a different issuer authorizes account linking.")

### Moving a partner to another provider

An issuer migration changes the identity namespace even when the employee keeps the same email. The portal needs an approved linking or migration process, with evidence connecting the old and new identities. Automatically trying an email match after an unknown issuer appears would reintroduce the original account-takeover risk.

## When to use it

Use federation for partner, employee, or customer access when another trusted organization already operates authentication and the application should consume that result. Several applications sharing organizational sign-in and multiple companies entering one portal are strong signals.

A managed application-local identity service may suffice when there is no external trust relationship to integrate. Federation adds protocol, configuration, and lifecycle responsibilities; it does not eliminate identity engineering.

## Tradeoffs and common mistakes

Provider outages can block new sign-ins; provider compromise can undermine every RP that trusts it. Decide how existing sessions behave during an outage without accepting unverifiable assertions. Plan key rotation, monitoring, recovery, and bounded login transactions.

Common errors include accepting arbitrary issuers, skipping audience or transaction checks, matching accounts by email, and importing an external role directly as local administrator authority. Release only necessary attributes, protect session material, and keep tokens out of logs. Federated sign-in does not by itself establish tenant isolation or immediate global revocation.

## Related patterns

[[gatekeeper|Gatekeeper]] can place authentication handling at a restricted public boundary. Federation defines where the authentication result comes from and how the RP trusts it.

[[reference-monitor|Reference Monitor]] concerns unavoidable enforcement of protected access. A federated login supplies identity evidence; every relevant resource operation still needs enforcement.

[[adapter|Adapter]] can translate provider-specific interfaces or claim shapes. Translating a field name does not establish issuer trust or validate an assertion.

## Sources

- [Microsoft Azure Architecture Center: Federated Identity](https://learn.microsoft.com/en-us/azure/architecture/patterns/federated-identity) — established pattern, delegated authentication, applicability, and operational costs.
- [NIST SP 800-63C-4: Federation and Assertions](https://pages.nist.gov/800-63-4/sp800-63c.html) — IdP/RP responsibilities, federated identifiers, account association, trust, and session lifetimes.
- [NIST SP 800-63B-4: Session management](https://pages.nist.gov/800-63-4/sp800-63b.html) — independent IdP/RP session lifetimes and reauthentication, section 5.
- [OpenID Connect Core 1.0, errata set 2](https://openid.net/specs/openid-connect-core-1_0.html) — authentication protocol, ID Token validation in section 3.1.3.7, and identifier stability in section 5.7.
- [IETF RFC 9700: OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700.html) — authorization-code, PKCE, redirect, and transaction protections.

The partner portal, account fixtures, program, and diagrams are original teaching material.
