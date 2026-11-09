import {
  barX,
  dot,
  line,
  link,
  rectY,
  ruleX,
  ruleY,
  text,
  type PlotOptions,
} from '@observablehq/plot';
import {
  dailyOutput,
  histogram,
  mean,
  observedGroups,
  outputTeams,
  pairedCases,
  practicePairs,
  regionSeries,
  reportingDays,
  requestCounts,
  responseGroups,
  responseSamples,
  surveyCoverage,
  timedReadings,
  waitingTimes,
  wilsonInterval,
} from './lesson-data';
import { lessonManifest, type LessonId } from './lesson-manifest';

const green = '#007a4d',
  gray = '#777e78',
  ink = '#252822';
type ValueRow = { label: string; value: number };
export type LessonPanel = { title: string; options: PlotOptions };
export type LessonView = {
  summary: string;
  panels: LessonPanel[];
  key?: { label: string; color: string; symbol?: string }[];
  account?: string;
};
const base = (width: number, height = 280): PlotOptions => ({
  width,
  height,
  marginLeft: 46,
  marginRight: 30,
  marginTop: 28,
  marginBottom: 44,
  style: { fontFamily: 'inherit', fontSize: '12px', background: 'transparent' },
});
const labeledBars = (
  rows: readonly ValueRow[],
  domain: number[],
  width: number,
  fill: string | ((row: ValueRow) => string) = green,
): PlotOptions => ({
  ...base(width, Math.max(200, rows.length * 34 + 64)),
  marginLeft: 94,
  x: {
    domain,
    nice: false,
    grid: true,
    ticks: width < 400 ? 4 : 6,
    label: 'Units',
    labelAnchor: 'center',
  },
  y: { domain: rows.map((row) => row.label), label: null, tickSize: 0, padding: 0.25 },
  marks: [
    barX(rows, {
      x: 'value',
      y: 'label',
      fill,
      ariaLabel: (row: ValueRow) => `${row.label}: ${row.value}`,
    }),
    ruleX([0], { stroke: gray }),
    text(
      rows.filter((row) => row.value >= 0),
      {
        x: 'value',
        y: 'label',
        text: (row: ValueRow) => String(row.value),
        dx: 6,
        textAnchor: 'start',
        fill: ink,
        ariaHidden: 'true',
      },
    ),
    ...(rows.some((row) => row.value < 0)
      ? [
          text(
            rows.filter((row) => row.value < 0),
            {
              x: 'value',
              y: 'label',
              text: (row: ValueRow) => String(row.value),
              dx: -6,
              textAnchor: 'end',
              fill: ink,
              ariaHidden: 'true',
            },
          ),
        ]
      : []),
  ],
});
const month = (value: number) => ['Jan', 'Feb', 'Mar', 'Apr'][value - 1] ?? '';
function regionPlot(width: number, selected = [...regionSeries], direct = false): PlotOptions {
  const rows = selected.flatMap((series) =>
    series.values.map((value, index) => ({
      label: series.label,
      month: index + 1,
      value,
      color: series.color,
    })),
  );
  const ends = selected.map((series) => ({
    label: series.label,
    value: series.values[3],
    labelY: series.label === 'North' ? 32 : series.label === 'West' ? 22 : 10,
    color: series.color,
  }));
  return {
    ...base(width, selected.length === 1 ? 205 : 300),
    marginRight: 18,
    x: {
      domain: [1, 4.95],
      ticks: [1, 2, 3, 4],
      tickFormat: month,
      label: 'Month',
      labelAnchor: 'center',
    },
    y: { domain: [0, 35], ticks: [0, 10, 20, 30], grid: true, label: 'Units' },
    color: { type: 'identity' },
    marks: [
      line(rows, { x: 'month', y: 'value', z: 'label', stroke: 'color', strokeWidth: 2 }),
      dot(rows, {
        x: 'month',
        y: 'value',
        fill: 'color',
        r: 3,
        ariaLabel: (row: (typeof rows)[number]) =>
          `${row.label}, ${month(row.month)}: ${row.value} units`,
      }),
      ...(direct
        ? [
            link(ends, {
              x1: 4,
              y1: 'value',
              x2: 4.22,
              y2: 'labelY',
              stroke: 'color',
              strokeWidth: 1,
            }),
            text(ends, {
              x: 4.25,
              y: 'labelY',
              text: 'label',
              fill: 'color',
              textAnchor: 'start',
              fontSize: 11,
            }),
          ]
        : []),
    ],
  };
}

/** Each branch has a fixed fixture; mode changes presentation or explicitly chooses a variable type. */
export function lessonView(
  id: LessonId,
  mode: string,
  width: number,
  grayscale = false,
): LessonView {
  const fallback = lessonManifest.find((lesson) => lesson.id === id)!.fallback;
  switch (id) {
    case 'align-for-comparison':
      return {
        summary:
          mode === 'shared'
            ? 'Shared axes show that South produces over three times as much for every task. The observations and bar colors have not changed.'
            : 'Independent axes end at 30 for North and 100 for South. Their longest bars occupy the same width, although the values differ.',
        panels: outputTeams.map((team) => ({
          title: `${team.name} · ${mode === 'shared' ? 'shared scale' : 'independent scale'}`,
          options: {
            ...labeledBars(
              team.values.map((value, i) => ({
                label: `Task ${String.fromCharCode(65 + i)}`,
                value,
              })),
              [0, mode === 'shared' ? 110 : Math.max(...team.values)],
              width,
            ),
            x: {
              domain: [0, mode === 'shared' ? 110 : Math.max(...team.values)],
              nice: false,
              grid: true,
              ticks: 4,
              label: 'Units',
              labelAnchor: 'center',
            },
          },
        })),
      };
    case 'compare-against-a-reference': {
      const options = labeledBars(dailyOutput, [0, 110], width);
      if (mode === 'reference')
        options.marks = [
          ...options.marks!,
          ruleX([80], { stroke: ink, strokeDasharray: '4,3', strokeWidth: 1.5 }),
          text([{ value: 80, label: 'Target 80', day: 'Mon' }], {
            x: 'value',
            y: 'day',
            text: 'label',
            dy: -20,
            textAnchor: 'middle',
            fontSize: 11,
          }),
        ];
      return {
        summary:
          mode === 'reference'
            ? 'Target: 80 units. Tuesday is 5 above it and Thursday 11 above; Monday is 8 below and Wednesday 16 below.'
            : 'The counts are readable, but the chart does not yet show the target of 80 units.',
        panels: [{ title: 'Daily output', options }],
      };
    }
    case 'show-paired-differences': {
      const changes = pairedCases.map((row) => ({
        label: row.label,
        value: row.after - row.before,
      }));
      const options: PlotOptions =
        mode === 'differences'
          ? {
              ...labeledBars(changes, [-4, 8], width),
              x: {
                domain: [-4, 8],
                grid: true,
                label: 'After − before (points)',
                labelAnchor: 'center',
                ticks: [-4, 0, 4, 8],
              },
            }
          : {
              ...base(width),
              marginLeft: 48,
              x: {
                domain: [0, 24],
                grid: true,
                label: 'Score (points)',
                labelAnchor: 'center',
                ticks: [0, 5, 10, 15, 20],
              },
              y: { domain: pairedCases.map((row) => row.label), label: null },
              marks: [
                ruleY(pairedCases, {
                  y: 'label',
                  x1: 'before',
                  x2: 'after',
                  stroke: gray,
                  strokeWidth: 2,
                }),
                dot(pairedCases, { x: 'before', y: 'label', fill: '#fff', stroke: gray, r: 5 }),
                dot(pairedCases, { x: 'after', y: 'label', fill: green, r: 5 }),
              ],
            };
      return {
        summary:
          'The paired changes are +3, −2, +6, and +1 points. P2 declines even though the mean change is +2.',
        panels: [
          {
            title:
              mode === 'differences'
                ? 'Change for each matched case'
                : 'Before and after for the same cases',
            options,
          },
        ],
        key:
          mode === 'pairs'
            ? [
                { label: 'Before · hollow', color: gray, symbol: '○' },
                { label: 'After · filled', color: green, symbol: '●' },
              ]
            : undefined,
      };
    }
    case 'show-the-distribution':
      return {
        summary:
          mode === 'distribution'
            ? 'Mean: 7 minutes. Counts in [0,4), [4,8), [8,12), [12,16), and [16,20) are 2, 6, 2, 1, and 1. A long wait of 18 minutes is hidden by the mean alone.'
            : 'Mean: 7 minutes across 12 cases. The location of the mean does not describe the shape or spread of those waiting times.',
        panels: [
          {
            title:
              mode === 'distribution'
                ? 'Same cases, four-minute bins'
                : 'One summary of twelve cases',
            options: {
              ...base(width),
              x: {
                domain: [0, 20],
                ticks: [0, 4, 8, 12, 16, 20],
                label: 'Waiting time (minutes)',
                labelAnchor: 'center',
              },
              y: { domain: [0, 7], ticks: [0, 2, 4, 6], label: 'Cases per bin', grid: true },
              marks: [
                ...(mode === 'distribution'
                  ? [
                      rectY(histogram(waitingTimes), {
                        x1: 'low',
                        x2: 'high',
                        y: 'count',
                        fill: green,
                        inset: 1,
                      }),
                    ]
                  : []),
                ruleX([mean(waitingTimes)], { stroke: ink, strokeDasharray: '4,3' }),
                text([{ x: 7.3, y: 6.5 }], {
                  x: 'x',
                  y: 'y',
                  text: ['Mean 7'],
                  textAnchor: 'start',
                  fontSize: 11,
                }),
              ],
            },
          },
        ],
      };
    case 'keep-individual-observations-visible': {
      const centers = observedGroups.map((group, i) => ({
        label: group.label,
        value: mean(group.values),
        row: 1 - i,
      }));
      const cases = observedGroups.flatMap((group, i) =>
        group.values.map((value, j) => ({
          label: group.label,
          value,
          row: 1 - i + (j - 2) * 0.09,
        })),
      );
      return {
        summary: fallback,
        panels: [
          {
            title: mode === 'cases' ? 'Individual cases plus group means' : 'Group means only',
            options: {
              ...base(width),
              x: {
                domain: [0, 12],
                ticks: [0, 3, 6, 9, 12],
                label: 'Minutes',
                labelAnchor: 'center',
                grid: true,
              },
              y: {
                domain: [-0.4, 1.4],
                ticks: [0, 1],
                tickFormat: (value) => (value === 1 ? 'A' : 'B'),
                label: null,
              },
              marks: [
                ...(mode === 'cases'
                  ? [
                      dot(cases, {
                        x: 'value',
                        y: 'row',
                        fill: green,
                        r: 4,
                        ariaLabel: (row: (typeof cases)[number]) =>
                          `${row.label}: ${row.value} minutes; vertical offset is for separation only`,
                      }),
                    ]
                  : []),
                dot(centers, {
                  x: 'value',
                  y: 'row',
                  symbol: 'diamond',
                  stroke: ink,
                  fill: 'none',
                  r: 6,
                }),
              ],
            },
          },
        ],
        key: [
          { label: 'Mean · hollow diamond', color: ink, symbol: '◇' },
          ...(mode === 'cases'
            ? [{ label: 'Observation · filled dot', color: green, symbol: '●' }]
            : []),
        ],
      };
    }
    case 'plot-variables-together':
      return {
        summary: fallback,
        panels:
          mode === 'together'
            ? [
                {
                  title: 'One point per participant',
                  options: {
                    ...base(width),
                    x: {
                      domain: [0, 7],
                      ticks: [0, 2, 4, 6],
                      label: 'Practice (hours)',
                      labelAnchor: 'center',
                      grid: true,
                    },
                    y: {
                      domain: [0, 10],
                      ticks: [0, 2, 4, 6, 8, 10],
                      label: 'Tasks completed',
                      grid: true,
                    },
                    marks: [
                      dot(practicePairs, {
                        x: 'hours',
                        y: 'tasks',
                        fill: green,
                        r: 5,
                        ariaLabel: (row: (typeof practicePairs)[number]) =>
                          `${row.label}: ${row.hours} hours, ${row.tasks} tasks`,
                      }),
                      text(practicePairs, {
                        x: 'hours',
                        y: 'tasks',
                        text: 'label',
                        dx: 8,
                        textAnchor: 'start',
                        fontSize: 11,
                      }),
                    ],
                  },
                },
              ]
            : [
                {
                  title: 'Practice by participant',
                  options: {
                    ...labeledBars(
                      practicePairs.map((row) => ({ label: row.label, value: row.hours })),
                      [0, 9],
                      width,
                    ),
                    x: {
                      domain: [0, 9],
                      ticks: [0, 3, 6, 9],
                      label: 'Hours',
                      labelAnchor: 'center',
                    },
                  },
                },
                {
                  title: 'Tasks by participant',
                  options: {
                    ...labeledBars(
                      practicePairs.map((row) => ({ label: row.label, value: row.tasks })),
                      [0, 9],
                      width,
                    ),
                    x: {
                      domain: [0, 9],
                      ticks: [0, 3, 6, 9],
                      label: 'Tasks completed',
                      labelAnchor: 'center',
                    },
                  },
                },
              ],
      };
    case 'preserve-elapsed-time': {
      const rows = timedReadings.map((row, i) => ({
        ...row,
        position: mode === 'elapsed' ? row.day : i,
      }));
      return {
        summary:
          mode === 'elapsed'
            ? 'The rise from 14 to 18 takes seven days: about 0.57 units per day. The first four-unit rise takes one day.'
            : 'Equal spacing makes the two four-unit rises appear equally fast, although their elapsed times are one and seven days.',
        panels: [
          {
            title:
              mode === 'elapsed'
                ? 'Position follows elapsed days'
                : 'Each observation receives an equal gap',
            options: {
              ...base(width),
              x: {
                domain: mode === 'elapsed' ? [0, 9] : [0, 3],
                ticks: mode === 'elapsed' ? [0, 1, 4, 8, 9] : [0, 1, 2, 3],
                tickFormat: (value) =>
                  String(mode === 'elapsed' ? value : (timedReadings[value]?.day ?? '')),
                label: 'Day',
                labelAnchor: 'center',
              },
              y: { domain: [8, 22], ticks: [10, 15, 20], label: 'Reading (units)', grid: true },
              marks: [
                line(rows, { x: 'position', y: 'value', stroke: green, strokeWidth: 2 }),
                dot(rows, { x: 'position', y: 'value', fill: green, r: 4 }),
              ],
            },
          },
        ],
      };
    }
    case 'show-parts-in-context': {
      const counts = mode === 'counts';
      const pieces = responseGroups.flatMap((row) => {
        const positive = counts ? row.positive : (100 * row.positive) / row.total;
        return [
          { label: row.label, part: 'Positive', value: positive, color: green },
          {
            label: row.label,
            part: 'Other',
            value: (counts ? row.total : 100) - positive,
            color: '#777e78',
          },
        ];
      });
      const totals = responseGroups.map((row) => ({
        label: row.label,
        value: counts ? row.total : 100,
        text: counts ? `n=${row.total}` : '100%',
      }));
      return {
        summary: fallback,
        key: [
          { label: 'Positive', color: green },
          { label: 'Other', color: gray },
        ],
        panels: [
          {
            title: counts
              ? 'Counts preserve the different group sizes'
              : 'Each bar represents 100 percent',
            options: {
              ...base(width, 210),
              marginLeft: 32,
              marginRight: 44,
              x: {
                domain: counts ? [0, 370] : [0, 125],
                ticks: counts ? [0, 100, 200, 300] : [0, 25, 50, 75, 100],
                label: counts ? 'Responses' : 'Share (%)',
                labelAnchor: 'center',
                grid: true,
              },
              y: { domain: ['A', 'B'], label: null },
              color: { type: 'identity' },
              marks: [
                barX(pieces, { x: 'value', y: 'label', fill: 'color', z: 'part' }),
                text(totals, {
                  x: 'value',
                  y: 'label',
                  text: 'text',
                  dx: 6,
                  textAnchor: 'start',
                  fontSize: 11,
                }),
              ],
            },
          },
        ],
      };
    }
    case 'small-multiples':
      return {
        summary: fallback,
        panels:
          mode === 'multiples'
            ? regionSeries.map((series) => ({
                title: series.label,
                options: regionPlot(width, [series]),
              }))
            : [{ title: 'All regions on one set of axes', options: regionPlot(width) }],
        key: regionSeries.map((series) => ({ label: series.label, color: series.color })),
      };
    case 'match-color-to-the-data': {
      const rows = Array.from({ length: 8 }, (_, i) => ({
        label: `Row ${i + 1}`,
        value:
          mode === 'categorical'
            ? ['A', 'B', 'C', 'D'][i % 4]
            : mode === 'diverging'
              ? i * 10 - 35
              : mode === 'cyclic'
                ? i * 45
                : i * 10,
      }));
      const color: PlotOptions['color'] =
        mode === 'categorical'
          ? {
              type: 'categorical',
              domain: ['A', 'B', 'C', 'D'],
              range: [green, '#356eac', '#925625', '#78548c'],
            }
          : {
              type: 'linear',
              domain: mode === 'diverging' ? [-35, 35] : mode === 'cyclic' ? [0, 360] : [0, 70],
              scheme: mode === 'diverging' ? 'RdBu' : mode === 'cyclic' ? 'rainbow' : 'viridis',
            };
      const explanation =
        mode === 'categorical'
          ? 'A–D are unordered categories. Equal identities repeat; the colors imply no rank.'
          : mode === 'sequential'
            ? 'Values rise from 0 to 70. A sequential palette supplies a perceptual progression.'
            : mode === 'diverging'
              ? 'Deviations range from −35 to +35 around a justified zero midpoint.'
              : 'Directions run from 0° to 315°. The palette wraps: 360° represents the same direction as 0°.';
      return {
        summary: explanation,
        panels: [
          {
            title: 'Color roles follow the variable',
            options: {
              ...base(width, 330),
              marginLeft: 58,
              marginRight: 30,
              x: { domain: [0, 1.5], axis: null },
              y: { domain: rows.map((row) => row.label), label: null, tickSize: 0 },
              color,
              marks: [
                barX(rows, {
                  x: 1,
                  y: 'label',
                  fill: 'value',
                  ariaLabel: (row: (typeof rows)[number]) =>
                    `${row.label}: ${row.value}${mode === 'cyclic' ? ' degrees' : ''}`,
                }),
                text(rows, {
                  x: 1.05,
                  y: 'label',
                  text: (row: (typeof rows)[number]) =>
                    `${row.value}${mode === 'cyclic' ? '°' : ''}`,
                  textAnchor: 'start',
                  fontSize: 12,
                }),
              ],
            },
          },
        ],
      };
    }
    case 'highlight-the-relevant-contrast':
      return {
        summary:
          mode === 'highlight'
            ? 'Billing is emphasized at 124 tickets. Every other count, bar length, and row position stays visible and unchanged.'
            : 'All categories receive equal emphasis. The reader must decide which contrast deserves attention.',
        panels: [
          {
            title: 'Support tickets by category',
            options: {
              ...labeledBars(requestCounts, [0, 140], width, (row) =>
                mode === 'highlight' && row.label === 'Billing' ? green : gray,
              ),
              x: {
                domain: [0, 140],
                grid: true,
                ticks: [0, 40, 80, 120],
                label: 'Tickets',
                labelAnchor: 'center',
              },
            },
          },
        ],
      };
    case 'label-directly':
      return {
        summary: fallback,
        panels: [
          {
            title: 'The same three trajectories',
            options: regionPlot(width, [...regionSeries], mode === 'direct'),
          },
        ],
        key:
          mode === 'legend'
            ? regionSeries.map((series) => ({ label: series.label, color: series.color }))
            : undefined,
      };
    case 'show-uncertainty': {
      const rows = responseSamples.map((sample) => ({
        label: `${sample.label} (n=${sample.n})`,
        estimate: (100 * sample.positive) / sample.n,
        low: 100 * wilsonInterval(sample.positive, sample.n)[0],
        high: 100 * wilsonInterval(sample.positive, sample.n)[1],
      }));
      return {
        summary: fallback,
        panels: [
          {
            title:
              mode === 'intervals'
                ? 'Estimates with Wilson 95% intervals'
                : 'Point estimates alone',
            options: {
              ...base(width, 235),
              marginLeft: 80,
              x: {
                domain: [0, 100],
                ticks: [0, 25, 50, 75, 100],
                grid: true,
                label: 'Positive responses (%)',
                labelAnchor: 'center',
              },
              y: { domain: rows.map((row) => row.label), label: null },
              marks: [
                ...(mode === 'intervals'
                  ? [
                      ruleY(rows, {
                        y: 'label',
                        x1: 'low',
                        x2: 'high',
                        stroke: green,
                        strokeWidth: 2,
                        marker: 'tick',
                      }),
                    ]
                  : []),
                dot(rows, { x: 'estimate', y: 'label', fill: green, stroke: '#fff', r: 5 }),
              ],
            },
          },
        ],
      };
    }
    case 'distinguish-missing-from-zero': {
      const rows = reportingDays.map((row) => ({
        ...row,
        shown: row.value === null && mode === 'zero' ? 0 : row.value,
      }));
      return {
        summary:
          mode === 'zero'
            ? 'This view invents a zero for unreported Wednesday. The dip is a consequence of that replacement, not observed evidence.'
            : 'Tuesday is an observed zero. Wednesday has no reported value, so the line breaks instead of claiming a measurement.',
        panels: [
          {
            title:
              mode === 'zero'
                ? 'Missing filled with an invented zero'
                : 'Missing remains visibly unavailable',
            options: {
              ...base(width),
              x: {
                domain: [0, 4],
                ticks: [0, 1, 2, 3, 4],
                tickFormat: (day) => reportingDays[day]?.label ?? '',
                label: 'Day',
                labelAnchor: 'center',
              },
              y: {
                domain: [0, 22],
                ticks: [0, 5, 10, 15, 20],
                label: 'Reported count',
                grid: true,
              },
              marks: [
                line(rows, { x: 'day', y: 'shown', stroke: green, strokeWidth: 2 }),
                dot(rows, { x: 'day', y: 'shown', fill: green, r: 4 }),
                ...(mode === 'missing'
                  ? [
                      text([{ day: 2, label: 'Missing' }], {
                        x: 'day',
                        y: 4,
                        text: 'label',
                        fontSize: 11,
                        fill: ink,
                      }),
                    ]
                  : []),
              ],
            },
          },
        ],
      };
    }
    case 'expose-sample-size-and-coverage':
      return {
        summary:
          mode === 'counts'
            ? fallback
            : 'Both positive-response rates are 75%. Equal percentages alone conceal different respondent counts and response coverage.',
        panels: [
          {
            title: 'Positive responses among respondents',
            options: {
              ...base(width, 240),
              x: {
                domain: [0, 100],
                ticks: [0, 25, 50, 75, 100],
                label: 'Positive responses (%)',
                labelAnchor: 'center',
                grid: true,
              },
              y: { domain: ['A', 'B'], label: null },
              marks: [
                dot(surveyCoverage, {
                  x: (row: (typeof surveyCoverage)[number]) => (100 * row.positive) / row.n,
                  y: 'label',
                  fill: green,
                  r: 5,
                }),
                ...(mode === 'counts'
                  ? [
                      text(surveyCoverage, {
                        x: 10,
                        y: 'label',
                        text: (row: (typeof surveyCoverage)[number]) => `${row.positive}/${row.n}`,
                        textAnchor: 'start',
                        dy: -13,
                        fontSize: 12,
                      }),
                    ]
                  : []),
              ],
            },
          },
        ],
      };
    case 'redundant-coding': {
      const redundant = mode === 'redundant';
      return {
        summary: `${redundant ? 'Circles identify North, squares East, and triangles West.' : 'Every group uses circles, so color carries group identity.'} ${grayscale ? 'The grayscale view removes the hue distinctions.' : 'Positions and values remain fixed.'}`,
        key: regionSeries.map((series) => ({
          label: series.label,
          color: series.color,
          symbol: redundant ? { circle: '○', square: '□', triangle: '△' }[series.symbol] : '○',
        })),
        panels: [
          {
            title: 'Identify each series with the key',
            options: {
              ...base(width),
              x: {
                domain: [0.8, 4.2],
                ticks: [1, 2, 3, 4],
                tickFormat: month,
                label: 'Month',
                labelAnchor: 'center',
              },
              y: { domain: [0, 35], ticks: [0, 10, 20, 30], label: 'Units', grid: true },
              marks: regionSeries.map((series) =>
                dot(
                  series.values.map((value, i) => ({ month: i + 1, value })),
                  {
                    x: 'month',
                    y: 'value',
                    symbol: redundant ? series.symbol : 'circle',
                    stroke: series.color,
                    fill: '#fff',
                    strokeWidth: 2,
                    r: 5,
                    ariaLabel: (row: { month: number; value: number }) =>
                      `${series.label}, ${month(row.month)}: ${row.value}`,
                  },
                ),
              ),
            },
          },
        ],
      };
    }
    case 'provide-an-equivalent-text-account':
      return {
        summary:
          mode === 'account'
            ? 'The added account names the population, main comparison, and limits. The chart itself has not changed.'
            : 'The visible account is hidden for this teaching comparison. The underlying data remains available below.',
        account: mode === 'account' ? fallback : undefined,
        panels: [
          {
            title: 'Support tickets by category',
            options: {
              ...labeledBars(requestCounts, [0, 140], width),
              x: {
                domain: [0, 140],
                grid: true,
                ticks: [0, 40, 80, 120],
                label: 'Tickets',
                labelAnchor: 'center',
              },
            },
          },
        ],
      };
  }
}
