---
id: ml-label-preserving-augmentation
type: pattern
title: 'Label-Preserving Augmentation'
summary: 'Create additional training views by changing aspects of an example that should not change its target, while checking that the relevant evidence survives.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A team trains a product classifier from photographs taken under one studio light. The model performs well on those photographs but struggles with customer images taken from different angles and at different exposures. Collecting more labeled photographs would help, but some variation can be introduced into the existing training images.

The tempting shortcut is to rotate, flip, crop, or recolor everything. Yet color might identify the product variant, and a crop might remove the object. Label-Preserving Augmentation expands the training views only where the original target remains justified.

## Core idea

Transform an example while keeping its label because the transformation changes something irrelevant to the task. A slightly darker photograph can still depict the same product. This encodes an **invariance**: the desired answer should stay the same across those changes.

The condition is about the task, not the operation's name. A horizontal flip may preserve “contains an arrow” while changing “points right” into “points left.” A transformation that is useful for one classifier can create incorrect training pairs for another.

Augmentation introduces a design assumption about which differences the model should ignore. It does not create new independent observations or establish that the assumption is true.

## How it works

First define the target and the variations expected in use. Choose transformations and bounded strengths that should preserve that target and enough evidence to infer it. Review transformed examples from important classes and edge cases, including compositions of operations.

For an original training pair **(x, y)**, sample a permitted transformation **T** and train on **(T(x), y)**. Averaging the training loss over these views encourages the model to fit the same target despite the variation. Chen, Dobriban, and Lee provide a [theoretical treatment](https://www.jmlr.org/papers/v21/20-163.html) under invariance assumptions, including a tradeoff when invariance is only approximate. This is not a guarantee for arbitrary transformations.

Generate views in advance or sample them during training. Offline generation permits inspection and caching; online generation can provide fresh views without storing every result. TensorFlow's [augmentation tutorial](https://www.tensorflow.org/tutorials/images/data_augmentation) demonstrates preprocessing layers and dataset transformations. Its augmentation layers are inactive during ordinary evaluation and prediction.

Split original entities into training, validation, and test sets before generating their descendants. Keep all views of the same original in its split. Choose policy settings using validation data, then evaluate on a separate set representative of deployment.

## Worked examples

### One arrow, two different targets

The explorer uses a fictional 8 × 8 image: 26 foreground pixels form a right-pointing arrow; the other 38 pixels are background. It applies actual horizontal and vertical pixel-index reversals and multiplies foreground intensity by a contrast setting.

| Transformation       | Arrow-presence target         | Direction target  |
| -------------------- | ----------------------------- | ----------------- |
| Horizontal flip      | Arrow present → Arrow present | Right → Left      |
| Vertical flip        | Arrow present → Arrow present | Right → Right     |
| Set contrast to zero | Arrow present → No arrow      | Right → Undefined |

The horizontal flip changes 12 of 64 pixel values at full contrast. For the presence task, copying the positive label is valid under this synthetic definition. For direction, copying Right creates an incorrect target.

Vertical flipping changes no pixels because this particular arrow is vertically symmetric. Four horizontal/vertical flip settings therefore produce only two distinct images. Counting generated files would overstate the actual variation.

![The same arrow is flipped horizontally. The arrow-presence label stays the same, but the direction changes from right to left.](../assets/machine-learning/label-preserving-augmentation.svg 'The pixels undergo the same horizontal flip in both tasks. Arrow presence stays true, but Right becomes Left. Whether the old label remains valid depends on what the model must predict.')

Changing contrast from 100% to 50% changes 26 pixel values without changing either target in the idealized example. At zero, the arrow disappears. Keeping the positive label would then contradict the visible input. Real images have noise and visibility limits; the explorer deliberately treats any positive contrast as detectable.

```patternverse-widget
{
  "src": "ml-label-preserving-augmentation.html",
  "title": "Label-preserving augmentation explorer",
  "height": 1200,
  "fallback": "A horizontal flip preserves arrow presence but changes Right to Left. The explorer transforms actual pixels and checks explicit synthetic targets; no classifier is trained."
}
```

### An object box must move with the image

Consider a fictional 100 × 60 image containing a product box with coordinates **[10, 10, 30, 40]**. Coordinates describe continuous image edges in the order [left, top, right, bottom].

After a horizontal flip, the product class remains the same, but its bounding box becomes **[100 − 30, 10, 100 − 10, 40] = [70, 10, 90, 40]**. The width stays 20 and the height stays 30. Leaving the original box attached would supervise the wrong location.

Here the semantic class is invariant while the coordinates must transform with the input: this is **equivariance**. Torchvision's [documented v2 transforms](https://docs.pytorch.org/vision/stable/auto_examples/transforms/plot_custom_transforms.html) apply shared transformations to images and supported annotations. Its custom-transform guide explains why random parameters must be shared across related inputs. Masks, keypoints, and left/right class conventions need corresponding handling too.

### Small text edits can reverse the meaning

In a fictional sentiment dataset, “I would not recommend it” is negative. Deleting “not” leaves a fluent sentence with the opposite sentiment. A generic random-deletion policy cannot justify retaining every original label.

Wei and Zou's [EDA research](https://aclanthology.org/D19-1670/) evaluates synonym replacement, insertion, swapping, and deletion on text-classification tasks. Those empirical results do not certify that every generated sentence preserves its target. Negation, quantities, names, and technical terminology deserve particular scrutiny.

## Assumptions for correctness

The original label must be credible, and the permitted changes must preserve the task's meaning. Review the full transformation distribution, not just a pleasing sample. Two individually mild operations can jointly remove decisive evidence.

The resulting inputs should also be relevant to deployment. Preserving a class label is necessary but does not make an implausible image useful. Class-specific policies may be needed: color changes can be harmless for shape recognition and destructive for a color-based category.

The explorer's target checker recognizes exact right/left arrow templates after ignoring positive intensity, plus a blank image. It is an explicit synthetic rule, not a learned semantic judge or a tool for validating real-world augmentation policies.

## When to use it

Use this pattern when labeled originals are limited and domain knowledge identifies realistic nuisance variation. Image viewpoint, exposure, or modest acquisition noise can be candidates when the target does not depend on them.

Prefer additional data collection when important deployment conditions cannot be simulated credibly. Augmentation cannot supply a missing product category or reveal an unobserved failure mechanism simply by transforming existing examples.

## Tradeoffs and operating costs

Additional views require transformation work and training computation; storing them also costs space. Compare policies at a stated training budget so improvements are not attributed to augmentation when they reflect extra optimization steps.

Track original identifiers, policy versions, parameter ranges, and random seeds. Inspect per-class and per-slice results against a baseline without augmentation. A policy that helps the average can damage a rare class whose distinguishing feature it suppresses.

## Common mistakes and limitations

Splitting augmented descendants independently leaks near-duplicates into evaluation. Increasing strength until images look dramatically different can turn an intended regularizer into label corruption. More transformed rows do not equal more independent evidence.

Successful training on augmented views does not demonstrate robustness to every deployment shift. Crops, occlusions, and generated paraphrases can erase or alter the target. Human review and held-out evaluation remain necessary; there is no universal safe list of transformations.

## Related patterns

[[ml-weak-supervision|Weak Supervision]] creates targets from imperfect sources; this pattern inherits an existing target under a transformation assumption. **Mixup** interpolates both inputs and labels rather than preserving one original label. [[ml-self-supervised-pretraining|Self-Supervised Pretraining]], including SimCLR, uses transformed views to define a learning objective without requiring these supervised labels. **Equivariant Modeling** encodes predictable output changes in model structure. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] keeps related views out of separate evaluation splits.

## Sources and further reading

- [Chen, Dobriban, and Lee: A Group-Theoretic Framework for Data Augmentation](https://www.jmlr.org/papers/v21/20-163.html) — invariance, averaging, and qualifications for approximate invariance.
- [TensorFlow: Data augmentation](https://www.tensorflow.org/tutorials/images/data_augmentation) — online augmentation, preprocessing layers, and evaluation behavior.
- [Torchvision: How to write your own v2 transforms](https://docs.pytorch.org/vision/stable/auto_examples/transforms/plot_custom_transforms.html) — joint image/annotation transforms and shared random parameters.
- [Wei and Zou: EDA](https://aclanthology.org/D19-1670/) — a documented text-augmentation study.
- [Zhang and colleagues: mixup: Beyond Empirical Risk Minimization](https://arxiv.org/abs/1710.09412) — interpolation of inputs and labels.
- [Chen and colleagues: A Simple Framework for Contrastive Learning of Visual Representations](https://proceedings.mlr.press/v119/chen20j.html) — SimCLR and the role of augmentation in self-supervised learning.
