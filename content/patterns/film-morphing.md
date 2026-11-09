---
id: film-morphing
type: pattern
title: Morphing
summary: Warp corresponding features and blend images to make one form appear to
  transform into another.
status: published
verses:
  - filmmaking
---

*Make a change of identity feel like one continuous event.*

A sorceress passes through several animal forms. A man ages decades in seconds. A familiar face stretches into the reflective surface of a machine.

A cut could show the before and after. A dissolve could overlap them. But sometimes the story needs us to watch the transformation itself: the features move, the outline changes, and one body seems to become another without interruption.

Morphing creates that continuity by establishing relationships between the starting and ending forms, then controlling how they change. In a classic image morph, the pictures are distorted toward compatible intermediate shapes while their appearances blend.

The important pattern is to design the connection between the forms. The endpoints supply the ingredients; the transformation needs its own choreography.

## The puzzle: why doesn’t one face simply fade over the other?
Imagine dissolving between two portraits whose eyes and mouths occupy different positions. Halfway through, you see overlapping features: two noses, doubled eyes, and ghostly outlines.

A morph moves corresponding features toward shared positions during the blend. An eye becomes the other eye; the jaw follows a designed path toward the new jaw.

This creates a strong impression of metamorphosis. Our attention can follow a feature through the change, instead of watching two independent pictures overlap.

## The basic trick: correspondence, warping, blending

<!-- film-illustration:morph-correspondence -->
![Corresponding eyes, mouth and silhouette move toward intermediate positions while the appearance blends. The invented faces explain landmark movement without warping film imagery.](../assets/filmmaking/morph-correspondence.svg "Corresponding features move while appearances blend. That gives the viewer a continuous relationship to follow through the change. Illustrative scenario, not a documented film setup.")
<!-- /film-illustration:morph-correspondence -->

**Correspondence** identifies which features belong together: eyes, mouth corners, silhouette, or other important landmarks.

**Warping** moves those features and the surrounding image into intermediate arrangements. Both source and destination images can be distorted toward the same changing shape.

**Blending** changes their visible contributions as the deformation proceeds. The beginning resembles the source; the ending resembles the destination.

Thaddeus Beier and Shawn Neely’s foundational paper describes this combination of image warping and cross-dissolving, with feature-based controls for the artist. [Their SIGGRAPH paper](https://doi.org/10.1145/133994.134003) explains the principle.

### Willow (1988): how does one animal become another?


![Successive frames show Fin Raziel changing through animal and intermediate forms.](https://i0.wp.com/beforesandafters.com/wp-content/uploads/2019/10/willow.jpg?resize=850%2C574&ssl=1)

*Willow (1988) — Transformation-sequence frames.* A sequence of frames shows Fin Raziel passing through animal and intermediate forms. The changing outlines help connect separately photographed elements. [Image source](https://beforesandafters.com/2019/10/21/the-tech-of-terminator-2-an-oral-history/). [Technical account](https://www.lucasfilm.com/news/willow-at-30-with-visual-effects-wizards/). Credit: ILM imagery, published by befores & afters.


*How can photographed creatures change species without an obvious interruption?*

Willow’s attempt to restore Fin Raziel to human form became a major early demonstration of digital morphing. The sequence combined filmed practical elements with digital transitions between the changing animal forms and the eventual human figure.

Visual effects supervisor Dennis Muren describes approaching the problem through two-dimensional pictures with changing outlines, while puppets supplied controllable movement for the photography. Model maker Jean Bolte helped create the sequence’s practical creatures. [Lucasfilm’s discussion with the original effects team](https://www.lucasfilm.com/news/willow-at-30-with-visual-effects-wizards/) explains that collaboration.

The reusable insight is that the intermediate connection can be digital even when the things being connected are photographed.

This also makes preparation valuable. The more deliberately the physical elements support the intended transition, the more useful material the morph has to work with.

### Indiana Jones and the Last Crusade (1989): how does Donovan age without a cutaway?


![Donovan’s head at an aged stage of the Grail-chamber transformation.](https://4.bp.blogspot.com/-AK-gbkXAFPk/UMoF3OwB8cI/AAAAAAAACC0/SfDzD13f8No/s1600/indy3_jul2012-a1.jpg)

*Indiana Jones and the Last Crusade (1989) — Finished film frame.* Donovan at an aged stage of the Grail-chamber effect. This still shows one moment; ILM’s account explains how morphing joined the motion-controlled puppet heads. [Image source](https://singlemindedmovieblog.blogspot.com/2012/12/outstanding-effect-shots-part-13-of-24.html). [Technical account](https://www.ilm.com/vfx/indiana-jones-and-the-last-crusade/). Credit: Film frame reproduced by The Single-Minded Movie Blog.


*How can several different aging effects read as one continuous deterioration?*

ILM built the sequence around three motion-controlled puppet heads depicting different stages of Donovan’s decomposition. Morphing blended the separately photographed heads into the continuous effect. [ILM’s production account](https://www.ilm.com/vfx/indiana-jones-and-the-last-crusade/) identifies that combination.

The physical heads supplied detailed surfaces and changing anatomy. Repeatable movement helped the photographed stages correspond. Digital transformation connected them.

This is a broader filmmaking pattern: divide an impossible continuous action into achievable stages, then design the transitions carefully enough that the audience experiences a single event.

The morph does not have to create every wrinkle or every physical change. It can connect the work done by makeup, mechanisms, and photography.

### Terminator 2: Judgment Day (1991): when does an actor become a digital character?


*How can a human disguise become a metallic body while remaining the same character in the same room?*

![The T-1000’s human disguise as Janelle, before the transformation.](https://theasc.com/wp-content/uploads/2026/04/Terminator-2-FX-Janelle-Voight-1.jpg)

*Terminator 2: Judgment Day (1991) — Transformation frame — human disguise.* The T-1000 appears as Janelle before the visible change. Compare the figure’s outline with the next two frames. [Image source](https://theasc.com/article/terminator-2-fx/). Credit: Film image published by American Cinematographer.

![An intermediate T-1000 form changes from clothing and skin toward reflective metal.](https://theasc.com/wp-content/uploads/2026/04/Terminator-2-FX-Janelle-Voight-2.jpg)

*Terminator 2: Judgment Day (1991) — Transformation frame — intermediate form.* The intermediate image combines a changing silhouette with the transition from clothing and skin to reflective metal. [Image source](https://theasc.com/article/terminator-2-fx/). Credit: Film image published by American Cinematographer.

![The T-1000 has become a metallic humanoid in the same kitchen.](https://theasc.com/wp-content/uploads/2026/04/Terminator-2-FX-Janelle-Voight-3.jpg)

*Terminator 2: Judgment Day (1991) — Transformation frame — metallic body.* The metallic humanoid occupies the same kitchen scene. The three frames reveal changes in both shape and appearance. [Image source](https://theasc.com/article/terminator-2-fx/). Credit: Film image published by American Cinematographer.

The transformation connects recognizable features while changing their shape and surface. The sequence above progresses from human disguise through an intermediate form to a metallic body.

The T-1000 required several kinds of transformation. Some involved three-dimensional models; others used image manipulation to connect photographed performances and rendered forms.

ILM artist John Berton describes using Doug Smythe’s MORF program to create transitions between the computer-generated T-1000 and Robert Patrick. He also describes adjusting the timing of details in the memorable shot where the character reverses through its own body rather than turning around normally. [The crew’s oral history](https://beforesandafters.com/2019/10/21/the-tech-of-terminator-2-an-oral-history/) explains the work.

Dennis Muren’s contemporary account emphasizes the combination of image processing, three-dimensional deformation, relighting, and painted fixes within individual shots. [American Cinematographer’s production interview](https://theasc.com/article/terminator-2-fx/) documents that mixture.

The pattern is a handoff between representations. A photographed actor and a digital body can contribute different parts of one apparent performance.

## Two-dimensional images and three-dimensional forms

An image morph reshapes the photographed picture. It can preserve rich photographic detail while transforming its arrangement.

A three-dimensional transformation changes a model’s form before it is rendered. In the T-1000 work, artists developed related versions ranging from an amorphous blob to increasingly detailed humanoid shapes and finally the photographed actor. [The ILM crew describe those stages](https://beforesandafters.com/2019/10/21/the-tech-of-terminator-2-an-oral-history/).

These approaches can be combined. A model can supply changing volume while an image transition completes the connection to live action.

The right choice depends on what the camera reveals during the transformation.

## The middle needs its own design
Two attractive endpoints do not guarantee a convincing transition.

A face can arrive at the correct destination while passing through an intermediate expression that looks accidental. A short animal becoming a tall one can seem to stretch like rubber unless the change has a clear visual rhythm.

One useful question is which features should remain recognizable longest. The eyes may preserve identity while the outline changes. A mouth may transform first to suggest a threat. A surface change may prepare us for a larger anatomical change.

These are decisions about attention and meaning as well as geometry. The transformation becomes more convincing when the viewer can understand what is happening throughout it.

## Why some morphs look wrong
Poor correspondence produces sliding or doubled features. Excessive stretching can smear texture. Changes in head angle may expose areas absent from the source photography.

The background also matters. Distorting the entire picture can make walls and doorframes bend with the subject. Artists need to isolate the intended transformation and restore or reconstruct surrounding areas where necessary.

Lighting can reveal the join, too. A cheek becoming a different shape should acquire believable shading. A blend between incompatible highlights can look like a surface fading rather than a body changing.

These problems help explain why film morphs often combine several techniques. The warp establishes continuity, while masks, paint, models, and compositing solve the parts it cannot handle convincingly.

## When this pattern helps
Morphing is useful when the audience needs to perceive a continuous change of form, identity, age, or material.

It can carry a spectacular transformation, connect stages of a practical effect, or bridge a digital character and a photographed performer. The transition can be brief and nearly invisible or become the central event of the shot.

Its close neighbors are **[match cuts](/pattern/film-match-cuts)**, which connect separate images through similarity; **[substitution splices](/pattern/film-substitution-splices)**, which exchange states across an edit; **[prosthetic makeup](/pattern/film-prosthetic-makeup) and [animatronics](/pattern/film-animatronics)**, which supply physical transformation stages; and **[digital doubles](/pattern/film-digital-doubles-and-face-replacement)**, which provide another representation of a character.

Its most important principle is correspondence: give the viewer something coherent to follow through the change, then design how shape, surface, and timing carry it into the new form.
