---
id: film-matchmoving-and-camera-tracking
type: pattern
title: Matchmoving / Camera Tracking
summary: Recover camera motion from photographed images so added elements remain
  anchored in the scene.
status: published
verses:
  - filmmaking
---

*Give an imaginary object the same viewpoint as the real world.*

A digital dinosaur can have beautiful skin, convincing muscles, and excellent animation—and still look pasted onto a field. As the camera moves, its feet slide against the grass. A building added to the skyline drifts slightly behind its neighbors. Something is wrong before we can explain why.

The missing agreement is often the camera. The photographed landscape and the digital addition must be seen from the same position, through compatible optics, at every moment.

**The puzzle:** How can filmmakers put something into moving footage when the camera never photographed it?

They reconstruct a virtual camera that follows the real one. That process is **matchmoving**, often called **3D camera tracking**.


![A Brachiosaurus shares a grassy landscape with photographed people and trees.](https://www.ilm.com/wp-content/uploads/2025/07/jurassic-park-ilm-dinosaur-cg-animation-scaled.jpeg)

*Jurassic Park (1993) — Finished film frame.* A CG Brachiosaurus shares the landscape with live-action performers and trees. This frame illustrates the integration problem; the camera-tracking technique is documented in ILM’s production account. [Image source](https://www.ilm.com/ilm-evolutions-50-animation-part-one/). [Technical account](https://www.ilm.com/vfx/jurassic-park/). Credit: ILM & Universal.


## The camera leaves clues

<!-- film-illustration:camera-parallax-agreement -->
![One camera occupies two successive positions beside fixed near and far points. Matching frame insets show the nearer feature shifting farther across the image.](../assets/filmmaking/camera-parallax-agreement.svg "As one camera moves sideways, near details shift more than distant ones. The paired views show the evidence used to reconstruct its motion. Illustrative scenario, not a documented film setup.")
<!-- /film-illustration:camera-parallax-agreement -->

Imagine walking sideways past a fence with mountains behind it. Nearby fence posts sweep across your view much faster than the distant mountains. This relative displacement is **parallax**.

A moving film camera records similar clues. First, software follows details such as a wall corner or a stone from one frame to the next. It then estimates where the camera moved and where those details sit in space. This calculation is called a **camera solve**. Artists check whether its virtual camera keeps a new object attached to the filmed world as the shot plays.

The result can include an animated virtual camera and a sparse **point cloud**: estimated positions of tracked features. That cloud is useful scaffolding, rather than a complete model of every surface. [How a camera solve uses parallax](https://learn.foundry.com/nuke/17.0/content/comp_environment/cameratracker/solving_camera_position.html); [camera and point-cloud outputs](https://learn.foundry.com/nuke/17.0/content/comp_environment/cameratracker/camera_tracking.html).

## Jurassic Park: making a dinosaur share the landscape

*How did they put an enormous animal among real trees and people without making it look like a moving illustration?*

ILM identifies camera motion tracking among the technologies developed for *Jurassic Park* (1993). Its digital dinosaurs had to inhabit photographed locations, with perspective consistent with the live-action footage. [ILM’s production account](https://www.ilm.com/vfx/jurassic-park/).

The Brachiosaurus image above makes the spatial problem easy to recognize: people, trees, ground, and a synthetic animal must read as one place. Camera matching supplies the viewpoint; creature animation, lighting, shadows, and compositing supply other parts of the illusion.

A single frame cannot demonstrate a successful moving-camera solve. The revealing test is the sequence: as the viewpoint changes, does the dinosaur remain convincingly located in the landscape?

## What the artists actually reconstruct
The solve needs to account for the camera’s position, its direction, and the way its lens projects the scene. Known focal lengths and camera measurements help constrain the answer. Artists exclude independently moving subjects from a background-camera solve and can correct unreliable tracks manually. Surveyed points can connect the reconstruction to known positions on set. [Nuke’s camera-tracking documentation](https://learn.foundry.com/nuke/17.0/content/comp_environment/cameratracker/camera_tracking.html).

Once the viewpoint follows the footage, artists set the scene’s orientation and scale. They identify the floor, choose a reference position called the origin, and use measured distances to establish the size of the digital scene. A reconstruction that follows the footage can still need these adjustments before a creature’s feet or a digital building can be placed sensibly. [Setting orientation and scale](https://learn.foundry.com/nuke/17.0/content/comp_environment/cameratracker/adjusting_scene.html).

The lens matters too. Real lenses can bend the image in ways an ideal virtual camera does not. One workflow removes that distortion for effects work, then restores the matching distortion for the composite. Another distorts the rendered addition to match the original footage. The essential requirement is that both layers obey compatible optics. [Accounting for lens distortion](https://learn.foundry.com/nuke/17.0/content/comp_environment/cameratracker/lens_distortion.html).

### District 9: letting the camera behave like a documentary camera

*How can a computer-generated alien survive footage that looks improvised, hurried, and handheld?*

For *District 9* (2009), Neill Blomkamp wanted the feeling of a documentary crew encountering extraordinary events. Image Engine producer Stefanie Boose described extensive camera tracking, with almost no locked-off shots in the studio’s work.

Actor Jason Cope performed in a gray suit, giving the other actors someone to respond to and providing performance and lighting reference. Artists removed him and built the alien performance using several animation methods. Tracking the camera was a separate problem from reconstructing the performer’s movement. Both had to agree in the final shot. [Image Engine’s crew interviews in fxguide](https://www.fxguide.com/fxpodcasts/District_9/).


![Jason Cope performs in a gray reference suit.](https://www.fxguide.com/wp-content/uploads/2010/10/09Sep/d9/03A.jpg)

*District 9 (2009) — Original live-action plate.* Jason Cope performs in a gray reference suit. The visible body markers concern the performer; camera tracking reconstructs the viewpoint of the surrounding scene. [Image source](https://www.fxguide.com/fxpodcasts/District_9/). Credit: Image Engine production image, published by fxguide.


![A digital alien replaces the gray-suited performer in the matching wall-and-clipboard shot.](https://www.fxguide.com/wp-content/uploads/2010/10/09Sep/d9/03B.jpg)

*District 9 (2009) — Finished visual-effects shot.* The corresponding composite replaces Cope with a digital alien. The wall and clipboard provide recognizable reference points when comparing the two images. [Image source](https://www.fxguide.com/fxpodcasts/District_9/). Credit: Image Engine production image, published by fxguide.


Here, matchmoving preserves a style of filmmaking: the director can keep the unstable, observational viewpoint while the effects team makes the invented character belong within it.

## Three different meanings of “tracking”

The word covers related operations, so the distinction helps:

| Operation | What it follows or reconstructs | Typical use |
|---|---|---|
| **2D point tracking** | A feature’s position in the picture | Making an element follow a visible point |
| **Planar tracking** | The changing appearance of a flat surface | Replacing a sign or screen |
| **3D camera tracking** | The camera’s viewpoint and scene-feature positions | Placing objects at different depths |

These can work together. A screen replacement might only need a planar track; a creature moving between foreground and background may need a reconstructed camera. Object tracking adds another question: how is a moving object oriented relative to that camera? [Foundry’s comparison of tracking methods](https://www.foundry.com/products/nuke/plug-ins/cameratracker/faqs).

## Children of Men: making separate takes share one viewpoint

*How can a handheld camera leave a café, continue along a street, and witness an explosion in an apparently continuous shot—even though the material was filmed on different days?*

For the opening of *Children of Men* (2006), Double Negative combined two principal takes. Supervisor Frazer Churchill explains that the plates were tracked, stabilized, and stitched together; a passing bus helped reveal the next section. A new handheld movement preserved the shot’s restless feel.

For transitions elsewhere in the film, the team tracked the adjoining takes in 3D and created an intermediate camera to blend their movements through reprojection. Camera reconstruction could therefore help reconcile two photographed views, as well as integrate CG. [Churchill’s account in Animation World Network](https://www.awn.com/vfxworld/children-men-invisible-vfx-future-decay).


![An animated before-and-after comparison alternates a street view with added building billboards.](https://www.awn.com/sites/default/files/styles/original/public/image/attached/3150-child03childrenofman-fst0.gif?itok=q_O-8_1u)

*Children of Men (2006) — Animated before-and-after comparison.* The street photograph alternates with the enhanced view, revealing large billboards added to the buildings. This comparison shows environment changes, rather than the café transition described above; tracking must keep such additions attached as the viewpoint moves. [Image source](https://www.awn.com/vfxworld/children-men-invisible-vfx-future-decay). Credit: © Universal Pictures, courtesy of Double Negative.


## When the reconstruction becomes difficult
The tracker needs observations that support a consistent explanation. A person crossing the frame can move for reasons unrelated to the camera. Reflections can appear to slide across a surface. Artists must decide which features describe the stationary environment and which should be excluded.

Depth is another limitation. A camera translating through space reveals useful parallax; a camera rotating from one position provides much less information about distances. A rotation-only shot can still be tracked, but it cannot reveal the same depth relationships. [Camera-motion cases and tracking limitations](https://www.foundry.com/products/nuke/plug-ins/cameratracker/faqs).

A solve also needs evidence across time. Nuke’s solver selects separated keyframes to obtain enough parallax to define its 3D points. A plausible-looking reconstruction of one frame is insufficient: the same camera and scene must explain the changing observations. [How the camera solve uses parallax](https://learn.foundry.com/nuke/17.0/content/comp_environment/cameratracker/solving_camera_position.html).

Even a good camera solve leaves creative work unfinished. It establishes where the viewer is; it does not automatically decide how a creature acts, how sunlight falls across it, or which photographed objects must conceal parts of it.

## Where it fits among the other tricks
**[Motion control](/pattern/film-motion-control-and-repeatable-camera-movements)** physically repeats a camera movement; matchmoving reconstructs a viewpoint from recorded images. **[Rotoscoping](/pattern/film-rotoscoping)** supplies masks that let foreground objects pass in front of an addition. **Digital cleanup** can use the reconstructed scene to help replacement imagery follow the footage. **[Hidden cuts](/pattern/film-hidden-cuts-and-invisible-stitching)** can use tracking and reprojection to reconcile the viewpoints of separate takes.

The reusable principle is simple: **to make an imaginary object belong to a photographed world, reproduce the viewpoint from which that world was seen.**
