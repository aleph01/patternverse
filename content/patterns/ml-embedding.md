---
id: ml-embedding
type: pattern
title: 'Embedding'
summary: 'Represent an item with a compact numerical vector whose values are learned for a task, then reuse that representation with a compatible model or similarity rule.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A book service has a million titles. Giving every title its own input position distinguishes them, but supplies no learned relationship between two hiking guides. Giving titles consecutive numbers is worse: title 200 is not inherently twice title 100 or more similar to 201 than to 800.

Embedding gives each item a numerical representation that training can adjust. The aim is to make useful distinctions and relationships available to a predictor, rather than treating arbitrary identifiers as measurements.

## Core idea

An **embedding** is a vector: an ordered list of numbers representing an item. For a categorical lookup, a table stores one vector per known ID. The ID selects a row; its numeric magnitude has no meaning.

Training changes the coordinates to reduce a chosen loss. Items may acquire useful relationships because of the observations and objective used to train them. Merely assigning a short vector does not create semantic understanding, and closeness is meaningful only relative to a suitable comparison rule.

The coordinates need not have names such as “outdoors” or “cooking.” Their combined behavior matters more than interpreting each number separately. Encoders can also compute embeddings from text or images instead of looking up a whole item's ID.

## How it works

Choose the input unit, vocabulary, vector dimension, and training task. A lookup layer with V entries and d coordinates stores a V-by-d parameter table. Looking up an ID retrieves its row; multiplying a one-hot vector by the same table selects the identical row without requiring a dense one-hot input in practice.

Pass the retrieved vector to a predictor or combine it with a compatible context vector. Compute a loss from observed targets and update the relevant parameters. With a frozen context and a single lookup, the example below updates only the selected row. A larger system can train context vectors and shared model weights too.

[PyTorch's Embedding layer](https://docs.pytorch.org/docs/stable/generated/torch.nn.Embedding) documents the lookup mechanism and learnable table. Initializing such a layer does not make its vectors useful; training or a suitable pretrained checkpoint supplies that next step.

Keep the vocabulary mapping, weights, preprocessing, and model version together during serving. Evaluate the final task on independent examples, including rare and unfamiliar inputs. A lower training loss does not establish useful recommendations.

## Worked examples

### An ID selects a row, then feedback changes it

Use this fictional two-coordinate table. Its starting values are chosen for explanation, not learned from book data:

| ID  | Title          | Vector  |
| --- | -------------- | ------- |
| 0   | Hiking Guide   | (1, 0)  |
| 1   | Camp Cooking   | (0, 1)  |
| 2   | Desk Lighting  | (−1, 0) |
| 3   | Weekend Trails | (4, 3)  |

Selecting ID 1 retrieves **e = (0, 1)**. Suppose a fixed reader-context vector is **q = (1, 0)**. Their **dot product** multiplies matching coordinates and adds them: **q · e = 1 × 0 + 0 × 1 = 0**.

For this toy binary click model, convert that score into a model probability using **p = 1/(1 + exp(−q · e))**. A score of zero gives p = 0.5. This chosen model is not evidence that half of real readers will click.

An observed click supplies target y = 1. Its loss is **−ln(p) = 0.693 nats**, using a natural logarithm. For a non-click target, the loss is −ln(1 − p). A non-click here means a recorded exposure without a click, not an item that was never shown.

With learning rate one, a gradient step updates **e to e − (p − y)q**. Here p − y = −0.5, so the row becomes **(0.5, 1)**. Its dot score rises to 0.5, p becomes approximately **0.622**, and click loss falls to **0.474 nats**. The first coordinate changes because this fixed context's second coordinate is zero. Other title rows remain unchanged.

![An ID selects the Camp Cooking row from a two-coordinate table. Its dot score and click loss determine a computed next update from zero comma one to zero point five comma one.](../assets/machine-learning/embedding.svg 'Follow ID 1 into its selected row, then into the score and next-update preview. The green row identifies the parameters being updated. This one-example calculation improves training loss; it does not demonstrate recommendation quality.')

The explorer performs these updates and exposes the table and history. Starting coordinates are fictional; updates are actually computed. Changing the next item or feedback preserves learned rows. Reset restores the starting table. The fixed context, learning rate, and twelve-update limit are teaching choices.

```patternverse-widget
{
  "src": "ml-embedding.html",
  "title": "Embedding lookup and learning explorer",
  "height": 1200,
  "fallback": "ID 1 selects (0, 1). Against context (1, 0), one click update changes that row to (0.5, 1), raising model probability from 0.500 to 0.622 and reducing training loss from 0.693 to 0.474 nats. Other rows stay fixed."
}
```

### The scoring rule changes the retrieved title

Before any updates, the same context q = (1, 0) gives Hiking Guide dot score **1** and Weekend Trails score **4**. Dot-product retrieval prefers Weekend Trails.

**Cosine similarity** divides the dot product by both vector lengths. Hiking Guide has length 1; Weekend Trails has length **√(4² + 3²) = 5**. The context also has length 1. Their cosine scores are therefore **1** and **4/5 = 0.8**, reversing the order. [Scikit-learn's definition](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html) describes this normalized dot product.

Neither ordering is inherently correct. Dot product responds to direction and length; cosine removes the effect of positive rescaling. Choose the scoring rule with the objective and evaluation, rather than swapping it after training and assuming equivalent behavior. The explorer's ranking selector changes retrieval only; learning still uses the dot-product click model.

[TensorFlow Recommenders](https://www.tensorflow.org/recommenders/examples/basic_retrieval) documents a trained two-tower movie-retrieval system with query and candidate representations. Its training and evaluation differ from this one-context calculation; these toy scores reproduce no reported movie-recommendation result.

### Text can supply a representation for an unseen item

A new book has no independently trained ID row. One explicit fallback is a shared unknown row. This explorer reserves **row 4 as UNK = (0, 0)** and disables its updates. That policy keeps lookup defined without inventing a personalized representation. Mathematical cosine similarity is undefined for a zero-length vector, so the explorer displays N/A for that comparison.

An encoder offers another route: compute a vector from the book's description. It can process a new description, although usefulness still depends on its training and domain. [Word2vec](https://arxiv.org/abs/1301.3781) learns word representations from text contexts; [Sentence-BERT](https://aclanthology.org/D19-1410/) documents sentence representations designed for similarity comparisons. A word-table lookup and a sentence encoder are related mechanisms, not interchangeable interfaces. Neither is executed by this explorer.

## Assumptions for correctness

IDs must select the intended rows consistently. Scores require compatible vector spaces, not merely matching dimensions. Query and candidate representations must follow the trained pairing and version contract.

The training signal must support the intended relationship. Clicks reflect exposure and presentation as well as interest. Missing interactions are not automatically negative labels. Keep evaluation outcomes outside fitting, and check cold-start behavior separately from frequently observed IDs.

## When to use it

Use embeddings when many categories need reusable learned features, when interactions can reveal useful structure, or when a suitable encoder can represent new text, images, or other inputs.

Compare with simpler encodings and predictors. A small categorical problem may not need another representation layer, and a lookup table cannot independently learn an ID it has never encountered.

## Tradeoffs and operating costs

Short vectors reduce the representation supplied to later layers, but the table still grows with vocabulary. One million rows with 32 float32 coordinates require **32 million values, or 128 MB** in decimal bytes, before optimizer state, mappings, indexes, or other model parameters. Sparse one-hot inputs need not be materialized densely; an embedding table is not automatically the smallest model.

Dimension, training data, indexing, and refresh frequency trade cost against task quality. Updating an encoder can require rebuilding stored vectors and retrieval indexes.

## Common mistakes and limitations

Do not infer universal meaning from a coordinate, a two-dimensional plot, or a nearest neighbor. Different objectives can preserve different relationships. Matching dimensions does not align separately trained spaces.

Rare-item estimates can be weak, and learned relationships can reproduce biases or sensitive information. Better training loss or plausible neighbors establish neither fairness nor factual correctness. Validate the application, not just the appearance of its vector space.

## Related patterns

[[ml-multimodal-input|Multimodal Input]] combines representations from different observation types. [[ml-feature-cross|Feature Cross]] encodes joint conditions explicitly; embeddings instead learn compact representations that can support sharing. [[ml-hashed-feature|Hashed Feature]] assigns fixed positions through hashing rather than learning a separate vector per ID. [[ml-self-supervised-pretraining|Self-Supervised Pretraining]] supplies one way to learn representations. [[ml-retrieval-augmented-generation|Retrieval Augmented Generation]] may use embeddings to retrieve evidence, but also needs source selection and answer checking. [[ml-heuristic-benchmark|Heuristic Benchmark]] asks whether the added representation improves on a credible simpler alternative.

## Sources and further reading

- [PyTorch: Embedding](https://docs.pytorch.org/docs/stable/generated/torch.nn.Embedding) — indexed lookup, learnable parameters, and pretrained tables.
- [TensorFlow Recommenders: basic retrieval](https://www.tensorflow.org/recommenders/examples/basic_retrieval) — query/candidate representations, training, evaluation, and retrieval.
- [Scikit-learn: cosine similarity](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html) — normalized dot-product comparison.
- [Mikolov and colleagues: Efficient Estimation of Word Representations in Vector Space](https://arxiv.org/abs/1301.3781) — learned word representations and their evaluation.
- [Reimers and Gurevych: Sentence-BERT](https://aclanthology.org/D19-1410/) — sentence embeddings for similarity tasks.
