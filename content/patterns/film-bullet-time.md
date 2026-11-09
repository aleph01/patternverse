---
id: film-bullet-time
type: pattern
title: Bullet Time
summary: Combine views from an array of cameras to move the viewpoint around an
  apparently suspended moment.
status: published
verses:
  - filmmaking
---

*Let the viewpoint travel while the moment barely moves.*

A character leaps into the air. For an instant, their body seems suspended. The camera swings around them, revealing the pose from another angle, before the action suddenly resumes.

Ordinary slow motion can stretch a jump, but it also slows the recorded camera movement. A freeze-frame can stop the jump, but it preserves only one viewpoint. The filmmaker wants something more unusual: **time slowing almost to a standstill while our view of the scene keeps moving.**

Bullet time separates those two things. It lets filmmakers control the progression of the action and the movement of the viewpoint independently.

## The opening puzzle: how can a camera circle someone before they fall?

![Morpheus’s helicopter run is staged beside a floor-level array of Bullet Time cameras.](https://theasc.com/wp-content/uploads/2026/04/Matrix-646.jpg)

*The Matrix (1999) — Behind the scenes.* Morpheus’s run toward the helicopter is staged beside the Bullet Time camera array along the floor. Multiple viewpoints supply a camera path without requiring one camera to travel that path during the action. [Image source](https://theasc.com/article/flashback-the-matrix-cinematography/). Credit: Production image published by American Cinematographer.


Imagine placing a row of cameras along the path that a moving camera would normally follow.

Each camera photographs the subject from a slightly different position. Play those photographs in spatial order and the viewpoint appears to travel along the row.

If all the cameras photograph the same instant, the subject remains frozen throughout that apparent journey.

In this basic arrangement, the athlete does not need to hold the jump while a camera travels around. The cameras already occupy the necessary positions.

Digital Air, a company that produces camera-array effects, describes this simultaneous-exposure version as a *frozen moment* or *time slice*. Its images are sequenced and stabilized to create the moving view. [Digital Air: frozen-moment technique](https://digitalair.com/techniques/)

## Two controls make the effect flexible

<!-- film-illustration:bullet-time-array -->
![Several physical cameras surround one performer. A timing strip distinguishes simultaneous exposures from staggered exposures before their viewpoints are sequenced.](../assets/filmmaking/bullet-time-array.svg "Several cameras record different viewpoints. Simultaneous exposures hold one instant; staggered exposures let the action advance. Illustrative scenario, not a documented film setup.")
<!-- /film-illustration:bullet-time-array -->

```patternverse-widget
{"src": "film-bullet-time.html", "title": "Viewpoint and event time are separate", "height": 560, "fallback": "Compare different viewpoints of one instant with different viewpoints captured as action advances. Illustrative scenario, not a documented film setup."}
```


Camera position determines **where we see the action from**. Exposure timing determines **which moment of the action we see**.

Changing the timing produces different results:

- **Expose simultaneously:** the viewpoint travels around a frozen moment.
- **Expose in a rapid sequence:** the viewpoint travels while the action advances slowly.
- **Vary the intervals:** the action can decelerate toward a freeze or accelerate out of it.

An orbit is only one possible path. Cameras can follow an arc, a line, or a more elaborate arrangement, provided the resulting views can be joined convincingly.

Digital Air’s technical examples show how sequential exposures produce slow motion and how changing their intervals produces a time ramp. [Slow-motion arrays](https://digitalair.com/techniques/slow_motion.html), [time ramps](https://digitalair.com/techniques/time_ramp.html)

### Puzzle one: how does the camera move around Neo as he dodges bullets?

In *The Matrix* (1999), Neo bends backward on a rooftop while bullets pass him. His movement becomes extraordinarily slow, yet the viewpoint continues sweeping around his body.

Visual-effects supervisor John Gaeta and the team used arrays of still cameras to record successive viewpoints. American Cinematographer’s retrospective describes setups employing up to 120 still cameras, carefully aimed along the planned path. [American Cinematographer: the camera arrays behind *The Matrix*](https://theasc.com/article/the-end-of-the-century-as-we-knew-it-the-1990s/)

Those photographs were the starting material for a larger construction. The finished shot needed smooth transitions between viewpoints and a convincing environment surrounding the performer.

Bullet-time supervisor Kim Libreri explains that the physical spacing between camera bodies created gaps in the movement. Digital interpolation—creating in-between images from the recorded views—helped bridge those gaps, while image-based virtual scenery supplied the rooftop background. [Libreri’s production account in fxguide](https://www.fxguide.com/fxfeatured/art_of_optical_flow/)

The effect also serves the story. Neo’s relationship to the simulated world is changing, and the image gives us a corresponding freedom from ordinary physical limits. We can inspect an event from positions that a conventional camera could never reach in that brief interval.

### Puzzle two: can the same trick make an ordinary moment feel uncanny?

In Larry Fessenden’s *Wendigo* (2001), a frozen-moment shot demonstrates another application of the pattern.

Digital Air documents the production’s use of a curved **80-lens Timetrack camera**. All 80 shutters opened and closed simultaneously. The resulting views therefore describe one moment from multiple positions. A zoom into the scene was added digitally afterward. [Digital Air: *Wendigo* example and equipment photographs](https://digitalair.com/techniques/)

The distinction between an 80-lens system and 80 separate camera bodies is useful: the essential requirement is a collection of coordinated viewpoints, and different equipment can provide them.

Here the technique invites a different reading from an action spectacle. Moving through a suspended moment can make the world feel interrupted, dreamlike, or available for unusually close inspection.

A flying kick, a splash, a startled expression, and an everyday scene can all use the same underlying arrangement. The subject determines what the suspended time means.

### Puzzle three: how can the viewpoint escape the camera array altogether?

A physical array has a built-in restriction: its cameras must occupy the positions from which the scene will be photographed.

What happens when the desired viewpoint needs to pass through an impossible fight, weave among many characters, or take a path that would intersect the equipment?

*The Matrix Reloaded* (2003) expanded this freedom through **virtual cinematography**, notably in the “Burly Brawl,” where Neo fights many versions of Agent Smith.

George Borshukov described a process combining photographed and scanned sets, captured performances, digital bodies, and reconstructed faces. These elements could be assembled into scenes viewed through a virtual camera. [Borshukov’s account of *The Matrix Reloaded*](https://transcripts.cnn.com/show/nac/date/2003-05-18/segment/00)

This extends the principle behind bullet time: the viewpoint and the action’s timing become separately controllable. The method grows from sequencing photographed views into constructing a scene that can be rendered from new ones.

It also explains why “bullet time” can describe a recognizable screen effect without identifying one universal production method.

## Why the raw photographs need so much work
A convincing array shot must feel like one camera travelling smoothly.

Small differences between cameras can produce visible disturbances: the subject shifts within the frame, the horizon tilts, brightness changes, or the apparent size fluctuates. Alignment, consistent settings, and digital stabilization help make the viewpoints agree.

There is also a sampling problem. A sparse array supplies only a few positions along the apparent journey. Without additional processing, the image may hop between them.

Interpolation can create intermediate frames, but it has limits. Hair, fingers, overlapping limbs, reflections, and newly revealed background areas can be difficult to reconstruct convincingly. Optical-flow researchers interviewed by fxguide identify boundaries, transparency, reflections, and changing visibility among the underlying challenges. [fxguide: how optical-flow interpolation works](https://www.fxguide.com/fxfeatured/art_of_optical_flow/)

The polished result depends on photography, timing, calibration, and post-production working together.

## When the pattern earns its place
Bullet time is especially effective when the audience benefits from spending longer inside a brief event.

It can reveal the geometry of a stunt, make a character’s extraordinary perception visible, prolong anticipation, or turn a fleeting arrangement into something sculptural.

The changing viewpoint should contribute something. It might reveal the distance between a projectile and a body, expose the shape of a movement, or discover a detail hidden from the initial angle.

Without that purpose, the orbit can interrupt the scene’s momentum. A moment becomes longer without becoming more interesting.

The classic array also requires substantial planning. Its placement defines the available path, and a broad view may reveal equipment elsewhere in the arrangement. Background replacement and rig removal can become significant parts of the shot.

## How it relates to neighbouring tricks
**[Slow motion](/pattern/film-overcranking-and-undercranking)** stretches an event recorded over time. Bullet time adds separate control over the progression through viewpoints.

**Speed ramps** change how quickly the action advances. They often provide the transition into and out of a bullet-time passage.

**Virtual cinematography** allows camera movement through a reconstructed or generated scene. It can extend the available path beyond the positions of physical cameras.

**[Substitution splices](/pattern/film-substitution-splices)** remove an interval so a change appears instantaneous. Bullet time approaches screen time from another direction: a moment can persist while the image continues discovering new views of it.
