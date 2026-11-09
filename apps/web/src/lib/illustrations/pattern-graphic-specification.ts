/** Shared authoring prompt, versioned with the approved abstract concept-graphic collection. */
export const PATTERN_GRAPHIC_SPECIFICATION = `Patternverse concept graphics — specification 2

Read the pattern article and identify its central mechanism before drawing.
Create a compact abstract diagram expressing one relationship, action, or transformation.
Use branching, connection, separation, containment, repetition, hierarchy, perspective,
or another spatial relationship that explains that mechanism. The composition carries meaning.

Style: flat geometric forms, crisp edges, generous negative space, and consistent visual weight.
Use a transparent 96 × 96 canvas. Keep geometry, including strokes, inside the canvas,
with comfortable margins. Prefer a few clear primary forms and supporting connectors.
Use dark ink #181814, supporting gray #898983, and one focal accent hue:
green #05ce78 or purple #7259b8. Explain what the accent identifies.
Use connector widths near 5–6 units. Check the result at 32, 48, and 96 pixels.

Reference direction: the six approved first-pass studies in this collection:
Find Alternative Paths; Second-order Thinking; Separate Observation, Meaning, and Action;
Connection Circles; Drill the Bottleneck; Look Outside the Frame.
Their geometry and accent placement are the visual anchors.

Keep imagery abstract. Avoid literal objects, characters, little scenes, decorative detail,
stock symbols, text, gradients, shadows, texture, and colored backgrounds.
An image should reinforce its title and serve as a memory cue, without claiming to explain
the whole article unaided. General patterns must not look confined to a single example.
Do not randomly rotate, reflect, or recolor a composition: those choices affect its meaning.

Output a brief explanation of the visual mapping and the finished vector geometry.
For the registry, represent geometry as an array of paths. Each path has d and fill;
optional fields are stroke, strokeWidth, linecap, and linejoin. Colors are primary,
secondary, accent, purple, or none (fill only). Use no markup, IDs, transforms, external
references, or embedded code. Convert circles and rectangles to equivalent paths.
Save the result as an explicit authored record, then review it beside the collection.
Generation happens during authoring; rendering never invents or changes artwork.
`;
