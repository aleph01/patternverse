---
id: stats-forecast-intervals
type: pattern
title: 'Report a Forecast Distribution'
summary: 'Represent uncertainty about future observations and check whether forecast ranges behave as intended.'
status: published
verses:
  - statistics
---

A service planner receives a forecast of 100 calls tomorrow and schedules exactly enough capacity for 100. The realized total is 125. The forecast may have been a reasonable central estimate, yet the plan ignored the distribution of possible demand.

A forecast should communicate uncertainty about what can happen, not only its center. Use a predictive distribution or intervals at relevant levels, then evaluate their calibration and usefulness at the horizon and conditions where the forecast will be used.

## Worked example: a staffing forecast with visible uncertainty

Use an explicit fictional model: at day 0, tomorrow's call volume is approximated by a Normal distribution with mean 100 and standard deviation 20. The mean and standard deviation are treated as known for this teaching calculation. Real call counts are discrete, and a fitted forecasting model would need justification for its distribution, parameter uncertainty, dependence, and changing conditions.

For a central 80% prediction interval, use 100 ± 1.282 × 20, approximately **74.4 to 125.6 calls**.

Central means the model puts equal probability outside the two ends: 10% below and 10% above for this 80% interval. The symbol ± means calculate both endpoints, once by subtracting and once by adding. The multiplier 1.282 comes from the stated Normal model, the familiar bell-shaped distribution; it is not a number estimated from these six observed outcomes.

For a central 95% interval, use 100 ± 1.960 × 20, approximately **60.8 to 139.2 calls**. These ranges concern tomorrow's observation under the stated model. They do not describe uncertainty about the average call volume.

![Six forecast means with nested 80 and 95 percent prediction bands, overlaid with observations recorded after the forecasts were issued.](../assets/statistics/forecast-bands.svg 'Green bands show central 80% prediction intervals and outer purple bands show central 95% intervals. The green line is the forecast mean; black dots and a dashed line are later observations. All forecasts precede the observations. Widening is an assumption of this example, not a universal forecasting rule.')

| Forecast day | Mean | Assumed standard deviation | Observed later |
| ------------ | ---- | -------------------------- | -------------- |
| 1            | 100  | 20                         | 125            |
| 2            | 102  | 22                         | 96             |
| 3            | 104  | 24                         | 112            |
| 4            | 106  | 26                         | 145            |
| 5            | 108  | 28                         | 85             |
| 6            | 110  | 30                         | 132            |

All six forecasts were issued together, before these outcomes. For each day, the bands use the same multipliers applied to that day's stated standard deviation. Day 4's observation of 145 exceeds the 80% upper limit of about 139.3 but remains within the 95% upper limit of about 157.0. Five of six observations are inside their 80% intervals and all six are inside their 95% intervals. Six horizons from one forecast origin are too little evidence to establish calibration, and their errors may be dependent. Repeat the check over many forecast origins and examine the relevant horizon and season separately.

A capacity choice follows from consequences. Under tomorrow's stated approximation, the 90th percentile is about 125.6 calls, so capacity for 126 calls is near a threshold that demand exceeds on one day in ten. Choosing that threshold requires a reason to tolerate that shortage rate; it is not automatically the cheapest or safest plan. Capacity for the mean of 100 is exceeded about half the time under this symmetric model. [[stats-choose-consequences]] helps connect that difference to staffing costs, waiting, and service commitments, while [[stats-validate-forward]] explains how to test the forecast without using later information.

## Connect the range to the action

Suppose two staffing options have the same forecast mean but different uncertainty. In one scenario, plausible demand lies tightly around 100; in another, large surges are common. A capacity decision that incurs high costs for unmet demand may choose a high predictive quantile rather than the mean.

Prediction intervals describe uncertainty about future observations under a forecasting procedure and its assumptions. They are generally different from confidence intervals for the estimated mean. Even if the expected demand were known precisely, tomorrow's actual call total could still vary substantially.

A second example concerns delivery times. A central forecast of three days does not justify promising every customer delivery within three days. A high quantile relevant to the service commitment is more informative, provided its historical coverage is assessed.

## Check predictions after the fact

Evaluate forecast distributions using forward validation. Across many comparable predictions, examine how often observations fall within nominal intervals and whether failures concentrate in particular seasons, groups, or horizons. An interval can have acceptable overall coverage while systematically missing peaks.

Coverage alone is insufficient: an absurdly wide interval can cover nearly everything. Calibration asks whether stated probabilities match observed frequencies across many relevant forecasts. Sharpness asks how concentrated the forecast ranges are. Assess both, using a scoring rule that rewards informative, well-calibrated forecasts. A useful forecast is informative while honestly representing uncertainty, rather than mechanically widening its range until every past event fits.

Inspect residual dependence and changing variability. If errors become larger as demand rises, a constant-width interval may misrepresent peak periods. If the model ignores seasonality or structural changes, an apparently precise interval can be misleading.

## Advanced notes: future uncertainty has several sources

Observation variability, estimated parameters, model choice, and assumptions about future conditions can all affect prediction. A particular interval procedure may include some of these and omit others. State what the forecast conditions on, such as a fixed policy, weather scenario, or economic assumption.

Longer horizons often introduce more opportunities for uncertainty to accumulate, but interval behavior depends on the model and task. Do not infer a universal widening formula from a single example. When scenario uncertainty dominates, compare explicit scenarios instead of presenting one narrowly conditioned distribution as the whole future.

Monitoring also requires a defined reference process. An unusual observation relative to historical behavior may signal a change, a data error, or ordinary variation. Repeated alerts need a suitable monitoring procedure and a plan for investigation.

Use this pattern when a point forecast is being turned into a commitment, budget, capacity choice, or alarm. Show what the range means, test it against subsequent observations, and connect the relevant part of the distribution to the decision.

## Sources and further reading

These independently written explanations and fictional examples draw on established statistical methods. The linked sources provide technical development and additional qualifications.

- [Forecasting: Principles and Practice — forecasting tools](https://otexts.com/fpp3/toolbox.html)
