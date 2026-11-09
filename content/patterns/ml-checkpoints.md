---
id: ml-checkpoints
type: pattern
title: 'Checkpoints'
summary: 'Save a coherent training state at defined boundaries so interrupted work can resume from a verified recovery point instead of merely reloading weights.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A training job runs overnight, then its worker disappears before dawn. Yesterday’s weights are available, but the optimizer has forgotten its accumulated updates and the data loader starts at the beginning. The job runs again, yet it is no longer continuing the computation that stopped.

Checkpoints preserve a usable recovery point inside a longer computation. For machine learning training, the saved state must support the intended restart: recovering an approximate starting model requires less information than faithfully continuing the same run.

## Core idea

A training checkpoint is a snapshot of the state needed for subsequent updates, associated with a particular run and progress boundary. Model parameters are only part of that state. Optimizers can retain information from earlier gradients, and the next update also depends on which data arrives next.

Choose the recovery contract explicitly. A **weights-only** restore can be useful for inference or starting another experiment. A **training-state** restore also needs the relevant optimizer state, progress counters, and other state the training procedure uses. Neither label means every framework automatically saves everything your program needs.

## How it works

Identify what can affect the next update. Depending on the training loop, this includes parameters and model buffers, optimizer state, learning-rate schedule, random-generator state, data-order position, mixed-precision scaling, and accumulated gradients. Capture only what applies, but do not omit state merely because it is outside the model object.

Choose a coherent save boundary, such as immediately after a completed optimizer update. Save compatible components from that boundary together, with code, configuration, data references, and format identity. [PyTorch’s saving tutorial](https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html) documents saving model and optimizer state alongside training progress for resumption.

Write and verify the snapshot before publishing it as a recovery target. Retain an older completed checkpoint while a new one is being written. A file called “latest” is insufficient evidence of completion. Use a publication protocol appropriate to the storage system, then test loading and continuing from the stored artifacts.

A restore test should check the next data and updates, not simply whether the weights load. Distributed runs additionally need compatible state from participating workers; [PyTorch’s distributed-checkpoint documentation](https://docs.pytorch.org/docs/2.14/distributed.checkpoint.html) describes sharded state and distributed save/load facilities. Those facilities still require a deliberate application recovery contract.

## Worked examples

### The same saved weight produces different next updates

This computed demonstration trains one scalar parameter, **w**, using two fictional dimensionless targets, **1 and 3**, repeatedly in that order. The prediction is w. For target y, the loss is **½(w − y)²**, so its gradient is **g = w − y**.

The optimizer remembers a value **v**, called momentum here. Starting with w = 0 and v = 0, each update first computes **v ← 0.50v + g**, then **w ← w − 0.10v**, using the new v. The coefficients 0.50 and 0.10 are fixed teaching choices.

| Update | Target used | Weight w | Momentum v |
| ------ | ----------: | -------: | ---------: |
| 1      |           1 |    0.100 |      −1.00 |
| 2      |           3 |    0.440 |      −3.40 |
| 3      |           1 |    0.666 |      −2.26 |

Save after update three. A complete snapshot records **w = 0.666**, **v = −2.26**, **three completed updates**, and the data position whose next target is **3**.

On complete restoration, the next gradient is **0.666 − 3 = −2.334**. Momentum becomes **0.50 × (−2.26) − 2.334 = −3.464**, giving **w = 0.666 − 0.10 × (−3.464) = 1.0124**. This matches the uninterrupted fourth update.

Restore only w and reset both momentum and data position. The next target is now 1, the gradient is **−0.334**, and the new momentum is also −0.334. The resulting weight is **0.666 − 0.10 × (−0.334) = 0.6994**. Loading the same weight did not preserve the continuation.

![A checkpoint records weight zero point six six six, momentum minus two point two six, three completed updates and next target three. Complete restoration gives next weight one point zero one two four; restoring only weights gives zero point six nine nine four.](../assets/machine-learning/checkpoints.svg 'Follow the saved state into both continuations. The starting weight is identical, but optimizer memory and the next target differ. Matching saved weights establishes neither matching training state nor the same next update; the numerical difference is not a model-quality comparison.')

The explorer actually performs these updates, serializes the snapshot as in-memory JSON, restores selected components, and compares with an uninterrupted run. It can isolate optimizer-memory loss from a reset data position. With a checkpoint after two updates, resetting the position happens to select the correct next target; that coincidence does not establish a complete recovery procedure.

```patternverse-widget
{
  "src": "ml-checkpoints.html",
  "title": "Checkpoint state and training continuation explorer",
  "height": 1200,
  "fallback": "After three synthetic momentum updates, the snapshot has w 0.666, momentum −2.26 and next target 3. Complete restoration gives next w 1.0124. Weights-only restoration resets momentum and data position, giving w 0.6994. These are computed toy updates, not model-performance measurements."
}
```

### Save frequency trades repeated work against write overhead

A separate fictional job saves after every **ten minutes of training work**, pausing for a **one-minute synchronous write**. Suppose it crashes during training after completing 27 training minutes. The last completed checkpoint represents minute **20**, so **27 − 20 = 7 minutes** of training must be repeated. Two completed writes consumed two additional minutes: **29 minutes elapsed** before the crash, with no other overhead.

Saving every five training minutes would leave a completed snapshot at **25**, losing only **two minutes**. But five writes would consume **five minutes**, bringing elapsed time to **32 minutes** at the same training progress. These figures compare one specified interruption, not an optimal universal interval. Restore time, storage contention, and failures during writes require separate accounting.

### Latest progress and best validation score serve different purposes

Three fictional checkpoints at updates **100, 200, and 300** have validation losses **0.50, 0.30, and 0.40**. If smaller loss is better, update 200 is best on that validation measure; update 300 is latest. Recovery from latest preserves more completed work, while choosing the best evaluated candidate applies a different criterion.

[Keras ModelCheckpoint](https://keras.io/api/callbacks/model_checkpoint/) documents monitoring a metric, choosing its improvement direction, and saving only the best checkpoint. Its save format and configuration determine what is retained; a selected weights file need not satisfy a complete recovery contract. Current Keras documentation says a compiled model’s weights file can also include optimizer state, with compilation required before loading it. An option’s name alone is not a content guarantee.

[TensorFlow’s checkpoint guide](https://www.tensorflow.org/guide/checkpoint) demonstrates tracking a model, optimizer, step, and dataset iterator together. It also documents restoration assertions for matching expected objects. These are verified implementation examples, not frameworks executed by this explorer.

## Assumptions for correctness

Saved components must describe one coherent boundary and remain accessible, readable, and compatible with the restoring program. Data must be stable, with its position retained or reconstructed by a justified procedure. Mid-update saves may additionally require in-flight accumulation state.

The toy uses a fixed sequence and deterministic arithmetic. Real reproducibility depends on more than serialization: [PyTorch’s reproducibility guidance](https://docs.pytorch.org/docs/2.14/notes/randomness.html) notes limits across releases, platforms, and nondeterministic operations. A checkpoint should not promise identical future values beyond its tested environment and recovery contract.

## When to use it

Use checkpoints when training is expensive, interruptions are plausible, or experiments need recoverable progress. They are particularly valuable on interruptible workers and long distributed runs.

For a very short job, restarting may cost less than maintaining frequent snapshots. Select frequency and retention from recovery needs, write cost, and available storage.

## Tradeoffs and operating costs

Optimizer state can substantially increase snapshot size. Writing, copying state for asynchronous saves, and retaining several recovery points consume time, memory, storage, and bandwidth. Asynchronous writing still needs a stable captured snapshot and a clear completion signal.

Keep recovery snapshots and selected candidates according to explicit retention policies. Deleting an older completed snapshot before its replacement is verified removes the fallback it was meant to provide.

## Common mistakes and limitations

A successful load is not a successful restore test. A progress counter alone does not necessarily restore the data loader or random generator. A reset optimizer may be a legitimate new experiment, but should not be described as faithful continuation.

Training checkpoints differ from [activation checkpointing](https://docs.pytorch.org/docs/2.14/checkpoint.html), which trades recomputation for memory within training. They also differ from an inference export or an approved release. Recoverability does not establish predictive quality, and choosing a checkpoint repeatedly on final test outcomes contaminates evaluation.

## Related patterns

[[ml-hyperparameter-tuning|Hyperparameter Tuning]] selects configurations across trials; checkpoints preserve progress within one trial. [[ml-model-versioning|Model Versioning]] identifies compatible release artifacts; checkpoints preserve progress inside training. [[ml-workflow-pipeline|Workflow Pipeline]] coordinates retries and dependencies, while a training retry can use a checkpoint internally. [[ml-transfer-learning|Transfer Learning]] may intentionally reuse weights with new optimizer state. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] keeps checkpoint selection separate from final evaluation evidence.

## Sources and further reading

- [PyTorch: Saving and Loading Models](https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html) — model and optimizer state for resuming training.
- [TensorFlow: Training checkpoints](https://www.tensorflow.org/guide/checkpoint) — tracked training objects, iterators, retention, and restoration checks.
- [Keras: ModelCheckpoint](https://keras.io/api/callbacks/model_checkpoint/) — monitored metrics, best-only saving, and save configuration.
- [PyTorch: Reproducibility](https://docs.pytorch.org/docs/2.14/notes/randomness.html) — randomness and limits of identical execution.
- [PyTorch: Distributed Checkpoint](https://docs.pytorch.org/docs/2.14/distributed.checkpoint.html) — distributed save/load and sharded training state.

- [PyTorch: activation checkpointing](https://docs.pytorch.org/docs/2.14/checkpoint.html) — the separate recomputation-for-memory mechanism.
