---
id: ml-hashed-feature
type: pattern
title: 'Hashed Feature'
summary: 'Map a large or changing categorical vocabulary into a fixed feature space, accepting collisions in exchange for a bounded representation.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A team predicts which visits to an online shop will become purchases. One input is the referring website. There are already hundreds of thousands of distinct domains, and new ones arrive every day. Keeping a separate model input for each domain means maintaining a growing vocabulary and deciding what to do whenever an unfamiliar name appears.

The purpose of Hashed Feature is to keep a categorical input representation bounded while allowing new values to enter through the same mapping rule.

## Core idea

Hashed Feature replaces that expanding lookup with a fixed rule. Convert the category into a consistently formatted string, hash it, and use the result to select one of a fixed number of positions. An unfamiliar category can be represented immediately. The price is that different categories can select the same position and become indistinguishable in that feature representation.

Ordinary one-hot encoding gives each known category its own position. A visit from one referring domain activates that domain's position; the others remain zero. As the vocabulary grows, the representation needs more positions or an explicit policy for unknown values.

## How it works

With hashing, choose a fixed number of **buckets**: numbered positions in the feature vector. A deterministic hash converts a string into an integer. Taking that integer modulo the bucket count gives a valid position. Here, modulo means the remainder after division: remainder 1 selects bucket 1. Four buckets are numbered 0 through 3.

The rule is **bucket = hash(feature key) modulo bucket count**. The hash is a reproducible calculation, not something the model learns. In a simple unsigned encoding, the selected position receives 1. A linear model can then learn a weight for that position; other model families can consume the same representation.

The width stays fixed even as new names appear. For a linear model with one coefficient per bucket, the bucket count also bounds the number of coefficients for this feature. It does not bound every other memory cost in the surrounding system.

## Worked examples

### Six traffic channels

Six fictional traffic channels become keys such as `channel=email`. The field prefix keeps an identical value in another field from automatically becoming the same feature.

For example, the fixed hash of `channel=email` is 696406329. Dividing by four leaves remainder 1: **696406329 = 4 × 174101582 + 1**. Email therefore selects bucket 1. The complete calculation uses a reproducible 32-bit FNV-1a hash over UTF-8 bytes; another library hasher can produce different assignments. With four buckets:

| Feature key       | Hash value | Bucket: remainder after division by 4 |
| ----------------- | ---------: | ------------------------------------: |
| channel=email     |  696406329 |                                     1 |
| channel=search    | 1025387747 |                                     3 |
| channel=social    | 3766252980 |                                     0 |
| channel=referral  | 1431718766 |                                     2 |
| channel=direct    |  458501274 |                                     2 |
| channel=affiliate | 3082720886 |                                     2 |

Referral, direct, and affiliate all select bucket 2. That is a **collision**. Their unsigned vectors are each `[0, 0, 1, 0]`, even though the original names differ. A model receiving only this vector cannot distinguish those three channels. Other features, such as visit history, might still distinguish the visits.

![Six traffic channels mapped into four buckets: social in 0, email in 1, referral, direct, and affiliate sharing 2, and search in 3.](../assets/machine-learning/hashed-feature-buckets.svg 'Follow direct from the shared four-bucket slot to its own eight-bucket slot. Eight positions separate some names, while referral and affiliate still collide. Green marks shared positions, not learned similarity.')

The three shared names create three colliding pairs: referral–direct, referral–affiliate, and direct–affiliate. Counting pairs distinguishes three names sharing one bucket from one pair.

With eight buckets, direct selects 2, referral and affiliate select 6, and social selects 4. The six categories occupy five buckets, leaving one colliding pair. With sixteen buckets, these particular six keys occupy six distinct positions. Those outcomes belong to this example, not a prediction of what will happen to a production vocabulary.

### Explore the bucket assignments

Change the bucket count or enter different channel names. The cards show every bucket, including empty ones; the table exposes each calculation. Adding a name leaves existing assignments unchanged while the bucket count and hash rule stay fixed. Reset restores the six-channel, four-bucket case.

```patternverse-widget
{
  "src": "ml-hashed-feature.html",
  "title": "Hashed feature bucket explorer",
  "height": 1100,
  "fallback": "Six fictional channels occupy four buckets, with three colliding pairs. Bucket count changes the sharing; the example measures representation collisions, not predictive accuracy."
}
```

### A changing text vocabulary

A support-ticket classifier receives new product names and error messages every day. Its preprocessing turns each ticket into tokens, then hashes feature keys such as `token=refund` into a fixed-width vector. If a word appears twice, its count can contribute 2 to its bucket. Two different words that collide contribute to the same position; the model cannot recover their separate identities from that position alone.

This keeps vocabulary growth from adding input columns. Tokenization, spelling conventions, and evaluation remain separate responsibilities.

### Optional: signed contributions

The channel example puts a positive 1 in one position. When several text features are present, a bucket holds their summed contributions. Signed hashing gives each feature a stable positive or negative sign, so colliding contributions can cancel. Under the signed-hashing assumptions, the signs reduce systematic error in inner products: sums of matching coordinate products used to compare vectors. They still cannot recover which features shared a position.

### Documented implementations

Scikit-learn's `FeatureHasher` uses signed MurmurHash3 and enables alternating signs by default. Its output therefore differs from this explorer. TensorFlow also provides string-to-bucket operations. Reproduce the exact implementation selected for the real model rather than copying this example's integers into a different hasher.

## Assumptions for correctness

Training and serving must agree on the feature key, text encoding, hash algorithm, seed where applicable, bucket count, and sign convention. Treat those choices as part of the model's input contract. Changing the bucket count generally changes which learned weight a category reaches, so it requires a compatible model rather than a silent serving-time adjustment.

Decide explicitly how case, whitespace, Unicode, and missing values are represented. The explorer trims names, preserves case, adds `channel=`, and ignores blank lines. It also applies Unicode NFC, a standard form that makes equivalent accented spellings agree. A production pipeline should adopt rules appropriate to its actual data. A process-local hash with a changing seed is unsuitable for a persistent mapping unless its behavior is controlled.

## When to use it

Hashing is especially useful for large or evolving vocabularies when dictionary maintenance and parameter size matter.

A small, stable vocabulary often benefits from a direct encoding whose categories remain easy to inspect. If learned similarity is central to the task, consider embeddings. If explanations must distinguish individual categories, evaluate whether sharing positions is acceptable.

## Tradeoffs and operating costs

Suppose referrals tend to convert and affiliate visits tend not to. If both use the same unsigned feature vector, the model must share their contribution through this feature. Frequent categories with conflicting predictive relationships can interfere more than rare categories with similar relationships. A collision count alone cannot tell you the damage.

More buckets provide more room. In the explorer's nested choices of 2, 4, 8, and 16, increasing the count can separate collisions but cannot merge a previously separated pair. That property follows from using the same integer hash with bucket counts that divide one another. For arbitrary bucket counts, the assignments can rearrange more broadly.

Larger representations may require more model parameters and storage. Choose a feasible range, train using each representation, and compare on held-out data relevant to deployment. Inspect important slices as well as the aggregate score. Collision counts diagnose the representation; predictive damage must be measured with labels and a trained model.

Avoiding dictionary maintenance saves coordination work. Shared positions can still make unexpected predictions harder to investigate.

## Common mistakes and limitations

A newly observed domain can be hashed without rebuilding a vocabulary. It receives whatever behavior the model has already learned for its selected bucket. That may be useful, irrelevant, or misleading. Hashing solves the representation problem; it does not discover what the domain means or eliminate cold start.

Treating a collision as semantic similarity is another mistake. A hash function does not learn category relationships. Using the explorer's FNV-1a values with a different library hasher also changes the representation, even when both implementations use the same bucket count.

Hashing is not a privacy mechanism: a stable bucket assignment does not establish that sensitive source values are protected. Likewise, a field prefix distinguishes the original feature keys but does not prevent those different keys from colliding after hashing.

## Related patterns

[[ml-embedding|Embedding]] can learn representations after bucket selection, although colliding keys then share the same selected representation. [[ml-feature-cross|Feature Cross]] can create a combinatorial vocabulary that hashing bounds. **Transform** and **Model Versioning** help preserve the exact mapping contract across training and serving. These neighboring concepts are outside this article’s worked example.

## Sources and further reading

This original explanation and fictional example draw on feature hashing methods and the Hashed Feature pattern in _Machine Learning Design Patterns_ by Valliappa Lakshmanan, Sara Robinson, and Michael Munn (O'Reilly, 2020, Chapter 2).

- [Weinberger and colleagues: Feature Hashing for Large Scale Multitask Learning](https://arxiv.org/abs/0902.2206) — theoretical development and signed hashing.
- [Scikit-learn: feature hashing](https://scikit-learn.org/stable/modules/feature_extraction.html#feature-hashing) — encoding behavior, collisions, and inspectability.
- [Scikit-learn: FeatureHasher](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.FeatureHasher.html) — the implementation's algorithm and sign convention.
- [TensorFlow: strings.to_hash_bucket_fast](https://www.tensorflow.org/api_docs/python/tf/strings/to_hash_bucket_fast) — deterministic string-to-bucket mapping within the documented implementation.
- [Go standard library: FNV implementation](https://go.dev/src/hash/fnv/fnv.go) — a reference for the FNV-1a constants and byte-wise operation used in the teaching example.
