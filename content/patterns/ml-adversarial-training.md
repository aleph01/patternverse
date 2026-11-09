---
id: ml-adversarial-training
type: pattern
title: 'Adversarial Training'
summary: 'Train against deliberately difficult, constrained input perturbations to improve robustness within an explicit threat model.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

An image classifier recognizes a package correctly. Someone changes many pixel values by small, coordinated amounts, and the prediction flips even though the package remains recognizable. Excellent accuracy on ordinary test images did not establish resistance to deliberately chosen inputs.

Adversarial Training makes such difficult inputs part of learning. Its purpose is robustness to a specified set of changes, not immunity to every attack or every distribution shift. The central design decision is what the adversary may change while the original label remains the intended answer.

## Core idea

Ordinary training minimizes average loss on observed examples. Adversarial training instead asks, for each example, which allowed perturbation makes the current model's loss largest, then trains the model to reduce that loss.

The objective has two parts: **maximize loss over allowed input changes; minimize the resulting average over model parameters**. This robust-optimization formulation makes the threat model explicit. In neural networks, both optimizations are usually approximate. A successful attack demonstrates a weakness; an unsuccessful search does not prove that none exists. [Madry et al.](https://arxiv.org/abs/1706.06083).

## How it works

Define the editable inputs, distance constraint, budget ε, valid input range, and adversary's knowledge. An L∞ budget limits each coordinate's absolute change; an L2 budget limits the Euclidean length of the whole change vector. Their numerical radii are not interchangeable, and feature scaling changes what a radius permits.

Generate adversarial inputs against the current model. The fast gradient sign method, FGSM, takes one input-gradient step that increases loss. For an L∞ budget, the step is ε times the sign of that gradient. It is exact for the binary linear logistic model used below, but is generally an approximation for a neural network. [Goodfellow et al.](https://arxiv.org/abs/1412.6572).

Projected gradient descent attacks, commonly called PGD despite maximizing loss, repeat such steps and project back into the permitted region. Update model weights to reduce loss on the generated inputs, then regenerate attacks as the model changes. Random starts help explore different attack trajectories; they do not establish global optimality. [Madry et al.](https://arxiv.org/abs/1706.06083).

Keep model selection separate from final evaluation. Measure clean accuracy and resistance to attacks that know the complete prediction pipeline, using stronger or diverse evaluation attacks rather than relying only on the training attack. AutoAttack was developed to address unreliable evaluations, including poor attack tuning and gradient masking. [Croce and Hein](https://proceedings.mlr.press/v119/croce20b.html).

## Worked examples

### Fictional single input: a small coordinate can carry a large decision

Let x = (1, 0.2), label y = +1, and score s = 0x₁ + 5x₂. Predict +1 when s ≥ 0, otherwise −1. The clean score and signed margin y × s are both 1.

Under an L∞ budget of 0.25, δ = (0, −0.25) is allowed. The perturbed input is (1, −0.05), the score becomes −0.25, and the prediction is wrong. This is the exact loss-maximizing direction for this linear model, not a sampled noise direction.

### Optional: the exact linear-model attack

The dot product **w·x** is the weighted sum of input coordinates. The signed margin **y(w·x)** is positive for a correct binary prediction away from the boundary. For any binary linear score w·x, worst-case signed margin is **y(w·x) − ε‖w‖₁** under L∞, or **y(w·x) − ε‖w‖₂** under L2. Logistic loss is log(1 + exp(−margin)), so reducing the margin maximizes loss. Here **‖w‖₁** sums absolute weights, while **‖w‖₂** is their Euclidean length. The formulas assume real-valued features without additional clipping.

### Fictional training set: changing which cue the model uses

Eight observations have a broad shape score x₁ and a fine pattern score x₂. Repeated rows represent distinct records.

| Label | x₁  | x₂   | Count |
| ----- | --- | ---- | ----- |
| +1    | 1   | 0.2  | 3     |
| +1    | −1  | 0.2  | 1     |
| −1    | −1  | −0.2 | 3     |
| −1    | 1   | −0.2 | 1     |

Compare three fixed, zero-bias models: fragile cue w = (0, 5), both cues w = (1, 2), and broad cue w = (1, 0). Minimizing clean mean logistic loss selects the fragile cue: loss 0.3133 and accuracy 8/8. At L∞ radius 0.25, its worst-case mean loss is 0.8259 and robust accuracy is 0/8.

Minimizing worst-case mean loss among these three selects the broad cue: loss 0.6656, with clean and robust accuracy both 6/8. On the first input, its margin falls from 1 to 0.75 and remains correct. The two shape exceptions remain mistakes. Some opposite-label perturbation neighborhoods overlap at this radius, so perfect robustness is impossible on this fixture.

Change the constraint to L2 with the same numerical radius. The model using both cues now wins, with worst-case loss approximately 0.6269. The change reflects a different feasible set, not a universally better defense. All results are training-fixture calculations; they estimate no deployment accuracy. The explorer solves the continuous inner attack exactly and the outer choice exhaustively over three models. It does not train a neural network.

![A bounded neighborhood around a fictional input contains a worst-case perturbation; model selection trades clean accuracy against worst-case loss.](../assets/machine-learning/adversarial-training.svg 'The perturbation box defines what may change. Compare the fragile model’s clean success with its attacked failure, then the broad model’s tradeoff. The results concern eight fictional training records under the stated norm and radius.')

```patternverse-widget
{
  "src": "ml-adversarial-training.html",
  "title": "Adversarial training neighborhood explorer",
  "height": 1200,
  "fallback": "At L∞ radius 0.25, clean-loss selection gives 100% clean and 0% robust accuracy on eight fictional training records. Worst-case-loss selection gives 75% for both. Attacks and model choices are solved exactly."
}
```

### Verified implementation: regenerate, then update

The MadryLab MNIST challenge code creates perturbed batches before each training update and feeds those batches to the optimizer. Its L∞ PGD implementation optionally starts randomly, takes gradient-sign steps, and clips to both the perturbation budget and valid pixel range [0, 1]. This is an implementation reference, not a benchmark reproduced by the explorer. [Training loop](https://github.com/MadryLab/mnist_challenge/blob/master/train.py), [attack implementation](https://github.com/MadryLab/mnist_challenge/blob/master/pgd_attack.py).

## Assumptions for correctness

The allowed changes must represent the robustness question and respect input semantics. Independently moving tabular coordinates may create impossible records; small numerical edits to categorical encodings need not preserve meaning. A norm bound alone does not establish label preservation. The fictional overlapping neighborhoods deliberately expose this tension.

Evaluation must include the preprocessing, clipping, and randomness actually used at inference. The adversary must attack the deployed decision procedure. Claims should name the norm, radius, data, and evaluation method; robustness outside those conditions needs separate evidence.

## When to use it

Use this pattern when deliberately chosen input changes are a plausible failure mode and a defensible perturbation model exists. Compare against ordinary training and against simpler augmentation under the same evaluation conditions.

If the main problem is a new camera, a shifted population, or stale labels, bounded adversarial robustness addresses only part of that problem. Improving it does not establish general resilience to natural changes.

## Tradeoffs and operating costs

Iterative attack generation adds input-gradient calculations to training. Stronger searches, more restarts during evaluation, and repeated validation increase compute costs. Threat-model design and attack maintenance also require work.

Clean accuracy can decrease as robust training emphasizes different features. This is possible even beyond optimization difficulties: Tsipras and colleagues establish such a tension in a constructed setting and study related empirical behavior. It is not a claim that every robustness improvement must reduce accuracy. [Tsipras et al.](https://arxiv.org/abs/1805.12152).

## Common mistakes and limitations

Training once on a fixed collection of attacks can miss weaknesses of the updated model. Testing only the training attack can reward defenses that obstruct that particular search. Gradient masking can make gradient-based attacks look ineffective while other attacks succeed. Diverse attacks improve empirical scrutiny; they do not certify all permitted inputs. [Croce and Hein](https://proceedings.mlr.press/v119/croce20b.html).

An excessive perturbation budget may demand contradictory predictions around neighboring classes. An unrealistic budget may optimize the wrong protection. Report remaining errors and clean performance alongside attacked performance, and distinguish empirical resistance from a mathematical robustness certificate.

## Related patterns

[[ml-label-preserving-augmentation|Label-Preserving Augmentation]] uses chosen transformations; adversarial training chooses difficult inputs using the current model's loss. Both need justified label assumptions. [[ml-worst-group-optimization|Worst-Group Optimization]] emphasizes the highest-loss groups instead of searching input neighborhoods.

[[ml-domain-invariant-representation-learning|Domain-Invariant Representation Learning]] can use an adversarial domain classifier to remove domain clues. That adversarial objective differs from attacking task inputs. [[ml-behavioral-testing|Behavioral Testing]] specifies expected capabilities and can reveal failures, without itself optimizing a robust training objective.

## Sources and further reading

- [Goodfellow, Shlens, and Szegedy, Explaining and Harnessing Adversarial Examples (ICLR 2015)](https://arxiv.org/abs/1412.6572): FGSM and the linear logistic case.
- [Madry et al., Towards Deep Learning Models Resistant to Adversarial Attacks (ICLR 2018)](https://arxiv.org/abs/1706.06083): robust optimization and iterative attacks.
- [MadryLab MNIST challenge: training loop](https://github.com/MadryLab/mnist_challenge/blob/master/train.py): batch generation and model updates.
- [MadryLab MNIST challenge: PGD attack](https://github.com/MadryLab/mnist_challenge/blob/master/pgd_attack.py): projection and pixel clipping.
- [Croce and Hein, Reliable Evaluation of Adversarial Robustness (ICML 2020)](https://proceedings.mlr.press/v119/croce20b.html): diverse attacks and evaluation failures.
- [Tsipras et al., Robustness May Be at Odds with Accuracy (ICLR 2019)](https://arxiv.org/abs/1805.12152): conditions for accuracy–robustness tension.
