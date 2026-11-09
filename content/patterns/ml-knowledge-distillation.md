---
id: ml-knowledge-distillation
type: pattern
title: 'Knowledge Distillation'
summary: 'Train a student to reproduce useful behavior from a teacher, often combining teacher probabilities with verified labels to meet deployment constraints.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A support classifier combines several large models and routes messages accurately, but running the [[ml-ensembling|ensemble]] for every request is too slow for a phone application. A smaller model trained only on the available intent labels loses useful distinctions.

Knowledge Distillation uses the expensive model as a teacher during training. A student learns from its behavior and can then run independently. The purpose is often lower deployment cost, although distillation does not inherently require a smaller student or guarantee a faster system.

## Core idea

Teach the student more than the teacher's winning class. A distribution such as Delivery 70%, Billing 25%, Account 5% communicates different preferences from Delivery 70%, Billing 5%, Account 25%, even though both have the same top answer.

These **soft targets** can provide information that a single class label discards. They can also communicate systematic mistakes. The student is learning to imitate a source, not receiving a certificate of truth.

Distillation transfers behavior through training examples. Teacher and student need not share an architecture or copy the same parameters. Other variants match intermediate features or generated sequences rather than class probabilities.

## How it works

Freeze a trained teacher, collect inputs representative of the intended use, and obtain its outputs. Train the student on those same inputs. Where verified labels exist, combine imitation with ordinary supervised learning. Only the student changes in this offline method.

A classifier produces **logits**, unnormalized class scores. **Softmax** converts them to probabilities: exponentiate each score and divide by their sum. To soften the distribution, first divide every score by a positive **temperature T**. Larger T spreads probability more evenly without changing class order. Use the same T for teacher and student during matching.

The student has two jobs: predict the verified label and match the teacher's distribution. **Alpha (α)** weights imitation from zero to one; the label term receives weight 1 − α. Matching a teacher can teach distinctions among alternatives, but it can also teach a wrong preference.

Choose the student, temperature, and mixture on validation data. Evaluate deployment outputs at the intended inference setting, ordinarily T = 1. Distillation temperature serves training and is not automatically a probability-calibration setting for serving.

## Worked examples

### Three support intents

In this fictional example, class order is Delivery, Billing, Account. Teacher logits **[4, 2, 0]** produce:

| Temperature | Delivery | Billing | Account |
| ----------- | -------: | ------: | ------: |
| 1           |    86.7% |   11.7% |    1.6% |
| 2           |    66.5% |   24.5% |    9.0% |
| 4           |    50.6% |   30.7% |   18.6% |

At T = 2, divide [4, 2, 0] by two to get [2, 1, 0]. Delivery then receives **exp(2)/(exp(2) + exp(1) + exp(0)) ≈ 66.5%**. Billing and Account share more of the remaining mass. Delivery stays first; the softened preferences still need to be useful for this task.

The fictional student starts at [0, 0, 0], giving each class probability 1/3. The verified label is Delivery. Its label loss is **−ln(1/3) ≈ 1.099**: a penalty for assigning the correct class low probability. At T = 2, the temperature-scaled imitation loss is **1.065**. With α = 0.5, the combined loss is **0.5 × 1.099 + 0.5 × 1.065 ≈ 1.082**.

![Teacher probabilities soften at higher temperature, and a student combines teacher matching with a separately supplied true label before deployment at temperature one.](../assets/machine-learning/knowledge-distillation.svg 'Higher temperature spreads teacher probability across the three classes without changing their order. The student combines this imitation signal with a verified Delivery label. Its displayed result comes from one fictional training case.')

One gradient step with learning rate 0.5 changes the student's logits to approximately **[0.333, −0.128, −0.205]**, reducing combined loss to **0.773**. After ten steps, loss is **0.128** and its temperature-one Delivery probability is **84.7%**.

The update raises Delivery's score and lowers the alternatives. These are actual updates to three free scores for one example, not a compressed network or held-out result. Changing a setting restarts the student.

### Optional: the exact objective

The explorer uses **L = (1 − α)CE(y, q₁) + αT²KL(pₜ || qₜ)**. Here y is the verified label, pₜ is the teacher distribution, qₜ is the student distribution at temperature T, and q₁ is the student's ordinary output. Cross-entropy (CE) is the label penalty above. Kullback–Leibler divergence (KL) measures teacher-to-student mismatch using natural logarithms.

The [PyTorch tutorial](https://docs.pytorch.org/tutorials/beginner/knowledge_distillation_tutorial.html) implements this combined approach with student-only gradients. T² compensates for temperature-dependent gradient scale; it does not make temperatures equivalent. With a fixed teacher, soft-target cross-entropy differs from KL by the teacher's entropy and gives the same student gradient.

```patternverse-widget
{
  "src": "ml-knowledge-distillation.html",
  "title": "Knowledge distillation temperature and student explorer",
  "height": 1200,
  "fallback": "A three-score student learns from a fixed teacher and one verified label. Ten computed updates reduce combined loss from 1.082 to 0.128. This shows the objective, not generalization or deployment speed."
}
```

### A teacher can teach the wrong answer

Switch to teacher logits **[0, 4, 2]** while the true class remains Delivery. Set α = 1, so only imitation drives training. After ten steps, the scaled teacher mismatch falls from **1.065 to 0.057**, but hard-label CE rises from **1.099 to 3.074**. At inference, the student assigns **83.1%** to Billing.

The student has become a better imitator and a worse fit to the supplied label. Teacher agreement and ground-truth quality are different measurements. Mixing in labels can change the tradeoff, but no universal mixture fixes a systematically unsuitable teacher.

### Documented variants

[DistilBERT](https://arxiv.org/abs/1910.01108) distills during language-model pretraining, combining a language-modeling objective, a distillation objective, and a cosine-distance objective before downstream adaptation. Its reported size and performance results concern that architecture and evaluation setup; they are not a general compression ratio.

[Sequence-Level Knowledge Distillation](https://aclanthology.org/D16-1139/) studies machine translation using teacher-generated sequences as student training targets. This differs from matching the full class distribution at every step. If a service provides only generated text or a winning label, it does not expose the logits needed to reproduce this explorer's temperature calculation.

## Assumptions for correctness

Teacher and student outputs must refer to the same classes in the same order. A silent label permutation can produce a perfectly computed loss for the wrong task. Inputs, preprocessing, and target definitions must also align.

The teacher must provide useful behavior on the transfer inputs, and those inputs must cover relevant deployment conditions. Student capacity and optimization must be sufficient to learn it. A larger teacher is not necessarily the most suitable teacher.

Freeze the teacher in this offline method and prevent gradients from updating it. Keep evaluation independent of both teacher-target generation and student tuning; duplicated examples or reused test labels can inflate results.

## When to use it

Consider distillation when a useful model or ensemble is expensive to serve and a separate student can meet latency, memory, energy, or throughput requirements. It can also transfer behavior across architectures.

If an existing compact model already meets the quality target, distillation may add little. First establish which deployment constraint actually matters.

## Tradeoffs and operating costs

Generating teacher outputs consumes inference time, storage, and sometimes service fees. Caching outputs saves repeated teacher computation but ties the cache to an exact checkpoint, class mapping, preprocessing pipeline, and input view.

Compare against the same student trained without distillation. Measure task quality and important slices alongside actual hardware latency, memory, and model size. Fewer parameters do not establish faster execution, and the teacher need not remain in the serving path.

## Common mistakes and limitations

Applying softmax twice, reversing the KL direction, mismatching temperatures, or forgetting the chosen loss reduction changes the objective. Different implementations may use alpha for different terms; check the definition rather than copying a coefficient.

Teachers can transfer bias, overconfidence, and errors. Students can also outperform a teacher in some settings, so teacher accuracy is not a mathematical ceiling. Neither imitation loss nor the explorer's single-example result establishes population performance.

## Related patterns

**Transfer Learning** commonly reuses parameters; distillation reuses behavior through training signals. [[ml-self-supervised-pretraining|Self-Supervised Pretraining]] constructs targets from data and can be combined with distillation. **Pseudo-Labeling** often retains a teacher's winning class rather than its full distribution. [[ml-quantize-for-deployment|Quantization]] changes numerical precision, while **Pruning** removes model components; both can complement distillation. **Feature Distillation**, exemplified by FitNets, transfers intermediate representations.

## Sources and further reading

- [Hinton, Vinyals, and Dean: Distilling the Knowledge in a Neural Network](https://arxiv.org/abs/1503.02531) — soft targets, temperature, and deployment motivation.
- [PyTorch: Knowledge Distillation Tutorial](https://docs.pytorch.org/tutorials/beginner/knowledge_distillation_tutorial.html) — student-only updates, combined losses, and direct student baselines.
- [Sanh and colleagues: DistilBERT](https://arxiv.org/abs/1910.01108) — distillation during pretraining with multiple objectives.
- [Kim and Rush: Sequence-Level Knowledge Distillation](https://aclanthology.org/D16-1139/) — teacher-generated sequence targets for translation.
- [Romero and colleagues: FitNets](https://arxiv.org/abs/1412.6550) — intermediate hints and students with different architectures.
