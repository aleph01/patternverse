# Software pattern article outline

Use one shared reading structure for the GoF rework and later software engineering patterns. Start with a problem the reader can recognize, explain the mechanism, then show the decision and its consequences. Preserve established pattern names and technical distinctions while making the articles useful without prior knowledge of a taxonomy.

## Approved article structure

| Section                       | What the reader should learn                                       | Editorial requirements                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose and problem           | What situation calls for this pattern, and what becomes difficult? | Begin with a concrete situation. Name the conflicting requirements: what must remain stable, what must vary, or which guarantees compete.                                                        |
| Core idea                     | What is the essential design move?                                 | Give a compact explanation and a useful mental model. Place an explanatory illustration here when it makes the change easier to understand.                                                      |
| How it works                  | Which parts collaborate, and who owns each decision?               | Explain responsibilities, interactions, and assumptions. Describe execution as well as structure. Use familiar names before introducing canonical participant terminology.                       |
| Worked example                | What changes in a specific implementation?                         | Develop one example through problem → design change → result. Include a small, complete code example when code teaches the mechanism. Add a second context when it reveals a different decision. |
| When to use it                | What evidence makes this a worthwhile choice?                      | Describe concrete signals. Include the simpler alternative and the conditions where it is sufficient.                                                                                            |
| Tradeoffs and common mistakes | What does this cost, and how can it go wrong?                      | Explain consequential costs, incorrect assumptions, and at least one tempting misuse. Keep correctness conditions beside the behavior they qualify.                                              |
| Related patterns              | How does this differ from nearby designs?                          | Explain two to four relevant relationships. Prefer useful comparisons to a bare list of names. Link only to existing entries.                                                                    |
| Sources                       | Where does the established pattern come from?                      | Attribute the original pattern and any additional factual claims. Identify teaching examples as original examples.                                                                               |

Use these H2 headings consistently across the collection. Pattern-specific H3 headings may add detail. Aim for roughly 800–1,500 words when the material supports it. Avoid padding sections to achieve uniform lengths. Keep the summary to a single sentence describing the design move.

Declare the language on every code fence and render examples with syntax highlighting. Keep code selectable and preserve its whitespace. Use readable contrast and keyboard-accessible horizontal scrolling on narrow screens.

For architectural or distributed patterns, “How it works” must explain boundaries, failure behavior, consistency, and ordering where relevant. For concurrency patterns, include ownership and synchronization. For GoF patterns, explain objects or functions, responsibilities, collaboration, and the dimension of change. These are content requirements within the shared outline, not extra mandatory headings.

## Why this structure

The outline combines the practical concerns common to established pattern literature: situation, problem, solution, mechanism, examples, applicability, consequences, and relationships. It is the approved Patternverse editorial structure, not a claim that every source uses identical headings.

The [GoF publisher description](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-9780201633610) emphasizes applicability, constraints, consequences, examples, and code. The [Enterprise Integration Patterns introduction](https://www.enterpriseintegrationpatterns.com/patterns/messaging/Introduction.html) explicitly distinguishes context, problem, forces, solution, sketch, results, next patterns, and examples. The [POSA series](https://www.dre.vanderbilt.edu/~schmidt/POSA/) spans architectural patterns, design patterns, and idioms. The shared outline accommodates those different scales without treating every pattern as a class diagram.

## One GoF collection

**GoF Design Patterns** contains all 23 canonical entries in one collection. The separate Creational, Structural, and Behavioral collections, category browse section, category tags, and repeated article category labels have been removed. Individual pattern IDs and article URLs remain stable.

Present the patterns alphabetically so the order does not silently reproduce the old category split:

Abstract Factory, Adapter, Bridge, Builder, Chain of Responsibility, Command, Composite, Decorator, Facade, Factory Method, Flyweight, Interpreter, Iterator, Mediator, Memento, Observer, Prototype, Proxy, Singleton, State, Strategy, Template Method, Visitor.

The collection introduction should explain the common purpose and link to all 23 patterns. Explain comparisons between neighboring patterns inside the articles. The collection is a reading reference, not a required learning sequence.

The metadata sidecar, compiler and search tests, and integration documentation track the revised content and relationships. The original import remains archived for provenance. The three retired collection URLs redirect to the main collection.

## Article illustration standard

Use the current light editorial article style established in Architecture, Filmmaking, and Machine Learning. This is distinct from the small concept marks used in cards and headers.

- Fixed white surface, including dark browser appearance.
- Regular Helvetica Neue, with Helvetica and Arial fallbacks.
- Ink `#252c28`; secondary text `#626962`; context fill `#f1f2ef`; construction lines `#a6aca3`; mechanism accent `#00855b`; light accent `#edf5f0`.
- Simple editable SVG geometry, square boundaries, ample space, and restrained line weights. Use green to identify the consequential relationship or intervention.
- Labels and line styles must carry the meaning independently of color. Arrows must distinguish calling, choosing, implementing a contract, and returning a result.
- Prefer comparisons, collaboration diagrams, and execution sequences. Add UML only when its notation teaches something necessary. Avoid decorative class boxes and metaphor illustrations.
- Use a second illustration when it answers a different question. Do not require an arbitrary illustration count.
- Compose a separate stacked phone version when shrinking the desktop layout would make labels hard to read. Include an accessible description and an explanatory caption for each figure.

Local style references: [Machine Learning](machine-learning-illustration-style.json), [Filmmaking](film-illustration-review.json), and [Architecture](architecture-illustration-style.json).

## Implementation

All 23 GoF patterns follow this outline. The collection has 24 explanatory figures and 48 desktop and phone SVG variants. Strategy retains its two reviewed figures; other articles use one collaboration or mechanism drawing where it answers the central question. See [GoF integration](gof-import.md) for the implementation and provenance.
