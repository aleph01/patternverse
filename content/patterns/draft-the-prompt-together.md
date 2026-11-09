---
id: draft-the-prompt-together
type: pattern
title: "Draft the Prompt Together"
summary: "Use AI to turn a rough intention into a task brief you can inspect before execution."
status: published
tags:
  - ai-usage
  - thinking-with-language-models
  - prompting
  - task-framing
  - clarification
verses:
  - ai-usage
---

You know what you want help with, but the request comes out as “help me improve this.” You can describe the background and recognize a good result more easily than you can formulate complete instructions in advance.

One useful first task for the AI is to help turn that intention into a prompt. Instead of immediately attempting the work, it helps identify the intended result, missing context, constraints, and criteria for success.

The prompt becomes a small artifact you can inspect before asking for the larger one.

## The core idea

Use the model as a collaborator in formulating the request. Supply your rough goal and relevant context, ask it to clarify meaningful gaps, then have it draft a concise brief for the task.

The sequence is **rough intention → clarify → draft the prompt → inspect → use**. You decide which assumptions and requirements belong in the final prompt. The model can propose them, but should not quietly turn its guesses into your instructions.

This approach is sometimes called meta-prompting or AI-assisted prompt writing. The useful principle is clarifying the work before execution. A long prompt, elaborate role, or special vocabulary is optional.

![A rough intention becomes a draft prompt; a human review loop clarifies it before it is used for the task.](/diagrams/ai-usage/draft-the-prompt-together.svg "Inspect the task brief before execution; revise assumptions and missing context together.")

## Why it works

The AI can help organize information you have supplied into a form that makes the task easier to inspect. A rough conversation may contain the audience in one message, an important constraint in another, and a preference implied by an example. Bringing them together exposes omissions and contradictions.

For you, the draft lowers the effort of articulating everything at once. You can react to a concrete proposal: “Keep that criterion, remove this assumption, and ask about the missing source.” That response helps define the task more precisely.

AI-generated prompts are an established application; [Anthropic's prompt-generator announcement](https://claude.com/resources/articles/prompt-generator) describes creating editable prompts from task descriptions. That demonstrates the approach's practical use, rather than proving that an extra prompt-writing step improves every task. Its value depends on whether it resolves ambiguity or creates a useful reusable brief.

## How to use it

Begin with the outcome and what you already know. Ask for clarification only where an answer could materially affect the work:

> I want help turning these research notes into an article for interested beginners. Before writing, help me formulate the request. Identify the most important gaps, distinguish my stated requirements from your suggestions, and draft a prompt I can review.

Read the proposed prompt as a specification. Check the audience, scope, source material, constraints, expected output, and success criteria. Remove invented commitments. If the model adds “include five studies” when you have supplied only two, that is a proposed change in scope, not a harmless detail.

Test the prompt on a small representative piece when the work is large or recurring. Revise it using what the result reveals.

If the prompt will be used in a new conversation, include the necessary context or name the attachments that must accompany it. “Use what we discussed” will not carry the earlier conversation with it.

## A worked example

Omar wants to use an AI to summarize customer interviews. His initial request is “Give me a prompt for finding insights in these interviews.” The first draft asks the model to produce personas, rank feature requests, and recommend a product roadmap.

That sounds thorough, but it exceeds the actual task. Omar wants to identify recurring frustrations while preserving evidence and exceptions. He explains that the interviews come from a small, self-selected group and should not be treated as representative of all customers.

He asks the AI to revise the prompt around those requirements. The new brief requests themes grounded in supplied excerpts, distinguishes participant statements from interpretation, retains contradictory cases, and avoids population-level claims. It asks for unknowns to remain visible rather than filled in.

Omar tests the prompt on two interviews before using it on the whole set. The output groups several complaints under “difficult onboarding,” but the quoted passages describe different problems: understanding the product and obtaining account access. He refines the instruction to separate distinct mechanisms even when the surface vocabulary overlaps.

The resulting prompt is useful because it records decisions about the task. It still cannot establish that every theme is well supported. Omar compares the output with the interviews and revisits the brief when later material does not fit its categories.

The same process can help with a one-off writing request or a technical task. The amount of prompt drafting should depend on how much clarification the work needs.

## When it helps—and where it falls short

Use this pattern when the goal is clear enough to discuss but hard to specify, when earlier results expose recurring misunderstandings, or when the request will be reused. It can also help prepare a handoff to another person or model.

Avoid asking for the “perfect prompt” without explaining the actual situation. That often produces generic instructions with impressive-looking headings but little task-specific information. More instructions can introduce conflicts as easily as clarity.

Watch for the model importing a standard workflow that does not fit your intent. Suggested roles, deliverables, and criteria should earn their place. Keep questions proportionate; a small task should not require a long interview before work begins.

Finally, know when to stop drafting. If the request is already clear and easy to assess, use it. A trial result often teaches more than another round of polishing the instructions. Judge the prompt by the work it enables, not by how sophisticated it sounds.

## Related patterns

[[use-contrast-not-just-examples|Use Contrast, Not Just Examples]] — Make hard-to-describe preferences concrete while formulating the brief.

[[preserve-the-invariants|Preserve the Invariants]] — State which essential properties the task must preserve.

[[work-in-inspectable-steps|Work in Inspectable Steps]] — Test the prompt on an inspectable piece before expanding the work.
