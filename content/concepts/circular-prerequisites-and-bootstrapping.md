---
id: circular-prerequisites-and-bootstrapping
type: concept
title: Circular Prerequisites and Bootstrapping
summary: Identify a chain of prerequisites that has no available first step, then supply a usable starting condition or authorize a different entry route.
status: published
tags:
  - structural-traps
  - dependency-and-feasibility
  - circular-dependencies
  - bootstrapping
verses:
  - systems-thinking
attribution: Original Patternverse field-guide synthesis. The worked scenario and explanatory diagram are hypothetical. Qualitative comparisons state their assumptions; attributed theory and research are distinguished from practical editorial guidance.
---

## A recognizable situation

Mina gets into her car, turns the key, and finds the starting battery too flat to turn the engine. The engine normally drives the alternator that recharges that battery. But it cannot begin doing so until it is running.

Trying the same start again does not supply the missing electrical energy. Mina needs a source that is available before the engine runs, rather than another request for the engine to recharge its own starting battery.

This hypothetical example concerns a conventional engine-driven charging system with a discharged but serviceable battery. It illustrates a missing starting condition, not every possible reason a car fails to start. [AAA's explanation of starting and charging](https://ww1.aaa.com/autorepair/articles/14-reasons-why-your-car-wont-start)

## The underlying pattern

**A circular prerequisite makes each possible first step depend on another unfinished step in the same chain.** A requires B, B requires C, and C requires A. With none already available, the chain cannot start under those rules.

**Bootstrapping supplies a starting condition from which the ordinary process can proceed.** That condition might be an existing tool, a minimal first version, initial information, or an authorized provisional route. It must actually satisfy or replace the blocking requirement.

Computing provides established examples of this idea. A compiler translates program text into executable software; when a compiler is written in the language it translates, building it requires some existing means of running or compiling that language. Bootstrappable Builds documents alternative implementations and simpler initial build paths. [Bootstrappable Builds: Best Practices](https://www.bootstrappable.org/best-practices.html)

The general framework here is an editorial synthesis across such dependency problems, not a standardized treatment with one historical inventor or a universally effective remedy.

## What keeps it going

Starting needs enough stored electrical energy. Restoring that energy through the car's alternator needs the engine already running. With neither available, the ordinary operating cycle cannot supply its own first step.

This is a dependency between states at different times, not a claim that engines and batteries are logically impossible. An initially charged battery ordinarily supplies the seed. When that seed is absent, another compatible source can supply it.

A dependency graph makes strict ordering precise. If an arrow means that one task must finish before another begins, a complete ordering exists exactly when the finite graph has no directed cycle. This is the basis of topological sorting. [Python: graphlib](https://docs.python.org/3.14/library/graphlib.html)

That result applies to a task model, not directly to every physical feedback process. The car comparison instead separates initial stored energy from later replenishment. It becomes workable when the model includes an external starting source or prior charging. A diagram that omits those alternatives describes the blocked route, not all possible routes.

Organizations can make the same mistake by applying an ordinary operating rule to an initial state. A qualification may require experience obtainable only after qualification; a new service may need records that only an operating service can produce. The question is which accepted input can exist before the normal cycle begins.

![Hypothetical qualitative illustration. Battery charge enables the starter and engine; the running engine enables later alternator charging. Without starting charge, the ordinary route has no first step. Compatible external energy enables the engine before its charging system can operate. Change: Supply a compatible starting source available before ordinary operation. Limitation: Assumes discharge only. Assistance costs resources; faults and the cause of discharge still need attention.](../assets/structural-traps/circular-prerequisites-archive.svg "Hypothetical illustration. The upper cycle distinguishes initial stored energy from later replenishment. The lower route supplies a seed without changing the car’s normal starting requirement. A successful start does not diagnose the battery or charging system, or establish full recharge.")

## Why the obvious responses fail

**Reordering the same blocked steps** cannot supply the missing starting input. Asking the alternator to recharge first still requires the engine to run.

**Trying harder at the normal action** helps only if something relevant changes. Repeated starting attempts do not themselves add battery charge.

**Making the seed smaller** works only if it remains sufficient for the next step. An initial resource must meet the real requirement, not merely resemble it.

**Borrowing without checking compatibility** can move the obstruction or introduce a different failure. Tools, software binaries, evidence, and physical energy sources must be suitable for their intended use.

**Treating initial support as a permanent repair** confuses two questions. A successful start establishes that the starting condition was supplied. It does not establish that the battery, charging system, or reason for discharge is sound.

## Possible ways out

These response families are practical editorial guidance. Their suitability depends on the purpose and authority behind each prerequisite.

**Supply an existing seed.** Borrow, import, or reuse something that already meets a requirement. Check compatibility and permission to use it. This preserves the remaining dependency chain but introduces reliance on whoever supplies the seed.

**Create a limited initial version.** A simpler tool or manual process may produce what the ordinary process needs. Its output must meet the next step's actual requirements. Bootstrappable Builds recommends simpler alternative build routes for software tools; a slower starting method can be sufficient even when unsuitable for routine production. That is engineering guidance, not evidence that every organizational prerequisite can be simplified. [Bootstrappable Builds: Best Practices](https://www.bootstrappable.org/best-practices.html)

**Authorize a provisional route.** Separate supervised entry from independent operation. Specify what is permitted, who is responsible, what evidence must be produced, and when ordinary requirements take over. The relevant owner must approve the change; the newcomer cannot confer permission on themselves.

**Unfold the versions or stages.** “A compiler builds a compiler” sounds circular until the already available compiler and the newly built compiler are distinguished. Similarly, initial evidence may support a provisional decision that enables better evidence later. This works when the stages really differ and the earlier one can perform the necessary task.

**Redesign the requirement.** If a customary document is only a proxy for capability, an accepted assessment may substitute for it. If every available start violates a non-negotiable requirement, the honest result is that the process cannot start as specified. Authority, resources, or the design must change.

## A worked example

### Supply energy before asking the normal cycle to replenish it

Mina first repeats the normal starting attempt. It fails because the available charge still cannot turn the engine. In this hypothetical diagnosis, the battery is discharged, while the starter and charging system are otherwise functional.

A roadside technician supplies a suitable external starting source. It provides the initial energy that the unavailable alternator cannot yet provide. In the stipulated successful sequence, the engine starts and its charging system can then operate. This is an explanation of the dependency, not a procedure for connecting equipment or a claim that brief running restores a fully charged battery.

The intervention adds a seed; it does not make the ordinary process start from nothing. Assistance costs time and resources. The cause of discharge still needs attention, and a failed battery or charging system would require repair rather than repeated external starts. An appropriate external charger could instead restore a usable starting condition before the engine runs.

### A documented compiler bootstrap

Rust's compiler-development guide describes a precompiled stage-zero compiler and standard library used to build the compiler from current source. The resulting compiler participates in later build stages. An existing executable supplies the initial capability; source text is not expected to compile itself without a running tool. [Rust Compiler Development Guide](https://rustc-dev-guide.rust-lang.org/building/bootstrapping/what-bootstrapping-does.html)

This documents a working arrangement, not proof that a seed is automatically trustworthy or compatible with arbitrary versions. The Bootstrappable Builds project treats the provenance and inspectability of initial binaries as separate concerns. [Bootstrappable Builds](https://www.bootstrappable.org/)

NIST's network-onboarding glossary gives another form: introducing enough initial information to establish trust and a secure channel, sometimes through a separate channel involving a person. That definition is specific to network onboarding, not permission to bypass verification. [NIST: bootstrapping](https://csrc.nist.gov/glossary/term/bootstrapping)

## Limits and lookalikes

An ordinary chain is long but has a first available step. A missing resource is not automatically a circle. A feedback loop describes effects returning over time; a prerequisite arrow specifies what must already exist.

A Catch-22 can make the act of qualifying remove eligibility. Supplying a resource may therefore fail where it would start an ordinary prerequisite loop. A cold start concerns participation or usefulness below a viable threshold; a seed that unlocks one task need not attract enough participants.

A seed can clear one cycle while another still blocks progress. Check the remaining prerequisites and what happens when temporary support ends.

Bootstrapping also has distinct meanings in statistics and business finance. Here it means establishing an operational starting condition, with its costs and external support made visible.

## Related patterns

[[catch-22|Catch-22]] examines self-defeating eligibility rules; check whether the proposed starting step would itself disqualify the applicant.

[[reframing-remove-constraints|Remove Constraints]] distinguishes genuine prerequisites from customary restrictions. A diagram should represent verified requirements, not every assumed limitation.

[[prefer-the-smallest-useful-experiment|Prefer the Smallest Useful Experiment]] can test whether a proposed initial version produces acceptable evidence. A small test teaches something; a bootstrap must additionally enable a subsequent step.

## Sources and further reading

- [Python Software Foundation, graphlib](https://docs.python.org/3.14/library/graphlib.html): formal task-ordering conditions and cycle detection; does not establish which real-world dependencies are mandatory.
- [Bootstrappable Builds, Best Practices](https://www.bootstrappable.org/best-practices.html): specialist guidance on alternative implementations, minimal starting paths, and provenance.
- [Rust Compiler Development Guide, What Bootstrapping Does](https://rustc-dev-guide.rust-lang.org/building/bootstrapping/what-bootstrapping-does.html): primary documentation of staged compiler construction, checked 31 October 2026.
- [Bootstrappable Builds](https://www.bootstrappable.org/): the project explains why the initial binary seed remains an object of trust and inspection.
- [NIST CSRC, bootstrapping](https://csrc.nist.gov/glossary/term/bootstrapping): a domain-specific definition of initial information exchange during network onboarding.
- [AAA, Fourteen Reasons Why Your Car Will Not Start](https://ww1.aaa.com/autorepair/articles/14-reasons-why-your-car-wont-start). Specialist explanation of the starter and engine-driven charging system; supports the physical dependency, not a universal diagnosis or a repair procedure.
