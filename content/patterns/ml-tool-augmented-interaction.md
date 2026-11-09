---
id: ml-tool-augmented-interaction
type: pattern
title: 'Tool-Augmented Interaction'
summary: 'Let a model request bounded external operations, execute them through application checks, and return observed results before continuing the interaction.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

An equipment-desk assistant says, “Three tripods are reserved,” but the booking system has no reservation. It produced a plausible sentence without performing the operation. Another assistant can access the booking service, but retries a slow request and accidentally reserves twice.

Tool-Augmented Interaction connects language generation to explicit operations: look up inventory, calculate a value, or create a reservation. The application controls execution and returns the outcome to the model. The useful boundary is between a proposed call, an executed operation, and an observed result.

## Core idea

Give the model descriptions of a small set of tools, including their names, arguments, and expected results. It can request a tool when external computation, information, or action is needed. Application code checks and executes the request, then supplies the result for the next response or call.

[Anthropic's client-tool documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) illustrates this round trip: a model returns a structured tool-use request, the application runs the function, and a subsequent message returns the tool result. Provider-managed tools may execute elsewhere; the same distinction between request and execution remains useful.

A structured call provides an interface. It does not establish permission, correct intent, or successful execution. Those properties depend on the surrounding application and service contracts.

## How it works

Define narrow operations such as `get_inventory(item)` and `reserve_inventory(item, quantity)`. Explain units, required fields, valid identifiers, and failure outcomes. Separate reading information from changing state. Broad “execute anything” tools make it harder to constrain behavior and diagnose mistakes.

The model proposes a call. The application validates its structure and values, checks the authenticated user's permission, and applies any required confirmation policy. A well-formed quantity can still exceed available stock; a permitted tool can still target the wrong item. Structural checks, authorization, and business rules answer different questions.

Execute approved calls with bounded time and retry budgets. Attach a call identifier for matching the response and, where supported, a separate idempotency key for retrying the same logical operation. Return structured success, rejection, or uncertain-outcome information. A timeout is an observation about communication, not proof that a write failed.

Feed the result back into the interaction. The model can answer, correct arguments after an error, or request another operation. The application decides when the loop must stop. Log calls, arguments, execution outcomes, and policy decisions with appropriate access and retention controls; a transcript of confident prose is insufficient evidence of what happened.

## Worked examples

### Reserving equipment, fictional

Cedar Hall’s local service starts with five available tripods and no reservations. The assistant's scripted proposal is:

```json
{ "name": "reserve_inventory", "arguments": { "item": "tripod", "quantity": 3 } }
```

The host accepts exactly these argument fields, requires an integer quantity from 1 to 10, checks that the user is a clerk, and requires confirmation under this fictional desk's policy. It then attaches the stable request key `demo-17`. The reservation service checks current stock when applying the write.

| Stage             | Observed information or state                            |
| ----------------- | -------------------------------------------------------- |
| Inventory lookup  | 5 tripods available at lookup time                       |
| Checked proposal  | Reserve 3 tripods for this authorized, confirmed request |
| Service result    | Reservation R1 contains 3; remaining stock is 2          |
| Response handling | Supply R1 to the model before reporting completion       |

A quantity of six passes argument validation but is rejected for insufficient stock. Quantity zero fails validation. A viewer can look up inventory but cannot reserve it. An unconfirmed clerk request waits without writing. These outcomes come from executable rules in the explorer; no language model is running.

![A model proposes reserving three tripods. The host checks arguments, permission, and confirmation; local tool code reserves once and returns R1. The observed result returns to the model. A separate server-state view distinguishes a completed write from a lost acknowledgement.](../assets/machine-learning/tool-augmented-interaction.svg 'Follow the proposal through application checks, execution, and the returned receipt. Reserving three leaves two tripods. A lost acknowledgement can hide a completed write from the client; the server view is shown only for explanation.')

```patternverse-widget
{
  "src": "ml-tool-augmented-interaction.html",
  "title": "Tool interaction and retry walkthrough",
  "height": 1200,
  "fallback": "Reserve three of five fictional tripods, then inspect permission, confirmation, and lost-response branches. Retrying with the same key can return the existing receipt. Execution is local and scripted; no real reservation or model runs."
}
```

Now lose the response after the first successful write. With only one write attempt allowed, the client sees **UNKNOWN**, while the simulated server has reserved three. The explorer exposes both views for explanation; a real client cannot infer hidden server state from a timeout.

With two write attempts allowed, retrying the identical request with `demo-17` returns R1 again. Stock remains **5 − 3 = 2**, with **one reservation** and **three total tool attempts**: one lookup and two write attempts. This assumes the service atomically records the mutation and its idempotency entry. The [AWS Builders' Library](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) explains this contract, including rejecting different parameters under the same key. A fresh key would represent a new operation rather than deduplicating the old one.

### A computed weight, fictional

An assistant obtains weights of 1.25 kg per stand and 0.8 kg per clamp, then submits `3 × 1.25 + 2 × 0.8` to a calculator tool. The result is **5.35 kg**. External calculation makes the arithmetic inspectable, but cannot repair a mistaken quantity or a source weight expressed in pounds. Record input values, units, and the actual result; do not invent a calculator response when the tool fails. This arithmetic example is independent of the reservation walkthrough.

### Verified research implementations

[ReAct](https://arxiv.org/abs/2210.03629) studied language-model interaction with external environments, including Wikipedia-based question answering and interactive benchmarks. [Toolformer](https://arxiv.org/abs/2302.04761) trained a model to select and use APIs including a calculator, search, translation, and a calendar. These demonstrate different approaches to learning or prompting tool use. Neither establishes that an arbitrary tool loop is reliable or authorizes Cedar Hall's fictional operations.

## Assumptions for correctness

Tool descriptions must match implementations, results must be associated with the correct calls, and units and identifiers must retain their meaning. The application must enforce authorization using trusted identity rather than an identity claimed in model-generated arguments.

State-changing services need explicit concurrency and retry semantics. A stock lookup can become stale before the write. The service must enforce its invariant when committing the reservation. The explorer uses sequential local operations and an atomic-write assumption; it does not simulate concurrent customers, durable storage, authentication, or network timing.

## When to use it

Use this pattern when an interaction needs current information, precise computation, or an external action that text generation alone cannot perform. It is useful when natural language helps interpret varied requests and a bounded tool interface can perform the resulting operations.

A fixed workflow is often simpler when every input follows the same known sequence. Tool access adds little to a task that only needs a clear explanation from already supplied information.

## Tradeoffs and operating costs

Each round can add model inference, service latency, context consumption, and failure handling. Bound retries and loop length, keep results concise, and monitor task completion alongside denied calls, tool errors, latency, and duplicated effects. [Anthropic's tool-design guidance](https://www.anthropic.com/engineering/writing-tools-for-agents) discusses useful error messages, response size, and evaluation of complete tool interactions.

Tools also become maintained product interfaces: changing a field, error code, or description can change behavior. Version and test the model, tool definitions, host rules, and service together.

## Common mistakes and limitations

Do not equate schema-valid arguments with a correct or authorized action, or a proposed call with a receipt. Tool-returned documents and messages can contain malicious instructions. Keep their content as data, restrict available capabilities, and enforce policy outside the model. [OWASP's Excessive Agency guidance](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) explains risks from excessive functionality, permissions, and autonomy.

Repeated calls can amplify an initial misunderstanding. Test wrong identifiers, changed arguments, insufficient stock, lost responses, and stopping behavior. Idempotency limits duplicate effects under its service contract; it does not undo a wrong reservation or guarantee eventual success.

## Related patterns

[[ml-retrieval-augmented-generation|Retrieval Augmented Generation]] supplies source evidence; retrieval can be one tool within a larger interaction. [[ml-few-shot-in-context-learning|Few-Shot In-Context Learning]] can demonstrate tool conventions without changing model parameters. [[ml-schema-based-data-validation|Schema-Based Data Validation]] checks interface expectations but does not establish authority or intent. [[ml-behavioral-testing|Behavioral Testing]] checks the complete loop, including refusals, retries, and failure recovery.

## Sources and further reading

- [Anthropic: Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) — client-tool request, execution, and result handling.
- [Yao et al.: ReAct](https://arxiv.org/abs/2210.03629) — interaction between language models and external environments.
- [Schick et al.: Toolformer](https://arxiv.org/abs/2302.04761) — learning when and how to use APIs.
- [AWS Builders' Library: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) — caller intent, atomicity, retries, and key mismatch.
- [Anthropic: Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) — interface design and evaluation.
- [OWASP: Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) — capability limits and authorization boundaries.
