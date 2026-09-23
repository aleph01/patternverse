---
id: worry-exposure
type: pattern
title: Worry Exposure
summary: Deliberately approach a recurring feared scenario instead of repeatedly avoiding, suppressing, or neutralizing it.
status: published
verses:
  - therapy
---

Worry exposure is a structured way to approach a recurring feared scenario for a limited period of
time. Instead of immediately suppressing the worry, seeking reassurance, checking, or distracting
yourself, you describe the scenario and practise allowing its uncertainty to be present.

The aim is not to prove that the feared event cannot happen or to force anxiety to disappear. It is
to practise responding differently when worry appears.

## Before beginning

This exercise can temporarily increase anxiety. Choose a topic that feels uncomfortable but
manageable rather than your most overwhelming concern.

The exercise may not be suitable during an acute crisis or when you do not feel able to remain
safely present. Professional guidance may be appropriate when symptoms are severe or when you are
uncertain whether this exercise is suitable for you.

## The approach

Write the feared situation in the first person and present tense. Include what happens, what you
notice, and what you fear the outcome would mean. Read the scenario slowly for a defined period,
noticing urges to neutralize or avoid it without requiring those urges to disappear.

Afterwards, briefly note what you observed. There is no guaranteed outcome and no particular
reaction you need to produce.

```patternverse-practice
title: Worry Exposure Practice
introduction: |
  Work with one recurring worry in a deliberate and time-limited way.
steps:
  - id: choose-worry
    title: Choose a worry
    blocks:
      - id: choose-worry-guidance
        type: markdown
        content: |
          Choose one recurring worry to work with.

          Start with something uncomfortable but manageable rather than the most overwhelming
          concern available to you.
      - id: worry-description
        type: text-input
        label: What are you worried might happen?
        placeholder: Describe the feared outcome.
        multiline: true
        required: true
  - id: write-script
    title: Write the worry scenario
    blocks:
      - id: script-guidance
        type: markdown
        content: |
          Describe the feared scenario clearly.

          Write in the first person and present tense. Include what happens, what you notice, and
          what you fear the outcome would mean.
      - id: worry-script
        type: text-input
        label: Write your worry scenario.
        placeholder: The feared situation is happening...
        multiline: true
        required: true
  - id: exposure
    title: Stay with the scenario
    blocks:
      - id: exposure-guidance
        type: markdown
        content: |
          Read the scenario slowly and allow the associated uncertainty and anxiety to be present.

          As far as is manageable, notice urges to reassure yourself, check, suppress the thought,
          or distract yourself. The purpose is not to force anxiety to disappear.
      - id: exposure-timer
        type: timer
        label: Exposure duration
        defaultDurationSeconds: 600
        userAdjustable: true
        persistent: true
  - id: reflection
    title: Reflect
    blocks:
      - id: reflection-guidance
        type: markdown
        content: Take a moment to notice what happened during the exercise.
      - id: reflection-response
        type: text-input
        label: What did you notice?
        placeholder: Note changes, urges, emotions, or anything unexpected.
        multiline: true
        required: false
```
