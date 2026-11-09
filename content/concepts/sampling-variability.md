---
id: sampling-variability
type: concept
title: Sampling Variability
summary: Explore why estimates change from sample to sample, even when the underlying probability stays the same.
status: published
tags:
  - statistics
  - probability
verses:
  - learning
---

A fair coin has a 50% chance of landing heads on each toss. That does not mean every ten tosses
will contain exactly five heads. An estimate from a finite sample varies by chance.

## Try it: toss some coins

Run the example, choose a batch size, and toss the coins a few times. The solid line follows the
running proportion of heads; the dashed line marks the underlying probability of 50%.

```patternverse-widget
{
  "src": "coin-sampling.html",
  "title": "Coin sampling explorer",
  "height": 480,
  "fallback": "Small samples can give proportions far from 50%. As the number of independent tosses grows, the proportion tends to stabilize near 50%, although it need not get closer after every batch."
}
```

## What to notice

- Start with batches of ten. Early results can swing a long way from 50%.
- Add larger batches. A single extra heads or tails has less influence on a larger sample.
- Reset the example and try again. The exact path changes because this is a fresh random sample.

More observations reduce random sampling variation. They do not repair a biased sampling process:
if the coin were unfair, more tosses would estimate that different probability more precisely.
