---
id: film-performance-capture
type: pattern
title: Performance Capture
summary: Record performance information and translate it into the movement and
  expression of a screen character.
status: published
verses:
  - filmmaking
---

*Preserve the acting while changing the body that expresses it.*

A creature pauses before answering. Its eyes shift toward another character. Its shoulders tighten, then relax. Before it says anything, we understand that it has changed its mind.

The creature might have enormous eyes, unfamiliar anatomy, or skin made of something no human possesses. Yet the moment feels like a particular person thinking.

That is the motivation for performance capture: filmmakers want characters whose physical appearance exceeds what an actor can wear, while retaining the timing, relationships, and small choices of a performed scene.

## The opening puzzle: how can you recognize an actor inside a completely different creature?

Davy Jones is a mixed-method example: the production captured Bill Nighy’s body movement, while animators interpreted his facial acting by hand. The pair below shows the photographed performance and the finished character.

![Bill Nighy performs Davy Jones on set in a marked iMocap suit.](https://vfxblog.com/wp-content/uploads/2019/11/88f23-davyjones_plates.jpg?h=912&w=1200)

*Pirates of the Caribbean: Dead Man’s Chest (2006) — Original performance plate.* Bill Nighy performs Davy Jones on set in ILM’s iMocap suit. Body movement was captured alongside the other actors; facial performance was studied and animated rather than automatically transferred by facial capture. [Image source](https://vfxblog.com/2018/10/09/ilms-hal-hickel-on-the-symbiotic-relationship-between-actor-and-animator/). Credit: Disney / ILM; published by vfxblog.


![The matching finished shot replaces Nighy with the tentacled digital Davy Jones.](https://vfxblog.com/wp-content/uploads/2019/11/9cfeb-davyjones_final.jpg?h=673&w=1200)

*Pirates of the Caribbean: Dead Man’s Chest (2006) — Finished VFX shot.* Davy Jones replaces Nighy’s photographed appearance while preserving the acting choices. Animation, creature anatomy, shading, and lighting complete the character. [Image source](https://vfxblog.com/2018/10/09/ilms-hal-hickel-on-the-symbiotic-relationship-between-actor-and-animator/). Credit: Disney / ILM; published by vfxblog.


Much of what makes a performance recognizable happens through movement over time: a hesitation, a characteristic head tilt, a gesture beginning before a sentence, a smile that arrives reluctantly.

Performance capture records aspects of that behaviour so artists can carry them into a digital character.

The central trick is to **separate the performance from the performer’s photographed appearance**, then adapt it to another body.

The paired Davy Jones images show that separation: Bill Nighy’s photographed performance and the finished digital character. The work between those stages is an iterative process of capture, interpretation, animation, and rendering.

## What actually gets captured?

<!-- film-illustration:performance-to-character -->
![Recorded acting is retargeted and refined for a character with different anatomy. The figures separate the input performance from the animation decisions that shape the result.](../assets/filmmaking/performance-to-character.svg "Captured acting is adapted to another anatomy, then refined. Different proportions can change the meaning or contact of a copied movement. Illustrative scenario, not a documented film setup.")
<!-- /film-illustration:performance-to-character -->

The terms *motion capture* and *performance capture* overlap. “Performance capture” generally emphasizes the coordinated acting—including body movement, facial expression, and recorded dialogue—rather than an isolated movement such as a walk cycle. Production methods vary considerably.

A common optical body-capture system uses several cameras to track markers attached to a performer. Software reconstructs their positions in three dimensions and derives the movement of a digital skeleton. Other approaches use wearable sensors or markerless tracking. [Reference: Vicon’s overview of motion-capture systems](https://www.vicon.com/resources/blog/types-of-motion-capture-a-complete-guide/).

Facial capture is a related but distinct problem. Cameras record the actor’s changing face, often from a small head-mounted assembly. A facial “solve” estimates how a character’s controls should move to reproduce the expression. Wētā’s FACETS system, for example, maps facial performance onto characters with substantially different proportions and gives animators editable results. [Reference: Wētā FX’s explanation of FACETS](https://www.wetafx.co.nz/research-and-tech/technology/facets).

These recordings supply movement and reference. The character’s model, skin, hair, costume, lighting, and final image still require their own work.

### Example: Gollum—how does an intimate conversation survive the transformation?

The riddle scene in *The Hobbit: An Unexpected Journey* (2012) depends on a conversation between Bilbo and Gollum. Suspicion, excitement, and sudden changes of intention matter more than spectacular movement.

Wētā could capture Andy Serkis on set while he acted with Martin Freeman. That preserved the exchange between the performers: each could respond to what the other actually did in the take. Wētā describes the resulting performance as something its animators translated into Gollum, supported by improved muscles, eyes, and surface rendering. [Reference and breakdown videos: Wētā FX’s Gollum case study](https://www.wetafx.co.nz/films/case-studies/gollum).

The translation still needed close attention. Production interviews describe animators extending facial expressions beyond human possibilities, refining eye movement, and ensuring that Gollum’s hands and feet made the correct contact with his surroundings.

The capture provided a specific performance to preserve. The animation made that performance work through a small, unusually proportioned creature. [Reference: *Computer Graphics World*, “Of Gollum and Wargs and Goblins, Oh My!”](https://www.cgw.com/Publications/CGW/2013/Volume-36-Issue-2-Jan-Feb-2013-/Of-Gollum-and-Wargs-and-Goblins-Oh-My-.aspx).

## The next puzzle: why isn’t transferring the movement enough?
Imagine transferring a human hand movement to a character with much longer arms. Copying the joint rotations might send its hand through a table instead of onto it.

Faces create similar problems. A small change around a human mouth may read very differently on a creature with a wide muzzle or enormous eyes.

This adaptation is often called **retargeting**: mapping a source performance onto the destination character. It requires decisions about proportions, contact, expression, and what the audience should understand.

The important correspondence is sometimes emotional rather than geometrically exact.

### Example: Davy Jones—how do you preserve an expression when the character has no nose?

For *Pirates of the Caribbean: Dead Man’s Chest* (2006), ILM captured Bill Nighy’s body performance on location, allowing him to act alongside the other performers.

His facial performance followed a different route. Animation supervisor Hal Hickel explains that the production did not use facial motion capture for Davy Jones. Animators studied Nighy’s photographed face and animated the character’s expressions by hand.

Hickel gives a revealing example: Nighy might flare his nostrils in anger, but Davy Jones has no corresponding nose. The artists had to communicate that acting choice through other features.

This makes Davy Jones an especially useful example of a mixed approach. Captured body movement, closely observed facial acting, animation, and creature-specific additions work together. Preserving Nighy’s intention required understanding what he was doing, then finding an equivalent expression. [Reference and side-by-side images: Hal Hickel’s interview with vfxblog](https://vfxblog.com/2018/10/09/ilms-hal-hickel-on-the-symbiotic-relationship-between-actor-and-animator/).

## Why the other actor matters
A performance includes responses to another person: interruptions, changes of distance, physical contact, and attention.

Capturing performers together can preserve those relationships. But different character sizes introduce another complication. The actor’s actual eyes may be below or beside where the finished creature’s eyes will appear.

Productions therefore need ways to maintain appropriate eyelines and contact. For *Avatar: The Way of Water*, Wētā describes a cable-mounted eyeline system with small monitors showing digital characters’ facial performances at the appropriate positions in space. [Reference: Wētā FX’s production account](https://www.wetafx.co.nz/articles/our-work-on-avatar-the-way-of-water).

### Example: *Avatar: The Way of Water*—why capture swimming in actual water?

A person swimming is affected by buoyancy, resistance, current, and the effort of surfacing. Those forces shape the performance.

For *Avatar: The Way of Water* (2022), James Cameron’s team developed capture methods operating both underwater and above the surface. The performers worked in a tank, experiencing water movement while acting.

The system had to combine information from the two capture spaces as performers crossed the surface. Bubbles also created tracking problems because their reflections could be confused with markers.

The resulting digital characters could inherit movement grounded in that physical experience, while artists built the finished appearance and environment.

The broader principle is that changing the final body does not eliminate the value of giving the performer meaningful physical circumstances. [Reference and production imagery: Disney’s account of the underwater capture process](https://thewaltdisneycompany.com/news/how-avatar-the-way-of-water-revolutionizes-underwater-cinematography/).

## From take to finished shot

A simplified workflow has several connected stages:

1. **Perform and record:** preserve the acting, dialogue, movement, and reference.
2. **Reconstruct:** turn the recordings into usable body and facial animation.
3. **Adapt:** transfer the performance to the character’s proportions and controls.
4. **Refine:** resolve contacts, expressions, and character-specific movement.
5. **Finish:** add surfaces, hair, clothing, lighting, and integration with the scene.

Productions may revisit these stages repeatedly. A preview character visible during filming helps filmmakers judge the action, but it does not represent all the detail of the final shot.

## Where the illusion becomes fragile
A convincing performance depends on relationships between movements. An eye shift, breath, head turn, and spoken phrase have timing that belongs together. Refinement needs to preserve that coherence.

Capture can also contain missing or ambiguous information. Markers become obscured; hands contact objects differently after retargeting; an expression reads poorly through unfamiliar anatomy.

Performance capture is particularly useful when a digital character must sustain detailed acting or close interaction with other performers. Fully hand-animated approaches remain valuable where the movement or anatomy calls for a different solution.

Its neighbours include **[rotoscoping](/pattern/film-rotoscoping)**, which uses photographed action as an animation guide; **[digital doubles](/pattern/film-digital-doubles-and-face-replacement)**, which provide a character representation; and **[procedural crowds](/pattern/film-procedural-crowds)**, which can distribute captured movement across many figures.

Performance capture’s distinctive promise is more personal: a fantastic character can retain the particular rhythm of a performed moment.
