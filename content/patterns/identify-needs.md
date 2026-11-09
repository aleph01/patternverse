---
id: identify-needs
type: pattern
title: Identify Needs
summary: Find words for what matters in a situation using a browsable needs library and a guided selection practice.
status: published
aliases:
  - Needs Library
  - Identify Unmet Needs
libraries:
  - id: needs
    src: ../assets/libraries/needs.json
tags:
  - needs
  - self-reflection
  - nonviolent-communication
verses:
  - therapy
attribution: 'An original Patternverse educational article and practice. Needs vocabulary adapted from the Center for Nonviolent Communication Needs Inventory. © 2005 Center for Nonviolent Communication · www.cnvc.org · cnvc@cnvc.org · +1.505-244-4041. Descriptions, recognition cues, and browsing hierarchy by Patternverse.'
---

You have agreed to one more favor, and now even a friendly message feels like another demand. “I just want everyone to leave me alone” is the clearest sentence available. But it leaves several possibilities tangled together: exhaustion, too little choice, too little privacy, or a wish for help with what you are already carrying.

Finding a more specific word can change the picture. *Rest* points toward relief from effort. *Choice* points toward having a meaningful say. *Support* points toward not carrying something alone. Several may fit at once, and the first word that comes to mind may need revising.

Identifying needs means putting tentative language around what matters in a particular situation. It does not require finding a hidden explanation for every feeling. Sometimes the immediate need is already plain: food, sleep, a safe place, or time away from a demand.

## A vocabulary to explore

The browser brings together **68 needs in eight areas**. **Simple** offers 24 starting words; **Detailed** opens the fuller vocabulary and its subgroups. Search looks across the complete library, including descriptions, related search terms, and possible recognition phrases. Open a word to see what it means and examples of how someone might express it.

The areas organize browsing; they do not rank needs or prescribe a sequence. A word can appear in more than one area. The examples are possible ways into a meaning, not evidence that a particular need explains your experience.

```patternverse-widget
{
  "src": "identify-needs.html",
  "title": "Needs library",
  "height": 900,
  "fallback": "Explore needs in eight areas: body and physical well-being; safety and stability; connection and belonging; autonomy and freedom; authenticity and expression; understanding and growth; meaning and contribution; and play, beauty, and harmony. Examples include rest, support, privacy, clarity, belonging, and choice. The library offers 24 starting words and a detailed view of all 68 entries. These are prompts for reflection, not an assessment or a ranking of what you should need."
}
```

To connect the vocabulary with your own situation, [open the interactive practice](/pattern/identify-needs/run). It uses the needs selector to collect words that feel relevant, then leaves room for your own wording and meaning. You can select several, select none, or leave a question unanswered. The practice uses no AI to decide what you need.

## Separate what matters from a particular solution

A need names a concern; a strategy names a way of addressing it. “I want my friend to call tonight” is a particular arrangement. Companionship, being heard, or reassurance about the relationship may help explain why that arrangement matters. They do not establish which alternative would actually help.

This distinction comes from Nonviolent Communication. Rosenberg's process separates needs and values from specific preferred actions; the CNVC inventory offers vocabulary for exploration rather than a complete or definitive classification. Our descriptions and browsing groups are editorial adaptations, not an official CNVC taxonomy. [CNVC, NVC process and Needs Inventory, pages 1 and 4](https://allard.ubc.ca/sites/default/files/2021-08/NVC%20process%20with%20feelings%20and%20needs%20inventory.pdf).

Not every concern becomes interchangeable once it has a broad name. If someone broke a promise, repair may reasonably involve that person. An access requirement, an agreed responsibility, or protection from harm should not disappear into a suggestion to meet the need elsewhere.

[[nvc-separate-needs-from-strategies|Separate Needs from Strategies]] develops this distinction in disagreements and practical decisions. Here, the emphasis is on recognizing and describing the concern before deciding what to do about it.

## The same reaction can point toward different needs

Mara dreads the weekly team meeting. She initially calls this “needing more confidence.” Looking at a recent meeting reveals something more specific: priorities changed halfway through, two people gave conflicting instructions, and nobody resolved which deadline applied.

*Clarity* fits better than a global judgment about confidence. *Predictability* also matters, but is different: she can understand a changed deadline and still struggle when plans repeatedly change without notice. The distinction helps her describe both concerns without claiming that all uncertainty can be removed.

In another team, someone may dread the same meeting because they are repeatedly interrupted. *Being heard*, *respect*, or *inclusion and participation* may fit better. The outward reaction does not identify the need by itself. The circumstances and the person's own account matter.

## Allow more than one word

Jon wants to cancel dinner after a demanding week, but feels sad at the thought of missing it. Choosing *rest* does not make *companionship* disappear. Choosing *companionship* does not mean he has the energy for a crowded evening.

Naming both makes the difficulty easier to describe: he wants connection and has little capacity for the proposed arrangement. A shorter visit, another date, or accepting a disappointing evening apart are possibilities to consider later. None is automatically adequate. Identifying needs clarifies the tension; it does not guarantee a solution that satisfies everything.

Needs can also be visible in experiences that went well. After a quiet afternoon repairing a bicycle with a friend, Jon notices how much he valued learning, cooperation, and ease. Recognition can help describe what sustains him, as well as what is missing.

## Keep the meaning specific

Broad words are useful entry points, but they can conceal important differences. “Support” might mean practical assistance, someone listening, or reliable backup. “Space” might mean privacy, time without social contact, or freedom to make a decision. Your own explanation carries more information than a tag alone.

Close neighbors in the library are deliberately distinct. **Rest** can happen while awake; **sleep** names a different bodily requirement. **Clarity** concerns specific information, while **understanding** concerns making sense of something. **Choice** concerns voluntary decisions, while **freedom** concerns restrictions on action. You do not need to choose the perfect label, but a distinction is worth keeping when it changes what you mean.

The library does not tell you whether a need is met, unmet, urgent, or especially important. Those judgments belong to the situation. An unfamiliar word can be left aside, and something important may need language the library does not contain.

## When recognition becomes another demand

Trying to identify a need can become an exercise in getting the answer right. A useful word should make your experience easier to express, not replace it with an approved explanation. “I'm not sure” is a reasonable outcome.

It can also be tempting to use a need as proof that someone must comply: “My need is connection, so you must stay.” Naming the concern does not decide another person's availability or consent. Conversely, another person's need does not cancel your boundaries or responsibilities.

Nor should reflection delay an obvious practical response. Hunger may call for food; an unsafe situation may call for protection. A lack of money, discriminatory treatment, or unavailable care can be a real external problem. A more fluent description does not supply missing resources.

## Other ways into the same situation

[[cbt-thinking-patterns|Identify Cognitive Distortions]] looks at how an interpretation was constructed. [[identify-limiting-beliefs|Identify Limiting Beliefs]] explores assumptions and rules. Identifying a need asks a different question: what matters here? A conclusion can be inaccurate while the concern behind it remains understandable.

[[nvc-distinguish-feelings-from-conclusions|Distinguish Feelings from Conclusions]] helps separate an emotional experience from a claim about what someone else intended. These distinctions can support one another without requiring every experience to be analyzed through every lens.

Browse the [[self-understanding|Self-Understanding]] collection for the three identification patterns together.

```patternverse-language
:language 1
:title "Identify Needs"
:import "commons/needs-selector@0.1.0" as ui
:output selected_needs
:output own_words
:output situation
:output meaning

context = !form {
  :title "A situation to explore"
  situation = !ask [optional] {
    :placeholder "A moment, reaction, difficulty, or experience that went well…"
What is happening? A short description is enough. You can also skip this and browse the words first.
  }
}

selection = !widget ui.needs {
Which needs feel relevant in this situation? You can choose several or none. Simple offers starting words; Detailed opens the full library. Your selection can include needs that are being met as well as ones that are missing.
}

reflection = !form {
  :title "What these words mean to you"
  own_words = !ask [optional] {
    :placeholder "Your own wording, or leave blank…"
Is there something important that the library does not name in your words?
  }
  meaning = !ask [optional] {
    :placeholder "What matters here, in this particular situation…"
What do the needs you recognized mean here? You can describe what is present, missing, or still unclear. You do not have to decide on a solution.
  }
}

selected_needs = selection.needs
own_words = reflection.own_words
situation = context.situation
meaning = reflection.meaning

!show {
## Words to return to

**Selected needs:** {{selected_needs}}

**Your own words:** {{own_words}}

**The situation:** {{situation}}

**What matters here:** {{meaning}}

These are your descriptions of this moment, not a score or a fixed account of you. You can leave the meaning open or return to it later.
}
-> end
```
