import type { ExpansionId } from './expansion-manifest';
import type { LessonTable } from './lesson-data';

export const districts = [
  { name: 'North', incidents: 240, population: 120_000 },
  { name: 'Central', incidents: 180, population: 45_000 },
  { name: 'South', incidents: 90, population: 90_000 },
];
export const growth = [
  { name: 'Atlas', values: [1000, 1100, 1250, 1400] },
  { name: 'Birch', values: [100, 130, 160, 200] },
];
export const repeatedPoints = [18, 12, 25, 15, 10].flatMap((n, group) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${group + 1}.${i + 1}`,
    x: group + 1,
    y: [3, 5, 4, 7, 6][group],
    // Display offsets are deterministic; recorded x and y remain unchanged.
    jx: Math.sin(i * 2.4 + group) * 0.24,
    jy: Math.cos(i * 1.8 + group) * 0.24,
  })),
);
export const contexts = [1, 2, 3, 7, 8, 9].map((hours, i) => ({
  id: i + 1,
  hours,
  score: [8, 9, 10, 2, 3, 4][i],
  group: i < 3 ? 'A' : 'B',
}));
export const dailyReadings = [12, 18, 11, 21, 14, 25, 3, 26, 20, 30, 23, 33, 27, 36, 31].map(
  (value, i) => ({ day: i + 1, value }),
);
export function movingAverage(window: number) {
  const half = (window - 1) / 2;
  return dailyReadings.slice(half, -half).map((row, i) => ({
    day: row.day,
    value: dailyReadings.slice(i, i + window).reduce((sum, d) => sum + d.value, 0) / window,
  }));
}
export const contributions = [
  { name: 'Opening', from: 0, to: 100, change: 100, total: true },
  { name: 'New', from: 100, to: 140, change: 40, total: false },
  { name: 'Resolved', from: 140, to: 115, change: -25, total: false },
  { name: 'Reopened', from: 115, to: 130, change: 15, total: false },
  { name: 'Closing', from: 0, to: 130, change: 130, total: true },
];
export const magnitudes = [1, 10, 100, 1000].map((value, i) => ({ name: `Case ${i + 1}`, value }));
export const waits = [2, 3, 4, 4, 5, 5, 6, 7, 8, 10, 12, 18];
export function cumulativeWaits() {
  return [
    { minutes: 0, share: 0 },
    ...[...new Set(waits)].map((minutes) => ({
      minutes,
      share: waits.filter((v) => v <= minutes).length / waits.length,
    })),
    { minutes: 20, share: 1 },
  ];
}
export const launches = [
  { name: 'Atlas', launch: 4, values: [4, 5, 8, 12, 15, 16] },
  { name: 'Birch', launch: 10, values: [3, 4, 7, 11, 14, 15] },
].flatMap((series) =>
  series.values.map((value, i) => ({
    name: series.name,
    day: series.launch + i - 2,
    since: i - 2,
    value,
  })),
);
export const cohorts = [
  { name: 'January', month: 1, values: [100, 70, 55, 45] },
  { name: 'March', month: 3, values: [100, 80, 65, 60] },
].flatMap((cohort) =>
  cohort.values.map((retained, age) => ({
    name: cohort.name,
    month: cohort.month + age,
    age,
    retained,
  })),
);
export const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const weeks = [
  [15, 24, 32, 26, 20, 9, 8],
  [18, 27, 35, 29, 23, 12, 11],
  [16, 25, 33, 27, 21, 10, 9],
].flatMap((values, w) =>
  values.map((value, d) => ({
    week: `Week ${w + 1}`,
    weekday: d,
    day: w * 7 + d + 1,
    value,
  })),
);
export const tasks = [
  { name: 'Intake', start: 0, end: 2 },
  { name: 'Review', start: 1, end: 5 },
  { name: 'Build', start: 3, end: 8 },
  { name: 'Check', start: 7, end: 9 },
];
export const island = [
  { name: 'Bay', x: 0, y: 0, rate: 80 },
  { name: 'Cove', x: 0, y: 1, rate: 70 },
  { name: 'Delta', x: 0, y: 2, rate: 60 },
  { name: 'Elm', x: 1, y: 0, rate: 20 },
  { name: 'Fern', x: 1, y: 1, rate: 30 },
  { name: 'Grove', x: 1, y: 2, rate: 25 },
].map((d) => ({
  ...d,
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [d.x, d.y],
        [d.x + 1, d.y],
        [d.x + 1, d.y + 1],
        [d.x, d.y + 1],
        [d.x, d.y],
      ],
    ],
  },
}));
export const intersections = [
  { name: 'A', members: ['A'], count: 4 },
  { name: 'B', members: ['B'], count: 3 },
  { name: 'C', members: ['C'], count: 2 },
  { name: 'AB', members: ['A', 'B'], count: 5 },
  { name: 'AC', members: ['A', 'C'], count: 1 },
  { name: 'BC', members: ['B', 'C'], count: 2 },
  { name: 'ABC', members: ['A', 'B', 'C'], count: 3 },
];
export const catalogue = [
  'Catalogue/Research/Field',
  'Catalogue/Research/Desk',
  'Catalogue/Delivery/Build',
  'Catalogue/Delivery/Support',
];
export const transitions = [
  ['New', 'Active'],
  ['New', 'Active'],
  ['New', 'Active'],
  ['New', 'Paused'],
  ['Active', 'Active'],
  ['Active', 'Active'],
  ['Active', 'Active'],
  ['Active', 'Active'],
  ['Active', 'Paused'],
  ['Paused', 'Active'],
  ['Paused', 'Active'],
  ['Paused', 'Paused'],
].map(([from, to], i) => ({ id: i + 1, from, to }));
export const months = [
  12, 15, 14, 19, 17, 23, 20, 25, 21, 29, 24, 30, 28, 33, 31, 38, 35, 40, 65, 42, 39, 45, 41, 48,
].map((value, i) => ({ month: i + 1, value }));
export const requests = [
  [1, 3],
  [2, 7],
  [3, 4],
  [4, 8],
  [5, 6],
  [6, 9],
  [2, 2],
  [4, 5],
  [6, 4],
  [7, 7],
  [8, 6],
  [10, 9],
].map(([hours, completed], i) => ({
  id: i + 1,
  name: `Case ${String(i + 1).padStart(2, '0')}`,
  hours,
  completed,
  region: i < 6 ? 'East' : 'West',
  note: i % 3 === 0 ? 'Includes follow-up work' : 'Standard request',
}));
export function filteredRequests(region: string, minimum: number) {
  return requests.filter(
    (d) => (region === 'all' || d.region.toLowerCase() === region) && d.hours >= minimum,
  );
}
export function selectedRequests(low: number, high: number) {
  return requests.filter((d) => d.hours >= Math.min(low, high) && d.hours <= Math.max(low, high));
}

export function expansionTable(id: ExpansionId): LessonTable {
  switch (id) {
    case 'normalize-by-exposure':
      return {
        columns: ['District', 'Incidents', 'Population', 'Per 100,000'],
        rows: districts.map((d) => [
          d.name,
          d.incidents,
          d.population,
          (d.incidents / d.population) * 100_000,
        ]),
      };
    case 'index-to-a-common-start':
      return {
        columns: ['Service', 'Quarter', 'Users', 'Index'],
        rows: growth.flatMap((d) =>
          d.values.map((v, i) => [d.name, i + 1, v, (v / d.values[0]) * 100]),
        ),
      };
    case 'resolve-overplotting':
      return {
        columns: ['Case', 'Recorded x', 'Recorded y'],
        rows: repeatedPoints.map((d) => [d.id, d.x, d.y]),
      };
    case 'condition-on-groups':
      return {
        columns: ['Case', 'Context', 'Hours', 'Score'],
        rows: contexts.map((d) => [d.id, d.group, d.hours, d.score]),
      };
    case 'show-the-smooth-with-the-raw':
      return { columns: ['Day', 'Units'], rows: dailyReadings.map((d) => [d.day, d.value]) };
    case 'decompose-the-change':
      return {
        columns: ['Stage', 'From', 'To', 'Total or signed change'],
        rows: contributions.map((d) => [d.name, d.from, d.to, d.change]),
      };
    case 'reveal-multiplicative-differences':
      return { columns: ['Case', 'Units'], rows: magnitudes.map((d) => [d.name, d.value]) };
    case 'show-the-cumulative-distribution':
      return { columns: ['Case', 'Minutes'], rows: waits.map((v, i) => [i + 1, v]) };
    case 'align-around-an-event':
      return {
        columns: ['Service', 'Calendar day', 'Days since launch', 'Units'],
        rows: launches.map((d) => [d.name, d.day, d.since, d.value]),
      };
    case 'compare-cohorts-at-equal-age':
      return {
        columns: ['Cohort', 'Calendar month', 'Age (months)', 'Retained of 100'],
        rows: cohorts.map((d) => [d.name, d.month, d.age, d.retained]),
      };
    case 'align-repeating-cycles':
      return {
        columns: ['Week', 'Day', 'Weekday', 'Requests'],
        rows: weeks.map((d) => [d.week, d.day, weekdays[d.weekday], d.value]),
      };
    case 'show-duration-explicitly':
      return {
        columns: ['Task', 'Start hour', 'End hour', 'Duration'],
        rows: tasks.map((d) => [d.name, d.start, d.end, d.end - d.start]),
      };
    case 'preserve-meaningful-geography':
      return {
        columns: ['District', 'West–east column', 'North–south row', 'Rate per 1,000'],
        rows: island.map((d) => [d.name, d.x, d.y, d.rate]),
      };
    case 'show-intersections-explicitly':
      return {
        columns: ['Exact membership', 'People'],
        rows: intersections.map((d) => [d.name, d.count]),
      };
    case 'expose-parent-child-structure':
      return {
        columns: ['Leaf', 'Parent', 'Root'],
        rows: catalogue.map((d) => {
          const [root, parent, leaf] = d.split('/');
          return [leaf, parent, root];
        }),
      };
    case 'compare-state-transitions':
      return {
        columns: ['Member', 'First status', 'Second status'],
        rows: transitions.map((d) => [d.id, d.from, d.to]),
      };
    case 'overview-plus-detail':
      return { columns: ['Month', 'Units'], rows: months.map((d) => [d.month, d.value]) };
    case 'filter-to-focus':
    case 'details-on-demand':
    case 'brushing-and-linking':
      return {
        columns: ['Case / region', 'Hours', 'Tasks', 'Note'],
        rows: requests.map((d) => [`${d.name} / ${d.region}`, d.hours, d.completed, d.note]),
      };
  }
}
