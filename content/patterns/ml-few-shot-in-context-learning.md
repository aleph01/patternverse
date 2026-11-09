---
id: ml-few-shot-in-context-learning
type: pattern
title: 'Few-Shot In-Context Learning'
summary: 'Put a small set of task demonstrations into a model’s input so it can condition its response on the desired mapping and format without updating its weights.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A library wants a language model to label requests as HOLD, RENEW, or FIND. Instructions explain the categories, but replies sometimes include commentary, substitute different labels, or confuse reserving a book with extending an existing loan. The team has a handful of clear examples and wants to establish a convention without training a new checkpoint.

Few-Shot In-Context Learning places those demonstrations alongside the new request. It gives the model concrete input–output pairs to condition on during inference. Whether this improves the library's results still requires evaluation.

## Core idea

Demonstrate the task inside the input. Each example pairs an input with the response that should accompany it, using a consistent format. The model then processes a new input in that context.

[Brown and colleagues](https://arxiv.org/abs/2005.14165) evaluated GPT-3 with tasks and demonstrations supplied as text, without task-specific gradient updates. For an autoregressive language model, the response is generated from a conditional distribution such as `Pθ(response | instructions, demonstrations, query)`. The parameters θ stay fixed during this use; the context changes.

Zero-shot prompting supplies no demonstrations, one-shot supplies one, and few-shot supplies several. Here, “few-shot” means prompt-time adaptation. Other few-shot learning methods may update parameters. Examples in one request also do not automatically become permanent task knowledge for later requests; they must remain available in the context or be supplied again.

## How it works

Define the task and output contract, then choose verified demonstrations that illustrate important distinctions and valid outputs. Separate instructions, example inputs, example outputs, and the new input clearly. The demonstration output should follow the same convention expected for the query.

Selection and order are design choices. A small fixed example set is easy to inspect. A retrieval step can instead choose examples for each query. In either case, keep evaluation answers out of the demonstration pool and use development data for prompt choices.

The model processes the resulting context and generates a response through its existing inference procedure. Examples can convey label names, formatting, input patterns, and task relationships; they need not act as a miniature supervised training run. [Min and colleagues](https://aclanthology.org/2022.emnlp-main.759/) found that input distribution, label space, and sequence format mattered substantially in their studied classification and multiple-choice settings. Their finding that corrupted labels sometimes had limited effects does not justify supplying incorrect demonstrations for an arbitrary task.

Validate the actual responses, including format and task correctness. Version the instructions, examples, selection rule, order, model, and generation settings so comparisons describe the same system.

## Worked examples

### Library request labels, fictional

Suppose a small reviewed bank contains these examples:

| ID  | Request                                    | Label |
| --- | ------------------------------------------ | ----- |
| D1  | Renew my loan of Dune.                     | RENEW |
| D2  | Can I keep this book for another week?     | RENEW |
| D3  | Reserve a copy of Dune for me.             | HOLD  |
| D4  | Put me on the waiting list for this title. | HOLD  |
| D5  | Which shelf has Dune?                      | FIND  |
| D6  | Find books by Ursula Le Guin.              | FIND  |

For the query “Can I renew Dune for another week?”, the intended reference label is RENEW. That is a human-authored target for this fictional case, not an observed model response.

### Optional: how demonstrations are selected

The explorer ranks the bank using **Jaccard overlap**: the number of shared distinct words divided by the number of distinct words in their union. It lowercases text, extracts ASCII letter sequences, retains common words, and ignores repetition. Equal scores use ascending example ID. This deliberately simple selector uses no embeddings or language model.

D2 shares five words with the query across a ten-word union, giving **5/10 = 0.50**. D1 gives **2/10 = 0.20**; D3 gives **2/12 ≈ 0.1667**. Selecting three therefore supplies two RENEW examples and one HOLD example, with no FIND demonstration. The instruction still names all three labels. Including a label is a coverage fact, not a performance measure. The assembled prompt places these complete request–label pairs before the new request and an unfinished `Label:` field. The optional inspection reports 369 Unicode characters, including spaces and line breaks; that is not a token count.

![A fictional prompt builder selects D2, D1, and D3, places their request–label pairs before a new library request, and supplies the context to a model whose weights remain fixed. No model response is generated in the illustration or explorer.](../assets/machine-learning/few-shot-in-context-learning.svg 'The selected examples change the context supplied to a fixed model. They do not update its weights. Ranking and prompt construction are computed here; the model’s response is not simulated.')

```patternverse-widget
{
  "src": "ml-few-shot-in-context-learning.html",
  "title": "Few-shot prompt construction explorer",
  "height": 1200,
  "fallback": "Three selected request–label demonstrations enter the prompt before a new request. Change their number or order to inspect the actual context. Selection and character counts are computed; no language model or accuracy measurement runs."
}
```

Reversing the selected order changes which example lies nearest the query. [Lu and colleagues](https://aclanthology.org/2022.acl-long.556/) document order sensitivity in evaluated language models; this page does not predict the direction or size of such an effect. Choosing six demonstrations represents every label but lengthens the prompt. Choosing zero leaves instructions and the query only.

### Extracting a missing field, fictional

A repair desk wants objects containing `item` and `location`. Two demonstrations could be:

```text
Input: Leave the repaired kettle at the north desk.
Output: {"item":"kettle","location":"north desk"}

Input: The repaired lamp is ready.
Output: {"item":"lamp","location":null}
```

For “The repaired toaster is ready,” the intended response uses `"location":null`. The second example demonstrates missingness instead of encouraging the model to invent a location. This is a proposed prompt design, not a verified inference result. Production handling still needs parsing and field validation; a valid object can contain incorrect extracted facts.

### A verified research implementation

[Liu and colleagues](https://aclanthology.org/2022.deelio-1.10/) evaluated KATE, which retrieves semantically similar demonstrations using sentence representations and inserts them into GPT-3 prompts. It outperformed random example selection on their studied benchmarks. That supports testing query-dependent selection, not assuming that our lexical selector reproduces their method or gains. Their experiments are distinct from both invented examples above.

## Assumptions for correctness

Demonstrations must reflect the intended task, labels, and output convention. Similar wording does not establish semantic relevance: “renew” and “keep longer” may express the same intent with little overlap, while common words can create misleading matches. The model must have capabilities sufficient for the requested task; examples do not guarantee new capabilities.

The evaluation must represent intended inputs and remain separate from prompt development. Record near-duplicates and related sources so that retrieval does not accidentally expose evaluation answers. Untrusted example or query text also needs clear handling as data rather than authoritative instructions.

## When to use it

Use this pattern to establish a local classification convention, demonstrate structured extraction, or adapt response style when a capable model and a few reliable examples are available. It can provide a useful baseline before investing in training.

A clear instruction alone may suffice for a straightforward task. A large, stable workload may justify fine-tuning or a smaller specialized model after comparing quality, latency, and maintenance costs.

## Tradeoffs and operating costs

Demonstrations consume context space and can increase inference work. Real limits and billing depend on model tokens and the serving system. The explorer reports Unicode character counts solely to make prompt growth visible; these are not token counts or prices.

Retrieval adds an example store, selection logic, and freshness requirements. More demonstrations can add redundancy or conflicting patterns. Compare example counts and orders using held-out measurements rather than assuming that longer prompts improve performance.

## Common mistakes and limitations

Do not interpret fluent explanations as evidence that the task mapping was learned correctly. Measure errors and invalid outputs separately. [Zhao and colleagues](https://proceedings.mlr.press/v139/zhao21c.html) identify answer biases tied to context, including label position and prior frequency; their contextual-calibration method addresses a specific experimental setting rather than guaranteeing reliable probabilities everywhere.

Do not quietly spend the test set on prompt tuning, include confidential examples without an appropriate handling plan, or treat a retrieved example as an instruction source. Prompt examples neither enforce output constraints nor provide a correctness guarantee.

## Related patterns

[[ml-self-supervised-pretraining|Self-Supervised Pretraining]] builds the underlying model through parameter updates; in-context use conditions an already trained model. **Fine-Tuning** updates parameters for adaptation. [[ml-retrieval-augmented-generation|Retrieval-Augmented Generation]] often supplies factual evidence, while retrieving demonstrations supplies examples of the desired task behavior; a prompt may contain both. [[ml-behavioral-testing|Behavioral Testing]] checks the capabilities and failure cases of the complete prompt-and-model system.

## Sources and further reading

- [Brown et al.: Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) — inference-time demonstrations without task-specific gradient updates.
- [Min et al.: Rethinking the Role of Demonstrations](https://aclanthology.org/2022.emnlp-main.759/) — studied contributions of labels, inputs, and formatting.
- [Lu et al.: Fantastically Ordered Prompts](https://aclanthology.org/2022.acl-long.556/) — prompt-order sensitivity and its experimental limits.
- [Liu et al.: What Makes Good In-Context Examples for GPT-3?](https://aclanthology.org/2022.deelio-1.10/) — KATE and retrieval-based demonstration selection.
- [Zhao et al.: Calibrate Before Use](https://proceedings.mlr.press/v139/zhao21c.html) — answer biases and contextual calibration.
