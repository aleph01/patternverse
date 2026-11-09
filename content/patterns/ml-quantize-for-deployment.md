---
id: ml-quantize-for-deployment
type: pattern
title: 'Quantize for Deployment'
summary: 'Reduce numerical precision to meet deployment constraints, then verify model quality and performance on the actual target.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A model works well on a workstation, but its download is too large for a mobile app and inference strains the device's memory budget. Replacing every 32-bit weight with a smaller numerical representation looks attractive. The difficulty is preserving useful behavior while making the converted model execute efficiently on its target.

Quantize for Deployment treats precision as a deployment choice that must be validated. Smaller stored numbers can reduce transfer and storage costs and enable specialized arithmetic. They do not establish a particular latency improvement or an acceptable prediction error.

## Core idea

Quantization maps many real values onto a smaller set of representable values. In common affine integer quantization, an integer code q represents approximately **r = scale × (q − zero point)**. The positive scale sets grid spacing; the zero point is the integer representing real zero. Quantizing requires rounding and, when necessary, clipping to the available integer range. [LiteRT specification](https://developers.google.com/edge/litert/conversion/tensorflow/quantization/quantization_spec).

A **per-tensor** scale covers a whole tensor. **Per-channel** scales can give different output channels different grids. A shared scale that accommodates one channel's large weights can erase another channel's small weights. This is a representation tradeoff, not a change to the model's intended task.

## How it works

First preserve a floating-point baseline in the intended deployment format. This helps distinguish conversion problems from precision loss. Identify supported numeric types, operations, layouts, and execution providers before selecting a precision policy.

**Post-training quantization** converts an already trained model. Static activation quantization determines ranges from calibration inputs; these should reflect expected deployment conditions and preprocessing. Dynamic quantization determines activation parameters at inference time, adding work while adapting their ranges to the current data. Weight-only quantization leaves other parts at higher precision. These approaches create different execution and storage requirements. [ONNX Runtime](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html).

If post-training conversion loses too much quality, quantization-aware training can simulate quantization effects during training so parameters adapt. The training computation can still use floating-point variables; the exported inference representation is a separate result. [Jacob et al.](https://arxiv.org/abs/1712.05877).

Validate the converted graph's outputs, task metrics, and important slices. Inspect operator placement and benchmark on the actual device under realistic batch size and concurrency. If a sensitive operation remains in floating point, measure the additional conversions and data movement as part of the deployed path.

## Worked examples

### Fictional grid: rounding differs from clipping

Take a 4-bit unsigned code range 0–15, scale 0.1, and zero point 5. Real zero maps to code 5; the representable range is −0.5 to 1.0.

The value 0.26 becomes round(2.6) + 5 = 8 and reconstructs to 0.3, an error of +0.04. The value 1.8 would require code 23, so it clips to 15 and reconstructs to 1.0, an error of −0.8. A finer grid reduces ordinary rounding error, but cannot represent a value beyond its range. The explorer uses nearest-even rounding before adding the zero point, following the stated ONNX convention. [QuantizeLinear](https://onnx.ai/onnx/operators/onnx__QuantizeLinear.html).

### Fictional classifier: two distinct conversion failures

A two-output linear model has three input features. Its weights and biases are:

| Output | Weights             | Bias |
| ------ | ------------------- | ---- |
| A      | (0.12, −0.08, 0.04) | 0.05 |
| B      | (2, −1.5, 0.5)      | −0.4 |

The larger score wins, with ties going to A. For x = (0.465, 0.4, 0.2), the floating-point scores are approximately A = 0.0818 and B = 0.0300.

With symmetric 4-bit weight codes −7 to 7, one shared scale is approximately 2/7. All three A weights round to zero; B becomes codes (7, −5, 2). An unsigned 8-bit input grid calibrated over 0–1 produces input codes (119, 102, 51). A’s integer dot product is zero. B’s is **7 × 119 − 5 × 102 + 2 × 51 = 425**. Rescaling and adding floating-point biases yields A = 0.0500 and B = 0.0762: the winner changes to B.

Give A its own weight scale, approximately 0.12/7. Its codes become (7, −5, 2), and its reconstructed score becomes about 0.0786, restoring A for this input. This is a computed example of improved fidelity, not proof of general accuracy.

Calibration can fail independently. For x = (1, 2, 0.5), the floating-point winner is A. A 0–1 input range clips the second feature and changes the winner to B even with per-channel weights. A 0–2 calibration range avoids that clipping and restores A in the demonstrated configuration. Conversely, a very wide range can sacrifice resolution around common values.

![A small fictional classifier loses its small output-channel weights on a shared 4-bit grid, changing its winning score; the diagram exposes integer codes, accumulation, and parameter bytes.](../assets/machine-learning/quantize-for-deployment.svg 'The shared grid rounds output A’s small weights to zero and changes the winning score. A separate scale can preserve those weights at an additional storage cost. The example measures numerical fidelity, not task accuracy or speed.')

### Optional: parameter storage accounting

Six FP32 weights occupy 24 bytes; six packed 4-bit codes occupy 3. But the explorer's complete toy parameter record also includes FP32 weight scales, two FP32 biases, and one FP32 input scale. It totals 19 bytes with a shared weight scale or 23 with two scales, versus a 32-byte floating-point weight-and-bias record. Zero points are fixed at zero and implicit; shape and format information are supplied separately. These are actual toy-record bytes, not model-file sizes or peak RAM measurements.

```patternverse-widget
{
  "src": "ml-quantize-for-deployment.html",
  "title": "Deployment quantization explorer",
  "height": 1200,
  "fallback": "A shared 4-bit grid erases output A’s small weights, changing the float winner to B. Per-output scales restore A for this fictional input. Packed bytes and scores are computed; no hardware benchmark runs."
}
```

The explorer packs and decodes parameters, quantizes inputs, computes integer dot products, and rescales scores. It reports agreement with the floating-point model on four fictional inputs. There are no ground-truth labels, so agreement is not accuracy. Floating-point output scaling and biases remain; this is not a complete integer-only runtime.

### Verified deployment mechanism

LiteRT's full-integer conversion uses representative inputs to estimate activation ranges. Its documented integer-only path restricts supported operations and specifies integer input/output types; permitting floating-point fallback produces a different compatibility result. The browser example does not run that converter or reproduce a device benchmark. [LiteRT post-training quantization](https://developers.google.com/edge/litert/conversion/tensorflow/quantization/post_training_quantization).

## Assumptions for correctness

Conversion and execution must agree on scales, zero points, signedness, rounding, clipping, tensor axes, and bias handling. Accumulators need sufficient width, and integer outputs require compatible rescaling into subsequent operations. A weight file alone does not specify the whole numerical contract.

Calibration inputs must cover relevant activation behavior. Keep the final quality evaluation independent of tuning and calibration. A rare operating condition can be important even if it barely affects average tensor error.

## When to use it

Use quantization when storage, memory traffic, or supported low-precision compute constrains deployment. Start with precision policies supported by the target, then compare quality and measured resource use.

If the dominant cost lies in preprocessing, unsupported operations, or external calls, reducing weight precision may have limited end-to-end benefit. A smaller model architecture can be a better intervention.

## Tradeoffs and operating costs

Additional scales and conversion operations consume space and work. Low-bit packing may save transfer bytes while requiring unpacking or specialized kernels. Some tensors may need higher precision than others.

Quantization can even slow inference when hardware support is inadequate or conversion overhead dominates. ONNX Runtime explicitly cautions that performance depends on the model and hardware. Benchmark latency distributions and memory separately; avoid translating a weight compression ratio into a speedup claim. [ONNX Runtime](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html).

## Common mistakes and limitations

Calling a model “int8” can conceal floating-point inputs, outputs, or fallback operators. Likewise, low average weight error does not guarantee stable decisions near a boundary. Check actual task outcomes, including rare slices, and localize divergent intermediate tensors when quality drops.

Per-channel scaling is not universally supported or free. The explorer deliberately uses a tiny, custom record, implicit zero points, and scalar arithmetic; it cannot predict a framework's file overhead, allocator behavior, native rounding details, or hardware performance. Matching the floating-point model also preserves that model's mistakes.

## Related patterns

[[ml-knowledge-distillation|Knowledge Distillation]] learns a student's behavior and may change architecture; quantization changes numerical representation. **Pruning** removes selected parameters or structures, which requires a different sparsity and runtime argument.

[[ml-probability-calibration|Probability Calibration]] concerns whether predicted probabilities match observed frequencies, not activation-range selection. [[ml-canary-rollout-with-rollback|Canary Rollout with Rollback]] limits serving exposure and provides recovery after conversion has been validated; it does not establish numerical fidelity.

## Sources and further reading

- [LiteRT: 8-bit quantization specification](https://developers.google.com/edge/litert/conversion/tensorflow/quantization/quantization_spec): affine representation, scales, zero points, and operator contracts.
- [LiteRT: post-training quantization](https://developers.google.com/edge/litert/conversion/tensorflow/quantization/post_training_quantization): calibration, fallback, and integer-only conversion.
- [ONNX: QuantizeLinear](https://onnx.ai/onnx/operators/onnx__QuantizeLinear.html): rounding, saturation, and quantization granularity.
- [ONNX Runtime: quantization](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html): conversion modes, debugging, and hardware-dependent performance.
- [Jacob et al., Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference (CVPR 2018)](https://arxiv.org/abs/1712.05877): integer inference and training with simulated quantization.
