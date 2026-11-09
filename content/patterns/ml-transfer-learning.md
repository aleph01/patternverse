---
id: ml-transfer-learning
type: pattern
title: 'Transfer Learning'
summary: 'Reuse parameters learned on a source task, then fit a new prediction head or adapt selected layers to a target task.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A recycling team has 600 labeled photographs of damaged packaging. Training an image model from scratch may spend those examples learning edges and textures before it learns which damage matters. A model already trained on many photographs offers a different starting point.

Transfer Learning reuses learned parameters for a new task. The question is whether the starting representation contains useful information, and how much of it should change. A familiar checkpoint is a candidate, not evidence that the new problem is solved.

## Core idea

Separate a model into an **encoder**, which turns an input into features, and a **prediction head**, which maps those features to the required output. Replace the original head when its labels do not match the new task.

First, the encoder can stay **frozen** while the new head learns. Alternatively, **fine-tuning** lets selected encoder parameters change too. Both reuse a learned starting point. A frozen encoder offers stability, but its head cannot recover distinctions the encoder has discarded.

[PyTorch's transfer-learning tutorial](https://docs.pytorch.org/tutorials/beginner/transfer_learning_tutorial.html) implements both pretrained initialization with fine-tuning and training a replacement head with the earlier parameters frozen.

## How it works

Choose a source checkpoint whose inputs, training history, and permitted uses suit the target. Preserve its expected input scaling, vocabulary, or other preprocessing. Compatible input dimensions alone do not establish compatibility.

Set aside target validation and test examples before adapting anything. Train a replacement head on target training labels with the encoder frozen. Use validation results to decide whether to retain that configuration or unfreeze selected layers, usually with a cautious learning rate. Keep the final test set outside those choices. Compare with a credible simple baseline and, where feasible, training without the transferred initialization.

Freezing requires attention to model state as well as gradient updates. For example, normalization layers can maintain running statistics. The [Keras guide](https://keras.io/guides/transfer_learning/) explains its BatchNormalization behavior, recommends keeping those layers in inference mode during its fine-tuning workflow, and requires recompilation after changing trainability. Check the equivalent rules in the framework actually used.

## Worked examples

### A head cannot reconstruct a missing input

This computed teaching example uses fictional, dimensionless inputs. It stipulates a starting encoder rather than running pretraining. Each input has two numbers, x₁ and x₂. The encoder produces one feature, **h = a x₁ + b x₂**, starting with a = 1 and b = 0. Thus h initially retains only x₁. A one-parameter head predicts **ŷ = w h**, starting with w = 1. There are no biases.

The target requires both inputs: y = x₁ + x₂.

| Training input (x₁, x₂) | Target y | Starting prediction |
| ----------------------- | -------- | ------------------- |
| (1, 0)                  | 1        | 1                   |
| (−1, 0)                 | −1       | −1                  |
| (0, 1)                  | 1        | 0                   |
| (0, −1)                 | −1       | 0                   |

Measure training loss as **half the mean squared error**: square each prediction error, average over four rows, then divide by two. Initially the loss is **(0 + 0 + 1 + 1) / 8 = 0.25**. This convention simplifies the gradient; it is not an accuracy percentage.

With a frozen encoder, the last two inputs both become h = 0. Any head receiving only that identical feature must give them the same answer. Here the best w is already 1, so updating the head leaves loss at **0.25**.

Fine-tuning opens another route. For this batch, the loss gradient for b is **−0.5**; the gradients for a and w are zero. With learning rate 0.5, subtracting the scaled gradient changes b to **0 − 0.5 × (−0.5) = 0.25**. The last two predictions become 0.25 and −0.25. Loss becomes **(0 + 0 + 0.75² + 0.75²) / 8 = 0.140625**. The encoder now carries some information about x₂.

![A starting encoder retains only the first input. After one computed update, the frozen route keeps that direction while fine-tuning introduces a contribution from the second input and lowers training loss.](../assets/machine-learning/transfer-learning.svg 'Compare the encoder directions and the loss bars after one update. Fine-tuning introduces a second-input contribution that the frozen representation lacks. These are training calculations on four invented rows, not measured transfer performance.')

The explorer trains both routes from the same stipulated starting values. Its second task uses y = x₁, which the starting feature already preserves; both routes begin with zero loss. Changing tasks resets the models so the comparison starts fairly.

```patternverse-widget
{
  "src": "ml-transfer-learning.html",
  "title": "Frozen features and fine-tuning explorer",
  "height": 1200,
  "fallback": "For target y = x₁ + x₂, the starting encoder keeps only x₁. One full-batch update leaves frozen-encoder loss at 0.250, while fine-tuning changes b from 0 to 0.25 and lowers half mean squared error to 0.140625. These four-row training results do not measure generalization."
}
```

### Replacing an image classifier's original labels

In the fictional packaging case, a pretrained image encoder might produce 512 features per photograph. A new linear head for three damage categories needs **512 × 3 + 3 = 1,539 parameters**, including three biases. This describes a proposed interface, not a claim that any particular checkpoint will recognize the damage.

A documented counterpart is PyTorch's ants-and-bees tutorial: it loads an ImageNet-pretrained ResNet18, replaces its final layer with two outputs, and contrasts parameter freezing with fine-tuning. It demonstrates an implementation workflow. Its dataset and results do not verify the packaging application.

### Adapting a language model to classification

[Howard and Ruder's ULMFiT paper](https://aclanthology.org/P18-1031/) documents transfer from language-model training into text classification, including adaptation to target-domain text and classifier fine-tuning. This provides a text example of reusing learned parameters for a different output task. Supplying example messages in a prompt is a different mechanism: it need not change parameters at all.

## Assumptions for correctness

The source representation must retain, or be adaptable to capture, information relevant to the target. [Yosinski and colleagues](https://arxiv.org/abs/1411.1792) found that transferability depended on layer specialization and source–target task differences in their image experiments. Their findings support checking suitability, not a universal rule about which layer to freeze.

Evaluation must represent deployment, with duplicates, related entities, and time boundaries handled appropriately. Pretraining data can overlap a target benchmark; disclose known overlap and uncertainty about provenance. Retain the source checkpoint, preprocessing, adapted weights, and label mapping as one reproducible release.

## When to use it

Use transfer when target labels or training resources are limited and a suitable pretrained model exists. Frozen features are a useful first comparison when the representation appears relevant. Fine-tuning is worth testing when validation evidence suggests that adapting the representation helps.

If simple target features already solve the problem, or source inputs differ fundamentally, a smaller model trained directly may be preferable.

## Tradeoffs and operating costs

Freezing reduces the parameters being optimized, but every input still passes through the encoder. Cached features can save repeated encoder computation when preprocessing and features stay fixed. Fine-tuning invalidates that cache and requires more training state and computation.

A tiny head does not make a large encoder cheap to serve. Measure target-device latency and memory separately from training cost. Checkpoint selection, validation runs, provenance review, and future updates also require maintenance.

## Common mistakes and limitations

**Negative transfer** means reuse makes target performance worse than the relevant alternative. Source-domain habits can be unhelpful, and extensive fine-tuning on a small dataset can overfit or erase useful behavior. Choose layers and stopping points using validation evidence rather than assuming more trainable parameters are better.

The explorer has no held-out data, source-training process, or realistic image or text distribution. Its loss reduction demonstrates a representational constraint and an update, not improved generalization. The appropriate baseline and target evaluation remain essential.

## Related patterns

[[ml-self-supervised-pretraining|Self-Supervised Pretraining]] describes how training targets can be constructed from raw data; transfer describes reuse afterward. [[ml-embedding|Embedding]] explains the representations an encoder can supply. [[ml-knowledge-distillation|Knowledge Distillation]] trains a student from a teacher's behavior, rather than requiring copied parameters. [[ml-few-shot-in-context-learning|Few-Shot In-Context Learning]] supplies demonstrations at inference time without updating weights. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] keeps adaptation and assessment information apart.

## Sources and further reading

- [PyTorch: Transfer Learning for Computer Vision](https://docs.pytorch.org/tutorials/beginner/transfer_learning_tutorial.html) — executable ResNet18 replacement-head and fine-tuning workflows.
- [Keras: Transfer learning and fine-tuning](https://keras.io/guides/transfer_learning/) — staged adaptation, trainability, compilation, and normalization-state handling.
- [Yosinski and colleagues: How transferable are features in deep neural networks?](https://arxiv.org/abs/1411.1792) — experiments on specialization, layer reuse, and task differences.
- [Howard and Ruder: Universal Language Model Fine-tuning for Text Classification](https://aclanthology.org/P18-1031/) — a documented text-transfer method.
