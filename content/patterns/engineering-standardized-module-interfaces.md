---
id: engineering-standardized-module-interfaces
type: pattern
title: 'Standardized Module Interfaces'
summary: 'Preserve the connection contract between replaceable units so suitable alternatives can work without redesigning their neighbors.'
status: draft
tags:
  - engineering
  - interfaces
  - interchangeability
  - system-architecture
verses:
  - engineering
attribution: 'Original Patternverse engineering synthesis. The valve skid and sensor heads are illustrative scenarios, not documented installations. Dimensions, ranges, pin assignments, and calculations are teaching fixtures, not an industry wiring or flange specification. Drawings are original schematics.'
---

## Purpose and problem

The replacement valve has the correct flange diameter and bolt holes. It still will not fit: its body is longer than the space between the fixed pipes. Another replacement fits a sensor socket perfectly, but its output represents a different pressure range. The displayed reading looks plausible and means the wrong thing.

Both systems have removable units. What they lack is a complete, preserved agreement about what may cross the replacement boundary.

Standardized Module Interfaces makes that agreement explicit, allowing suitable units to change while their neighbors retain the connections and behavior they depend on.

## Core idea

**Keep the boundary contract stable while allowing the implementation behind it to vary.**

The contract includes physical fit, exchanged quantities, operating limits, and the meaning of signals or actions. It may be a project specification, a product-family convention, or a suitable published standard. “Standardized” does not require an industry-wide connector.

This specializes [[engineering-segmentation|Segmentation]]. Segmentation chooses independently manageable pieces; this pattern adds the conditions under which one piece can substitute for another. The units need not share their internal construction or part number.

## How it works

Describe the boundary from both sides. Establish datums, dimensions and tolerances, connection orientation, sealing, supply conditions, loads, signals, and required behavior. Include installation and removal space. Specify what is guaranteed by the module and what its neighbor must provide.

Record the applicable version and permitted variants. A drawing reference that omits its revision, facing, or configuration can conceal a consequential difference.

Verify the contract in layers: dimensional inspection, electrical or fluid compatibility, and appropriate functional checks. A successful bolt-up establishes only some of these. Freeze the requirements that neighbors rely on; leave internal choices open where they do not affect those requirements. Review changes against installed equipment before calling a new revision compatible.

## Worked examples

### A valve fits the reserved station

An illustrative piping skid reserves a station for an isolation valve. Its neighboring pipes and supports are intended to remain. The initial purchase description names a nominal connection size, but leaves flange facing, body length, actuator clearance, and operating duty unresolved.

The revised interface definition separates the mating details from the installed geometry and function.

| Contract layer | What the replacement must preserve |
| --- | --- |
| Mating connections | Specified flange family, size, rating designation, facing, bolt pattern, and compatible joint components. |
| Geometry | Flow-axis alignment, valve face-to-face dimension and tolerances, installed gap, body/actuator envelope, and service clearance. |
| Operating duty | Suitable pressure and temperature limits, wetted materials, required isolation and flow performance. |
| Actuation | Compatible controls, supply requirements, movement envelope, and specified resulting state. |

For a nominal fit calculation, choose an invented valve face-to-face length of 200 mm and a compressed gasket thickness of 2 mm at each end. The required pipe-face gap is then **200 + 2 + 2 = 204 mm**. A candidate with a 240 mm body requires 244 mm under the same assumptions: 40 mm more than the reserved gap. Matching flange holes does not resolve that mismatch.

These are teaching values, not dimensions selected from a standard. Real acceptance must include dimensional variation, gasket behavior, alignment, and the relevant installation conditions.

![An exploded valve station shows fixed pipe flanges, two gasket positions, the valve mating faces, a shared flow axis, and a reserved body and actuator envelope. A separate face view identifies the project flange pattern.](../assets/engineering/module-interfaces-valve.svg 'Illustrative interface geometry, not a pressure-equipment design. Dashed lines identify the reserved envelope and datums; exploded gaps are not installation distances. The 200 mm valve and two nominal 2 mm compressed gaskets require a 204 mm pipe-face gap. Joint suitability and valve duty require separate verification.')

ASME treats these subjects in complementary standards. B16.10 addresses installation dimensions for specified combinations of valve material, type, size, rating class, and end connection. B16.5 addresses flange dimensions alongside pressure–temperature ratings, materials, tolerances, and other requirements. Their public scope descriptions support the distinction; they do not establish compliance for this fictional station. [ASME B16.10](https://www.asme.org/codes-standards/find-codes-standards/b16-10-face-face-end-end-dimensions-valves), [ASME B16.5](https://www.asme.org/codes-standards/find-codes-standards/b16-5-pipe-flanges-flanged-fittings-nps-1-2-nps-24-metric-inch-standard)

Two approved suppliers may use different internal details while meeting the station's complete requirements. Installing either should preserve the specified duty without moving the pipes; that remains a verified acceptance claim, not a consequence of the word “standard.”

### Different sensor heads share one declared interface

A fictional test rack accepts interchangeable pressure-sensor heads. Head A uses one sensing construction; Head B uses another. The rack should not require a new bracket, harness, or interpretation rule whenever the approved head changes.

The project contract specifies the mounting face and datums, connector and contact numbering, enclosure envelope, and pressure connection. It also defines an 18–30 V DC supply range around nominal 24 V, a compatible sourced-current output and receiver load, and a linear mapping from 0–100 kPa gauge pressure to 4–20 mA. Accuracy, response time, environmental limits, and fault behavior need their own acceptance criteria.

![Two differently shaped sensor heads share the same mounting face and a project-specific four-contact connector. A magnified connector face and legend distinguish supply, return, current signal, and a reserved contact. Both approved heads preserve the same pressure-to-current mapping.](../assets/engineering/module-interfaces-sensor-heads.svg 'Project-only connector sketch, not a connector wiring standard. Different internal sensing constructions are acceptable only if mounting, electrical conditions, signal meaning, and required performance remain compatible. The declared mapping is 4–20 mA for 0–100 kPa gauge pressure.')

For this fixture, apply the same reference pressures to each approved head. The nominal expectations are 4 mA at 0 kPa, 12 mA at 50 kPa, and 20 mA at 100 kPa. This gives an inspectable interpretation check, while leaving accuracy tolerances and dynamic tests to the declared performance requirements.

Sensor identity and calibration information must follow the replacement. NI's description of TEDS illustrates how measurement ranges, excitation requirements, and individual calibration information can accompany sensors. A documented configuration record can serve this example; its connector does not magically implement electronic identification. [NI, Sensor Calibration with TEDS Technology](https://www.ni.com/en/support/documentation/supplemental/06/sensor-calibration-with-teds-technology.html)

### The plug fits, but the interpretation does not

Keep the rack, connector, supply, and receiver configuration unchanged. Substitute Head C, whose 4–20 mA output instead spans 0–1000 kPa gauge pressure.

At an illustrative 500 kPa, C produces 12 mA. The unchanged receiver interprets that as **(12 − 4) / (20 − 4) × 100 = 50 kPa**. Physical mating and an in-range current conceal a tenfold interpretation mismatch.

![Two declared linear mappings share a 4–20 mA current axis. At 12 mA, the replacement head represents 500 kPa while the unchanged receiver reports 50 kPa. Separate markers and labels identify both values.](../assets/engineering/module-interfaces-signal-meaning.svg 'Calculated teaching fixture: Head C spans 0–1000 kPa while the receiver remains configured for 0–100 kPa. The plotted difference is a mapping mismatch, not measured sensor error. An electrically plausible current does not establish a compatible interpretation.')

TI's current-loop explanation describes the nominal 4 mA lower endpoint and 20 mA full-scale endpoint. Those electrical endpoints alone cannot specify which physical range the receiver should infer. [Texas Instruments, TIDUC27B, section 2](https://www.ti.com/lit/ug/tiduc27b/tiduc27b.pdf)

A head requiring 3.3 V and tolerating at most an assumed 3.6 V would fail a different compatibility check on the same nominal 24 V supply, despite a matching connector. Calibration cannot repair a supply mismatch. A changed pressure range may become an approved variant through explicit configuration and duty review; it is not a transparent replacement under the unchanged contract.

## Assumptions for correctness

Both sides must implement the same applicable contract and permitted configuration. Manufacturing variation, operating conditions, and performance must stay within its limits. Reference-plane definitions and signal units must be unambiguous.

The unchanged neighbor must remain suitable, and the replacement process must restore required seals, supports, connections, and configuration. Interface conformity does not diagnose the fault or prove the complete machine suitable for every duty.

## When to use it

Use this pattern when replacement, multiple suppliers, upgrades, or product variants should preserve neighboring equipment. It is especially useful when units change more frequently than the surrounding platform, or when substitution currently triggers repeated mechanical and control redesign.

## Tradeoffs and operating costs

A preserved interface constrains later designs. Reserved space, conservative limits, compliance checks, documentation, fixtures, and variant management have costs. An oversized universal contract can burden every unit. Choose a useful compatibility family and manage explicit exceptions instead of promising compatibility with everything.

## Common mistakes and limitations

The common error is equating mating geometry with functional interchangeability. Others include mismatched reference pressure, changed calibration units, incompatible source/sink behavior, unreviewed startup states, and revisions that quietly alter assumptions.

Adapters can bridge some differences, but add another interface and require their own verification. They cannot supply missing pressure capacity or make incompatible electrical limits disappear. Nor does preserving a connector guarantee continued availability of replacement modules.

## Related patterns

[[engineering-segmentation|Segmentation (P001)]] is the parent strategy: it chooses the units that can be managed separately.

**Common Parts (P122)** reduces the variety of actual components. Different parts may share an interface, and identical part numbers are a separate purchasing and configuration decision.

**Reconfigurable Architecture (P011)** changes the working arrangement of modules. Stable interfaces can enable that rearrangement but do not require it. These two engineering articles are planned.

[[adapter|Adapter]] addresses translating an existing mismatch in software. It is a useful analogy to physical or electrical adaptation; this pattern instead establishes the boundary contract suitable replacements are intended to preserve.

## Sources and further reading

- [ASME B16.10, public scope description](https://www.asme.org/codes-standards/find-codes-standards/b16-10-face-face-end-end-dimensions-valves): installation interchangeability has specified conditions, including valve type and connection.
- [ASME B16.5, public scope description](https://www.asme.org/codes-standards/find-codes-standards/b16-5-pipe-flanges-flanged-fittings-nps-1-2-nps-24-metric-inch-standard): flange geometry is accompanied by material and operating requirements. Full dimensional tables were not used here.
- [NI, Sensor Calibration with TEDS Technology](https://www.ni.com/en/support/documentation/supplemental/06/sensor-calibration-with-teds-technology.html): configuration and calibration information support interpretation.
- [Texas Instruments, TIDUC27B, section 2](https://www.ti.com/lit/ug/tiduc27b/tiduc27b.pdf): nominal current-loop endpoint conventions. Its documented design is not the fictional pressure head used above.
