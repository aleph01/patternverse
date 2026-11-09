---
id: engineering-eliminate-a-supporting-task
type: pattern
title: 'Eliminate a Supporting Task'
summary: 'Remove the design feature that makes a supporting operation necessary, while preserving the useful function it served.'
status: draft
tags:
  - engineering
  - function-allocation
  - maintenance
  - system-architecture
verses:
  - engineering
attribution: 'Original Patternverse engineering synthesis. The magnetic-drive pump, guided flexure, and lubrication-assignment comparison are illustrative designs, not documented installations. Beam dimensions and displacement are teaching assumptions. Drawings and calculated beam shapes are original.'
---

## Purpose and problem

A pump's shaft crosses the boundary containing its process fluid. Rotation is necessary to drive the impeller, and the moving penetration creates another requirement: maintain a seal around that rotating shaft.

Improving the seal may be worthwhile. Another possibility is to transmit torque through a stationary wall, leaving no moving penetration to seal. The useful pumping function remains, while the particular supporting task loses its cause.

Eliminate a Supporting Task looks for this dependency: an operation exists because of a feature that the design can avoid. The opportunity lies in changing that feature, rather than simply making its associated work less visible.

## Core idea

**Remove the feature that creates the task so the task itself is no longer needed.** State both precisely. “Seal the rotating penetration” is a different requirement from “contain the process fluid.” The first can disappear while the second remains essential.

The replacement design must preserve the required useful behavior. Deleting a maintenance instruction, leaving a required task unattended, or moving it elsewhere does not establish that the need has gone.

This is an independent terminal pattern within the Function and Architecture family. Contactless interaction or compliant motion may enable it in particular designs; neither is its parent or a universal prerequisite.

## How it works

Trace the supporting operation back to the physical condition requiring it. A rotating boundary crossing requires dynamic sealing. A specified rubbing joint may require lubricant replenishment. Distinguish these local needs from the broader functions of containment and motion guidance.

Change the architecture so that the triggering condition is absent. Then trace the useful function through the new arrangement and check its operating envelope. The design may add different tasks, such as inspecting a stationary pressure boundary or checking flexible members for damage.

Compare complete obligations before and after. A particular task can be eliminated without making the machine maintenance-free or reducing total lifetime effort. Record the cause that disappeared, the useful function retained, and the new conditions that now govern success.

## Worked examples

### Pump: remove the rotating penetration

Consider an illustrative centrifugal pump whose motor shaft passes through the process boundary and drives the impeller. A dynamic shaft seal manages that crossing. Hold the required hydraulic duty and fluid-containment requirement fixed; the replacement must also transmit adequate torque over the required speed and temperature range.

Use separate drive-side and pump-side rotors with a stationary containment shell between them. Magnetic interaction transmits torque through the shell. The impeller shaft remains wholly inside the process side; the motor shaft remains outside. [HMD Kontro describes this separation of a magnetic drive from the sealed liquid end](https://www.hmdkontro.com/think-sealless/sealless-system/).

![Matched pump drive sections compare a continuous shaft crossing a dynamic seal with separate internal and external rotors across a stationary containment shell. The after arrangement has no rotating shaft passing through the highlighted wall.](../assets/engineering/eliminate-task-magnetic-pump.svg 'Original longitudinal drive sections, not to scale. The selected process boundary changes from one moving shaft penetration to none. Separate shafts remain on opposite sides of a stationary containment shell; curved arrows indicate rotation, not fluid flow or magnetic-field strength. Static joints, internal supports, and containment duties remain. No torque, pressure, leakage, or reliability rating is calculated.')

The inspectable evidence is the boundary crossing: **one rotating penetration becomes zero** in this selected arrangement. No replacement provider lubricates or adjusts a dynamic seal at that location, because that interface no longer exists. Fluid containment still depends on the shell and its stationary connections.

This is a change of architecture, not permission to omit a seal from an existing shaft penetration. Coupling capacity, shell suitability, bearing arrangements, and heat generation still require assessment. [KSB describes loss of synchronism when a permanent-magnet coupling exceeds its transmissible torque](https://www.ksb.com/en-global/centrifugal-pump-lexicon/article/magnetic-coupling-1116620). [HMD Kontro also documents optional secondary protection that can include additional sealing devices](https://www.hmdkontro.com/2022/01/28/secondary-control-containment-options/). The eliminated task is specifically the primary rotating process-boundary seal; the example establishes no universal absence of seals or maintenance.

### Guided mechanism: remove the rubbing pivots

An illustrative small stage uses parallel links with lubricated pin joints to guide a short displacement. Its service plan requires replenishing lubricant at those contacts. Preserve the required small motion and payload requirement, but replace the jointed links with two flexible leaves connected to a rigid moving member. Motion now comes from elastic bending rather than relative sliding at the pins.

[PI explains flexure guidance through elastic deformation without sliding or rolling contacts or guide lubrication](https://www.pi-usa.us/fileadmin/user_upload/physik_instrumente/files/TEC/PI-TEC76-Drive-Train-Elements.pdf). The guide still carries loads and constrains motion; the pin-contact lubrication job has no remaining contact to serve.

![A pinned parallel-link guide is compared with a two-leaf flexure guide. The flexure's neutral and displaced shapes identify its fixed and guided ends; labels give leaf length 30 mm, thickness 0.20 mm, and displacement 0.30 mm.](../assets/engineering/eliminate-task-flexure-guide.svg 'Original guide schematics and an evaluated small-deflection beam shape. Displacement and thickness are exaggerated for legibility. The numerical fixture uses uniform leaves with ideal fixed-guided conditions; it gives peak nominal bending strain of 0.020% at 0.30 mm displacement. No material, payload capacity, fatigue life, or actual stage accuracy is selected or established.')

For a teaching calculation, give each uniform leaf length **L = 30 mm**, thickness **t = 0.20 mm**, and guided-end displacement **δ = ±0.30 mm**. Assume the fixed end cannot move and both ends retain their initial orientation. A small-deflection fixed-guided beam model gives peak nominal bending strain **ε = 3t|δ|/L² = 0.00020**, or **0.020%**, at either travel extreme. [Fleming and Yong provide fixed-guided beam relations and the corresponding displacement shape](https://www.precisionmechatronicslab.com/wp-content/uploads/2018/01/J17k.pdf); these teaching dimensions do not describe their piezoelectric stage.

That strain calculation is not an allowable limit or a fatigue-life prediction. Material behavior, root geometry, manufacturing damage, off-axis loads, and required cycles still matter. Travel and parasitic motion also need checking. A flexure can remove a joint's lubrication task while creating a different design and inspection problem.

### Reassigned lubrication: the requirement survives

Retain the original pinned guide, lubricant, duty, and required contact condition. Assign its lubrication to a different technician. The contacts and their replenishment requirement are unchanged; only responsibility has moved.

Now attach an automatic lubricant supply to the same pins. It may remove a person's manual pumping operation, but it continues the joint-lubrication job being considered here. The supply also needs suitable delivery, replenishment, and condition checks. A smaller manual workload does not prove that the underlying supporting requirement disappeared.

![The same lubricated pin joint appears first with a manual oil supply and then with an automatic supply connected to the same lubrication passage. A separate flexure detail has no pin contact. Labels distinguish the retained lubrication job from removal of its cause.](../assets/engineering/eliminate-task-task-boundary.svg 'The two pin-joint arrangements hold contact, lubricant need, and operating duty fixed; changing ownership or delivery method retains joint lubrication. The flexure changes the motion interface and removes that particular rubbing-contact task. Arrows indicate lubricant delivery in the first two arrangements. No service interval, lubricant quantity, or whole-machine maintenance saving is claimed.')

The intended elimination becomes appropriate only when a redesign removes the contact's need for replenished lubricant while still meeting the required guidance and load conditions. The flexure is one candidate for limited motion, not a universal repair for every lubricated joint.

## Assumptions for correctness

The feature must actually cause the named task, and its removal must preserve the required useful function across the operating envelope. Check remaining boundaries and any new failure modes.

The beam fixture assumes uniform geometry, linear elastic small-deflection bending, ideal end constraints, and no initial stress. It omits local stress concentrations, shear deformation, geometric nonlinearity, temperature effects, and fatigue. Two leaves do not halve the bending strain imposed by the same displacement on each.

## When to use it

Consider this pattern when recurrent work can be traced to a particular interface, adjustment, consumable, or mechanism that the design could avoid. Favor cases where the causal connection is clear and the replacement can be verified. An expensive task is a reason to investigate its cause, not evidence that it can be deleted.

## Tradeoffs and operating costs

The redesign may cost more, permit less travel, change efficiency, or require different inspection and protection. Static containment and elastic motion have their own constraints. Evaluate the total operating and renewal burden rather than equating one removed task with a better system overall.

## Common mistakes and limitations

Renaming work, outsourcing it, or hiding it in an automatic component can leave the physical requirement intact. Broadening “no dynamic process seal” into “no seals,” or “no pin lubrication” into “no maintenance,” also loses the boundary that makes the claim defensible. Removing one dependency can introduce another.

## Related patterns

**Contactless Interaction (P039)** enables the magnetic-pump example by transmitting torque through a field. Contactless transfer alone need not remove any supporting task. This is an enabling relationship, not a parent relationship.

[[engineering-function-transfer|Function Transfer (P004)]] preserves a useful job and changes its provider. Here the precisely named supporting need disappears.

**Compliant Motion (P054)** obtains motion through flexible-member deformation. It enables the flexure example but can also be chosen for other reasons. Contactless Interaction and Compliant Motion remain planned articles.

## Sources and further reading

- [HMD Kontro, Think Sealless System](https://www.hmdkontro.com/think-sealless/sealless-system/): static containment shell and magnetic transmission to the liquid end; advertised product benefits are not transferred to the teaching design.
- [KSB, Magnetic coupling](https://www.ksb.com/en-global/centrifugal-pump-lexicon/article/magnetic-coupling-1116620): rotor arrangement and torque-dependent synchronism.
- [HMD Kontro, Secondary Control / Containment Options](https://www.hmdkontro.com/2022/01/28/secondary-control-containment-options/): remaining primary containment and optional additional protection.
- [PI, TEC76: Drive Train Elements, “Flexure Guides”](https://www.pi-usa.us/fileadmin/user_upload/physik_instrumente/files/TEC/PI-TEC76-Drive-Train-Elements.pdf): elastic guidance and absence of lubricated rolling or sliding guide contacts; no universal lifetime claim is adopted.
- [Fleming and Yong, “An Ultrathin Monolithic XY Nanopositioning Stage Constructed From a Single Sheet of Piezoelectric Material,” 2017, section III](https://www.precisionmechatronicslab.com/wp-content/uploads/2018/01/J17k.pdf): fixed-guided beam relations, including the displacement shape. The example above is an original passive-leaf fixture.
