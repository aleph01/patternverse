---
id: rewrite-the-nightmare
type: pattern
title: Rewrite the Nightmare
summary: Change a recurring nightmare while awake and rehearse the revised dream to develop alternative imagery.
status: published
aliases:
  - Imagery Rehearsal Therapy
  - IRT
tags:
  - nightmares
  - sleep
  - imagery
  - rehearsal
verses:
  - therapy
---

A recurring nightmare can begin to feel fixed. The details may vary, but the same threat, helplessness, pursuit, loss, or catastrophic ending keeps returning. Because it happens during sleep, it can seem as though there is little you can do except wake up and recover.

Imagery Rehearsal Therapy (IRT) takes a different approach: change the dream while you are awake, then repeatedly imagine the changed version.

Rather than trying to discover the hidden meaning of the nightmare or convince yourself that it is irrational, IRT treats the nightmare as a script that can be revised. You choose a different development or ending and mentally rehearse it during the day. Over time, the nightmare may become less frequent, less distressing, or change its form.

IRT is one of the best-supported psychological treatments specifically developed for recurrent nightmares. Randomized trials and meta-analyses have found reductions in nightmare frequency and distress, including in people with trauma-related nightmares, although results vary between populations and individual studies.

## Change the script

Suppose you repeatedly dream that you are running through a building while something follows you. Every door is locked and eventually you become trapped.

In IRT, you might rewrite it:

> I reach the end of the corridor and notice a door I have never seen before. It opens easily. Outside is a quiet garden. I step through, and whatever was following me cannot cross the doorway.

The new dream does not have to be realistic. You could fly away, become enormous, summon someone to help, discover that the monster is harmless, turn around and speak to it, or simply change the scene entirely.

It also does not have to end with perfect happiness. What matters is that something important changes. A dream organized around helplessness might become one in which you have a choice. A dream organized around pursuit might contain an escape. A dream ending in catastrophe might simply continue beyond the moment where it normally stops.

After creating the new version, you repeatedly imagine it while awake. This is the rehearsal part of Imagery Rehearsal Therapy.

## Why rehearsal matters

Dreams are not necessarily fixed stories stored intact in memory. They are reconstructed from memories, emotions, expectations, imagery, and other ongoing processes. IRT introduces a competing version of a recurring dream and repeatedly activates that version.

One way of thinking about the method is:

**Recurring nightmare → deliberately altered script → repeated waking imagery → greater availability of alternative dream imagery**

The exact mechanism is still debated. Researchers have proposed changes in imagery, emotional processing, expectations about nightmares, sense of control, and memory processes. The clinical finding is more established than any single explanation of why the technique works.

An early randomized trial found substantial reductions in recurrent nightmares after participants learned to change their nightmares and rehearse the new versions. Later research has found benefits across several populations, though not every trial has found IRT superior to an active comparison treatment.

## Rewrite rather than analyze

A common temptation is to spend most of the exercise interpreting the nightmare:

*Why was the person chasing me? What does the building symbolize? Why was the door locked?*

Those questions may sometimes be interesting, but they are not necessary for IRT.

The central question is much more practical:

**What would I like to happen differently?**

For example, someone who repeatedly dreams of failing an exam could imagine calmly leaving the room and realizing that the exam does not determine their future. Someone dreaming of losing control of a car could imagine the vehicle slowing down when they touch the brake. Someone dreaming of an approaching creature might discover that it shrinks to the size of a mouse.

The change can be small. Sometimes changing a single decisive moment is easier to imagine than inventing an entirely new dream.

## Rehearse the new dream

Once the alternative version feels clear enough, mentally run through it during the day. Imagine the setting, movement and important sensory details, particularly the changed part of the dream.

The goal is not perfect visualization. Someone who has weak visual imagery can still imagine the sequence conceptually: *I reach the door. It opens. I step outside. I am safe.*

A typical IRT program involves repeated rehearsal across days or weeks rather than a single dramatic session. The new version may eventually appear in dreams, but that is not required for the method to be useful. The original nightmare may instead become less frequent, less vivid or less distressing.

## Common mistakes

One mistake is trying to create the psychologically “correct” ending. There is no requirement that the new dream reveal some deeper truth. If being rescued by a giant friendly bird makes the dream easier to rehearse, that is a perfectly legitimate script.

Another is continuing to rehearse the frightening part much more than the changed part. The purpose is not prolonged exposure to the nightmare. Keep enough of the original dream to establish the situation, then give substantial attention to the alternative sequence.

Finally, do not judge the method by whether tonight's dream immediately changes. IRT is generally practiced repeatedly. Research has found meaningful average effects, not a guarantee that every nightmare disappears or that everyone responds.

If working with a highly traumatic nightmare causes overwhelming distress, dissociation, or marked worsening of symptoms, it can be preferable to work with a clinician rather than repeatedly engaging with the material alone.

## Sources and scope

This article describes Imagery Rehearsal Therapy; the practice below is an educational self-help adaptation, not a full clinical protocol. Evidence for therapist-delivered treatment does not establish that this brief exercise will produce the same results.

The [American Academy of Sleep Medicine position paper](https://pubmed.ncbi.nlm.nih.gov/29852917/) recommends IRT for nightmare disorder and PTSD-associated nightmares. The research discussed above includes [Krakow and colleagues’ early randomized trial](https://pubmed.ncbi.nlm.nih.gov/7677723/) and [Casement and Swanson’s meta-analysis of post-trauma nightmares](https://pmc.ncbi.nlm.nih.gov/articles/4120639/). Benefits vary, and the mechanism remains uncertain. The [AASM best practice guide](https://aasm.org/resources/practiceparameters/nightmaredisorder.pdf) describes 10–20 minutes of waking rehearsal per day; this practice defaults to 10 minutes.

## Related patterns

[[cbt-worry-time]] gives daytime worry a bounded space; it addresses waking worry rather than changing dream imagery. [[cbt-activity-mood]] helps observe links between daily activities and mood without interpreting the nightmare.

## Practice — Rewrite one nightmare

Write an alternative dream, then rehearse it with a timer. The timer defaults to 10 minutes and can be adjusted before starting.

```patternverse-language
:language 1
:title "Rewrite the Nightmare"
:output outcome
!ask dream {
    Capture the dream

    Choose one recurring or memorable nightmare that feels manageable to work with while awake. Briefly describe what happens, especially the part you would like to change. You do not need to record every disturbing detail.

    This is an educational self-help adaptation, not a full treatment program. You can pause or end at any point. If engaging with the dream feels overwhelming, leave it here and consider working with a clinician.
}
!ask turning_point {
    Find the turning point

    Where could this dream begin to go differently? It might be the moment you become trapped, someone appears, you lose control, or something terrible seems about to happen.
}
!ask alternative {
    Change what happens

    What would you prefer to happen next? You can make the change realistic, impossible, serious, strange, or playful. A locked door could open, you could fly, someone could help, or the threatening place could become familiar. Choose something that makes the scene feel more manageable to imagine.
}
!ask revised_dream {
    Write the new version

    Retell the dream briefly, replacing the original sequence with your alternative. Keep only enough of the original to establish the situation. Give the changed section enough detail to imagine it as a scene. There is no psychologically correct ending to discover.
}
rehearsal = !form {
    :title "Rehearse the revised dream now"
    !show {
        Imagine your revised dream from beginning to end, returning to the changed section as you rehearse. Give most of your attention to the new imagery rather than dwelling on the frightening material. You can keep your eyes open and use words or a sense of the sequence if visual imagery is difficult. Perfect visualization is unnecessary.

        Your revised dream, in your own words:

        {{revised_dream}}

        Copy this version into a notebook or document if you want it available for later rehearsal.
    }
    !timer countdown {
        :duration 600
        :adjustable true
        :min 60
        :max 1200
        :blocking true
        :sticky false
        Start the timer when you are ready. It defaults to 10 minutes; typical IRT rehearsal is 10–20 minutes during the day. You can adjust the duration before starting.
    }
}
!show {
    You have given yourself another script to work with. You can rehearse this version during the day over the coming days. Repeated rehearsal matters more than an immediate change tonight; improvement is not guaranteed.

    Nothing has been scheduled for you.
}
= outcome "rehearsed"
-> end
```
