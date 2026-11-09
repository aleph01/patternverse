---
id: ml-model-cards
type: pattern
title: 'Model Cards'
summary: 'Accompany a specific model release with an evidence-backed account of its intended use, evaluation conditions, limitations, and maintenance responsibilities.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A support platform receives a new routing model with a promising message: “92% accuracy.” The integration team still cannot tell whether that score includes long tickets, whether Spanish messages were tested, or whether the model should make final decisions. Six months later, another team downloads updated weights and finds the same description attached.

Model Cards address this handoff problem. They accompany a particular model with enough context to interpret its results and judge whether a proposed use fits the available evidence. Their value comes from making claims inspectable, including where knowledge stops.

## Core idea

Treat documentation as part of the model release. A useful card connects **which model**, **what it is for**, **how it was evaluated**, and **what the evidence does not establish**.

[Mitchell and colleagues](https://arxiv.org/abs/1810.03993) proposed model cards as short documents reporting intended uses, performance across relevant conditions and groups, evaluation procedures, and limitations. Their suggested sections include model details, use, factors, metrics, training and evaluation data, quantitative analyses, ethical considerations, and caveats. This is a reporting framework that can be adapted to the task.

A statement such as “tested on English support tickets, with a human confirming the queue” conveys more than an unexplained score. It also gives a future user something concrete to compare with their own setting.

## How it works

Start with the artifact's identity: model version, developer, release date, architecture or model family, and a stable reference to weights and required preprocessing. Distinguish the date of the model from the date someone revised its documentation. Name an owner or feedback route.

Describe the intended task, users, input conditions, and decision workflow. State foreseeable uses outside that scope. For example, recommending a queue to an agent does not establish suitability for automatically closing a customer's case.

Connect each evaluation claim to its data and procedure. Record dataset version, split, sampling period, label definition, relevant exclusions, preprocessing, prediction rule or threshold, metric definition, and subgroup counts. Link detailed experiment records instead of squeezing every log into the card. The [Hugging Face annotated template](https://huggingface.co/docs/hub/model-card-annotated) provides prompts for training, evaluation, limitations, recommendations, and technical specifications.

Finally, separate measured results, interpretations, intended restrictions, and unanswered questions. A card can recommend human review, but the serving system must implement that workflow. Keep documentation with the release and revisit affected claims when weights, preprocessing, configuration, or intended use change.

## Worked examples

### A routing model handoff, fictional

Suppose `route-assist 1.2` recommends billing, account-access, or shipping queues for English tickets. It takes the highest-scoring class after a fixed tokenizer and 128-token input limit. Agents confirm the recommendation; the model cannot close a case.

Evaluation report E17 uses a frozen holdout of 1,000 tickets, one per customer, separate from training and model selection. Reference labels are the queues assigned by reviewers. “Correct” means matching that reference queue, which is itself an imperfect proxy for successful resolution. Length is measured on the original ticket before tokenization.

| Evaluation subset         | Correct / tickets | Observed accuracy |
| ------------------------- | ----------------- | ----------------- |
| Short: at most 100 words  | 855 / 900         | 95%               |
| Long: more than 100 words | 65 / 100          | 65%               |
| All tickets               | 920 / 1,000       | 92%               |

The overall figure is `(855 + 65) / (900 + 100) = 92%`. Averaging the two percentages equally gives 80%, which answers a different question. Counts reveal that short tickets dominate this evaluation.

![A fictional model card binds route-assist version 1.2 to evaluation report E17. Its 92 percent overall accuracy combines 95 percent on 900 short tickets with 65 percent on 100 long tickets. Use boundaries distinguish human-reviewed English routing from untested Spanish input and out-of-scope automatic closure.](../assets/machine-learning/model-cards.svg 'The 92% headline combines many short tickets with weaker long-ticket results. Keeping counts, use boundaries, and release identity beside the score makes that limitation visible. Documentation does not enforce the boundary.')

A compact card could therefore say: “English queue suggestions for support agents. E17: 920/1,000 reference queues matched; long tickets 65/100. Route long tickets manually pending further evaluation. Spanish performance is not evaluated. Automatic closure is outside intended use. Owner: Support ML; card revision 3.” The fuller record would link the test procedure, data documentation, and uncertainty analysis. These toy percentages are point estimates, not population guarantees or evidence of equal performance across demographic groups.

For a proposed workload containing 80% long tickets, holding these two observed rates fixed gives `0.20 × 0.95 + 0.80 × 0.65 = 71%`. This is an illustrative mixture calculation, not a measured deployment result. The within-group rates could also change. A reader can now identify the evidence needed before adoption instead of importing 92% into a different setting.

### A changed release, fictional

The team prepares version 1.3 with a 256-token input limit and new weights. A manager suggests copying version 1.2's 92% into its card because the task name is unchanged. That would attach evidence to the wrong artifact. Retain E17's historical results under version 1.2; document the new configuration and evaluate version 1.3 under an appropriate protocol before making its own performance claim.

The same rule applies when weights stay fixed but a deployment changes language, decision threshold, or human-review policy. Record what changed and identify which conclusions need new evidence. Updating prose alone does not validate a new use.

### A verified published card

The [Hugging Face DistilBERT SST-2 card](https://huggingface.co/distilbert/distilbert-base-uncased-finetuned-sst-2-english) identifies an English checkpoint fine-tuned on SST-2, reports 91.3% development-set accuracy, and lists training settings. It also reports a diagnostic in which changing a country name changes positive-sentiment probabilities sharply, and recommends probing risks in the intended use case. These are the publisher's reported results; this article has not rerun the model. The useful example is how a benchmark result and a concrete limitation coexist in the same documentation.

## Assumptions for correctness

Claims must refer to the identified artifact and operating configuration. The evaluation must actually support the population, metric, and conditions described. A polished card cannot repair contaminated test data, unreliable labels, missing groups, or selectively reported results.

Readers need access to enough supporting evidence to interpret important claims, with uncertainty and unknowns visible. Protect personal data and confidential details through suitable summaries and controlled supporting records. Do not expose sensitive examples simply to make documentation look complete.

## When to use it

Use a model card when a model crosses a team boundary, enters a registry or product, is shared publicly, or may be reused after its original developers have moved on. Internal models benefit too: the future operator needs the same context as an external downloader.

Scale detail to consequences and reuse. A small classifier can have a concise card; a broadly deployed model may need linked evaluations and specialist reviews. The card should help a reader make a specific adoption or operating decision.

## Tradeoffs and operating costs

The expensive part is often producing and maintaining evidence. Relevant slices need labels, evaluation protocols need ownership, and limitations need review as use changes. Generated fields can reduce clerical work while leaving interpretation and disclosure decisions to responsible people.

On the [Hugging Face Hub](https://huggingface.co/docs/hub/model-cards), a model repository's README supplies the card, with YAML metadata supporting discovery and structured information. This makes documentation travel with a model, but machine-readable tags do not establish that the narrative is accurate or sufficient.

## Common mistakes and limitations

Avoid generic claims such as “unbiased,” unexplained benchmark numbers, and copied cards whose version references are stale. A filled section is not proof that a risk was evaluated. “Not evaluated” describes a knowledge gap; “outside intended use” describes a boundary. They may overlap, but neither should be silently interpreted as approval.

A model card communicates evidence and responsibilities. It does not enforce restrictions, continuously monitor production, establish legal compliance, or certify safety. Documentation can become promotional unless review includes concrete failure cases and people accountable for updating it.

## Related patterns

[[ml-explainable-predictions|Explainable Predictions]] accompanies an individual output with an account of its computational basis; a model card documents the release’s broader evidence and limits. [[ml-model-versioning|Model Versioning]] identifies artifacts and configurations; Model Cards explain the evidence and use context attached to them. [[ml-slice-based-evaluation|Slice-Based Evaluation]] produces results across conditions that a card should report. [[ml-behavioral-testing|Behavioral Testing]] supplies concrete capability and failure examples. [[ml-datasheets-for-datasets|Datasheets for Datasets]] document data motivation, collection, composition, and recommended uses; a model card links that context to a trained model and its evaluation.

## Sources and further reading

- [Mitchell et al.: Model Cards for Model Reporting](https://arxiv.org/abs/1810.03993) — the original reporting framework and worked cards.
- [Hugging Face: Annotated Model Card](https://huggingface.co/docs/hub/model-card-annotated) — practical prompts for use, evaluation, limitations, and technical details.
- [Hugging Face: Model Cards](https://huggingface.co/docs/hub/model-cards) — repository cards, descriptive text, and structured metadata.
- [DistilBERT SST-2 model card](https://huggingface.co/distilbert/distilbert-base-uncased-finetuned-sst-2-english) — a verified published example with reported results and bias diagnostics.
- [Gebru et al.: Datasheets for Datasets](https://arxiv.org/abs/1803.09010) — the neighboring data-documentation pattern.
