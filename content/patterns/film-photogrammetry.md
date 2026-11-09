---
id: film-photogrammetry
type: pattern
title: Photogrammetry
summary: Reconstruct the shape and appearance of a subject from overlapping photographs.
status: published
verses:
  - filmmaking
---

*Borrow the complexity of the real world, then make it available to a virtual camera.*

A cliff contains more irregular detail than anyone would sensibly sculpt by hand: cracks within cracks, broken ledges, stains, and layers of erosion. A convincing digital version needs those relationships, especially when the camera gets close or moves around it.

Filmmakers often begin by photographing something real from many overlapping viewpoints. Software compares the images and reconstructs a three-dimensional surface. The photographs can also supply its visible color and detail.

**The puzzle:** How can pictures of an ordinary place become a location that never existed?

The trick is to turn photographs into editable spatial material. **Photogrammetry** measures from images; in visual effects, it commonly produces digital objects, terrain, and parts of environments that artists can rearrange and render from new viewpoints.


![A shaded digital model shows the assembled rock towers of the Citadel.](https://www.fxguide.com/wp-content/uploads/2015/05/ct2_200_before.jpg)

*Mad Max: Fury Road (2015) — Digital geometry breakdown.* The Citadel shown as shaded CG geometry. This is an assembled production model, rather than a photograph of the source cliffs. [Image source](https://www.fxguide.com/fxfeatured/a-graphic-tale-the-visual-effects-of-mad-max-fury-road/). Credit: © 2015 Warner Bros. Pictures; Iloura breakdown published by fxguide.


![The corresponding Citadel shot adds stone surfaces, lighting, sky and surrounding terrain.](https://www.fxguide.com/wp-content/uploads/2015/05/ct2_200_after.jpg)

*Mad Max: Fury Road (2015) — Finished visual-effects shot.* The corresponding finished Citadel image adds the surface detail, lighting, sky, and surrounding landscape that make the digital fortress read as a place. [Image source](https://www.fxguide.com/fxfeatured/a-graphic-tale-the-visual-effects-of-mad-max-fury-road/). Credit: © 2015 Warner Bros. Pictures; Iloura image published by fxguide.


## How flat pictures reveal depth

<!-- film-illustration:photogrammetry-rays -->
![Two observations constrain a shared surface detail along viewing rays. A complete reconstruction uses many overlapping views and also estimates calibrated camera relationships.](../assets/filmmaking/photogrammetry-rays.svg "Overlapping views constrain where a shared feature sits in space. A complete reconstruction needs many such observations and camera relationships. Illustrative scenario, not a documented film setup.")
<!-- /film-illustration:photogrammetry-rays -->

Photograph a rock from the left, then from the right. The same notch appears in different positions relative to the features behind it. Those differences constrain where the notch could be in three-dimensional space.

Modern reconstruction software identifies corresponding details across photographs and estimates the cameras’ positions and orientations. It then uses the overlapping views to reconstruct the subject. Agisoft’s documentation describes this alignment stage as producing a cloud of shared image features, or “tie points.” [How photographs are aligned](https://agisoft.freshdesk.com/support/solutions/articles/31000157953-mission-planning-for-complex-structures).

A typical workflow then builds a **mesh**—a surface made from small polygons—and maps photographic imagery onto it as a **texture**. Shape and appearance are separate products: a detailed-looking texture can conceal fairly simple geometry, while a dense mesh can look plain without its photographed surface. Cleanup remains part of the process. [Smithsonian’s photogrammetry pipeline](https://smithsonian.github.io/dpo-cook/recipes/photogrammetry/).

The important change is that the photograph is no longer restricted to its original flat rectangle. Some of the scene’s structure has become available to another camera.

### Mad Max: Fury Road — a fortress assembled from real cliffs

*Where did they find those enormous rock towers, and how did they put a civilization on top?*

For *Mad Max: Fury Road* (2015), supervisor Andrew Jackson photographed cliffs in Australia’s Blue Mountains from a helicopter. Those photographs supplied material for the Citadel’s digital rock formations. [Jackson’s production account](https://www.fxguide.com/fxfeatured/a-graphic-tale-the-visual-effects-of-mad-max-fury-road/).

Iloura then reworked the reconstructed geometry and textures to achieve George Miller’s design. The cliffs were assembled and altered, with color and surface treatment adjusted. The result combined the complicated character of actual stone with a fictional arrangement and controlled composition. [The effects team’s roundtable](https://www.fxguide.com/fxfeatured/mad-max-fury-road-special-and-visual-effects-roundtable/).

The geometry and final image above show an environment assembled and altered for the film, rather than an untouched scan.

## The Jungle Book — collecting ingredients for a forest
*How can a jungle feel full of specific, living detail when its young star was largely filmed on a stage?*

For *The Jungle Book* (2016), MPC’s team photographed locations across India, collecting extensive coverage of trees, rocks, plants, and ground debris. Supervisor Adam Valdez describes rock walls used as textures or reconstructed through photogrammetry.

Those captures became ingredients in designed environments. Artists combined them with specially modeled features and systems for distributing vegetation and smaller objects. [Valdez and Rob Legato’s production account](https://www.fxguide.com/fxfeatured/out-of-the-pages-and-into-the-jungle-book/).


![Monkeys carry Mowgli through a dense, layered jungle.](https://www.fxguide.com/wp-content/uploads/2016/04/tru_shots_053mk_0320.jpg)

*The Jungle Book (2016) — Finished film frame.* Mowgli is carried through a densely layered digital jungle by monkeys. MPC’s environment workflow incorporated photographic surveys and photogrammetry; this frame does not identify which individual assets were reconstructed. [Image source](https://www.fxguide.com/fxfeatured/out-of-the-pages-and-into-the-jungle-book/). Credit: Film image published by fxguide.


This is a useful second application of the pattern: **capture a library, then compose a place**. A production can keep the visual specificity of real locations while changing the arrangement to suit the action, camera, and story. The final frame does not identify which individual objects were scanned.

## Capturing a place versus capturing a person

A stationary rock can be photographed by one camera moving around it. A performer changes position between exposures. If the views disagree about the shape being photographed, reconstruction becomes harder.

For moving subjects, synchronized camera arrays can capture many viewpoints of the same instant. Repeating that operation through time creates a sequence of reconstructed surfaces: a moving volume rather than a single frozen object. [Supervisor Guillaume Rocheron on volumetric performance capture](https://www.inverse.com/article/29642-ghost-in-the-shell-visual-effects-3d-printing-motion-capture).

## Ghost in the Shell — photographing a performance in three dimensions

*How did the giant advertising figures become moving people that seem to occupy the city’s space?*

For *Ghost in the Shell* (2017), Digital Air built a dome containing 80 synchronized cameras to capture performers for the film’s “solograms.” At 24 frames per second, each instant supplied a set of views from which a new model and texture could be reconstructed. [The capture system and reconstruction account](https://www.realityscan.com/spotlights/realityscan-provides-solograms-for-ghost-in-the-shell).


![A flight-attendant performer inside Digital Air’s multicamera capture dome, photographed for the film’s volumetric advertising figures.](https://cms-assets.unrealengine.com/cm6trzq52049r07ohhff9djhz/resize=width:1200/quality=value:90/auto_image/cmd2bybkm7w5r07ohr3ja2ybq)

*Ghost in the Shell (2017) — Production capture photograph.* A flight-attendant performer inside Digital Air’s multicamera capture dome, photographed for the film’s volumetric advertising figures. [Image source](https://www.realityscan.com/spotlights/realityscan-provides-solograms-for-ghost-in-the-shell). Credit: Digital Air production image published by RealityScan.


![The reconstructed flight-attendant performer is displayed from several viewpoints in the software.](https://cms-assets.unrealengine.com/cm6trzq52049r07ohhff9djhz/resize=width:1200/quality=value:90/auto_image/cmd2c244w7w3b08mxyaezeuy8)

*Ghost in the Shell (2017) — Photogrammetric reconstruction screenshot.* The reconstructed performer viewed from several angles in the software. This is an asset-development image, rather than a finished city shot. [Image source](https://www.realityscan.com/spotlights/realityscan-provides-solograms-for-ghost-in-the-shell). Credit: Reconstruction image published by RealityScan.


The distinction from skeletal motion capture is useful: this method records the performer’s changing visible form and photographed appearance, rather than only movement instructions for another character. It gives artists a photographed performance they can place within a three-dimensional composition. [Rocheron’s explanation](https://www.inverse.com/article/29642-ghost-in-the-shell-visual-effects-3d-printing-motion-capture).

## Why the capture needs planning
More photographs help only when they supply useful coverage. The same surface needs to appear in overlapping views, and the views must actually reveal its shape. Photographing the front of a statue repeatedly supplies little evidence about its back.

Plain surfaces offer few recognizable features. Glossy surfaces are troublesome because reflections shift with viewpoint. A reconstructed model also needs a scale reference if its dimensions must match measured reality. Agisoft’s capture guidance emphasizes overlap, surface texture, and known distances. [Image-capture guidance](https://www.agisoft.com/pdf/tips_and_tricks/Image%20Capture%20Tips%20-%20Equipment%20and%20Shooting%20Scenarios.pdf).

A photograph records illumination along with the surface. For the Blue Mountains capture, Jackson waited for overcast conditions so the material could accept additional directional lighting more readily. The same production found that shiny vehicle surfaces produced imperfect scan geometry; modelers rebuilt the cars into assets suitable for animation and destruction. [The practical limits encountered on Fury Road](https://www.fxguide.com/fxfeatured/a-graphic-tale-the-visual-effects-of-mad-max-fury-road/).

A scan therefore needs to be judged against its intended shot. Does the silhouette hold up? Will the camera reveal a missing surface? Does an apparently sharp detail exist in the geometry, or only in the texture?

## What photogrammetry adds to the other tricks
**[Matchmoving](/pattern/film-matchmoving-and-camera-tracking)** reconstructs the filming camera so additions agree with recorded footage. Photogrammetry concentrates on reconstructing the photographed subject; the two processes share the problem of recovering spatial relationships from images.

**LiDAR and laser scanning** provide another route to measured geometry, using laser light. They can complement image-based capture, but a production’s reference to “scanning” does not establish which method it used. [Historic England’s comparison of survey techniques](https://historicengland.org.uk/research/methods/terrestrial-remote-sensing/specialist-survey-techniques/).

**[Digital doubles](/pattern/film-digital-doubles-and-face-replacement)** can use captured human form as a starting point. **[Physics simulation](/pattern/film-physics-simulation)** can animate or destroy assets prepared from scans, once artists have made them suitable for that purpose.

The reusable principle is to **capture real complexity, then reshape it for the shot**. The photographs provide evidence; the finished illusion still depends on what the filmmakers build from it.
