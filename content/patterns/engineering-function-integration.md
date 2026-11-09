---
id: engineering-function-integration
type: pattern
title: 'Function Integration'
summary: 'Combine compatible jobs in one component to remove unnecessary parts and assembly interfaces while preserving the conditions each job needs.'
status: draft
tags:
  - engineering
  - function-allocation
  - design-for-assembly
  - system-architecture
verses:
  - engineering
attribution: 'Original Patternverse engineering synthesis. The instrument enclosure, pump support, and worn-clip comparison are illustrative designs, not documented installations. Dimensions and component counts are teaching fixtures. Drawings are original schematics.'
---

## Purpose and problem

An instrument enclosure needs a small clamp to keep an internal cable on its intended route. The clamp adds procurement, positioning, two screws, and a mounting operation, although the enclosure wall is already beside the cable.

That arrangement may be appropriate: the clamp might need a different material or independent replacement. But if both jobs can share suitable material, geometry, and service life, the separate part may be an avoidable interface.

Function Integration asks whether one component can fulfill several compatible requirements. Removing parts is useful only if the remaining component can actually perform their jobs.

## Core idea

**Combine compatible functions in one component.** A housing can enclose equipment and retain a cable; a casting can contain fluid and support the pump. The component's geometry serves more than one purpose.

This is a parent strategy. Its direct specialization, [[engineering-function-transfer|Function Transfer (P004)]], applies when an existing component takes over the useful job of a dedicated part that is then removed. The two substitutions below fit that narrower case. Integration also covers choosing multiple roles together in a new component, without a prior dedicated part to eliminate.

Function and Architecture is the navigation family, not a parent pattern.

## How it works

Start with required functions rather than the current parts list. Identify what each part accomplishes, what holds it in place, and which interfaces exist only because those jobs are separate. Proximity creates an opportunity, but does not establish compatibility.

Compare material, temperature, stiffness, movement, manufacturing, inspection, and renewal requirements. A flexible retaining arm and a stiff enclosure wall may coexist through different local geometry, provided their shared material and connection are suitable. Conversely, a desirable enclosure material may make an unsuitable repeatedly flexed clip.

Give the combined component an explicit path for each job. Loads must reach supports; a retaining feature must allow assembly and preserve the intended cable route. Then check how performing one job affects the others, including during manufacture and servicing.

Choose Function Transfer when the concrete opportunity is to move a retained job from a removable dedicated part into a suitable existing part. Stay at the broader integration level when allocating compatible roles in a new design. If the job itself becomes unnecessary, the decision belongs to Eliminate a Supporting Task instead.

## Worked examples

### Instrument case: mold the retaining feature into the wall

Consider an illustrative instrument with an internal cable that must stay clear of a moving mechanism. The baseline uses an enclosure, a separate clamp, and two screws. Hold the cable route, cable size, enclosure envelope, and retention duty fixed. Replace the clamp with two locally flexible molded arms continuous with the wall, forming an open retaining channel.

![Matched enclosure sections compare a separate clamp secured with two screws against retaining arms molded into the wall. The same cable is shown in both; the integral detail labels a 5 mm throat and a 6 mm cable diameter.](../assets/engineering/function-integration-cable-clip.svg 'Original schematic sections with illustrative nominal dimensions. The selected subassembly changes from enclosure, clamp, and two screws to one enclosure. A rigid 6 mm circular cable section requires the 5 mm throat to widen by at least 1 mm for passage; equal arm movement would be 0.5 mm each. This geometry does not establish insertion force, strain, durability, or axial strain relief.')

For this selected subassembly, the inventory falls from **four manufactured pieces to one**; the cable and unrelated instrument parts are excluded from both counts. The separate clamp-positioning and screw-fastening tasks disappear. Cable insertion and verification remain. This is an operation comparison, not a measured assembly-time saving.

Assume a **6 mm** cable diameter and **5 mm** entry throat. Treating the cable section as rigid and circular, passage requires at least **1 mm** additional throat width. Symmetric arms would each move **0.5 mm**. These are teaching dimensions, not a production recommendation. They do not determine bending strain, force, or cable-jacket damage. Actual tolerances and deformability matter.

[Covestro describes molded snap features that can eliminate separate fasteners and distinguishes repeated assembly from one-time assembly](https://www.covestro.cn/-/media/covestro/solution-center/brands/downloads/imported/1556890495.pdf?hash=66F8C2EB6AD2DAF7CBC2A94AE4D0D8B2&rev=6035fb2043ef4fd8b536fdb54abf6939). Here the expected benefit is a simpler component inventory. The clip still needs an acceptable entry path, seated condition, release method where required, and performance over its intended use. Keeping a cable on route does not by itself establish specified axial strain relief or sealing.

### Pump: make support part of the casting

An illustrative pump initially uses a separate bracket between its housing and base. Retain the hydraulic duty, mounting position, and required support loads. Redesign the cast housing to include a supporting foot, then remove the dedicated bracket and its housing attachment.

![Section through a hollow pump housing shows its lower wall continuing into an integral supporting foot bolted to a base. Green arrows trace the qualitative transfer of housing loads through the continuous casting to its mounting foot.](../assets/engineering/function-integration-pump-support.svg 'Original schematic, not to scale. The housing now provides fluid containment and support through one casting. Arrows indicate qualitative load-transfer paths, not calculated forces or a stress field. Base fasteners remain. No pressure rating, support capacity, or casting dimensions are established.')

The inspectable change is the load path: the housing wall continues into the supporting feature rather than loading a separately attached bracket. [KSB's Etanorm manual describes volute casings with integrally cast feet](https://mbondpumps.co.za/wp-content/uploads/2022/02/ksb-etanorm-installation-operating-manual.pdf). That documented arrangement supports the mechanism; the teaching design is not a reconstruction of that pump.

Containment and support now share material and geometry. Mounting loads, casting quality, local transitions, machining access, and distortion must be considered together. The foot still needs an adequate connection to the base. KSB also specifies limits on nozzle loads: an integral support does not authorize using the pump as an anchor for surrounding pipework. The expected benefit is removal of the bracket interface; no mass, cost, or strength improvement is assumed.

### Worn clip: reduce the renewal scope

Now assume cable handling wears an integral clip's retaining lip while the rest of the enclosure remains sound. Under the assumed service policy, no local repair is provided. Restoring retention therefore requires renewing the enclosure. The earlier assembly benefit has created a larger service task.

Compare a redesign with a separately renewable retaining insert. Hold the cable, routing duty, enclosure envelope, and required retention condition fixed. Give the insert suitable support, retention, and an accessible extraction route. When its contact feature reaches the renewal criterion, remove the insert while retaining a suitable enclosure.

![Stacked enclosure sections compare a worn integral retaining lip, whose renewal includes the enclosure, with a separate retaining insert lifted from its supported seat. Green identifies the element renewed in each arrangement.](../assets/engineering/function-integration-renewal.svg 'Illustrative renewal-scope comparison. In the upper case, an assumed service policy provides no local repair for the worn integral feature. Below, the insert is a separately retained service part; the arrow shows withdrawal motion after release. Wear is schematic and enlarged. No wear rate, service interval, or maintenance-time gain is predicted.')

This adds a part and a service interface, but decouples local renewal from enclosure renewal. [BASF's snap-fit manual discusses stress concentration, relaxation, and fatigue](https://productdesignonline.com/wp-content/uploads/2019/08/Snap-Fit-Design-Manual.pdf); these must also be distinguished from contact wear when diagnosing an actual failed clip. The hypothetical wear is not evidence of a particular cycle life. An integral clip remains a candidate if its demonstrated durability and repair consequences suit the intended service; an insert requires its own successful interface design.

## Assumptions for correctness

The combined functions must be compatible across the required operating envelope and service history. A common material and manufacturing process must support the necessary local properties. Integration must preserve access, assembly, inspection, and acceptable failure consequences.

The clip's numerical fixture establishes nominal passage geometry only. It ignores tolerances, cable compression, friction, arm bending, and material behavior. The pump drawing identifies a connection and load route without calculating their adequacy.

## When to use it

Look for neighboring parts whose attachment, alignment, or handling exists mainly to deliver compatible jobs. Repeated small fastening operations, redundant supporting pieces, and features already available in a housing can make integration worth investigating. Check the actual functions before deciding that an apparently minor part is unnecessary.

## Tradeoffs and operating costs

Integration transfers complexity into the remaining component. Mold access, undercuts, casting transitions, tolerances, inspection, and tooling changes can offset assembly savings. [BASF notes that some snap features need additional mold slides](https://productdesignonline.com/wp-content/uploads/2019/08/Snap-Fit-Design-Manual.pdf). A component with several roles can also be more expensive to reject, replace, or redesign when only one feature changes.

## Common mistakes and limitations

Counting fewer parts without checking function fulfillment mistakes an inventory change for a successful design. Other failures include trapping an assembly behind an inaccessible feature, coupling a wear item to a durable enclosure, and assuming that one successful insertion proves repeated-use durability.

Not every separate fastener or bracket is overhead. It may provide adjustment, accommodate different materials, isolate an interaction, or define a useful replacement boundary. Keep that function if its loss would create a worse compromise.

## Related patterns

[[engineering-functional-separation|Functional Separation (P002)]] assigns incompatible jobs to distinct elements. Both strategies can coexist in one machine at different boundaries.

[[engineering-function-transfer|Function Transfer (P004)]] is the direct specialization for an existing part taking over a removed dedicated part's retained job. [[engineering-eliminate-a-supporting-task|Eliminate a Supporting Task (P005)]] instead removes the reason the job is needed.

[[engineering-replaceable-wear-units|Replaceable Wear Units (P124)]] restores a separate renewal boundary where deterioration is concentrated. The replaceable clip insert is a candidate application, provided renewal is actually practical.

## Sources and further reading

- [Covestro, Engineering Polymers: Joining Techniques, page 24](https://www.covestro.cn/-/media/covestro/solution-center/brands/downloads/imported/1556890495.pdf?hash=66F8C2EB6AD2DAF7CBC2A94AE4D0D8B2&rev=6035fb2043ef4fd8b536fdb54abf6939): molded snap features and repeated-assembly considerations.
- [BASF, Snap-Fit Design Manual, Parts I and VI, archived manufacturer document](https://productdesignonline.com/wp-content/uploads/2019/08/Snap-Fit-Design-Manual.pdf): molding access, stress concentration, relaxation, and fatigue; no material-specific limit is adopted here.
- [KSB, Etanorm Installation/Operating Manual, 2018, pages 20 and 25–27, distributor-hosted manufacturer document](https://mbondpumps.co.za/wp-content/uploads/2022/02/ksb-etanorm-installation-operating-manual.pdf): integral cast feet and model-specific installation and nozzle-load requirements. The original teaching figure does not reproduce the manual's geometry.
