---
id: engineering-segmentation
type: pattern
title: 'Segmentation'
summary: 'Divide equipment into independently manageable units so a local change can preserve the useful remainder.'
status: draft
tags:
  - engineering
  - system-architecture
  - serviceability
  - segmentation
verses:
  - engineering
attribution: 'Original Patternverse engineering synthesis. The filter-bank, conveyor, and vessel comparisons are illustrative scenarios, not documented installations. Numerical values are teaching assumptions; drawings are original schematics.'
---

## Purpose and problem

One filter cartridge is fouled, but the proposed repair replaces an entire welded filter assembly. Most of its material still performs its job. The costly part of the repair is the boundary around the failed element: the equipment was assembled as one unit, so it must be handled as one unit.

Segmentation changes that boundary. Divide the system into pieces that can be made, transported, inspected, changed, or serviced separately while preserving the useful remainder. The aim is a manageable intervention, not the largest possible part count.

## Core idea

**Choose the unit around the change it must accommodate.**

A cartridge, conveyor section, and pressure-vessel shell are all possible units, but they have different dependencies. A useful division lets someone complete a real task locally. A line on a drawing does little if a continuous belt, inaccessible fastener, or common pressure space still forces extensive dismantling.

Segmentation is the parent strategy. Standardized Module Interfaces adds a preserved connection contract so compatible units can be substituted. Replaceable Wear Units places predictable deterioration in a renewable element. Either can make a chosen division more useful; neither is required for every segmented design.

## How it works

Start with a likely intervention: replacing contaminated media, transporting a machine through a doorway, or exchanging a damaged section. Identify what must come away and what should remain. Then trace every dependency crossing the proposed boundary: loads, fluid, power, signals, alignment, sealing, access, and control permissions.

Choose boundaries where those dependencies can be released and restored without defeating the task. Check the removal route and the condition of the retained equipment during separation. A removable part may still need lifting equipment, temporary support, or a whole-system shutdown.

For a one-time transport constraint, a project-specific division may suffice. When future units must substitute without redesign, develop Standardized Module Interfaces. When deterioration is predictable and localized, use Replaceable Wear Units to define what gets renewed. These choices specialize the boundary rather than creating competing names for the same decision.

Evaluate the complete intervention, including diagnosis, isolation, extraction, replacement, reassembly, and verification. Smaller replacement scope is one benefit; shorter downtime and lower total cost are separate propositions requiring evidence.

## Worked examples

### A filter bank retains its pressure housing

Consider an illustrative process-filter housing with four cartridges. Its shell, supports, and pipe connections remain suitable, but one cartridge has become unusable. The baseline assembly has permanently attached internals that cannot be renewed separately. Its replacement boundary therefore includes sound structure.

The revised design makes each cartridge removable through an accessible closure. Seating and retention keep process flow through the intended media rather than around it. Cartridge dimensions, media compatibility, sealing, and pressure-drop limits still belong to the design; removability alone does not establish filtration performance.

For a simple material comparison, assume a retained housing and supports weigh 24 kg and each cartridge weighs 1 kg. The complete assembly weighs 28 kg. Exchanging one cartridge changes the handled replacement mass to 1 kg and leaves 27 kg in place, excluding closure consumables. That is arithmetic on invented values, not a measured waste reduction: other cartridges might also require renewal, and cleaning or disposal requirements can change the result.

![An opened four-cartridge filter housing retains three cartridges while a highlighted fourth is lifted along its extraction axis. The cover is displaced separately, and clear space above the cartridge is shown.](../assets/engineering/segmentation-filter-bank.svg 'Illustrative service state, not an operating assembly. Green identifies the selected cartridge; the arrow means extraction, not process flow. The housing and other cartridges remain, but the common pressure space must be isolated and depressurized. Geometry is schematic.')

A shared housing does not provide independent operating isolation. Parker's instructions for its Balston H- and K-Series filters require taking the assembly out of service and depressurizing it for cartridge changes, and specify access for opening the cover and reaching the cartridges. These are documented requirements for that equipment, not a claim that our fictional housing is a Parker product. [Parker, Bulletin TI-8L](https://www.parker.com/content/dam/Parker-com/Literature/IGFG/PDF-Files/BAL_TI_8L_H_K_Series_Filters.pdf)

If uninterrupted filtered supply is required, the architecture needs an additional suitable provision. Simply removing the cartridge while keeping the common housing pressurized is not the pattern.

### A conveyor section can actually leave the line

A fictional packing line has a nine-metre conveying route. Damage is concentrated in one region, but its continuous frame and belt make local exchange awkward. The redesign divides the route into three nominal three-metre service sections, each with its own belt, drive, support, and releasable connections.

The changed boundary is larger than an individual roller and smaller than the whole line. The middle section can be disconnected and moved into a clear service aisle while the end sections remain supported. It still requires a coordinated stop; retaining equipment does not mean it continues producing.

![Three conveyor sections occupy one straight route. The middle section is shown displaced into a clear side aisle, with its own belt and drive. The two outer sections retain their supports; two transfer interfaces are identified.](../assets/engineering/segmentation-conveyor.svg 'Illustrative plan and displaced service position. Green and the arrow identify the exchanged section and its removal direction. The route, load, belt width, and required throughput are held fixed; transfer behavior and alignment must be checked. Nominal dimensions do not specify a buildable conveyor.')

Check the same product, required throughput, speed, width, and end-to-end route in both arrangements. Transfers must accommodate the smallest product without jamming or falling through; adjacent speeds, guarding, controls, and alignment need coordinated treatment. Additional drives and joints may outweigh the service benefit.

Dorner's conveyor manual separately documents joining frame sections and installing the belt. This supports a useful distinction: a sectional frame is not automatically a set of independently removable operating units. The three-drive arrangement above is an original teaching scenario, not Dorner's specified configuration. [Dorner, 2200 Series manual, installation sections](https://www.dornerconveyors.com/wp-content/uploads/2018/10/851-873b-EU-EN.pdf)

### Extra vessel joints create work without a useful task

Now hold a vessel's required pressure, temperature, process volume, and access duty fixed. Suppose a proposal replaces a continuous shell with four shell sections connected by three additional circumferential flanged joints. No shipping constraint or localized replacement requirement motivates the split.

There are now three more sealed interfaces to design, assemble, inspect, and maintain. Their condition depends on suitable geometry, gaskets, fasteners, assembly, and operating conditions. ASME's discussion of pressure-boundary joint leakage explains why bolted-joint integrity needs deliberate attention. It supplies no failure probability for this fictional vessel. [ASME, bolted-joint assembly discussion](https://www.asme.org/topics-resources/content/new-guidelines-for-pressure-boundary)

![Two vessel silhouettes retain the same process envelope. The first has a continuous shell; the second has four sections with three additional flange pairs. A magnified joint identifies the gasket and clamping bolts.](../assets/engineering/segmentation-vessel-joints.svg 'Boundary comparison only: four shell sections introduce three extra circumferential joints. Existing closures and nozzles are omitted from both sketches. No wall thickness, pressure rating, torque, or leak probability is calculated.')

Segmentation becomes a candidate if a real transport limit or recurring local replacement need justifies those interfaces. That changes the design brief and requires engineering assessment. It does not make the extra joints free.

## Assumptions for correctness

The retained equipment must remain fit for its purpose. A replaceable cartridge does not remedy a corroded housing, and a removable conveyor bay does not fix unsuitable supports.

The proposed unit must be reachable, safely releasable, supported during removal, and obtainable or repairable. Its interfaces must restore the required function after reassembly. Operating isolation must be established separately from physical separability.

## When to use it

Consider segmentation when interventions are localized but the present assembly forces wholesale handling, replacement, or transport. Different service lives, access restrictions, shipping envelopes, and recurring configuration changes can suggest useful boundaries. Compare those benefits with the actual frequency and consequence of the intervention.

## Tradeoffs and operating costs

Every boundary can add fasteners, seals, connectors, alignment work, space, stock, and records. It can reduce stiffness or introduce transfer and contamination problems. Too-small units multiply coordination; too-large units preserve the original burden. Compare plausible service histories and the full replacement sequence rather than minimizing either part count or unit size alone.

## Common mistakes and limitations

The frequent mistake is calling a part replaceable because it was once assembled separately. Finishes, piping, guards, shared belts, or lost supplier support can make that promise unusable.

Another is assigning all benefits to the division. Interchangeability needs an interface contract; continued operation needs suitable isolation and capacity; reduced downtime needs an evaluated sequence. Repeatedly replacing a segmented part can also preserve a design defect that should be corrected.

## Related patterns

[[engineering-standardized-module-interfaces|Standardized Module Interfaces (P010)]] specializes segmentation by preserving connection requirements across substitutions. A one-off removable unit need not be interchangeable.

[[engineering-replaceable-wear-units|Replaceable Wear Units (P124)]] specializes it by locating predictable wear in a renewable unit. Segmentation also serves transport, manufacturing, and configuration changes.

[[engineering-functional-separation|Functional Separation (P002)]] assigns incompatible jobs to different elements. Dividing equipment for handling need not change which element performs each job.

[[engineering-function-integration|Function Integration (P003)]] combines compatible jobs in one component. It may suit the internals of a removable unit even when the overall machine remains segmented.

## Sources and further reading

- [Parker Hannifin, Balston H-Series and K-Series filters, Bulletin TI-8L](https://www.parker.com/content/dam/Parker-com/Literature/IGFG/PDF-Files/BAL_TI_8L_H_K_Series_Filters.pdf): cartridge access and service conditions for the named equipment.
- [Dorner, 2200 Series Modular Belt Conveyors, 851-873-EU Rev. B](https://www.dornerconveyors.com/wp-content/uploads/2018/10/851-873b-EU-EN.pdf): frame-section connections and separate belt installation.
- [ASME, “New Guidelines for Pressure Boundary and Bolted Joint Assembly”](https://www.asme.org/topics-resources/content/new-guidelines-for-pressure-boundary): a 2010 explanatory article on joint integrity, not a current design procedure.
- [[arch-repairable-connections|Repairable Connections]] offers an architectural comparison focused on replacing vulnerable construction without disturbing sound neighboring work. Its repair-specific connection detail is narrower than this parent strategy.
