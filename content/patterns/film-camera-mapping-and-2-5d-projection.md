---
id: film-camera-mapping-and-2-5d-projection
type: pattern
title: Camera Mapping / 2.5D Projection
summary: Project imagery onto simple geometry to create a limited moving view
  from a mostly flat source.
status: published
verses:
  - filmmaking
---

*Give a flat image just enough structure to survive a moving viewpoint.*

A beautiful painting can suggest an enormous world. Move the camera sideways, however, and a flat backdrop can reveal itself: the foreground and distant mountains move together, without the changing relationships we expect from depth.

Building the entire landscape as a detailed digital environment would solve that problem, but sometimes the shot only needs a small change of viewpoint. Much of the necessary beauty already exists in the painting or photograph.

**The puzzle:** How can the camera travel into a picture?

Give the image something three-dimensional to sit on. **Camera mapping**, or **camera projection**, projects an image onto geometry inside a digital scene. A second viewpoint can then photograph that scene. Autodesk describes it as a way to give matte paintings depth and perspective for effects such as virtual set extensions. [Autodesk’s explanation](https://download.autodesk.com/us/maya/2013help-composite/files/GUID-AA9C3E04-7C5A-4781-A314-7135DD078494.htm).


![Yusei Uesugi works on the Neverland matte painting.](https://i0.wp.com/beforesandafters.com/wp-content/uploads/2019/05/Hook_mattepainting.jpg?resize=850%2C574&ssl=1)

*Hook (1991) — Production photograph.* Yusei Uesugi works on the Neverland matte painting. The landscape begins as physical artwork. [Image source](https://beforesandafters.com/2019/05/20/how-ilms-work-on-hook-led-to-phantom-menaces-podrace/). Credit: ILM photograph, published by befores & afters.


![Peter flies toward Neverland amid clouds.](https://i0.wp.com/beforesandafters.com/wp-content/uploads/2019/05/hook.jpg?resize=980%2C551&ssl=1)

*Hook (1991) — Finished film frame.* Peter flies toward Neverland amid clouds. The painting’s island appears within the finished composite. [Image source](https://beforesandafters.com/2019/05/20/how-ilms-work-on-hook-led-to-phantom-menaces-podrace/). Credit: Film frame published by befores & afters.


## A slide projector inside the computer

<!-- film-illustration:camera-mapping -->
![An image projects onto simplified geometry. A limited camera change can reveal depth, but missing surfaces and stretched imagery restrict how far the new view can travel.](../assets/filmmaking/camera-mapping.svg "The projection camera places the picture on geometry; the viewing camera sees the resulting depth. A large move can expose missing surfaces. Illustrative scenario, not a documented film setup.")
<!-- /film-illustration:camera-mapping -->

Imagine a slide projector aimed at a plain model of a street. The model has boxes for buildings, a ground surface, and perhaps a few raised shapes. Project a photograph onto it from the right position, and those blank surfaces acquire windows, brickwork, pavement, and shadows.

From the projector’s viewpoint, the pieces line up to reconstruct the original image. Viewed from a nearby position, the model’s depth changes how those pieces overlap and shift.

The digital version follows the same principle. A **projection camera** determines where the image lands; the **render camera** determines what the audience sees. They can occupy the same position initially, but have different jobs. Foundry’s documentation explicitly describes projection cameras as sending still images or image sequences onto scene geometry, while the scene is viewed through a rendering camera. [Projection cameras explained](https://learn.foundry.com/nuke/9.0/content/comp_environment/3d_compositing/projection_cameras.html).

The image supplies much of the appearance. The geometry supplies the spatial behavior.

### Hook: flying toward a painted Neverland

*Was Neverland an island, a miniature, or a painting? How could the viewpoint move toward it?*

For *Hook* (1991), ILM projected Neverland matte paintings onto 3D geometry. John Knoll recalls how this let the camera move through an image that had begun as flat artwork. The painting supplied the designed landscape; geometry gave it spatial behavior. [Knoll’s account](https://beforesandafters.com/2019/05/20/how-ilms-work-on-hook-led-to-phantom-menaces-podrace/).

## Why call it “2.5D”?
The name describes a useful middle ground. There is real three-dimensional organization, but the scene can rely heavily on pictures made for particular viewing directions.

A distant mountain might be an image on a card. A nearby building might need a box with correctly positioned corners. Uneven ground might need a shaped surface. The representation can become more elaborate wherever the camera demands it.

Layering images at different depths and projecting imagery onto shaped geometry are related approaches within this broader family. They are not identical operations. A layered scene may need little more than separated cutouts; camera projection assigns image detail to surfaces from a specified viewpoint.

This preserves a familiar way of working for matte artists: they can design and refine an image in two dimensions while using geometry to support the final shot. [Maxon on camera mapping and matte painting](https://help.maxon.net/c4d/en-us/Content/html/32201.html).

## The Phantom Menace: taking miniature photographs for a high-speed ride
*How could the podrace camera rush past huge rock formations without filming an enormous model landscape?*

For *The Phantom Menace* (1999), Paul Huston proposed photographing small rock models in sunlight and projecting those photographs onto lightweight digital versions. Knoll describes a successful test through Mushroom Mesa. The approach combined photographed miniature surfaces with a controllable virtual flight path. [The production account](https://beforesandafters.com/2019/05/20/how-ilms-work-on-hook-led-to-phantom-menaces-podrace/).


![Podracers pass the tall rock formations of Mushroom Mesa.](https://i0.wp.com/beforesandafters.com/wp-content/uploads/2019/05/Podrace3.jpg?resize=1170%2C780&ssl=1)

*Star Wars: Episode I—The Phantom Menace (1999) — Finished film frame.* Podracers pass Mushroom Mesa’s rock formations, whose photographed miniature surfaces were carried onto digital geometry. [Image source](https://beforesandafters.com/2019/05/20/how-ilms-work-on-hook-led-to-phantom-menaces-podrace/). Credit: Alamy, as credited by befores & afters.


### Panic Room: making city photographs support new camera moves

*Were those enormous opening credits filmed hanging among Manhattan’s buildings? And was every camera move photographed on location?*

For *Panic Room* (2002), ComputerCafe and Picture Mill integrated digital titles into city views. Executive producer Jeff Barnes explains that some shots mapped high-resolution photography onto modeled structure to permit subtle perspective changes. Other backgrounds were divided into layers.

Creative director William Lebeda describes a specific change for production designer Arthur Max’s credit: the team wanted a downward move toward the building, so CafeFX supplied a virtual camera. The sequence mixed several methods rather than applying one treatment to every shot. [The creators’ interview](https://www.artofthetitle.com/title/panic-room/).


![Arthur Max’s credit hangs above a Manhattan street.](https://www.artofthetitle.com/assets/resized/sm/upload/kl/sl/s0/tg/PanicRoom-still-ArthurMax-0-870-0-0.jpg?k=33fd9d5e7c)

*Panic Room (2002) — Finished opening-title frame.* Arthur Max’s credit hangs above a Manhattan street. The creators identify this shot’s downward movement as a virtual-camera addition; their interview describes the sequence’s photographic mapping and layered backgrounds. [Image source](https://www.artofthetitle.com/title/panic-room/). Credit: ComputerCafe / Picture Mill title sequence, published by Art of the Title.


The example shows why even restrained movement matters. A slight change in viewpoint can turn a city image into a space through which the titles seem to extend.

## Where the illusion runs out
Projection does not create knowledge of hidden surfaces. If a photograph shows the front of a building, it cannot supply an accurate side wall when the new camera travels around the corner.

Imagine the slide-projector model again. A patch of wall viewed at a steep angle can receive a stretched smear of the picture. A surface hidden behind another object may receive inappropriate detail—or have no useful source image at all. Changing the viewpoint exposes these weaknesses.

Artists can add geometry, paint missing areas, or combine projections made from other positions. The work becomes less economical as more viewpoints and surface detail are required. Matte artist Nathalie Mathé identifies the number and variety of viewing angles as factors in choosing between matte painting and full 3D texturing. [Mathé on choosing the technique](https://www.cgchannel.com/2014/03/qa-nasa-researcher-turned-matte-painter-nathalie-mathe/).

The photograph also carries its original lighting. A painted shadow does not automatically move because a digital light moves. Reflections, water, smoke, and other changing elements may need separate treatment.

The useful question is therefore precise: **what must this image reveal during this camera move?** A distant background and a close orbit around an object demand very different amounts of reconstruction.

## How it connects to the other tricks
**[Photogrammetry](/pattern/film-photogrammetry)** reconstructs shape from photographs; camera mapping applies imagery to shape. They can cooperate, but an artist can also build projection geometry by hand.

**[Matchmoving](/pattern/film-matchmoving-and-camera-tracking)** supplies a camera that agrees with filmed footage. That camera information can help align a projection with the original shot. [Foundry’s projection workflow](https://learn.foundry.com/nuke/9.0/content/comp_environment/3d_compositing/projection_cameras.html).

**[Miniatures](/pattern/film-miniatures)** can supply photographed surfaces, as the podrace example demonstrates. **Digital cleanup** can place a repaired image onto scene geometry so it follows the changing viewpoint.

The central pattern is to **build enough depth for the shot, and let the image provide the detail**.
