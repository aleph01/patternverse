---
id: film-physics-simulation
type: pattern
title: Physics Simulation
summary: Use mathematical models of physical behavior to generate coordinated
  motion of materials and objects.
status: published
verses:
  - filmmaking
---

*Design the event, then let rules generate its detailed consequences.*

A wave breaks around a boat. A tower collapses into thousands of fragments. A character turns sharply, and her curls lag behind before settling around her shoulders.

Drawing every splash, collision, and strand movement individually would be an enormous task. It could also lose the relationships that make the event convincing: fragments should collide, hair should respond to the head, and water should flow around obstacles.

Physics simulation gives filmmakers another way to create that motion. Artists describe materials, forces, starting conditions, and constraints. Software calculates how the system changes over time. The resulting movement can then be adjusted, combined with animation, and turned into the finished image.

The central pattern is to design a system that produces useful behavior, then direct its results toward the needs of the shot.

## The puzzle: who animated every drop and piece of debris?

<!-- film-illustration:simulation-state-steps -->
![A model combines state with forces and constraints, advances a time step and repeats. Artists review the motion before rendering; the falling points do not stand for a universal solver.](../assets/filmmaking/simulation-state-steps.svg "Each small calculation advances the material’s motion. Artists direct and review those consequences before lighting and rendering the final image. Illustrative scenario, not a documented film setup.")
<!-- /film-illustration:simulation-state-steps -->

Often, nobody positioned each one individually.

A simulation calculates many related movements from a smaller set of rules and controls. Gravity pulls material down. Collisions prevent objects passing through each other. Connections hold pieces together until they are allowed to separate. Elasticity lets something stretch or bend and return toward a resting shape.

Those rules generate complexity. The filmmaker’s task is to make that complexity readable: the right wave, the right silhouette, the right collapse at the right moment.

[The Science Behind Pixar](https://sciencebehindpixar.org/pipeline/simulation), developed with Pixar, explains how simulation supplies movement for hair, clothing, water, and fire while balancing believability, artistic needs, and computation time.

### Moana (2016): how can the ocean act and still behave like water?


![Moana’s ocean rises into a character-like water form connected to the surrounding sea.](https://cdn.disneyanimation.com/uploads/publications/moana-performing-water/moana--performing-water-.jpg)

*Moana (2016) — Rendered water-character image.* Disney’s technical-publication image shows the ocean rising into a designed character shape while remaining connected to the surrounding water. The paper explains the combination of performance animation and fluid simulation. [Image source](https://disneyanimation.com/publications/moana-performing-water/). [Technical account](https://media.disneyanimation.com/uploads/production/publication_asset/163/asset/Moana-_Performing_Water.pdf). Credit: Walt Disney Animation Studios.


*How does water perform a deliberate gesture, then break into believable splashes?*

The ocean character had a performance designed through collaboration between animation and effects. The broad shape and timing established the action; guided simulations supplied flow and secondary movement.

Disney’s technical paper describes combining simulations with procedural deformations and controls that blended between the simulation and the base model. For the ocean’s high-five with Moana, contact with her hand triggered additional fluid. As the water withdrew, the designed form broke apart into particles responding to gravity. [The filmmakers’ SIGGRAPH paper](https://media.disneyanimation.com/uploads/production/publication_asset/163/asset/Moana-_Performing_Water.pdf) explains the method.

The general trick is to give different parts of the problem to different tools. Animation can establish intention; simulation can make the surrounding material respond convincingly.

### 2012 (2009): how do you choreograph a collapsing city?


![A plane flies between collapsing sections of the Los Angeles landscape.](https://www.fxguide.com/wp-content/uploads/2010/10/09Nov/2012/LAP190_1193.jpg)

*2012 (2009) — Finished effects image.* A plane escapes through the collapsing Los Angeles landscape. Digital Domain combined choreographed large movements with simulated breakup and layers of debris and atmosphere. [Image source](https://www.fxguide.com/fxfeatured/2012_disaster_porn/). Credit: Digital Domain production imagery, published by fxguide.


*How can thousands of pieces collide while the important building falls exactly where the scene needs it?*

For the Los Angeles escape sequence, Digital Domain developed a destruction system called Drop, based on the Bullet physics engine. Buildings and terrain were divided into pieces with connections controlling how they held together and broke apart.

The team worked from large motion toward smaller detail. Some skyscrapers initially rocked through hand animation. The simulation then took over with that movement already established, allowing the structure to break up as constraints were relaxed. Further layers added smaller destruction and atmospheric detail. [Digital Domain’s supervisors describe the process in fxguide’s production interview](https://www.fxguide.com/fxfeatured/2012_disaster_porn/).

This is a particularly useful pattern: choreograph the broad event, then calculate its consequences. The position and timing remain understandable while the fragments acquire varied, interacting movement.

### Brave (2012): why doesn’t Merida’s hair move like a solid helmet?


![Production views expose guide curves and successive layers of Merida’s curly hair.](https://www.fxguide.com/wp-content/uploads/2012/06/fourhairprogression.jpg)

*Brave (2012) — Production breakdown.* Guide curves and denser layers of Merida’s curls reveal the structures behind the hair. These are production views rather than finished film frames; movement comes from the simulation applied to the groom. [Image source](https://www.fxguide.com/fxfeatured/brave-new-hair/). Credit: Disney/Pixar, via fxguide.


*How can hundreds of curls preserve their shape while bouncing and flowing?*

Pixar modeled curly hair using spring-like structures. The difficulty was that a curl needed enough stiffness to retain its shape while the whole lock still needed to move softly.

In Pixar’s educational explanation, software engineer Hayley Iben describes adding supporting springs through the cores of the curls to help prevent them unwinding. The resulting structures reacted to forces as Merida moved. [Pixar in a Box’s hair-simulation lesson](https://www.khanacademy.org/computing/pixar/simulation/hair-simulation-101/v/hair-simulation-intro) explains that approach.

The production also gave animators a simplified, faster version of the hair and clothing simulation so they could anticipate its behavior while creating the performance. [Pixar’s crew discuss that collaboration in fxguide](https://www.fxguide.com/fxfeatured/brave-new-hair/).

The reusable insight is that detailed motion can respond to a primary performance. The head turn establishes the event; the hair adds delay, bounce, and settling around it.

### Elemental (2023): how can a flame have a readable face?


![Ember and Wade’s readable faces sit within their stylized fire and water bodies.](https://thewaltdisneycompany.com/app/uploads/2023/06/1920_ELEMENTAL-ONLINE-USE-m551_11_pub.pub16.158-1024x554.jpg)

*Elemental (2023) — Finished film image.* Ember and Wade retain readable expressions within their fire and water forms. Simulation and stylization work with the character animation; the still shows the finished appearance rather than the underlying calculation. [Image source](https://thewaltdisneycompany.com/news/how-disney-and-pixars-elemental-utilizes-new-technology-to-bring-its-complex-characters-to-life/). Credit: Disney/Pixar.


*How do you keep fire moving without letting its turbulence swallow the character’s expression?*

Pixar added a simulation phase after character animation to realize the fire and water behavior of Ember and Wade. The effects had to support their performances while preserving the visual qualities of their materials.

For Ember, the team reshaped the simulated flames toward the film’s illustrated design. Visual effects supervisor Sanjay Bakshi explains that excessively realistic flames could distract from the character’s expression. The production account names this technique volumetric neural style transfer. [Disney’s production account](https://thewaltdisneycompany.com/news/how-disney-and-pixars-elemental-utilizes-new-technology-to-bring-its-complex-characters-to-life/) describes the combination of animation, simulation, and stylization.

This example shows why a technically plausible result may still need substantial direction. A flame pattern that obscures the eyes can weaken a scene, even if its movement looks convincing.

The effect has to communicate a character as well as a material.

## Several kinds of simulation share the same principle

Different materials need different representations.

Rigid-body systems calculate the movement and collisions of solid pieces. Cloth and hair systems need bending, stretching, and resistance to deformation. Fluid systems calculate flowing behavior. Smoke and fire effects require changing volumes whose motion and appearance evolve through the shot.

A single event may involve several systems. A collapsing wall produces fragments, dust, and smaller debris. A soaked costume involves cloth motion and a changing surface appearance.

Each system represents selected properties of the real phenomenon. Choosing what to simplify is part of making the problem manageable and the result useful.

## Why simulation and rendering are separate jobs
A simulation can describe where material is and how it moves without producing a finished photograph.

Rendering supplies the visible result: light scattering through smoke, reflections on water, shadows between curls, or glowing flame. Compositing then combines rendered elements with the rest of the shot.

This distinction explains why realistic motion can still look artificial. The timing may be convincing while the lighting, scale, texture, or integration is wrong.

Likewise, a beautifully shaded still tells us little about whether the motion works. A simulation has to be judged as an event unfolding over time.

## Where the illusion can fail
One failure is scale. A large collapse can feel like a small model if the motion, debris, and dust do not suggest its intended size. A splash can feel too syrupy or too light for the scene.

Another is interference with the performance. Hair can cover a face at the wrong moment; smoke can conceal the action; debris can compete with the subject for attention.

Increasing detail will not necessarily solve those problems. The broad movement, timing, and composition need to work first. Artists may change forces, constraints, starting shapes, or the point at which simulation takes over.

They may also retain only part of a result, combine versions, or use animation to guide the event more closely.

## When this pattern helps
Physics simulation is useful when a shot needs many interacting movements or a material’s characteristic response: splashing, fluttering, bending, bouncing, drifting, or breaking.

It works alongside **keyframe animation**, which establishes authored performance; **[procedural crowds](/pattern/film-procedural-crowds)**, which generate behavior across many agents; **[digital doubles](/pattern/film-digital-doubles-and-face-replacement)**, whose clothing and hair may need simulated motion; and **practical effects**, which provide photographed elements and reference.

Its most important principle is to direct the system at the level that matters. Choose the action and its timing, then use simulation to supply the rich consequences that make it feel alive.
