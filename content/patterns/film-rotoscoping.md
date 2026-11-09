---
id: film-rotoscoping
type: pattern
title: Rotoscoping
summary: Trace and refine changing image boundaries over time to isolate or
  transform photographed elements.
status: published
verses:
  - filmmaking
---

*Follow a filmed shape through time so it can become a separate part of the image.*

An actor walks past a doorway. You want a new background behind them, but their coat, hands, and hair must remain in front. Or a performer swings an ordinary prop blade, and you want a glowing weapon to follow it precisely. Or you want a drawn character to inherit the timing of a filmed performance.

All three problems begin with the same useful move: use the photographed action to define shapes that change from frame to frame.

That is the recurring idea behind rotoscoping. It can produce a moving mask that controls an effect, or drawings that become the finished animation. In either case, filmed movement supplies a guide; artists decide what to follow and what to make from it.

## The puzzle: how do you cut something out when it never stops changing?

<!-- film-illustration:roto-shape-and-matte -->
![A moving boundary follows an invented performer and selects the foreground layer. Green marks the selected region; it is a teaching color rather than the literal values of a grayscale alpha image.](../assets/filmmaking/roto-shape-and-matte.svg "The changing boundary selects which layer appears. Green indicates the selected region here; an actual matte commonly uses grayscale values. Illustrative scenario, not a documented film setup.")
<!-- /film-illustration:roto-shape-and-matte -->

Cutting a person out of a photograph is one problem. Keeping them cut out while they turn, raise an arm, blur during a fast gesture, and disappear behind a chair is another.

A single outline cannot handle all those changes. The boundary must evolve with the action, and the result must remain convincing in motion.

The most important principle is continuity: follow the same object coherently over time. A beautiful outline in one frame is insufficient if it jumps or changes its meaning in the next.

### Star Wars (1977): how does a prop blade become light?


![Darth Vader and Obi-Wan Kenobi duel with luminous blades.](https://www.ilm.com/wp-content/uploads/2025/07/star-wars-lightsaber-ilm-kenobi-vader-scaled.jpg)

*Star Wars: A New Hope (1977) — Finished film image.* Darth Vader and Obi-Wan Kenobi duel with luminous blades. The finished image shows the effect; ILM’s accompanying account explains how mattes followed the photographed prop blades. [Image source](https://www.ilm.com/ilm-evolutions-50-animation-part-one/). Credit: ILM & Lucasfilm.


*How does a glowing blade remain attached to a rapidly moving sword?*

A **matte** is an image that selects where an effect or another image should appear. Following the blade supplies such a selection through time.

The photographed prop gives the effect a position, angle, length, and changing silhouette. Following it through the frames supplies the guide for the luminous replacement.

ILM’s production history describes the original lightsaber process as generating mattes from the live-action prop blades, then rephotographing and coloring them frame by frame. The first film’s lightsaber work was handled by Van Der Veer Photo Effects. Later films continued the laborious tracing process; Visual Concept Engineering handled the lightsaber combat for Return of the Jedi. [ILM’s account](https://www.ilm.com/ilm-evolutions-50-animation-part-one/) explains that history.

The general trick is to let a physical object establish the choreography while artwork transforms its appearance. Rotoscoping supplies the changing shape; additional animation and compositing supply the light.

## What a matte actually does
In visual effects, the product of roto is often a matte: an image that tells the compositor where another image or adjustment should apply.

A simple matte uses white for the selected region and black for the excluded region, with intermediate values allowing partial coverage. It can keep an actor in front of a replacement background, restrict a repair to one area, or protect an object from an adjustment.

This helps separate three jobs that often appear together. Rotoscoping defines a region. Painting or rendering creates replacement material. Compositing combines the elements.

Roto therefore does not, by itself, remove a person or reveal the background behind them. It establishes where the rest of the work can happen.

### Forrest Gump (1994): why doesn’t the repair cover the wheelchair?


![Hospital frames compare Lieutenant Dan’s missing legs with Sinise’s blue-covered lower legs.](https://i0.wp.com/beforesandafters.com/wp-content/uploads/2019/07/dan.jpg?w=1200&ssl=1)

*Forrest Gump (1994) — Effects comparison.* The hospital comparison includes the completed leg-removal illusion and Sinise’s blue-covered legs at right. Rotoscoping also preserved foreground objects crossing the reconstructed areas. [Image source](https://beforesandafters.com/2019/07/04/i-want-to-see-it-ilmers-on-the-time-gary-sinise-first-saw-his-missing-legs-in-forrest-gump/). [Technical account](https://beforesandafters.com/2024/07/08/erasing-lieutenant-dans-legs-from-the-point-of-view-of-a-digital-artist-on-forrest-gump/). Credit: Production and effects frames published by befores & afters.


*If artists paint new background over Lieutenant Dan’s legs, how do they preserve everything crossing in front?*

ILM artist Kathleen Beeler describes painting replacement backgrounds for the areas concealed by Gary Sinise’s legs and matching those repairs to the camera movement. When foreground objects such as the wheelchair overlapped the patch, artists rotoscoped them and composited them over the repair. [Beeler’s firsthand account](https://beforesandafters.com/2024/07/08/erasing-lieutenant-dans-legs-from-the-point-of-view-of-a-digital-artist-on-forrest-gump/) explains this division of labor.

The useful idea is that a photograph can be reorganized into layers after filming. A wheelchair that originally belonged to one recorded image can be isolated and placed above a reconstructed background.

The roto is largely invisible in the result. Its success is that the viewer continues to understand which objects are in front of which.

### Snow White and the Seven Dwarfs (1937): where does the dancing come from?


![Marge Champion’s filmed performance carries pencil outlines over the figure and costume.](https://blogs.loc.gov/music/files/2018/06/rotoscope001.jpg)

*Snow White and the Seven Dwarfs (1937) — Archival rotoscope print, circa 1935.* Marge Champion’s filmed performance carries pencil outlines over the figure and costume. This production artifact documents tracing from live action; it is not a finished animation frame. [Image source](https://blogs.loc.gov/music/2018/06/marge-champion-fairest-of-them-all-the-towering-talent-behind-disneys-snow-white-and-the-seven-dwarfs/). Credit: Marge Champion Collection, Music Division, Library of Congress.


*How can a drawn princess inherit the weight and rhythm of a dancer?*

Marge Champion, then known as Marjorie Belcher, performed live-action material for Disney’s animators. The Library of Congress preserves a particularly revealing artifact: a photographic print with drawn outlines over the filmed figure. Its collection account identifies this as a rotoscope print used for tracing, dating from around 1935. [The Library’s archival explanation](https://blogs.loc.gov/music/2018/06/marge-champion-fairest-of-them-all-the-towering-talent-behind-disneys-snow-white-and-the-seven-dwarfs/) connects it to Champion’s work on the film.

This shows a different destination for the same act of following movement. The guide helps create the character drawing rather than a mask for a live-action composite.

It does not mean every frame or character in Snow White was mechanically traced. A reference performance, a tracing, and a finished cartoon are different stages. The animator still has to make the movement belong to the designed character.

## A Scanner Darkly (2006): why do drawings move like recognizable actors?

![Keanu Reeves’ face and surroundings are rendered as drawn contours and broad color patches.](https://blogs.iu.edu/establishingshot/files/2022/03/Scanner-07-e1647973606356-1024x581.png)

*A Scanner Darkly (2006) — Finished animation frame.* Keanu Reeves’ photographed performance has been translated into drawn contours and broad patches of color. This is the film’s finished rotoscoped animation, rather than the underlying live-action footage. [Image source](https://blogs.iu.edu/establishingshot/2022/03/28/rotoscoping-identity-in-a-scanner-darkly/). [Technical account](https://www.awn.com/animationworld/scanner-darkly-animated-illusion). Credit: Film frame reproduced by Indiana University Cinema’s Establishing Shot.


*Why can a scene look painted while retaining the timing and expressions of Keanu Reeves?*

Richard Linklater described making the live-action film first—casting, rehearsing, shooting, and editing—then undertaking the animation. [His Fresh Air interview](https://freshairarchive.org/segments/richard-linklaters-scanner-darkly) explains that sequence.

The production used interpolated rotoscoping associated with Bob Sabiston’s software: artists drew selected frames, software estimated the shapes between them, and artists checked and corrected those estimates. Artists drew digitally over the photographed material, constructing outlines and regions of color. Linklater and producer Tommy Pallotta also describe the animation as part of the film’s unsettling sense of reality. [Their production interview with Animation World Network](https://www.awn.com/animationworld/scanner-darkly-animated-illusion) covers the approach.

The photographed performance supplies continuity, while drawing transforms the surface. An artist can simplify a cheek into color patches, alter a contour, or redesign a background without discarding the underlying gesture.

This is an artistic interpretation of a performance. Its choices determine what the viewer notices.

## Why the edges are difficult
A photographed boundary is not always a crisp line. Fast movement smears across the image. Hair leaves gaps through which the background remains visible. Defocus softens some contours more than others.

A hard cutout can make those subjects look like cardboard. A uniformly softened cutout can create a halo. The matte has to account for the actual edge.

Motion blur is especially revealing: a moving hand may occupy a streak rather than one sharp silhouette. [Foundry’s documentation](https://learn.foundry.com/nuke/15.1/content/comp_environment/rotopaint/adding_motionblur.html) describes applying motion blur to animated roto shapes, including controls for their exposure interval.

Occlusion adds another problem. When one object passes behind another, the visible boundary changes. The artist must preserve the relationship between the objects rather than blindly maintain a complete outline.

## Why artists don’t simply trace every frame independently
Modern roto commonly uses editable curves and keyframes. Artists establish shapes at useful moments, let software calculate intermediate positions, then inspect and correct the result. [Foundry’s Roto documentation](https://learn.foundry.com/nuke/content/reference_guide/draw_nodes/roto.html) describes those tools.

Separate shapes can follow parts that move differently: a torso, an upper arm, a forearm. This makes changes easier to control than treating a whole person as one complicated contour.

Independent tracing can introduce small inconsistencies that become distracting in playback. In a matte, that may make an edge chatter. In animation, changing lines and color regions can also be a deliberate part of the style.

The intended result determines which variations to retain.

## When this pattern helps
Rotoscoping is useful when an image contains the movement you need, but the relevant subject or region was not recorded separately.

It can rescue difficult separations, preserve foreground objects during cleanup, guide a localized effect, or turn photographed performance into animation. It can also work alongside a green-screen key, refining areas the color separation handles poorly.

Its closest neighbors are **digital cleanup**, which reconstructs what should replace an unwanted element; **compositing**, which combines the layers; and **[performance capture](/pattern/film-performance-capture)**, which records performance for transfer through a different kind of representation.

Across these uses, the durable idea is the same: follow the filmed action carefully enough that it can be transformed without losing its continuity.
