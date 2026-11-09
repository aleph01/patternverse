---
id: ml-multimodal-input
type: pattern
title: 'Multimodal Input'
summary: 'Combine complementary input types for one task, preserving their association and testing what happens when a modality is missing or misleading.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A parcel service receives a damage report saying “the box is crushed” and a photograph showing a small dent. Text alone may overstate the visible damage; the photo alone cannot explain whether the contents stopped working. A useful triage system needs both kinds of evidence, associated with the same claim.

Multimodal Input addresses this incomplete view. It combines different kinds of observations for one task, while keeping their identity, timing, and availability meaningful. Accepting an image upload alongside a text field is only the interface; the model must learn or otherwise define how those observations contribute.

## Core idea

A **modality** is a form of observation, such as text, images, or audio. Two text fields are multiple inputs, but do not by themselves introduce another modality.

Process each modality into a representation suitable for the task, then combine the representations or their predictions. This combination is called **fusion**. Its purpose is to use information that one input alone lacks. More inputs do not guarantee better answers: they can duplicate evidence, introduce noise, or disagree.

Start with the association between observations. A perfectly encoded photo from another parcel supplies the wrong evidence. The [multimodal learning survey](https://arxiv.org/abs/1705.09406) distinguishes representation, alignment, fusion, translation, and co-learning; choosing a fusion layer addresses only part of the problem.

## How it works

Define the prediction unit first: one parcel claim, one spoken segment, or one synchronized event. Specify which observations belong to it and which can be available at decision time. Keep identifiers and timing alongside the payloads.

Next, prepare each input consistently. A text encoder might produce a vector from the report; an image encoder might produce another from the photo. An encoder is a function that converts its input into features, often using learned parameters. Training can adjust these encoders, a combining model, or both.

One design concatenates the feature vectors into a longer vector for a predictor. Another combines branch predictions after each modality has been processed. Models with attention can instead learn which parts of one input relate to parts of another. These are alternatives to compare, not stages that every system requires.

Select the design using validation evidence, including text-only and image-only baselines. Evaluate on independent cases with realistic missing inputs and difficult disagreements. Freeze preprocessing, encoder versions, and the combining rule together for serving. A missing photo needs a declared policy, rather than an accidental numerical substitute.

## Worked examples

### A report and a photograph change the same triage score

This fictional example isolates decision-level fusion. Two branches supply dimensionless damage signals between zero and one. Larger means more evidence of damage on this invented scale. The signals are hand-chosen; the demonstration runs no text or image model and estimates no real damage probability.

| Claim | Report signal | Photo signal |
| ----- | ------------: | -----------: |
| C17   |          0.80 |         0.20 |
| C18   |          0.20 |         0.80 |

Give the report weight **0.40** and the photo weight **0.60**, summing to one. For C17, the report contributes **0.40 × 0.80 = 0.32** and the photo contributes **0.60 × 0.20 = 0.12**. Adding them gives a fused score of **0.44**.

A teaching rule sends scores **at least 0.60** to priority review. C17 therefore receives standard review, whereas its report signal alone would trigger priority. For C18, the same calculation gives **0.40 × 0.20 + 0.60 × 0.80 = 0.56**, also standard review. These are consequences of the declared rule, not verified correct triage decisions.

![Report and photograph signals for claim C17 pass through separate branches and a matching-ID check, then contribute 0.32 and 0.12 to a score of 0.44, below the 0.60 priority-review threshold.](../assets/machine-learning/multimodal-input.svg 'Follow both claim IDs through the association check before reading the combined bar. Its two segments show each input’s contribution on one score scale. The threshold turns the combined value into a review route; neither the weights nor the route establish correctness.')

The explorer computes the weighted contributions, total, and route. Change either signal, the report weight, photo availability, or the photo’s claim association. With report weight **0.70**, C17 instead scores **0.70 × 0.80 + 0.30 × 0.20 = 0.62**, crossing the threshold. Choosing weights therefore changes behavior and needs validation evidence; the sliders of a teaching example cannot supply it.

```patternverse-widget
{
  "src": "ml-multimodal-input.html",
  "title": "Multimodal association and fusion explorer",
  "height": 1100,
  "fallback": "For claim C17, report signal 0.80 contributes 0.32 and photo signal 0.20 contributes 0.12. Their weighted total 0.44 is below the 0.60 priority threshold. Missing photos use an explicit report-only fallback; a photo from another claim blocks scoring. These are synthetic calculations, not model performance."
}
```

### Missing evidence differs from reassuring evidence

Remove C17’s photo. This demonstration explicitly falls back to the report signal **0.80**, marking the result report-only. That fallback is a policy requiring its own evaluation; it is not a universally correct fusion formula.

Substituting zero while retaining the original weights would produce **0.40 × 0.80 + 0.60 × 0 = 0.32**. It would confuse absence with a photo supplying a low damage signal. A real model may use a presence indicator or be trained on missing modalities, but that behavior must be designed and tested.

Now attach a photo labeled C42 to C17’s report. The explorer blocks scoring before fusion, even if the numbers look plausible. Missing evidence can follow a supported fallback; contradictory association metadata indicates an invalid pair. Matching IDs still cannot prove that a person uploaded the intended photograph.

### Documented models combine or connect modalities differently

The [Keras multimodal entailment example](https://keras.io/examples/nlp/multimodal_entailment/) implements image and text encoders, projects their representations, and concatenates them for classification. Its task compares image–text posts for entailment relationships. It is a documented training example, not a parcel-triage implementation or a benchmark reproduced here.

[CLIP](https://proceedings.mlr.press/v139/radford21a.html) learns image and text representations using paired images and captions. At classification time, an image can be compared with encoded class descriptions. Multimodal training therefore does not imply that each downstream request must contain both a user photograph and a user report. Define the actual inference contract rather than inferring it from the training data.

## Assumptions for correctness

Observations must describe the intended unit and respect the decision’s information boundary. Video and audio may require time alignment within an event, beyond matching a record ID. Labels, splits, and preprocessing must not expose later outcomes or duplicate cases across evaluation boundaries.

The representations and fusion rule must be compatible. Equal vector dimensions do not make independently trained embedding spaces comparable. Averaging branch scores requires a justified common meaning and scale; normalizing arbitrary numbers into zero to one does not provide that justification.

## When to use it

Use this pattern when the task plausibly needs complementary evidence, the inputs can be associated reliably, and evaluation demonstrates enough improvement over the best usable single modality. Examples include interpreting a spoken event with synchronized video or classifying a product from both its description and photograph.

Prefer a simpler input contract when the extra modality is redundant, usually unavailable, or too costly to collect responsibly.

## Tradeoffs and operating costs

Each modality adds collection, annotation, storage, preprocessing, and monitoring work. Serving may wait for the slower branch or use a deadline and fallback. Measure the complete system, including uploads and decoding, rather than adding encoder timings alone.

Version changes can invalidate cached representations or alter branch influence. Track performance and availability separately: a model can appear stable while an increasing share of requests silently uses its weaker fallback.

## Common mistakes and limitations

Do not assume that extra information improves the trained system. [Wang, Tran, and Feiszli](https://arxiv.org/abs/1905.12681) document multimodal networks underperforming single-modality counterparts in their experiments, examining overfitting and differing learning behavior across modalities. Their result motivates comparison; it does not establish that fusion always fails.

A model may learn a shortcut from watermarks, recording devices, or upload patterns. Test each modality alone, remove inputs deliberately, and inspect relevant slices. Absence itself can correlate with outcomes. A successful weighted average cannot show that a model understands relationships such as “this dent contradicts this description”; some tasks need richer interactions.

## Related patterns

[[ml-embedding|Embedding]] supplies representations; multimodal input additionally needs association and combination. [[ml-ensembling|Ensembling]] combines predictors and can use a single modality; decision-level multimodal fusion can overlap with it. [[ml-training-serving-consistency|Training-Serving Consistency / Transform]] preserves compatible input processing. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] protects information boundaries. [[ml-slice-based-evaluation|Slice-Based Evaluation]] checks performance by modality availability and context.

## Sources and further reading

- [Baltrušaitis, Ahuja, and Morency: Multimodal Machine Learning: A Survey and Taxonomy](https://arxiv.org/abs/1705.09406) — representation, alignment, fusion, and related challenges.
- [Keras: Multimodal entailment](https://keras.io/examples/nlp/multimodal_entailment/) — executable image/text representation and classification example.
- [Radford and colleagues: Learning Transferable Visual Models From Natural Language Supervision](https://proceedings.mlr.press/v139/radford21a.html) — CLIP’s paired training and downstream use.
- [Wang, Tran, and Feiszli: What Makes Training Multi-Modal Classification Networks Hard?](https://arxiv.org/abs/1905.12681) — empirical limitations and modality-dependent training behavior.
