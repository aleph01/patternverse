---
id: "concept-mapping"
type: "pattern"
title: "Concept Mapping"
summary: "Express relationships as meaningful propositions to reveal what a subject’s structure does and does not explain."
status: "published"
aliases: ["Concept Map"]
tags: ["learning", "thinking-tools", "concept-mapping"]
verses: ["learning", "systems-thinking"]
attribution: "Joseph D. Novak developed concept mapping; Joseph D. Novak and Alberto J. Cañas document its theory and construction. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

A learner can define evaporation, condensation, humidity, and temperature. Asked why a cold window becomes wet, they list the definitions again. The missing piece is not another term. It is the relationship among the terms in an explanation.

Concept mapping makes those relationships explicit. Concepts become nodes; linking phrases turn connections into meaningful propositions. A map can then reveal whether the learner understands how ideas work together, where a relationship is uncertain, and which connections deserve investigation.

Joseph D. Novak developed concept mapping. Novak and Alberto J. Cañas describe its theoretical basis and construction. The method differs from a loose cluster of associated words: a meaningful linking phrase does important explanatory work.


![Condensation produces liquid water. Nearby air cooling can enable condensation. Read each labeled connection as a statement, then check it.](/diagrams/thinking-tools/concept-mapping.svg "Links form propositions. Condensation produces liquid water. Nearby air cooling can enable condensation. Read each labeled connection as a statement, then check it.")

## Begin with a focus question

Choose a question that bounds the map. “What is water?” is too broad for a useful short session. “Why can water appear on the inside of a cold window?” suggests a manageable set of concepts and a purpose for connecting them.

List candidate concepts before drawing every connection. These might include water vapor, room air, cold surface, surface temperature, condensation, and liquid water. Choose labels short enough to recognize, but do not sacrifice distinctions that the explanation needs.

Then connect a pair with a phrase that forms a readable statement: “condensation produces liquid water.” Another might be “a cold surface can cool nearby air.” Read each proposition as an ordinary sentence. “Temperature — water” expresses association, not an explanation.

The map should expose what you know and what you are unsure about. If the relationship between local cooling and condensation is unclear, mark it for checking. Do not fill the gap with a decorative arrow and assume understanding has followed.

## Build relationships, then inspect their meaning

Some concepts are broader than others, so a hierarchy may help organize the map. Other relationships cross between branches. Those cross-links can reveal an insight or a confusion that a tidy outline would miss.

A learner might connect ventilation with indoor moisture and indoor moisture with condensation risk. They may then ask why ventilation sometimes helps even when outdoor air feels damp. That question can lead to checking temperature and moisture content rather than relying on a vague sense of “wet weather.”

Keep the focus question visible. A map that expands into every fact about weather can become less useful for explaining the window. Add concepts when they improve the answer, not because every new term deserves a place.

Use sources to check doubtful propositions. Record a short evidence note where a relationship is subtle or disputed. A map is a representation of an account, not an authority that makes the account true.

## Compare two explanations of a process

A neighborhood group could map how a book donation becomes an available library item. Concepts might include donation, condition check, catalog record, shelf location, and borrowing. Relationships can specify that an accepted donation requires a catalog record before it becomes findable.

The map may reveal a missing connection: people know where books are physically placed, but the catalog is updated only at the end of the month. The group had treated shelving and availability as equivalent. Making the proposition explicit exposes the distinction.

This application does not require a scientific topic. It requires concepts whose relationships matter to the question. For a workflow, an [[issue-trees|Issue Tree]] may be better for dividing an investigation, while a concept map is better for expressing how elements relate.

## Use retrieval and sources deliberately

You can draft a map from memory to reveal gaps, then compare it with reliable material. You can also build a map while reading to integrate new relationships. These are different learning conditions, and the output should record which you used.

[[reconstruct-the-map|Reconstruct the Map]] emphasizes retrieval before checking. [[re-encode-the-idea|Re-Encode the Idea]] explores changes in representation. This pattern concentrates on labeled propositions and cross-links, whether the map begins from memory or a source.

Do not grade understanding by node count, visual symmetry, or the number of crossing lines. A small map with precise relationships can explain more than a dense diagram with generic labels such as “relates to.” Ask the learner to explain an important path and identify what evidence supports it.

## Keep the map revisable

Concept labels can hide disagreements. Two people may use “access” to mean permission, practical availability, or physical accessibility. A shared map helps only if they examine those meanings rather than merge unlike concepts under one convenient word.

A map can also imply stronger causation than the evidence supports. Use linking phrases such as “is associated with,” “requires,” “is part of,” or “may influence” deliberately. Distinguish a conceptual definition from an empirical claim.

The practice below stores concepts and labeled relationships as structured records. It does not provide a freehand graph editor or automatically verify copied concept names. The review step asks you to inspect those connections yourself and identify a proposition worth testing.

End by answering the focus question in a short explanation using the map. If the explanation still jumps across an unsupported link, that is a useful result: you have located the next learning task. Revise the proposition after checking it, and keep track of what changed.

## Sources

- [Joseph D. Novak and Alberto J. Cañas: The Theory Underlying Concept Maps and How to Construct and Use Them](https://cmap.ihmc.us/docs/theory-of-concept-maps), IHMC.

## Practice — Connect Concepts With Meaning

**Purpose:** Express relationships as meaningful propositions to reveal what a subject’s structure does and does not explain.

**Time:** About 20 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Connect Concepts With Meaning"
:output result

!show {
About 20 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
context = !form {
:title "Set a focus question"
question = !ask {
What question should the map help explain?
}
mode = !choose {
How are you constructing the map?
- memory: "Initially from memory, then checked"
- sources: "With sources available"
}
sources = !ask {
What sources will you use to check propositions?
}
}
concepts = !collect {
:min 1
:max 8
entry = !form {
:title "Add an entry"
name = !ask {
Name one relevant concept.
}
meaning = !ask {
What does the concept mean in this inquiry?
}
}
-> yield entry
}
!show {{concepts}} {

}
relationships = !collect {
:min 1
:max 10
entry = !form {
:title "Add an entry"
source = !ask {
Copy the source concept name.
}
phrase = !ask {
What linking phrase makes a meaningful proposition?
}
target = !ask {
Copy the target concept name.
}
support = !ask {
What supports this proposition, and what needs checking?
}
}
-> yield entry
}
!show {{relationships}} {

}
review = !form {
:title "Use and revise the map"
!show {
Concept names and relationships remain structured statements; this worksheet does not automatically match names or draw an editable network.
}
explanation = !ask {
Answer the focus question using a path of propositions.
}
gap = !ask {
Which cross-link, ambiguity, or unsupported proposition changes that explanation?
}
check = !ask {
What will you check, and how would the proposition change if unsupported?
}
}
result = {context: context, concepts: concepts, relationships: relationships, review: review}
!show {
Your explanation: {{review.explanation}}
Proposition or gap to check: {{review.gap}}
Next check: {{review.check}}
}
-> end
```
