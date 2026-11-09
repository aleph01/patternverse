import type { LessonId } from './lesson-manifest';

export const outputTeams = [
  { name: 'North', values: [18, 24, 30] },
  { name: 'South', values: [60, 80, 100] },
] as const;
export const dailyOutput = [72, 85, 64, 91].map((value, i) => ({
  label: ['Mon', 'Tue', 'Wed', 'Thu'][i],
  value,
}));
export const pairedCases = [
  { label: 'P1', before: 12, after: 15 },
  { label: 'P2', before: 18, after: 16 },
  { label: 'P3', before: 8, after: 14 },
  { label: 'P4', before: 20, after: 21 },
];
export const waitingTimes = [2, 3, 4, 4, 5, 5, 6, 7, 8, 10, 12, 18];
export const observedGroups = [
  { label: 'A', values: [2, 4, 6, 8, 10] },
  { label: 'B', values: [5, 5, 6, 7, 7] },
];
export const practicePairs = [2, 3, 5, 4, 7, 8].map((tasks, index) => ({
  label: String.fromCharCode(65 + index),
  hours: index + 1,
  tasks,
}));
export const timedReadings = [
  { day: 0, value: 10 },
  { day: 1, value: 14 },
  { day: 8, value: 18 },
  { day: 9, value: 20 },
];
export const responseGroups = [
  { label: 'A', positive: 40, total: 100 },
  { label: 'B', positive: 90, total: 300 },
];
export const regionSeries = [
  { label: 'North', values: [10, 20, 30, 25], color: '#007a4d', symbol: 'circle' },
  { label: 'East', values: [25, 23, 15, 10], color: '#356eac', symbol: 'square' },
  { label: 'West', values: [12, 18, 17, 24], color: '#78548c', symbol: 'triangle' },
] as const;
export const requestCounts = [
  { label: 'Access', value: 47 },
  { label: 'Billing', value: 124 },
  { label: 'Delivery', value: 83 },
  { label: 'Feedback', value: 28 },
  { label: 'Returns', value: 69 },
  { label: 'Setup', value: 42 },
  { label: 'Subscription', value: 97 },
  { label: 'Warranty', value: 35 },
];
export const responseSamples = [
  { label: 'A', positive: 7, n: 10 },
  { label: 'B', positive: 70, n: 100 },
];
export const reportingDays = [12, 0, null, 18, 15].map((value, day) => ({
  day,
  label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][day],
  value,
}));
export const surveyCoverage = [
  { label: 'A', positive: 3, n: 4, invited: 10 },
  { label: 'B', positive: 75, n: 100, invited: 100 },
];

export const mean = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;
export function histogram(values: readonly number[], width = 4) {
  return Array.from({ length: 5 }, (_, i) => ({
    low: i * width,
    high: (i + 1) * width,
    count: values.filter((value) => value >= i * width && value < (i + 1) * width).length,
  }));
}
export function wilsonInterval(successes: number, n: number): readonly [number, number] {
  const z = 1.959963984540054,
    p = successes / n,
    denominator = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denominator;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

export type LessonTable = {
  columns: readonly string[];
  rows: readonly (readonly (string | number)[])[];
};
export function tableForLesson(id: LessonId): LessonTable {
  switch (id) {
    case 'align-for-comparison':
      return {
        columns: ['Team', 'Task A', 'Task B', 'Task C'],
        rows: outputTeams.map((team) => [team.name, ...team.values]),
      };
    case 'compare-against-a-reference':
      return {
        columns: ['Day', 'Output', 'Target', 'Gap'],
        rows: dailyOutput.map((row) => [row.label, row.value, 80, row.value - 80]),
      };
    case 'show-paired-differences':
      return {
        columns: ['Case', 'Before', 'After', 'Change'],
        rows: pairedCases.map((row) => [row.label, row.before, row.after, row.after - row.before]),
      };
    case 'show-the-distribution':
      return {
        columns: ['Case', 'Minutes'],
        rows: waitingTimes.map((value, index) => [index + 1, value]),
      };
    case 'keep-individual-observations-visible':
      return {
        columns: ['Group', 'Case', 'Minutes'],
        rows: observedGroups.flatMap((group) =>
          group.values.map((value, i) => [group.label, i + 1, value]),
        ),
      };
    case 'plot-variables-together':
      return {
        columns: ['Case', 'Hours', 'Tasks'],
        rows: practicePairs.map((row) => [row.label, row.hours, row.tasks]),
      };
    case 'preserve-elapsed-time':
      return {
        columns: ['Day', 'Reading'],
        rows: timedReadings.map((row) => [row.day, row.value]),
      };
    case 'show-parts-in-context':
      return {
        columns: ['Group', 'Positive', 'Total', 'Share'],
        rows: responseGroups.map((row) => [
          row.label,
          row.positive,
          row.total,
          `${(100 * row.positive) / row.total}%`,
        ]),
      };
    case 'small-multiples':
    case 'label-directly':
    case 'redundant-coding':
      return {
        columns: ['Region', 'Jan', 'Feb', 'Mar', 'Apr'],
        rows: regionSeries.map((row) => [row.label, ...row.values]),
      };
    case 'match-color-to-the-data':
      return {
        columns: ['Row', 'Category', 'Ordered', 'Deviation', 'Angle'],
        rows: Array.from({ length: 8 }, (_, i) => [
          i + 1,
          ['A', 'B', 'C', 'D'][i % 4],
          i * 10,
          i * 10 - 35,
          `${i * 45}°`,
        ]),
      };
    case 'highlight-the-relevant-contrast':
    case 'provide-an-equivalent-text-account':
      return {
        columns: ['Category', 'Tickets'],
        rows: requestCounts.map((row) => [row.label, row.value]),
      };
    case 'show-uncertainty':
      return {
        columns: ['Sample', 'Positive/n', 'Estimate', 'Wilson 95% interval'],
        rows: responseSamples.map((row) => [
          row.label,
          `${row.positive}/${row.n}`,
          '70%',
          wilsonInterval(row.positive, row.n)
            .map((value) => (value * 100).toFixed(1))
            .join('–') + '%',
        ]),
      };
    case 'distinguish-missing-from-zero':
      return {
        columns: ['Day', 'Recorded count'],
        rows: reportingDays.map((row) => [row.label, row.value ?? 'Missing']),
      };
    case 'expose-sample-size-and-coverage':
      return {
        columns: ['Group', 'Positive/n', 'Responded/invited', 'Positive rate'],
        rows: surveyCoverage.map((row) => [
          row.label,
          `${row.positive}/${row.n}`,
          `${row.n}/${row.invited}`,
          '75%',
        ]),
      };
  }
}
