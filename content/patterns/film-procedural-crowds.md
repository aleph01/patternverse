---
id: film-procedural-crowds
type: pattern
title: Procedural Crowds
summary: Generate large crowds using shared rules and individual variation
  rather than animating every figure separately.
status: published
verses:
  - filmmaking
---

*Give individuals a repertoire, give the crowd a purpose, and let rules organize the detail.*

A filmmaker needs an army stretching to the horizon, a city square full of pedestrians, or thousands of spectators reacting to the same event.

Hiring enough extras might be impractical. Animating every digital person separately would create another enormous task. Simply copying one performance produces a revealing pattern: the same stride, gesture, or head turn repeats across the image.

The problem is therefore larger than filling space. **The crowd must look populated by individuals while behaving like people who share a situation.**

Procedural crowds address this by turning some of the animator’s decisions into reusable rules. Artists supply characters, movements, destinations, and conditions for reacting. The system applies those instructions across a population, generating much of the individual activity.

## The opening puzzle: how do thousands of figures move differently without thousands of separately animated performances?

![The photographed World War Z location before the crowd and effects additions.](https://media.mpcvfx.com/app/uploads/2022/04/515_lvi_0155_plate01_1080.jpeg)

*World War Z (2013) — Original photography / plate.* The original plate from MPC’s published before-and-after comparison. Compare it with the finished shot to separate the photographed environment from the added crowd and effects. [Image source](https://www.mpcvfx.com/en/filmography/world-war-z/). Credit: Paramount Pictures / MPC.


![The corresponding finished shot adds a dense crowd to the photographed location.](https://media.mpcvfx.com/app/uploads/2022/04/515_lvi_0155_272_1080.jpeg)

*World War Z (2013) — Finished VFX shot.* The completed shot from the same comparison. MPC’s ALICE system generated large crowds, with layout, simulation, and selected hand animation shaping the overall action. [Image source](https://www.mpcvfx.com/en/filmography/world-war-z/). Credit: Paramount Pictures / MPC.


Imagine a digital pedestrian with several available actions: walk, wait, turn, and look around.

The pedestrian also has a destination, a preferred walking speed, and rules for responding to obstacles. Another pedestrian receives slightly different settings. Both use the same underlying resources, but their paths and timing diverge.

Multiply that arrangement, and the crowd becomes a collection of related performances rather than an obvious repeated loop.

In crowd software, these figures are commonly called **agents**. An agent combines a digital character with animation and information controlling its behaviour. Systems such as Houdini separate the population’s initial arrangement from the simulation that moves it and manages its interactions. [Reference: SideFX’s explanation of crowd setup](https://www.sidefx.com/docs/houdini/crowds/setup.html).

## Variation and coordination solve different problems

Repetition becomes conspicuous when figures share matching appearances, matching poses, and regular spacing.

Differences in appearance and movement reduce that repetition. A convincing social arrangement adds another layer: for example, streams of pedestrians passing around a fountain, with small groups beside the main flow.

The *World War Z* before-and-after images show how substantial crowd additions can transform photographed space. The individual motion and the crowd’s overall structure still need separate attention.

The distinction matters: **variation gives people individuality; coordination makes them belong to the scene.**

### Example: *The Lord of the Rings*—how does an army become thousands of encounters?

For *The Lord of the Rings*, Stephen Regelous developed Massive, a system that allowed digital characters to respond to their surroundings.

In an original production interview about *The Fellowship of the Ring* (2001), Regelous described agents selecting, modifying, and blending movements according to what was happening around them. The team built libraries of actions and adjustable characteristics, including physical proportions and behavioural differences.

Instead of assigning an entire army one combat loop, the system could produce individual encounters using those shared resources. A warrior’s next action depended on its circumstances.

That shifts the animator’s work upstream. Artists create the movements, variations, and decision rules from which many performances can be assembled. Building that foundation was substantial work: the production report describes two years of preparation before the agents could be used in shots.

The reusable trick is to **author a system capable of producing many appropriate actions**, then direct its results. [Reference and production imagery: *Computer Graphics World*, “The Fellowship of the Ring”](https://www.cgw.com/Publications/CGW/2001/Volume-24-Issue-12-December-2001-/The-Fellowship-of-the-Ring.aspx).

## The crowd needs direction at two scales

<!-- film-illustration:crowd-authored-rules -->
![Bodies, actions and local rules feed directed routes and density. Individual variation works within a designed population; important actions can still receive separate animation.](../assets/filmmaking/crowd-authored-rules.svg "Shared actions create individuals; routes, timing and density organize the crowd. Variation alone does not supply a readable collective purpose. Illustrative scenario, not a documented film setup.")
<!-- /film-illustration:crowd-authored-rules -->

```patternverse-widget
{"src": "film-crowd-variation.html", "title": "Vary the same underlying walk", "height": 560, "fallback": "Compare identical walk timing with varied timing and pace. This isolates one part of crowd animation. Illustrative scenario, not a documented film setup."}
```

At the individual scale, a figure might avoid a neighbour, slow down, or change from walking to running.

At the scene scale, the crowd must accomplish something readable: advance toward a gate, leave a stadium, gather around a speaker, or flee a threat.

Local behaviour alone does not guarantee the desired composition. Artists also establish starting positions, routes, destinations, and areas with different instructions. Massive, for example, provides placement tools, lanes, flow fields, and controls for directing both groups and individuals. [Reference: Massive’s feature overview](https://www.massivesoftware.com/features.html).

A useful way to picture the relationship is a director working with background performers: broad instructions establish the action, while individual behaviour supplies its texture.

### Example: *Happy Feet*—how can a community share a dance without looking mechanically identical?

*Happy Feet* (2006) used different crowd techniques for different performance needs.

Animal Logic’s Horde system worked with multiple captured performances, varying them through changes in timing and space. This helped preserve the character of the choreography while avoiding uniform repetition. Massive was also used for procedural and cycle-based crowd sequences. [Reference: interviews with the filmmakers in Animation World Network](https://www.awn.com/animationworld/getting-animated-over-happy-feet).

The everyday penguin behaviour provides another revealing example. Crowd supervisor Tim Rowlandson described commuter lines in which some penguins briefly greeted one another, others stopped to chat, and others continued past. Different probabilities produced different social encounters.

The team also needed convincing avoidance and terrain adaptation. The penguins’ contrasting black feet against bright ice made slipping feet and intersecting bodies particularly visible.

The lesson extends beyond dance: shared activity needs a controlled range of individual responses. Excessive variation would lose the choreography; insufficient variation would expose the duplication. [Reference: Massive’s production account, including Rowlandson’s comments](https://www.massivesoftware.com/news_030107.html).

## The next puzzle: how does a crowd change its mind?
An agent can occupy a state such as waiting, walking, or running. A trigger changes that state when an appropriate condition occurs.

The condition might involve proximity, elapsed time, entering an area, or an explicitly animated cue. A transition can blend the movement between states.

This allows an artist to design a reaction spreading through a population, rather than making everyone switch actions on exactly the same frame. The timing still needs direction: the audience must understand what caused the change. [Reference: SideFX’s guide to crowd triggers and transitions](https://www.sidefx.com/docs/houdini/crowds/triggers.html).

### Example: *World War Z*—what happens when the crowd must climb over itself?

The Jerusalem sequences in *World War Z* (2013) required crowds that formed surging masses and pyramids against a wall.

Ordinary pedestrian avoidance would have undermined that behaviour. These characters needed to collide, pile up, fall, and continue moving.

MPC supervisor Jessica Norman described a combination of rough geometric blocking, captured climbing and falling movements, animated group interactions, and keyframe animation. The studio’s ALICE crowd system directed the characters, while its PAPI physics system calculated collisions and falls. Characters could switch from a performed movement to a physically simulated reaction.

Characters approaching the camera could also be taken out of the general crowd workflow for more specific animation.

The result illustrates an important limit of the pattern: a useful crowd system must reflect the behaviour of this particular population. A pedestrian street and a zombie pile require different assumptions. The spectacular overall movement also benefited from deliberately authored structure. [Reference and before-and-after imagery: fxguide’s interviews with the effects teams](https://www.fxguide.com/fxfeatured/zombie-warfare-world-war-z/).

## Where the illusion breaks
Several problems can reveal a procedural crowd:

- **Repeated signatures:** a distinctive gesture or costume appears too often.
- **Unmotivated variety:** people move differently but seem to have no reason for being there.
- **Poor contact:** feet slide, bodies intersect, or movement ignores the terrain.
- **Weak dramatic timing:** technically plausible activity obscures the event the audience needs to notice.

A convincing crowd also needs appropriate lighting, shadows, scale, and integration with its surroundings. Behaviour solves one part of the shot.

Procedural methods are especially useful when many figures must move through space or respond to changing conditions. A handful of prominent interactions may still deserve individual animation.

## A neighbouring trick: multiplying photographed extras
A large screen crowd does not automatically imply procedural agents.

For *Straight Outta Compton* (2015), Image Engine extended concert audiences through a completely two-dimensional approach. The production filmed approximately 2,000 extras performing in different parts of the venue, matching songs and lighting. Compositing combined those recordings into an apparent audience of approximately 20,000.

That solves crowd scale through photographed performances rather than simulated individual behaviour. [Reference and breakdown reel: Image Engine’s production case study](https://image-engine.com/case-studies/straight-outta-compton/).

Procedural crowds connect naturally with **[motion capture](/pattern/film-performance-capture)**, which supplies movement; **[digital doubles](/pattern/film-digital-doubles-and-face-replacement)**, which provide characters; and **compositing**, which integrates the population into the shot. Their distinctive contribution is a reusable way to organize many performances while retaining control over the crowd’s collective action.
