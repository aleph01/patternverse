---
id: delayed-feedback-and-oscillation
type: concept
title: Delayed Feedback and Oscillation
summary: Recognize when corrective actions chase outdated conditions, then coordinate response strength, action records, and observation timing with the delays in the system.
status: published
tags:
  - structural-traps
  - systems-and-feedback
  - delayed-feedback
  - oscillation
  - stocks-and-flows
verses:
  - systems-thinking
attribution: Original Patternverse field-guide synthesis. The worked scenario and explanatory diagram are hypothetical. Qualitative comparisons state their assumptions; attributed theory and research are distinguished from practical editorial guidance.
---

## A recognizable situation

Ada turns on an older shower. The water feels cold, so she moves the mixer toward hot. It is still cold a moment later, so she turns it farther. Then the hotter water reaches the showerhead and the spray becomes too hot.

She moves the mixer back toward cold. The hot water already traveling through the pipe continues arriving, so she makes another correction. The spray becomes too cold again.

This hypothetical shower captures a familiar predicament: the effect of a correction takes time to arrive, and repeated corrections can push the result past the condition they were meant to fix.

## The underlying pattern

**Delayed feedback can produce oscillation when corrective action continues on the basis of conditions that have already changed, or before earlier actions have become visible.** The compact formulation is: **the correction keeps arriving after the condition it was meant to correct.**

A **balancing feedback loop** opposes a departure from a target. With unsuitable timing and response strength, it can repeatedly overshoot, reverse, and undershoot. Oscillations may shrink, persist, or grow; delay alone does not determine which occurs. Some delayed loops settle without cycling.

This belongs to a long history of feedback analysis. Maxwell's _On Governors_ (1868) distinguished decaying from growing disturbances in mechanical speed regulation and warned that stronger regulation could become unstable. Meadows's _Thinking in Systems_ explains delayed inventory responses for general readers. Neither source implies that every fluctuating series is caused by delayed feedback. [Maxwell, pp. 270–272](https://webhomes.maths.ed.ac.uk/~v1ranick/papers/maxwell1.pdf), [Meadows, pp. 51–58](https://www.sustainable.soltechdesigns.com/meadows.pdf)

## What keeps it going

The temperature Ada feels now reflects a mixing decision made earlier. Water already in the pipe continues toward the showerhead after she turns the control. Her new setting affects later arrivals; it cannot instantly replace what is already on its way.

That pipeline contains an accumulated volume of water. Temperature is a property of that water, not itself a volume stock. A fuller physical model would also track heat storage in the pipe and changing supply conditions. The qualitative example holds those complications steady to isolate transport delay and repeated adjustment.

Ada's intended response is **balancing feedback**: feel a departure from the desired temperature and correct it. But another large adjustment made before the previous one is felt can overcorrect. The later hot arrival prompts a reversal; that reversal can then overshoot toward cold. One corrective loop can generate the cycling without an adversary or alternating outside demand.

Observation delay, execution delay, and physical-response delay belong at different points in a loop. Here Ada feels the arriving water directly; the delay is primarily between changing the mixture and feeling that change. A more accurate thermometer would not make water already in the pipe arrive sooner. With a stale dashboard reading, timestamps can distinguish old information from a failed action. They do not shorten this shower’s physical transit.

For an actual shower, this causal account would need checks on transit time, supply pressure, valve behavior, and disturbances. The example assumes a working mixer, steady supplies, and repeated sizable turns before earlier changes arrive. Delay alone does not establish oscillation.

![Hypothetical qualitative illustration. Ada turns the shower mixer warmer. Earlier cool water still in the pipe arrives before the changed mixture. Repeating a large warmer turn can stack correction and later make the spray too hot. An alternative modest-adjustment procedure waits to assess the first change before repeating it; physical transit delay remains. One overshoot is shown here. Oscillation requires repeated reversals; delay alone does not establish it. Change: Coordinate adjustment size and timing with the physical response delay. Limitation: Supply and equipment are held steady here. Waiting takes time; changing delays, disturbances, and safe limits need separate control.](../assets/structural-traps/delayed-feedback-test-tank.svg "Hypothetical illustration. Earlier water continues arriving while the first change travels through the pipe. The two lower branches compare stacked correction with allowing an effect to arrive before reassessment. This is physical-response delay, not stale reporting; no exact temperature path or stable controller is claimed. One overshoot is shown here. Oscillation requires repeated reversals; delay alone does not establish it.")

## Why the obvious responses fail

**Turn it farther because nothing has happened.** The effect may still be traveling through the pipe. Another turn can duplicate a correction that has not yet become visible.

**Adjust more often.** More observations can help, but more actions per observation can stack changes into the same delay. Urgency does not make the physical response immediate.

**Install a more precise display.** Better measurement can reduce uncertainty while leaving the transport delay intact. The intervention must address the actual location of the lag.

**Stop correcting altogether.** This can stop the repeated reversals while leaving the temperature unsuitable. Stability and a useful operating condition are different objectives.

## Possible ways out

**Allow an earlier correction to appear before repeating it.** In a safe, observable process, an operator can make a modest change and wait long enough to assess its effect. The cost is slower correction; long or uncertain delays require a more deliberate response rule than guessing an interval.

**Moderate the response.** Smaller adjustments or a tolerance band can avoid chasing every departure. That accepts some shortfall or variation and can take longer to reach a useful condition. No single adjustment size suits all systems.

**Track the action pipeline.** In inventory or staffing, distinguish what has been ordered from what has arrived and what is already committed. In the shower, remember that a control change has not yet replaced water in transit. An action record helps avoid duplicate correction; it is not proof of the current outcome.

**Shorten the relevant physical delay where feasible.** A different layout or suitable control arrangement may change the response. Such changes require appropriate design and testing. Faster sensing alone does not shorten transit, and speeding one part of a loop while leaving others unchanged can worsen behavior. [Meadows's delay comparisons](https://www.sustainable.soltechdesigns.com/meadows.pdf)

These are control principles, not instructions for constructing or validating a shower controller. A safe operating range, reliable equipment, and a way to handle disturbances remain separate requirements.

## A worked example

### Let one adjustment arrive before correcting it again

Ada first responds to cold water by making several warmer turns before the effect of the first arrives. The eventual mixture is hotter than intended. Several cooler turns made against that hot arrival repeat the same error in the other direction.

The hypothetical diagnosis is physical transport delay: the mixer responds, but changed water takes time to reach the showerhead. Supply conditions remain steady and the control has a usable setting. These assumptions exclude a faulty valve or fluctuating hot-water supply as the explanation.

Starting again under the same conditions, Ada makes one modest adjustment and allows its effect to reach the outlet before deciding whether another is needed. She judges the response after it has changed rather than treating unchanged immediate sensation as a failed adjustment. The illustration compares this with stacking another turn into the same delay.

In the stipulated revised sequence, she avoids the duplicated large change and approaches an acceptable temperature with fewer reversals. This is a qualitative demonstration, not a calculated trajectory, measured improvement, or proof that a particular control rule is stable.

The trade-off is time: a restrained response can leave an unsuitable condition in place longer. If the supply varies or the delay changes, waiting for an assumed response is insufficient. Feedback, appropriate limits, and safe equipment still matter. A perfectly steady but unsafe temperature would not count as success.

### The same mistake in ordering

A shop can reorder when inventory falls, see the shelves still empty, and order again before the first delivery arrives. Later, outstanding orders can overfill storage. The relevant pipeline is goods already ordered, not a thermometer or a report timestamp.

Sterman's 1989 Beer Distribution Game study found costly inventory dynamics and estimated decision rules that often underweighted goods already ordered. The evidence combines laboratory behavior with fitted models in a particular simulated distribution system. It supports the relevance of action pipelines, not a claim that every operator ignores them or validation of this shower example. [Original study](https://jmvidal.cse.sc.edu/library/sterman89a.pdf)

## Limits and lookalikes

Seasonal demand, periodic schedules, random shocks, and interacting processes can also produce cycles. One overshoot is not recurring oscillation. Check whether actions predict later reversals, whether the timing fits the lag, and whether alternative explanations fit better.

A shower's transport delay is not the same as stale reporting. An old dashboard reading can sometimes be updated using verified completed transfers under restrictive assumptions. In the shower, a record of turning the mixer does not establish the temperature now arriving at the outlet.

Real systems have changing delays, nonlinear responses, capacity limits, and disturbances. Delay can coexist with a stable response, shrinking oscillations, or growing oscillations. Directional arrows alone establish none of those trajectories.

A smooth result is also not sufficient evidence of safety, efficiency, or an appropriate target. The timing and strength of correction must be assessed together with the purpose and operating boundaries.

## Related patterns

[[fixes-that-fail|Fixes That Fail]] adds a harmful delayed side effect of a remedy. Here the ordinary corrective action can cycle without a separate harmful side effect.

[[growth-and-underinvestment|Growth and Underinvestment]] includes delayed capacity building and demand responses. Its investment trap requires more than oscillation alone.

[[escalation|Escalation]] depends on reciprocal intensification between actors. Ada needs only one person responding to a delayed physical effect.

## Sources and further reading

- **Maxwell, “On Governors” (1868), pp. 270–272.** Foundational analysis of regulation, instability, and oscillatory disturbances; [paper](https://webhomes.maths.ed.ac.uk/~v1ranick/papers/maxwell1.pdf).
- **Meadows, _Thinking in Systems_ (2008), pp. 51–58.** Accessible comparison of perception, response, and delivery delays, including the shower illustration on p. 54; [text](https://www.sustainable.soltechdesigns.com/meadows.pdf).
- **Sterman, “Modeling Managerial Behavior” (1989), _Management Science_ 35(3), 321–339.** Distribution-game experiments and fitted stock-management rules; [original paper](https://jmvidal.cse.sc.edu/library/sterman89a.pdf), [publication record](https://doi.org/10.1287/mnsc.35.3.321).
