export const lessonManifest = [
  {
    id: 'align-for-comparison',
    title: 'Align for Comparison',
    context: 'Fictional weekly output · two teams, three tasks',
    control: 'Horizontal scale',
    modes: [
      ['independent', 'Independent'],
      ['shared', 'Shared'],
    ],
    fallback:
      'North records 18, 24, and 30 units; South records 60, 80, and 100. Independent axes stretch both teams to the same apparent width. A shared zero-to-110 scale preserves their magnitude differences.',
  },
  {
    id: 'compare-against-a-reference',
    title: 'Compare Against a Reference',
    context: 'Fictional daily output · target 80 units',
    control: 'Reference',
    modes: [
      ['values', 'Values only'],
      ['reference', 'Show target'],
    ],
    fallback:
      'Daily output is 72, 85, 64, and 91 units. Against a target of 80, only Tuesday and Thursday exceed the reference. Adding the target changes no observation.',
  },
  {
    id: 'show-paired-differences',
    title: 'Show Paired Differences',
    context: 'Four fictional matched cases · before and after scores',
    control: 'Representation',
    modes: [
      ['pairs', 'Paired values'],
      ['differences', 'Differences'],
    ],
    fallback:
      'Before/after pairs are 12/15, 18/16, 8/14, and 20/21. Their changes are +3, −2, +6, and +1 points; the mean change is +2. Matching preserves the identity of each case.',
  },
  {
    id: 'show-the-distribution',
    title: 'Show the Distribution',
    context: 'Twelve fictional waiting times · minutes',
    control: 'Detail',
    modes: [
      ['mean', 'Mean only'],
      ['distribution', 'Distribution'],
    ],
    fallback:
      'Twelve waiting times have a mean of 7 minutes, but range from 2 to 18. Four-minute bins contain 2, 6, 2, 1, and 1 cases. The same average conceals the tail.',
  },
  {
    id: 'keep-individual-observations-visible',
    title: 'Keep Individual Observations Visible',
    context: 'Two fictional groups · five cases in each',
    control: 'Observations',
    modes: [
      ['means', 'Means only'],
      ['cases', 'Show cases'],
    ],
    fallback:
      'Group A contains 2, 4, 6, 8, and 10 minutes; B contains 5, 5, 6, 7, and 7. Both means are 6, while their spreads differ. Dot offsets separate duplicate values without changing their horizontal measurement.',
  },
  {
    id: 'plot-variables-together',
    title: 'Plot Variables Together',
    context: 'Six fictional participants · practice and completed tasks',
    control: 'Representation',
    modes: [
      ['separate', 'Separate lists'],
      ['together', 'Paired axes'],
    ],
    fallback:
      'Practice hours 1, 2, 3, 4, 5, and 6 pair with 2, 3, 5, 4, 7, and 8 completed tasks. A scatterplot preserves each pair and reveals a generally rising association, without establishing causation.',
  },
  {
    id: 'preserve-elapsed-time',
    title: 'Preserve Elapsed Time',
    context: 'Four fictional readings · days 0, 1, 8, and 9',
    control: 'Time spacing',
    modes: [
      ['equal', 'Equal spacing'],
      ['elapsed', 'Elapsed days'],
    ],
    fallback:
      'Readings are 10, 14, 18, and 20 on days 0, 1, 8, and 9. The middle rise takes seven days; the first takes one. Equal gaps between all observations conceal that difference.',
  },
  {
    id: 'show-parts-in-context',
    title: 'Show Parts in Context',
    context: 'Two fictional groups · positive and other responses',
    control: 'Measure',
    modes: [
      ['shares', 'Shares only'],
      ['counts', 'Counts + totals'],
    ],
    fallback:
      'A has 40 positive responses out of 100 (40%); B has 90 out of 300 (30%). A has the larger share, while B has the larger positive count. Both statements describe the same observations.',
  },
  {
    id: 'small-multiples',
    title: 'Small Multiples',
    context: 'Three fictional regions · four months',
    control: 'Layout',
    modes: [
      ['overlay', 'Overlay'],
      ['multiples', 'Small multiples'],
    ],
    fallback:
      'North rises from 10 to 25, East falls from 25 to 10, and West rises from 12 to 24. Repeated panels use the same month and zero-to-35 scales to separate their trajectories.',
  },
  {
    id: 'match-color-to-the-data',
    title: 'Match Color to the Data',
    context: 'Four types of fictional variables · inspect the key with each view',
    control: 'Variable type',
    modes: [
      ['categorical', 'Categories'],
      ['sequential', 'Ordered values'],
      ['diverging', 'Midpoint'],
      ['cyclic', 'Cycle'],
    ],
    fallback:
      'Categories need distinct identities; ordered values need a progression; deviations need a meaningful midpoint; directions wrap from 315 degrees back toward zero. This control changes the variable being illustrated, not just the palette.',
  },
  {
    id: 'highlight-the-relevant-contrast',
    title: 'Highlight the Relevant Contrast',
    context: 'Fictional support week · the same 525 tickets',
    control: 'Emphasis',
    modes: [
      ['equal', 'Equal emphasis'],
      ['highlight', 'Highlight Billing'],
    ],
    fallback:
      'Billing has 124 of 525 tickets. Highlighting it changes attention, not the counts, row order, or axis. All seven other categories remain available for comparison.',
  },
  {
    id: 'label-directly',
    title: 'Label Directly',
    context: 'Three fictional regions · four months',
    control: 'Identification',
    modes: [
      ['legend', 'Legend'],
      ['direct', 'Direct labels'],
    ],
    fallback:
      'North ends at 25, West at 24, and East at 10 units. Direct labels identify the lines near their endpoints; separate label positions avoid collisions between the neighboring North and West values.',
  },
  {
    id: 'show-uncertainty',
    title: 'Show Uncertainty',
    context: 'Fictional independent binomial samples · Wilson 95% intervals',
    control: 'Uncertainty',
    modes: [
      ['estimates', 'Estimates only'],
      ['intervals', '95% intervals'],
    ],
    fallback:
      'Both samples estimate 70% positive responses. Seven of ten gives a Wilson 95% interval of about 39.7–89.2%; seventy of one hundred gives 60.4–78.1%. Equal point estimates need not have equal precision.',
  },
  {
    id: 'distinguish-missing-from-zero',
    title: 'Distinguish Missing from Zero',
    context: 'Fictional daily counts · Wednesday was not reported',
    control: 'Missing value',
    modes: [
      ['missing', 'Keep missing'],
      ['zero', 'Fill with zero'],
    ],
    fallback:
      'Monday reports 12, Tuesday 0, Wednesday is missing, Thursday 18, and Friday 15. The gap represents unavailable evidence; filling it with zero invents a measurement. Tuesday is a genuine observed zero.',
  },
  {
    id: 'expose-sample-size-and-coverage',
    title: 'Expose Sample Size and Coverage',
    context: 'Two fictional surveys · respondents and invited people',
    control: 'Evidence',
    modes: [
      ['rates', 'Rates only'],
      ['counts', 'Show denominators'],
    ],
    fallback:
      'Both groups report 75% positive. A has 3 positives among 4 respondents, with 4 of 10 invitees responding. B has 75 among 100, with all 100 invitees responding. Sample size and response coverage describe different limitations.',
  },
  {
    id: 'redundant-coding',
    title: 'Redundant Coding',
    context: 'Three fictional series · fixed observations and positions',
    control: 'Identification',
    modes: [
      ['color', 'Color only'],
      ['redundant', 'Color + shape'],
    ],
    extra: 'View in grayscale',
    fallback:
      'North, East, and West keep the same positions. Circles, squares, and triangles provide an additional identification channel that remains available in grayscale. Grayscale is a reproduction test, not a simulation of every color-vision difference.',
  },
  {
    id: 'provide-an-equivalent-text-account',
    title: 'Provide an Equivalent Text Account',
    context: 'Fictional support week · the same 525 tickets',
    control: 'Explanation',
    modes: [
      ['account', 'With text account'],
      ['chart', 'Chart only'],
    ],
    fallback:
      'Across eight support categories in one fictional week, Billing has the most tickets: 124 of 525 (23.6%). Subscription follows at 97; Feedback has the fewest at 28. Counts describe workload, not severity or time spent.',
  },
] as const;

export type LessonId = (typeof lessonManifest)[number]['id'];
export function isLessonId(value: string): value is LessonId {
  return lessonManifest.some((lesson) => lesson.id === value);
}
