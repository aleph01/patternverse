export type ExpansionControl = {
  key: string;
  label: string;
  type: 'range' | 'select';
  min?: number;
  max?: number;
  step?: number;
  value: number | string;
  options?: readonly (readonly [string, string])[];
};
export type ExpansionLesson = {
  id: string;
  title: string;
  context: string;
  control: string;
  modes: readonly (readonly [string, string])[];
  fallback: string;
  controls: readonly ExpansionControl[];
};
export const expansionManifest = [
  {
    id: 'normalize-by-exposure',
    title: 'Normalize by Exposure',
    context: 'Three fictional districts · incidents in one year',
    control: 'Measure',
    modes: [
      ['counts', 'Counts'],
      ['rates', 'Per 100,000 people'],
    ],
    fallback:
      'North has 240 incidents among 120,000 people (200 per 100,000); Central has 180 among 45,000 (400); South has 90 among 90,000 (100). North has the most incidents; Central has the highest population rate.',
    controls: [],
  },
  {
    id: 'index-to-a-common-start',
    title: 'Index to a Common Start',
    context: 'Two fictional services · four quarters',
    control: 'Measure',
    modes: [
      ['values', 'Original values'],
      ['indexed', 'Start = 100'],
    ],
    fallback:
      'Atlas grows from 1,000 to 1,400 users (+40%); Birch grows from 100 to 200 (+100%). An index of 100 at the first quarter reveals relative growth while concealing absolute scale.',
    controls: [],
  },
  {
    id: 'resolve-overplotting',
    title: 'Resolve Overplotting',
    context: '80 fictional observations · five repeated coordinate pairs',
    control: 'Display',
    modes: [
      ['plain', 'Plain points'],
      ['alpha', 'Transparency'],
      ['jitter', 'Jitter'],
      ['bins', 'Hexagonal bins'],
    ],
    fallback:
      'Eighty observations occupy only five recorded coordinate pairs, with counts 18, 12, 25, 15, and 10. Transparency, deterministic offsets, and hexagonal counts reveal multiplicity in different ways. Offsets are display positions, not additional measurements.',
    controls: [],
  },
  {
    id: 'condition-on-groups',
    title: 'Condition on Groups',
    context: 'Six fictional cases · two operating contexts',
    control: 'Context',
    modes: [
      ['pooled', 'Pooled'],
      ['groups', 'Separate groups'],
    ],
    fallback:
      'Context A pairs hours 1, 2, 3 with scores 8, 9, 10. Context B pairs hours 7, 8, 9 with scores 2, 3, 4. The pooled association is negative, although the association within each context is positive. Neither view establishes causation.',
    controls: [],
  },
  {
    id: 'show-the-smooth-with-the-raw',
    title: 'Show the Smooth with the Raw',
    context: '15 fictional daily readings · centered moving average',
    control: 'Evidence',
    modes: [
      ['smooth', 'Smooth only'],
      ['raw', 'Smooth + raw'],
    ],
    fallback:
      'Daily readings are 12, 18, 11, 21, 14, 25, 3, 26, 20, 30, 23, 33, 27, 36, 31 units. A centered moving average summarizes the trend; the day-seven reading of 3 remains important. Only full windows are calculated.',
    controls: [
      {
        key: 'window',
        label: 'Window size (days)',
        type: 'range',
        min: 3,
        max: 7,
        value: 3,
        step: 2,
      },
    ],
  },
  {
    id: 'decompose-the-change',
    title: 'Decompose the Change',
    context: 'Fictional workload · opening total and reconciled contributions',
    control: 'Explanation',
    modes: [
      ['totals', 'Start and end'],
      ['steps', 'Show contributions'],
    ],
    fallback:
      'Workload starts at 100, adds 40 new cases, removes 25 resolved cases, and adds 15 reopened cases, ending at 130. Contributions reconcile exactly: 100 + 40 − 25 + 15 = 130. This arithmetic does not establish causes.',
    controls: [],
  },
  {
    id: 'reveal-multiplicative-differences',
    title: 'Reveal Multiplicative Differences',
    context: 'Four fictional measurements · each ten times the previous',
    control: 'Horizontal scale',
    modes: [
      ['linear', 'Linear'],
      ['log', 'Logarithmic'],
    ],
    fallback:
      'Measurements are 1, 10, 100, and 1,000 units. Equal tenfold ratios occupy equal distances on a logarithmic axis. On a linear axis, equal distances represent equal additive differences. Zero and negative values are not supported by this log scale.',
    controls: [],
  },
  {
    id: 'show-the-cumulative-distribution',
    title: 'Show the Cumulative Distribution',
    context: '12 fictional waiting times · minutes',
    control: 'Representation',
    modes: [
      ['histogram', 'Histogram'],
      ['cumulative', 'Cumulative'],
    ],
    fallback:
      'Waiting times are 2, 3, 4, 4, 5, 5, 6, 7, 8, 10, 12, and 18 minutes. Seven of twelve waits (58.3%) are at most six minutes. The cumulative curve includes ties and reaches 100% at eighteen minutes.',
    controls: [
      {
        key: 'threshold',
        label: 'Threshold (minutes)',
        type: 'range',
        min: 0,
        max: 20,
        value: 6,
        step: 1,
      },
    ],
  },
  {
    id: 'align-around-an-event',
    title: 'Align Around an Event',
    context: 'Two fictional launches · daily readings around launch',
    control: 'Time origin',
    modes: [
      ['calendar', 'Calendar day'],
      ['event', 'Days since launch'],
    ],
    fallback:
      'Atlas launches on calendar day 4; Birch on day 10. Both are observed from two days before to three days after launch. Aligning launch at zero reveals similarly rising trajectories, without demonstrating that launch caused the changes.',
    controls: [],
  },
  {
    id: 'compare-cohorts-at-equal-age',
    title: 'Compare Cohorts at Equal Age',
    context: 'Fictional signup cohorts · retention among 100 initial users each',
    control: 'Time origin',
    modes: [
      ['calendar', 'Calendar month'],
      ['age', 'Months since signup'],
    ],
    fallback:
      'January retention is 100%, 70%, 55%, 45%; March retention is 100%, 80%, 65%, 60%. Both cohorts are observed to age three months. At equal age, March retains more users, although calendar conditions and group composition may differ.',
    controls: [],
  },
  {
    id: 'align-repeating-cycles',
    title: 'Align Repeating Cycles',
    context: 'Three fictional weeks · daily request counts',
    control: 'Layout',
    modes: [
      ['timeline', 'Continuous days'],
      ['cycles', 'Aligned weeks'],
    ],
    fallback:
      'Each of three weeks has lower weekend demand and a midweek peak. Aligning Monday with Monday reveals the recurring weekly pattern while preserving each week as a separate series. The full timeline retains the sequence between weeks.',
    controls: [],
  },
  {
    id: 'show-duration-explicitly',
    title: 'Show Duration Explicitly',
    context: 'Four fictional tasks · hours since opening',
    control: 'Representation',
    modes: [
      ['starts', 'Start times'],
      ['intervals', 'Start to finish'],
    ],
    fallback:
      'Intake runs from hour 0 to 2, Review from 1 to 5, Build from 3 to 8, and Check from 7 to 9. Start markers omit duration. Intervals reveal overlaps, including Review and Build between hours 3 and 5.',
    controls: [],
  },
  {
    id: 'preserve-meaningful-geography',
    title: 'Preserve Meaningful Geography',
    context: 'Fictional island districts · equal-area schematic, not a real map',
    control: 'View',
    modes: [
      ['ranked', 'Ranked values'],
      ['map', 'Geographic context'],
    ],
    fallback:
      'The west-coast districts Bay, Cove, and Delta have rates 80, 70, and 60 per 1,000; inland Elm, Fern, and Grove have 20, 30, and 25. Ranking reveals the largest rate; geographic positions reveal the coastal cluster. All values and boundaries are fictional.',
    controls: [],
  },
  {
    id: 'show-intersections-explicitly',
    title: 'Show Intersections Explicitly',
    context: '20 fictional members · nonexclusive interests A, B, and C',
    control: 'Counts',
    modes: [
      ['totals', 'Category totals'],
      ['intersections', 'Exact intersections'],
    ],
    fallback:
      'Exact memberships are A only 4, B only 3, C only 2, AB only 5, AC only 1, BC only 2, ABC 3. These mutually exclusive intersections sum to 20 people. Category totals A=13, B=13, C=8 overlap and sum to 34 memberships.',
    controls: [],
  },
  {
    id: 'expose-parent-child-structure',
    title: 'Expose Parent–Child Structure',
    context: 'Fictional catalogue · one parent per item',
    control: 'Depth',
    modes: [
      ['collapsed', 'Top level'],
      ['expanded', 'All levels'],
    ],
    fallback:
      'The catalogue contains Research (Field, Desk) and Delivery (Build, Support). A tree preserves the parent of each item. Expanding the hierarchy adds the four leaves while retaining the two branches and root. Edge lengths do not encode quantity.',
    controls: [],
  },
  {
    id: 'compare-state-transitions',
    title: 'Compare State Transitions',
    context: '12 fictional members · status at two observations',
    control: 'Starting state',
    modes: [
      ['all', 'All members'],
      ['new', 'Started New'],
      ['active', 'Started Active'],
      ['paused', 'Started Paused'],
    ],
    fallback:
      'Of four members starting New, three become Active and one Paused. Of five starting Active, four remain Active and one becomes Paused. Of three starting Paused, two become Active and one remains Paused. End totals are nine Active and three Paused.',
    controls: [],
  },
  {
    id: 'overview-plus-detail',
    title: 'Overview Plus Detail',
    context: '24 fictional monthly readings · a six-month detail window',
    control: 'Layout',
    modes: [
      ['detail', 'Detail only'],
      ['context', 'Overview + detail'],
    ],
    fallback:
      'The detail always contains six consecutive months. A full 24-month overview locates that interval within the longer series and retains a later spike outside many selected windows. Both panels keep the same value scale.',
    controls: [
      {
        key: 'start',
        label: 'First month in detail',
        type: 'range',
        min: 1,
        max: 19,
        value: 7,
        step: 1,
      },
    ],
  },
  {
    id: 'filter-to-focus',
    title: 'Filter to Focus',
    context: '12 fictional requests · two regions, six requests each',
    control: 'Region',
    modes: [
      ['all', 'All regions'],
      ['east', 'East'],
      ['west', 'West'],
    ],
    fallback:
      'Twelve requests have recorded hours and task counts. Region filters show a subset on fixed axes; they do not change the underlying records. The displayed count always states how many of twelve observations remain. An additional hours threshold can produce an empty result.',
    controls: [
      {
        key: 'minimum',
        label: 'Minimum hours',
        type: 'range',
        min: 0,
        max: 11,
        value: 0,
        step: 1,
      },
    ],
  },
  {
    id: 'details-on-demand',
    title: 'Details on Demand',
    context: '12 fictional requests · exact values available by selection',
    control: 'Explanation',
    modes: [
      ['overview', 'Overview'],
      ['details', 'Show details'],
    ],
    fallback:
      'The overview shows twelve requests by hours and completed tasks. Select a case to retrieve its identifier, region, exact values, and note; hover or tap a point for a tooltip. The table preserves all observations regardless of selection.',
    controls: [
      {
        key: 'case',
        label: 'Case',
        type: 'select',
        options: [
          ['1', 'Case 01'],
          ['2', 'Case 02'],
          ['3', 'Case 03'],
          ['4', 'Case 04'],
          ['5', 'Case 05'],
          ['6', 'Case 06'],
          ['7', 'Case 07'],
          ['8', 'Case 08'],
          ['9', 'Case 09'],
          ['10', 'Case 10'],
          ['11', 'Case 11'],
          ['12', 'Case 12'],
        ],
        value: '1',
      },
    ],
  },
  {
    id: 'brushing-and-linking',
    title: 'Brushing and Linking',
    context: 'The same 12 fictional requests · scatterplot and task distribution',
    control: 'Selection',
    modes: [
      ['all', 'All observations'],
      ['selected', 'Highlight selection'],
    ],
    fallback:
      'A horizontal hours interval selects the same request identities in both views. Unselected observations remain visible in gray. Drag across the scatterplot, or use the two hour controls. Selection changes emphasis; it does not filter out observations.',
    controls: [
      {
        key: 'low',
        label: 'Selection start (hours)',
        type: 'range',
        min: 0,
        max: 10,
        value: 3,
        step: 1,
      },
      {
        key: 'high',
        label: 'Selection end (hours)',
        type: 'range',
        min: 0,
        max: 10,
        value: 7,
        step: 1,
      },
    ],
  },
] as const satisfies readonly ExpansionLesson[];
export type ExpansionId = (typeof expansionManifest)[number]['id'];
