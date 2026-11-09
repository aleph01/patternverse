---
id: ml-retrieval-augmented-generation
type: pattern
title: 'Retrieval Augmented Generation'
summary: 'Retrieve relevant, authorized evidence at request time and give it to a generator, while checking source currency, answer support, and citation quality separately.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A community hall changes its cancellation policy from 48 hours to 24 hours. Its language-model assistant still confidently repeats the old rule. The team needs answers grounded in the current handbook, with passages that staff and members can inspect. Retraining for every handbook edit would also leave the question of which source supports an answer.

Retrieval Augmented Generation, or RAG, connects a generator to an external collection at request time. It makes relevant evidence available in the input; whether the answer uses that evidence faithfully remains a separate responsibility.

## Core idea

Retrieve passages for the question, then condition generation on those passages. The model's stored knowledge and the retrieved collection serve different roles: one supplies learned capabilities and prior knowledge; the other supplies explicit source material that can be updated independently.

[Lewis and colleagues](https://arxiv.org/abs/2005.11401) introduced RAG models combining a pretrained sequence-to-sequence model with a dense Wikipedia index and neural retriever. Their research system was fine-tuned. A practical application can instead retrieve evidence for an existing model without updating its parameters on each request; absence of training is not the defining property of RAG.

Retrieval scores estimate relevance under a particular method. They are not probabilities that a claim is true, current, or permitted for this reader.

## How it works

Prepare the collection before serving questions. Divide documents into passages that retain necessary context, including conditions and exceptions. Keep stable source identifiers, revision dates, access permissions, and locations alongside the text. Index updates, corrections, and deletions must reach the serving system.

At request time, identify the reader's authorized scope and retrieve candidates within it. Lexical retrieval matches words; learned dense retrieval compares representations of questions and passages. [Dense Passage Retrieval](https://aclanthology.org/2020.emnlp-main.550/) demonstrates the latter with separate question and passage encoders. Hybrid retrieval can combine these signals; its value needs measurement on the intended questions.

Optionally rerank candidates, remove duplicates, and assemble a bounded context with source identifiers. Supply the question and clear instructions to answer from evidence, cite supporting passages, and acknowledge missing support. Retrieved text must remain source data rather than an instruction channel. Permission checks belong before restricted content reaches the model, as the [OWASP RAG guidance](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html) explains.

Finally, inspect the response. Check that cited passages exist, support the associated claims, and cover important factual statements. Evaluate retrieval and generation separately so an unsupported answer can be traced to missing evidence, misleading context, or the generator's use of it.

## Worked examples

### A current handbook answer, fictional

Cedar Hall's tiny collection includes:

| ID  | Passage excerpt                                                                      | Status and access  |
| --- | ------------------------------------------------------------------------------------ | ------------------ |
| P1  | Members may cancel a room booking without a fee until **24 hours** before its start. | Current; public    |
| P2  | Members may cancel a room booking without a fee until **48 hours** before its start. | Superseded; public |
| P4  | Staff may approve a room booking cancellation without a fee after the normal cutoff. | Current; staff     |
| P5  | A room booking may last up to **3 hours**. Members can book one room at a time.      | Current; public    |

Two other passages describe booking changes and workshop cancellations. For “When can members cancel a room booking without a fee?”, the explorer filters out superseded and staff-only passages, then selects two positive-scoring hits.

The word-matching retriever ranks P1 first and P5 second. Both share words with the question, but P1 supplies the cancellation cutoff while P5 discusses duration. Ranking identifies candidates to inspect; it does not establish that each passage answers the question.

A human-authored answer draft is: “Members can cancel without a fee at least 24 hours before the booking starts [P1].” P1 supports that claim; P5 supplies no cancellation cutoff. This draft illustrates evidence use, not an observed model response.

![A fictional question retrieves current public passages P1 and P5. Their text and source identifiers enter a generator's context. A human-authored answer draft cites P1 for the 24-hour cutoff; P5 is about booking duration and does not support that claim.](../assets/machine-learning/retrieval-augmented-generation.svg 'P1 supports the 24-hour claim; retrieved P5 does not. Trace each answer claim back to its evidence rather than treating retrieval rank as verification. The answer draft is human-authored.')

```patternverse-widget
{
  "src": "ml-retrieval-augmented-generation.html",
  "title": "RAG evidence and context explorer",
  "height": 1200,
  "fallback": "Current public passages P1 and P5 are retrieved, but only P1 supports the 24-hour cancellation answer. Including superseded P2 introduces a conflicting cutoff. The explorer computes retrieval and context, not generation or authentication."
}
```

### Optional: the lexical scoring rule

The explorer uses a **BM25** variant: words contribute according to their rarity, repetition in a passage, and passage length. Six indexed passages average **91/6 ≈ 15.17 words**. With `k1 = 1.2` and `b = 0.75`, P1 scores **2.8669** and P5 **2.2906**. Index statistics stay fixed when eligibility filters change. The [Apache Lucene implementation](https://github.com/apache/lucene/blob/main/lucene/core/src/java/org/apache/lucene/search/similarities/BM25Similarity.java) documents these parameter defaults and inverse-document-frequency calculation. This teaching code does not reproduce Lucene's analyzer or encoded length norms.

### A stale-rule failure, fictional

Switch to all versions. P2 ties P1 because changing “24” to “48” does not change their overlap with this question. Ascending ID breaks the tie; both enter the two-passage context. Higher similarity cannot resolve their authority. A version filter prevents this particular conflict. Increasing the passage count would not fix it.

For “Overnight accommodation?”, no indexed word matches and the explorer returns no passages. That means this retriever found no evidence, not that the hall necessarily forbids overnight stays. A deployed assistant should acknowledge insufficient support or route the question to staff.

### A verified research implementation

The original RAG study retrieved Wikipedia passages and combined them with a sequence generator for knowledge-intensive tasks, including open-domain question answering. Its benchmark improvements concern the studied systems and datasets; they do not validate Cedar Hall's fictional data or this lexical demonstration.

## Assumptions for correctness

The collection must contain sufficiently complete, authoritative evidence for the questions being answered. Chunk boundaries must preserve meaning: omitting “except” or a qualifying date can reverse a rule. Source permissions and versions must remain accurate through retrieval, caching, and citation display.

The generator must use the evidence faithfully, and the evaluation must test that behavior. A retrieved passage or a fluent response alone establishes neither support nor completeness. The explorer checks metadata and word matches; it does not verify semantic entailment.

## When to use it

Use RAG when answers depend on inspectable documents, changing organizational knowledge, or a collection too large to place into every request. It suits document questions where source attribution matters.

A direct database query is often clearer for exact counts or account balances. Returning a passage or search result may suffice when synthesis adds little. A small, stable handbook might fit directly in context after comparing quality and cost.

## Tradeoffs and operating costs

Retrieval adds indexing, storage, metadata management, latency, and another component to monitor. Reranking adds work; longer contexts consume model tokens and inference capacity. Document updates need measurable freshness rather than an assumption that the index is current.

More passages can introduce distraction and conflicting evidence. [Lost in the Middle](https://aclanthology.org/2024.tacl-1.9/) found sensitivity to evidence position in the long-context models and tasks it studied. Context capacity therefore does not by itself establish effective evidence use.

## Common mistakes and limitations

Do not treat citation-shaped text as verification. [ALCE](https://aclanthology.org/2023.emnlp-main.398/) evaluates fluency, answer correctness, and citation quality separately. Test supported claims, missing citations, wrong sources, and unanswerable questions, alongside retrieval coverage and latency.

Retrieved documents can contain malicious instructions. Delimiters and prompts help communicate roles but do not enforce authorization. Apply access controls outside the model and limit downstream actions. Also test stale documents, duplicates, contradictory sources, multilingual wording, and questions requiring evidence spread across passages. RAG can still produce unsupported answers.

## Related patterns

[[ml-few-shot-in-context-learning|Few-Shot In-Context Learning]] supplies demonstrations of task behavior; RAG supplies evidence about the answer. A prompt can contain both. **Fine-Tuning** changes model parameters and can improve behavior, but does not replace document retrieval or source maintenance. [[ml-behavioral-testing|Behavioral Testing]] checks evidence use and failure cases in the complete system. [[ml-selective-prediction|Selective Prediction]] supplies a framework for deferring answers when support is inadequate; retrieval scores require validation before serving as acceptance criteria.

## Sources and further reading

- [Lewis et al.: Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) — original architecture and research evaluation.
- [Karpukhin et al.: Dense Passage Retrieval for Open-Domain Question Answering](https://aclanthology.org/2020.emnlp-main.550/) — learned question and passage representations.
- [Apache Lucene: BM25Similarity source](https://github.com/apache/lucene/blob/main/lucene/core/src/java/org/apache/lucene/search/similarities/BM25Similarity.java) — lexical scoring parameters and implementation details.
- [Liu et al.: Lost in the Middle](https://aclanthology.org/2024.tacl-1.9/) — evidence-position effects in studied long-context systems.
- [Gao et al.: Enabling Large Language Models to Generate Text with Citations](https://aclanthology.org/2023.emnlp-main.398/) — ALCE and citation evaluation.
- [OWASP: RAG Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html) — permissions, untrusted retrieved text, and collection lifecycle.
