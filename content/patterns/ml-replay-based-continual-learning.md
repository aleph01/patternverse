---
id: ml-replay-based-continual-learning
type: pattern
title: 'Replay-Based Continual Learning'
summary: 'Mix selected past examples into ongoing training to retain useful earlier behavior while learning from new data.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A support-ticket model learns to recognize a new product's issues. After the update, it handles those tickets better but starts misrouting older products' requests. The old examples have disappeared from recent training batches, and improving the new behavior has changed parameters the old behavior depended on.

Replay-Based Continual Learning keeps selected past examples available during later updates. Its purpose is to reduce forgetting while continuing to learn. It cannot decide which old behavior remains desirable: retaining a valid capability and preserving an obsolete rule are different goals.

## Core idea

Maintain a bounded **replay buffer** of earlier examples. Mix examples from that buffer with current examples so that updates receive feedback about both. Old examples make earlier errors visible to the optimizer again, rather than relying on the current model weights to preserve everything implicitly.

A simple supervised replay baseline can be competitive in continual-learning experiments, even with small memories. That is evidence for testing a straightforward baseline, not a guarantee that any small buffer represents every important case. [Chaudhry et al.](https://arxiv.org/abs/1902.10486).

## How it works

Specify what should remain useful, then choose a memory budget and a retention policy. FIFO keeps recent records but can discard an older cohort completely. Reservoir sampling gives historical records equal inclusion probability under ideal uniform draws; it does not guarantee coverage of every class or cohort. Explicit quotas can protect selected groups, provided those groups are known and the budget can accommodate them. Mammoth implements reservoir replacement as a draw over the number of records seen so far. [Buffer implementation](https://github.com/aimagelab/mammoth/blob/master/utils/buffer.py).

At each update, combine current-data loss with replay loss. For example, J = (1 − ρ)Lnew + ρLmemory, where each term is a mean and ρ controls their relative influence. Memory capacity and replay weight are separate choices: storing more records need not increase the old-data weight. If batches are simply concatenated, their relative sizes instead determine that weighting.

Update the buffer according to the chosen lifecycle. In a streaming implementation, sampling before inserting the current record avoids treating that record as historical replay in its own update. Preserve compatible preprocessing and labels so stored inputs retain their meaning.

Evaluate earlier and newer cohorts after successive updates. Keep evaluation data outside the replay buffer when estimating generalization. An aggregate endpoint alone can conceal a capability that deteriorated midway or a small cohort lost by the retention policy.

## Worked examples

### Fictional score predictor: interference in shared weights

Consider a zero-bias linear model with three feature flags and initial weights w = (1, −1, 0). Its prediction is the weighted sum of those flags.

| Cohort           | Input flags | Target | Historical records |
| ---------------- | ----------- | ------ | ------------------ |
| A                | (1, 0, 0)   | 1      | A1–A4              |
| B                | (0, 1, 0)   | −1     | B1–B4              |
| C, arriving next | (1, 1, 1)   | 1      | none yet           |

The initial model fits A and B exactly but predicts 0 for C. For C, prediction minus target is **0 − 1 = −1**. The half-squared-error gradient is that error times its input flags: **(−1, −1, −1)**. Subtracting 0.25 times the gradient adds 0.25 to every weight. C's error falls, but A and B both acquire errors because their weights changed too. The model has enough capacity to fit everything: (1, −1, 1) would satisfy all three cohorts.

Build a four-record buffer with two records per historical cohort: A3, A4, B3, B4. Freeze it during this short adaptation episode. With ρ = 0.5, each update combines the new gradient with the full buffer's mean gradient. The first update reaches (1.125, −0.875, 0.125). After twelve updates, the computed comparison is:

| Training rule                         | Old A/B mean squared error | New C mean squared error |
| ------------------------------------- | -------------------------- | ------------------------ |
| Current only, step size 0.25          | 0.1111                     | less than 10⁻¹²          |
| Current only, matched step size 0.125 | 0.1103                     | 0.0000126                |
| Balanced replay, step size 0.25       | 0.0619                     | 0.0079                   |

The matched control separates replay feedback from merely reducing the new-data step. Replay retains more old behavior at this finite horizon, while new learning is slower. Its weights reach approximately (1.2487, −0.7513, 0.4138). These errors use the same deterministic examples involved in training; they estimate no unseen-data performance.

![Stored examples from two historical cohorts contribute gradients alongside new examples, reducing old-cohort error during a computed adaptation sequence.](../assets/machine-learning/replay-based-continual-learning.svg 'Old-data replay supplies a corrective gradient as the new cohort is learned. Compare old error with the matched current-only control, then inspect the slower new-data improvement. These are computed training errors.')

### Fictional memory omission: a sample is not a coverage promise

Present A1–A4 followed by B1–B4. A four-slot FIFO buffer retains only B. Replaying it protects B more directly while leaving A without a corrective memory gradient.

### Optional: reservoir coverage arithmetic

For an ideal uniform two-record reservoir, 6 of the 28 possible pairs contain only B. The chance of retaining no A is therefore 6/28, about 21.4%. The same holds for B; missing either cohort has probability 12/28, about 42.9%. Equal inclusion probability for individual records does not ensure representative coverage in a particular buffer. Quotas guarantee both cohorts in this example, but require their identities and sufficient slots.

The explorer computes retention, every gradient update, the matched control, and errors by cohort. Its seed selects a reproducible reservoir illustration; the coverage probability assumes ideal uniform sampling. Its historical buffer stays frozen, and current C records share identical inputs and targets. It does not simulate a production stream or neural network.

```patternverse-widget
{
  "src": "ml-replay-based-continual-learning.html",
  "title": "Continual replay buffer explorer",
  "height": 1200,
  "fallback": "Four historical slots and replay weight 0.5 reduce old-cohort error during twelve computed updates, while slowing new learning. Buffer policies can omit a cohort. Reported errors concern the training examples, not unseen cases."
}
```

### Verified implementation and variants

Mammoth's supervised ER method samples a nonempty buffer, concatenates old and current examples, takes an optimizer step, then inserts current examples. Dark Experience Replay additionally matches stored past logits, preserving aspects of earlier model behavior. CLEAR combines replay, off-policy learning, and behavioral cloning in reinforcement learning. These documented implementations differ from the explorer's full-buffer linear updates. [ER code](https://github.com/aimagelab/mammoth/blob/master/models/er.py), [DER](https://proceedings.neurips.cc/paper/2020/hash/b704ea2c39778f07c617f6b7ce480e9e-Abstract.html), [CLEAR](https://arxiv.org/abs/1811.11682).

## Assumptions for correctness

Retained examples must describe behavior still worth learning. Labels, feature definitions, and output meanings need compatible versions. When the underlying relationship changes, replaying stale labels can oppose useful adaptation. Continual learning under concept drift therefore requires deciding what to retain and what to replace. [Korycki and Krawczyk](https://arxiv.org/abs/2104.11861).

The buffer must cover relevant variation, not just frequently occurring examples. A cohort quota alone does not cover variation within that cohort. The model also needs capacity for the behaviors being retained; replay cannot resolve fundamentally contradictory targets for indistinguishable inputs.

## When to use it

Use replay when updates arrive sequentially, earlier capabilities remain valuable, and retaining some historical training data is feasible. Compare with ordinary fine-tuning and, when feasible, joint retraining on the available history.

Define the evaluation setting clearly. Recognizing all accumulated classes without a task identifier is different from receiving the task identity at inference. A buffer policy that relies on known cohorts should not be described as discovering them automatically.

## Tradeoffs and operating costs

Memory consumes storage and additional training work. Inputs, labels, timestamps, versions, and optional logits all contribute to the budget. Retained records need appropriate access and deletion handling; a buffer is still stored training data.

Replay weight controls an operating balance, not an automatic optimum. Too little influence can leave substantial forgetting; too much can delay new learning or reinforce outdated examples. Finite memory also makes selection, refresh, and reproducibility part of the training system.

## Common mistakes and limitations

A balanced buffer does not imply balanced evaluation performance. Repeatedly replaying a tiny set can make its measured errors unrepresentative of unseen historical cases. The explorer deliberately reports fixture MSE and exposes each retained ID.

Separating buffer capacity from replay frequency matters: doubling storage without replaying useful cases may accomplish little. Protecting old performance at every cost can also preserve harmful mistakes. Track old cohorts, new cohorts, and any intentionally retired behavior separately, with evaluation splits that reflect deployment.

## Related patterns

[[ml-knowledge-distillation|Knowledge Distillation]] transfers behavior through model outputs; DER combines that mechanism with replayed inputs. [[ml-self-supervised-pretraining|Self-Supervised Pretraining]] establishes representations before task adaptation, while replay maintains earlier behavior during successive updates.

[[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] keeps evaluation examples out of training memories. [[ml-slice-based-evaluation|Slice-Based Evaluation]] exposes which cohorts lose quality; it measures the retention problem without supplying replay updates.

## Sources and further reading

- [Chaudhry et al., On Tiny Episodic Memories in Continual Learning (2019)](https://arxiv.org/abs/1902.10486): simple supervised replay and small memories.
- [Mammoth: supervised Experience Replay](https://github.com/aimagelab/mammoth/blob/master/models/er.py): sampling, mixed-batch training, and insertion order.
- [Mammoth: buffer and reservoir selection](https://github.com/aimagelab/mammoth/blob/master/utils/buffer.py): retention mechanisms.
- [Buzzega et al., Dark Experience for General Continual Learning (NeurIPS 2020)](https://proceedings.neurips.cc/paper/2020/hash/b704ea2c39778f07c617f6b7ce480e9e-Abstract.html): replay with stored-logit matching.
- [Rolnick et al., Experience Replay for Continual Learning (NeurIPS 2019)](https://arxiv.org/abs/1811.11682): CLEAR in reinforcement learning.
- [Korycki and Krawczyk, Class-Incremental Experience Replay under Concept Drift (CVPR Workshops 2021)](https://arxiv.org/abs/2104.11861): retaining useful knowledge while adapting outdated concepts.
