---
id: discover-what-to-stop-doing
type: practice
title: Discover What to Stop Doing
summary: Recognize counterproductive current behaviors and choose a responsible first step for stopping.
status: published
verses: [decision-making]
implements: [inversion]
duration_minutes: 15
attribution: "Creative Destruction by Henri Lipmanowicz and Keith McCandless; original Patternverse individual adaptation, CC BY-SA 4.0."
---

Use this adaptation when current routines resemble the arrangements that could produce an unwanted result. The original Inversion practice remains available for designing safeguards.

## Liberating Structures source and adaptation

[Creative Destruction / TRIZ](https://www.liberatingstructures.com/creative-destruction), credited by the source to Henri Lipmanowicz and Keith McCandless. Source procedure reviewed 21 October 2026. The added adaptation and new practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations. Other pre-existing material retains its existing attribution.

## Practice — Discover What to Stop Doing

```patternverse-language
:language 1
:title "Discover What to Stop Doing"
:output result

!show {
A personal adaptation of Liberating Structures Creative Destruction, also called TRIZ. Imagine harmful arrangements, recognize actual similarities, and choose a responsible stopping action. This is not the full engineering TRIZ system or a claim that avoiding failure guarantees success.
}
context = !form {
:title "Define the result and boundary"
purpose = !ask {
What worthwhile result do you want?
}
worst = !ask {
What specific outcome would undermine it?
}
protect = !ask {
What obligations and people must remain protected?
}
}
reckoning = !collect {
:min 1
:max 5
entry = !form {
:title "Connect a bad design with current practice"
bad_design = !ask {
What could reliably help produce the unwanted outcome?
}
resemblance = !ask {
What current behavior resembles it? If none is known, say so.
}
evidence = !ask {
What actual evidence supports that resemblance?
}
status = !choose {
What is the status of the resemblance?
- observed: "Observed in current practice"
- uncertain: "Possible; needs checking"
- absent: "No current resemblance known"
}
}
-> yield entry
}
!show {{reckoning}} {
:group status
}
stopping = !form {
:title "Make room responsibly"
stop = !ask {
Which observed behavior is worth stopping? If no resemblance is verified, name what to check first.
}
first_step = !ask {
What responsible stopping step or evidence check follows?
}
permission = !ask {
Whose agreement or authority is needed before changing it?
}
positive = !ask {
What useful experience will replace it, beyond avoiding the worst?
}
review = !ask {
What will you inspect to learn whether stopping helped?
}
}
result = {aim: context, reckoning: reckoning, stopping_proposal: stopping}
!show {
Stop-doing proposal: {{stopping.stop}}
First step: {{stopping.first_step}}
Required agreement: {{stopping.permission}}
Positive purpose: {{stopping.positive}}
Review: {{stopping.review}}
}
-> end
```
