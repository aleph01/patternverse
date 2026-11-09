---
id: ml-self-supervised-pretraining
type: pattern
title: 'Self-Supervised Pretraining'
summary: 'Learn reusable model parameters from prediction tasks constructed from raw data, then adapt and evaluate them on the task that matters.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A support team has millions of messages but only a few hundred examples labeled by intent. Training its classifier from scratch asks those few labels to teach both the language of support requests and the distinctions between delivery, billing, and account problems.

Self-Supervised Pretraining separates those jobs. First learn from the structure of the unlabeled messages; then use the intent labels to adapt the model. The hope is that the first stage learns features useful for the second. That usefulness is an empirical question, not a consequence of having processed a large corpus.

## Core idea

Construct a prediction task whose targets come from the data itself. Hide part of an input and predict what was hidden, predict the next token from earlier tokens, or learn to associate two views of the same example.

The model receives a training signal without requiring someone to annotate each pretraining example. “Self-supervised” describes where that signal comes from. People still choose the data, objective, architecture, and evaluation.

**Pretraining** also specifies a role: the learned parameters are reused for another stage. A model trained to reconstruct inputs and then discarded has not provided a downstream benefit. Reusing a pretrained checkpoint is a common way to obtain that benefit without repeating its original training run.

## How it works

Choose a corpus relevant to the intended use and a prediction task that rewards useful structure. Define what the predictor may see and where its target comes from. A causal language model predicts a token using earlier tokens only. A masked model predicts hidden content using the remaining context.

Training changes model parameters to reduce errors on that constructed task. Consider a neural text system with an **encoder** that turns messages into numerical features and a **prediction head** that turns those features into outputs. After pretraining, retain the useful parameters and replace a head that serves only the original prediction task.

For an intent classifier, freeze the encoder and train a new classification head, or **fine-tune** by updating some or all of the encoder too. A frozen linear probe is a simple classifier trained on the unchanged features. It checks what information those features already make accessible.

Measure the stages separately. Pretraining loss measures word prediction or another constructed task. Independent intent labels measure the final classifier. Compare with an appropriate existing checkpoint and, where feasible, training without this pretraining, keeping label and optimization budgets explicit.

## Worked examples

### A missing word is a target, not an intent label

Consider the fictional message **“the parcel arrived late.”** Removing the final word creates input **“the parcel arrived [MASK]”** and target **“late.”** Nobody has labeled the message Delivery Complaint; the objective only asks the model to recover an observed word.

At another position, **“the [MASK] arrived late”** has target **“parcel.”** Context on both sides is available. By contrast, next-token prediction at that position sees only **“the”** and targets **“parcel.”** Showing “arrived late” to a causal predictor would violate its information contract.

[BERT](https://aclanthology.org/N19-1423/) documents masked language pretraining and adaptation. Its original method also uses next-sentence prediction and a fuller masking policy than this example.

![Raw text creates word-prediction targets. Learned model parameters are then reused for a separate labeled intent task whose performance needs independent evaluation.](../assets/machine-learning/self-supervised-pretraining.svg 'Follow the change in target: raw text supplies words during pretraining; reviewers supply intent labels during adaptation. The encoder is reused, while the task head can change. The separate count explorer below illustrates word loss only.')

### From word prediction to intent classification

Continue the fictional support example with a neural model. During masked-word training, its encoder processes “the parcel arrived [MASK]”; the word-prediction head uses those features to predict “late.” Training updates both components from the observed word target.

For routing, replace the word head with an intent head. A reviewer labels “my parcel is late” as Delivery Complaint. With the encoder frozen, only the new head learns from that intent label; with fine-tuning, the encoder can change too. At inference, the complete message enters the encoder and the intent head returns class scores. No missing-word answer is required.

The useful transfer is the encoder's learned parameters, not a table that converts “late” directly into an intent. Whether those parameters help must be checked on separate routing examples. This is a proposed fictional workflow, not a measured gain.

### Optional: inspect target construction and loss

The explorer fits an intentionally small conditional word-count model to five fictional lines. Repeated text counts as repeated training data:

| Raw pretraining line       | Occurrences |
| -------------------------- | ----------: |
| the parcel arrived late    |           2 |
| the parcel arrived early   |           1 |
| the refund arrived safely  |           1 |
| the refund arrived quickly |           1 |

Five lines supply 20 targets over eight distinct words. Boundary markers indicate sentence context but are not targets.

This count model uses only the preceding word. After **“arrived,”** it has seen late twice, and early, safely, and quickly once each: five observations. **Add-one smoothing** adds one count to each of eight vocabulary words, including words not seen in this context. Safely therefore receives **(1 + 1)/(5 + 8) = 2/13 ≈ 15.4%**. Its loss is **−ln(2/13) ≈ 1.872 nats**; a lower target probability means a larger loss. Nats indicates a natural, base-e logarithm.

The query **“the parcel arrived safely”** is absent from training. Its final word checks the word-prediction objective. Late receives a higher probability because it appeared more often after arrived.

The explorer switches between immediate left-word contexts and masked left/right contexts. Smoothing gives a uniform distribution for an unseen context. These tables demonstrate targets and loss, not neural features or downstream transfer.

```patternverse-widget
{
  "src": "ml-self-supervised-pretraining.html",
  "title": "Self-supervised target and loss explorer",
  "height": 1200,
  "fallback": "Five fictional lines supply 20 word targets. The count model assigns safely probability 2/13 and loss 1.872 nats. It demonstrates word prediction, not neural representation transfer."
}
```

### Two image views can define a different objective

[SimCLR](https://proceedings.mlr.press/v119/chen20j.html) is a documented contrastive approach. It forms transformed views of an image and trains representations using their relationship, without requiring category labels for that pretraining stage. Its evaluation separately examines the learned features and adaptation.

The view policy matters. For a fictional product-color classifier, removing color from every view may encourage invariance to information the downstream task needs. Self-supervision does not make a transformation semantically safe.

[wav2vec 2.0](https://arxiv.org/abs/2006.11477) extends the sequence to speech: masked contrastive pretraining, then adaptation using transcripts.

## Assumptions for correctness

Targets must be derived without accidentally revealing the answer. Masked reconstruction should not leave a direct copy accessible through an unintended input channel. Causal models must enforce their visibility restriction during training as well as inference.

The objective must preserve information needed downstream, and the corpus must cover relevant variation. A lower proxy loss can reflect easy backgrounds, common phrases, or memorization. It does not establish intent recognition, factual accuracy, fairness, or robustness.

Define evaluation boundaries before assembling the corpus. Overlapping documents, customers, recordings, or near-duplicates can contaminate results. If evaluation inputs are deliberately included as unlabeled pretraining data, report that transductive setting rather than claiming performance on wholly unseen examples.

## When to use it

Consider this pattern when raw data is plentiful, task labels are scarce, and reusable representations plausibly connect the two. Adapting an appropriate existing checkpoint is often the practical starting point.

Training from scratch requires stronger justification: a useful checkpoint may already exist, and a small task may not repay substantial pretraining. Severe domain mismatch can reduce or reverse the benefit.

## Tradeoffs and operating costs

Pretraining consumes computation, storage, data preparation, and experiment time. Reusing a checkpoint replaces some training cost with compatibility and provenance checks: tokenizer, preprocessing, architecture, license, and intended data domain must fit.

Record corpus versions, deduplication rules, objectives, and checkpoint lineage. Budget separately for adaptation labels and independent evaluation. Compare frozen features and fine-tuning when useful; the cheaper option may suffice, while full fine-tuning adds tuning effort and can lose previously useful behavior.

## Common mistakes and limitations

Processing unlabeled data is not enough: identify the constructed target and loss. Copying the input through an easy reconstruction path can solve the pretext task without useful features. Contrastive methods also need safeguards against uninformative representations; simply making every embedding identical is not a useful solution.

Choosing a final system solely by its pretraining loss can favor the wrong model. A better word predictor need not be a better router. Compare the adapted classifier on independent task labels before claiming accuracy or label savings.

## Related patterns

[[ml-transfer-learning|Transfer Learning]] is the broader reuse strategy; self-supervision is one way to obtain the starting parameters. [[ml-weak-supervision|Weak Supervision]] uses imperfect labeling sources, whereas these pretraining targets are constructed from observed data or view relationships. [[ml-label-preserving-augmentation|Label-Preserving Augmentation]] can create the views, but does not itself define the self-supervised loss. [[ml-knowledge-distillation|Knowledge Distillation]] learns from a teacher's outputs. [[ml-few-shot-in-context-learning|Few-Shot In-Context Learning]] supplies examples at inference time rather than updating parameters in this pretraining stage.

## Sources and further reading

- [Devlin and colleagues: BERT](https://aclanthology.org/N19-1423/) — masked pretraining, the original next-sentence objective, and downstream fine-tuning.
- [Howard and Ruder: Universal Language Model Fine-tuning for Text Classification](https://aclanthology.org/P18-1031/) — language-model pretraining and adaptation for classification.
- [Chen and colleagues: A Simple Framework for Contrastive Learning of Visual Representations](https://proceedings.mlr.press/v119/chen20j.html) — SimCLR, view construction, and representation evaluation.
- [Baevski and colleagues: wav2vec 2.0](https://arxiv.org/abs/2006.11477) — learning from untranscribed speech followed by supervised adaptation.
- [Brown and colleagues: Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) — autoregressive pretraining and evaluation through in-context examples without task-specific gradient updates.
