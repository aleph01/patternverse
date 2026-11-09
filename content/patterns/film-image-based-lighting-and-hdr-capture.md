---
id: film-image-based-lighting-and-hdr-capture
type: pattern
title: Image-Based Lighting / HDR Capture
summary: Capture the surrounding illumination as image data to light and reflect
  a scene in digital objects.
status: published
verses:
  - filmmaking
---

*Record the light of a place, then let a digital object respond to it.*

A digital creature can have convincing anatomy and excellent animation yet still seem to belong to a different photograph. Its shadows lean the wrong way. Its skin misses the warm light bouncing from a wall. Its metal armor reflects a world that does not resemble the one around it.

Rebuilding every lamp, window, cloud, and reflecting surface by hand would be a formidable task. Filmmakers can instead photograph the illumination arriving from the surrounding environment and use that information to light their digital additions.

**The puzzle:** How do you make a computer-generated object look as though it was photographed under the same light as everything else?

Capture the environment’s light from the object’s intended position, then use it during rendering—the calculation of the finished image. That is the central idea of **image-based lighting**, or **IBL**. **High dynamic range capture**, usually shortened to HDR or HDRI, helps preserve the brightness information that makes those images useful.


## What are those shiny balls doing on set?
A mirrored sphere offers a compact view of nearly everything around it. Photographing it at multiple exposures is one way to capture a **light probe**. Another is to photograph overlapping views around a camera position and assemble a full panorama.

The resulting map associates directions with light arriving from them. Debevec’s light-probe gallery documents both mirrored-ball and panoramic capture methods. [Light probes and how they are captured](https://www.pauldebevec.com/Probes/index.html).

A gray reference object serves a related purpose: it shows how a comparatively simple surface responds to the actual illumination. It gives artists something photographed against which to judge their reconstructed lighting. The reflective environment capture and the reference object answer different questions. [Reference objects and measured illumination](https://www.pauldebevec.com/Research/IBL/debevec-siggraph98.pdf).


## A photograph that becomes a light source

<!-- film-illustration:hdr-capture-to-light -->
![Short, medium and long exposure times contribute different brightness ranges to an HDR light map. Matte and reflective surfaces respond to that environment.](../assets/filmmaking/hdr-capture-to-light.svg "Short exposures retain bright sources; long exposures record dark surroundings. Their combined brightness relationships can light a digital object. Illustrative scenario, not a documented film setup.")
<!-- /film-illustration:hdr-capture-to-light -->

Imagine a digital object surrounded by a spherical map of a real location. One part contains a bright window; another contains a dark ceiling; another contains a warmly lit wall.

The renderer can use those different directions and intensities to illuminate the object. Polished metal produces recognizable reflections. Rougher surfaces spread the light into broader responses. The environment supplies more than a backdrop: it contributes to how the object looks.

An environment image can be treated as illumination arriving from a distant surrounding sphere. Autodesk’s documentation describes panoramic photographs and chrome-ball photographs as common sources. [Image-based lighting explained](https://help.autodesk.com/cloudhelp/2016/ENU/Maya/files/GUID-A7758B82-59A7-47CE-A6F5-8754282531C1.htm).

## Why an ordinary panorama may be insufficient
A photograph can show a bright lamp and a pale wall as almost the same white, even though the lamp sends far more light toward the subject. Once both have clipped to white, their true brightness relationship has been lost.

Take a short exposure to record the bright window without turning it into a blank white patch. Take longer exposures to record the dim walls and ceiling. Software combines that information into an **HDR light map**, preserving how much brighter the window is than the rest of the room. These maps are also called radiance maps. Paul Debevec and Jitendra Malik’s research established a method for recovering these radiance maps from exposure sequences. [The HDR capture research](https://www.pauldebevec.com/Research/HDR/).

The goal here is useful lighting information. Making a photograph look dramatic through contrast adjustments does not recover brightness measurements that were never captured.


![A flattened panorama of the interior lighting environment captured for Iron Man 2.](https://www.fxguide.com/wp-content/uploads/2011/01/HDR_IM2.jpg)

*Iron Man 2 (2010) — On-set HDR panorama preview.* An interior lighting capture displayed as a flattened panorama. This JPEG preview cannot preserve the full brightness range of the original HDR data. [Image source](https://www.fxguide.com/fxfeatured/ben-snow-the-evolution-of-ilm-lighting-tools/). Credit: ILM lighting-workflow image published by fxguide.


### Iron Man 2: taking the room into the renderer



*How could reflective digital armor move through Tony Stark’s house and still appear to share its lighting?*

For *Iron Man 2* (2010), ILM combined HDR captures from several positions with simple geometry. Ben Snow describes a lighting environment that accommodated characters moving through a room. [Snow’s production account](https://www.fxguide.com/fxfeatured/ben-snow-the-evolution-of-ilm-lighting-tools/).


![A digital reconstruction of the interior used to light the Iron Man suit.](https://www.fxguide.com/wp-content/uploads/2011/01/screen_ilm.jpg)

*Iron Man 2 (2010) — Lighting-environment reconstruction.* The reconstructed interior combines three HDR captures with geometry, according to the production account. [Image source](https://www.fxguide.com/fxfeatured/ben-snow-the-evolution-of-ilm-lighting-tools/). Credit: ILM lighting-workflow image published by fxguide.


The reconstructed environment lets nearby surfaces participate in lighting the digital suit.

### An exterior lighting example

![Tony Stark’s reflective armor in a sunlit exterior; this is separate from the interior lighting capture.](https://www.fxguide.com/wp-content/uploads/2011/01/im2.jpg)

*Iron Man 2 (2010) — Finished film image.* Tony Stark’s armor sits within a sunlit exterior. This image introduces the lighting problem; it is not a direct result of the interior HDR capture discussed here. [Image source](https://www.fxguide.com/fxfeatured/ben-snow-the-evolution-of-ilm-lighting-tools/). Credit: Film image published by fxguide.

### District 9: making an alien belong in ordinary daylight

*How did the aliens look embedded in dusty location photography rather than separately lit studio creatures?*

For *District 9* (2009), Image Engine’s on-set supervisor Peter Muyzers collected HDRI data, and the studio developed an HDRI lighting pipeline for exterior and interior scenes.

Jason Cope’s gray reference suit also helped: the team could observe the light direction and shadows across a body standing where the alien would appear. The captured environment supplied lighting data; the stand-in supplied an additional check on what that light did to a real subject. [Image Engine’s crew interviews](https://www.fxguide.com/fxpodcasts/District_9/).


![A digital District 9 alien stands against the photographed wall beside a clipboard.](https://www.fxguide.com/wp-content/uploads/2010/10/09Sep/d9/03B.jpg)

*District 9 (2009) — Finished visual-effects shot.* The digital alien shares the photographed wall and clipboard scene. Image Engine’s account documents its HDRI pipeline; the frame alone does not isolate each lighting contribution. [Image source](https://www.fxguide.com/fxpodcasts/District_9/). Credit: Image Engine production image published by fxguide.


The benefit extends beyond a single highlight. A creature must fit the balance between bright and shaded regions, with surface detail that responds plausibly as its pose changes.

### Life of Pi: the captured environment needs interpretation

*Why couldn’t the team simply photograph the set’s lighting and use it unchanged on Richard Parker?*

For *Life of Pi* (2012), Rhythm & Hues used HDRI as lighting reference, but the surrounding blue screens created a problem: using those captures directly would introduce unwanted blue into the tiger’s illumination. The team painted and created HDR environments to represent the intended world.

Digital-effects supervisor Jason Bayever also describes local bounce from the lifeboat: its orange seating and bright tarp influenced the tiger as he approached them. [The production account](https://www.fxguide.com/fxfeatured/life-of-pi/).


![The rendered tiger sits inside an orange lifeboat, with a wireframe pole still visible in the breakdown.](https://www.fxguide.com/wp-content/uploads/2012/11/Lifeboat_tiger_final.jpg)

*Life of Pi (2012) — Tiger-render breakdown.* The rendered tiger sits within the orange lifeboat. A wireframe pole remains visible in the foreground, identifying this as a breakdown image rather than a fully finished film frame. [Image source](https://www.fxguide.com/fxfeatured/life-of-pi/). Credit: Rhythm & Hues breakdown image published by fxguide.


The pattern is therefore more thoughtful than “capture and apply.” The renderer needs the light of the finished scene. A studio capture includes equipment and backings that may disappear from that scene, so the lighting representation may need alteration too.

## Where a light map reaches its limits
A single capture describes illumination at a particular position and time. Moving close to a window changes its apparent size and influence; moving behind a wall changes what light can reach the subject. A distant environment map alone cannot fully describe those local relationships.

Nearby geometry also matters when the digital object must cast a shadow onto a real floor or receive light bounced from a neighboring surface. Debevec’s original IBL research explicitly separates the distant environment, the local scene, and the inserted objects to account for those interactions. [The original rendering method](https://www.pauldebevec.com/Research/IBL/debevec-siggraph98.pdf).

Time is another complication. A bracketed capture records successive exposures; moving or flickering sources may not agree between them. Snow describes such difficulties with fire and changing stage illumination on *Iron Man 2*. [The capture challenges](https://www.fxguide.com/fxfeatured/ben-snow-the-evolution-of-ilm-lighting-tools/).

Finally, correct illumination does not fix an incorrect material. The object still needs suitable surface properties, geometry, and integration with the photographed scene.

## How it connects to the other tricks
**[Matchmoving](/pattern/film-matchmoving-and-camera-tracking)** establishes the viewpoint; IBL establishes much of the illumination. **[Photogrammetry](/pattern/film-photogrammetry)** can provide environmental geometry, while **camera mapping** can place captured imagery onto that geometry.

**[Interactive lighting](/pattern/film-interactive-lighting)** carries the same concern onto the physical set: an actor responds to real light representing an imagined environment. IBL commonly brings captured environmental light into the digital scene. The techniques can meet within one production.

The reusable principle is to **capture the relationships in the light, then preserve them when adding something new**.
