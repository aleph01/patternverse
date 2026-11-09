---
id: engineering-function-transfer
type: pattern
title: 'Function Transfer'
summary: 'Give an existing part the complete useful job of a dedicated part, verify its capacity and interfaces, then remove the dedicated part.'
status: draft
tags:
  - engineering
  - function-allocation
  - thermal-design
  - system-architecture
verses:
  - engineering
attribution: 'Original Patternverse engineering synthesis. The chassis, thermal network, and machine-driven lubrication cases are illustrative designs, not documented installations. Thermal resistances, temperatures, powers, and stroke delivery are declared teaching fixtures. Drawings are original schematics.'
---

## Purpose and problem

A power-electronics assembly has a dedicated heat sink beside a metal chassis that already supports and encloses the equipment. The sink adds material, mounting work, and space. If the chassis can accept, spread, and reject the device's heat, those jobs might move to a part already present.

The heat does not disappear when the sink leaves. It must still reach the surroundings without exceeding the relevant temperature limits. Removing the component before establishing that replacement path turns a promising simplification into an unfulfilled requirement.

## Core idea

**Transfer a retained job to a suitable existing part, then remove its former dedicated provider.** Identify all three: the job, the receiving part, and the removed part.

This specializes [[engineering-function-integration|Function Integration (P003)]]. Integration combines compatible functions generally. Function Transfer adds a specific redesign history: an existing element takes over a useful job from another element that becomes unnecessary. A newly conceived component with several roles need not involve this transfer.

The receiving part keeps its original responsibilities. Its available capacity must be assessed after the new job joins them.

## How it works

Describe the dedicated part's complete service, including conditions that are easy to overlook. A heat sink provides a path to the thermal surroundings; conducting heat into a large metal object completes only part of that path. An actuator supplies motion with a particular force, timing, and availability, not merely movement somewhere in the machine.

Identify the receiving element's existing capability and obligations. Add the connection needed for the new job, then follow its consequences through the system boundary. Check combined loading, access, alignment, failure behavior, and the operating conditions under which capacity is available.

Only remove the original provider when the receiving arrangement satisfies the retained function and its original duties. A connection, cam, mounting pad, or other small adaptation may still be needed. Compare the complete resulting arrangement rather than treating removal of one named part as the outcome.

## Worked examples

### Chassis: take over the complete thermal path

Consider an illustrative assembly dissipating **12 W** in one power device. Its chassis already receives **8 W** from other equipment. Hold both loads, the device, and **35°C** ambient temperature fixed. Set an illustrative junction-temperature criterion of **110°C**; the junction is the active semiconductor region. This is a teaching criterion, not a component rating or touch-temperature limit.

Use the [steady-state thermal-resistance model described by Texas Instruments](https://www.ti.com/lit/an/slva118a/slva118a.pdf): temperature rise equals heat flow multiplied by thermal resistance. Resistance is expressed in **K/W**, equivalent to °C/W for temperature differences. Assume **1.5 K/W** from junction to device case and **0.5 K/W** across the mounting interface. Together these contribute **24 K** at 12 W.

The separate sink has an assumed **3 K/W** resistance to ambient. Before transfer, the junction temperature is 35 + 12 × (1.5 + 0.5 + 3) = **95°C**. The chassis handles its separate 8 W load.

Now mount the device thermally to the existing chassis and remove the dedicated sink. Assume an effective chassis-to-ambient resistance of **2 K/W**, including spreading and heat rejection for this simplified arrangement. The chassis must now reject **20 W**, so its modeled temperature is 35 + 20 × 2 = **75°C**. Adding the device's 24 K rise gives **99°C** at the junction, below the fixture's criterion.

![Matched open-chassis sections show a device rejecting heat through a separate finned sink before transfer and through the existing chassis afterward. The other 8 W heat source remains. Calculated junction temperatures are 95°C and 99°C.](../assets/engineering/function-transfer-thermal-paths.svg 'Original schematic sections with calculated node temperatures from the declared steady-state model. The device dissipates 12 W, other chassis equipment 8 W, and ambient is 35°C. Arrows mean heat flow. The qualified chassis rejects the combined 20 W; removing the sink does not remove the heat. No temperature field, mounting specification, or product rating is shown.')

The result supports removal under this model, not a claim of improved cooling. Actual qualification must establish spreading, environmental heat rejection, effects on existing users, and surface-temperature requirements. [Infineon explains why mounting interfaces and electrical insulation contribute thermal resistance](https://www.infineon.com/dgdl/Infineon-Recommendations_for_Board_Assembly_TO-AP-v02_00-EN.pdf?fileId=db3a3043183a955501189e662ae34052). Those connections remain part of the job after the dedicated sink is gone.

### Lubrication: let existing machine motion supply the drive

An illustrative machine uses a dedicated actuator to stroke a small lubrication pump. Its main shaft already turns during the work requiring lubrication. Retain the pump, lubricant circuit, required delivery, and main machine duty; replace the dedicated actuator with a suitable eccentric and follower driven by that shaft.

[Bijur Delimon describes mechanical lubrication pumps driven by the machine through a connecting rod or eccentric cam](https://www.bijurdelimon.com/default/lubrication-products/pumps/mechanical.html). The transferred job here is driving the pump. The pumping mechanism and distribution circuit remain.

![Matched lubrication arrangements retain a pump and machine shaft. The upper arrangement strokes the pump with a separate actuator; below, an eccentric on the existing shaft drives a follower connected to the pump. The actuator is removed.](../assets/engineering/function-transfer-lubrication-drive.svg 'Original mechanism schematics, not to scale. Green arrows indicate reciprocating drive motion; the rotating shaft and eccentric are drawn at one illustrative phase. The pump and lubrication circuit remain. The new shaft coupling still consumes work, adds load, and requires suitable stroke and timing. The drawing is not a manufacturer pump design.')

Assume one completed pumping stroke per shaft revolution, **30 revolutions/min**, and effective delivery of **20 mm³ per stroke** under the required conditions. The calculated delivery is 30 × 20 = **600 mm³/min**, or **0.6 mL/min**. These are teaching values, not a product specification. A dedicated actuator providing the same 30 strokes/min would give the same nominal result.

The transferred drive delivers **zero strokes at standstill**. That may suit lubrication tied to running cycles, but cannot independently provide prelubrication or delivery during a pause. Verify stroke, refill time, pressure capability, required timing, and added shaft loading. Existing motion supplies the work; it does not make that work free. If independent availability is required, the proposed transfer is incomplete.

### Poor chassis rejection: moving heat is insufficient

Repeat the thermal comparison for a poorly rejecting chassis with **4 K/W** resistance, keeping that value fixed before and after removal. All powers, ambient temperature, mounting resistance, and the 110°C criterion remain unchanged.

With the separate sink retained, the device still reaches **95°C**, while the chassis handles its original 8 W at **67°C**. After transfer, the chassis reaches 35 + 20 × 4 = **115°C**; the junction reaches **139°C**. The receiving element fails the declared criterion.

![A thermal-resistance network shows 12 W from the device joining 8 W at the chassis node. The combined 20 W crosses a 4 K/W chassis-to-ambient resistance, producing a 115°C chassis and a 139°C junction at 35°C ambient.](../assets/engineering/function-transfer-rejection-limit.svg 'Computed failure fixture using the same poor chassis before and after transfer. Before removal, the independent 3 K/W sink keeps the junction at 95°C. Afterward, 12 W plus 8 W share the chassis rejection path. The 2 K/W device-and-mount path carries only the device 12 W. This is a lumped thermal network, not CFD or a transient simulation.')

For this fixture, chassis resistance must be no more than (110 − 35 − 24) / 20 = **2.55 K/W** to meet the junction criterion. Even an ideal zero-resistance device-to-chassis path would leave the chassis above that criterion. Better contact alone cannot solve this rejection bottleneck. Retain the sink or establish a complete alternative thermal design before removing it.

## Assumptions for correctness

The receiver must have adequate capability over the actual operating envelope, including its existing load. Its new interface must preserve the conditions needed for both jobs.

The thermal fixture assumes steady state, constant effective resistances, uniform receiver nodes, all device heat following the selected path, and independent cooling paths before transfer. It omits transient storage, other heat paths, local hot spots, and air recirculation. The stroke calculation assumes complete cycles and effective delivered volume; it does not predict pressure, leakage, or mechanical power.

## When to use it

Look for a dedicated provider beside an existing element with a suitable capability: a structural chassis that can reject heat, or working motion that can provide an auxiliary drive. Evidence must cover capacity, connection, and availability. Similar appearance or physical proximity alone is insufficient.

## Tradeoffs and operating costs

The receiver gains load, constraints, and failure consequences. A shared thermal path can warm existing equipment; a shared drive ties auxiliary service to machine operation. New mounts, insulation, linkages, inspections, and service access can offset the removed part. The remaining element may become harder to change independently.

## Common mistakes and limitations

Do not mistake heat storage for steady heat rejection, shaft movement for an adequate pumping cycle, or a transferred job for an eliminated requirement. A trial at one load or speed cannot establish the complete envelope. If the receiver needs a replacement subsystem comparable to the removed one, reconsider whether the proposed simplification earns its added coupling.

## Related patterns

[[engineering-function-integration|Function Integration (P003)]] is the direct parent. This child requires an identifiable former provider, existing receiver, and removed part.

[[engineering-eliminate-a-supporting-task|Eliminate a Supporting Task (P005)]] removes the reason a job is needed. Function Transfer retains the job and changes its provider.

**Shared Infrastructure (P006)** provides a common service with suitable capacity and isolation. A transferred job may join such a service, but sharing alone does not establish that a former dedicated part has been removed. Shared Infrastructure remains a planned article.

## Sources and further reading

- [Texas Instruments, Linear Regulator Design Guide for LDOs, SLVA118A, pages 9–10](https://www.ti.com/lit/an/slva118a/slva118a.pdf): steady-state thermal paths, resistance definitions, and heat-sink budgeting. No product values are reused.
- [Infineon, Recommendations for Assembly of Infineon TO Packages, revision 2.0, section 1.2](https://www.infineon.com/dgdl/Infineon-Recommendations_for_Board_Assembly_TO-AP-v02_00-EN.pdf?fileId=db3a3043183a955501189e662ae34052): interface resistance and electrical-isolation consequences; the fictional mounting arrangement is not a package assembly procedure.
- [Bijur Delimon, Mechanical Pumps](https://www.bijurdelimon.com/default/lubrication-products/pumps/mechanical.html): machine-driven cam or connecting-rod actuation, cyclic delivery, and spring return. The numerical stroke fixture is original.
