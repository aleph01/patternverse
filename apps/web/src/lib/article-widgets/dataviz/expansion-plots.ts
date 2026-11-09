import * as Plot from '@observablehq/plot';
import type { ExpansionId } from './expansion-manifest';
import { expansionManifest } from './expansion-manifest';
import * as D from './expansion-data';
import type { LessonView } from './lesson-plots';

export type ExpansionState = Record<string, number | string>;
const green = '#007a4d',
  blue = '#356eac',
  gray = '#b9bfb9',
  ink = '#252822',
  orange = '#a44b14';
const base = (width: number, height = 290): Plot.PlotOptions => ({
  width,
  height,
  marginLeft: 48,
  marginRight: 25,
  marginTop: 24,
  marginBottom: 48,
  style: { fontFamily: 'inherit', fontSize: '12px', background: 'transparent' },
  x: { ticks: width < 400 ? 4 : 6, labelAnchor: 'center' },
  y: { ticks: 5, labelAnchor: 'center', grid: true },
});
const seriesColor = (names: string[]) => ({ domain: names, range: [green, blue, '#78548c'] });
const seriesKey = (names: string[]) =>
  names.map((label, i) => ({ label, color: [green, blue, '#78548c'][i] }));
const panel = (title: string, options: Plot.PlotOptions) => ({ title, options });
const requestAxes = (width: number): Plot.PlotOptions => ({
  ...base(width),
  x: { domain: [0, 11], label: 'Hours', ticks: 5, labelAnchor: 'center' },
  y: { domain: [0, 11], label: 'Completed tasks', ticks: 5, grid: true, labelAnchor: 'center' },
});
const barChart = <T extends { name: string }>(
  width: number,
  rows: T[],
  value: (d: T) => number,
  max: number,
  label: string,
): Plot.PlotOptions => ({
  ...base(width, Math.max(210, rows.length * 38 + 80)),
  marginLeft: 76,
  marginRight: 48,
  x: { domain: [0, max], label, grid: true, ticks: 4, labelAnchor: 'center' },
  y: { domain: rows.map((d) => d.name), label: null, tickSize: 0 },
  marks: [
    Plot.barX(rows, { x: value, y: 'name', fill: green }),
    Plot.ruleX([0]),
    Plot.text(rows, {
      x: value,
      y: 'name',
      text: (d) => String(Math.round(value(d))),
      dx: 5,
      textAnchor: 'start',
    }),
  ],
});
export function expansionView(
  id: ExpansionId,
  mode: string,
  width: number,
  state: ExpansionState,
): LessonView {
  const fallback = expansionManifest.find((d) => d.id === id)!.fallback;
  const view = (
    panels: LessonView['panels'],
    summary: string = fallback,
    key?: LessonView['key'],
  ): LessonView => ({ panels, summary, key });
  switch (id) {
    case 'normalize-by-exposure':
      return view([
        panel(
          mode === 'rates' ? 'Population rates' : 'Incident counts',
          barChart(
            width,
            D.districts,
            (d) => (mode === 'rates' ? (d.incidents / d.population) * 100_000 : d.incidents),
            mode === 'rates' ? 450 : 280,
            mode === 'rates' ? 'Incidents per 100,000 people' : 'Incidents',
          ),
        ),
      ]);
    case 'index-to-a-common-start': {
      const rows = D.growth.flatMap((d) =>
        d.values.map((v, i) => ({
          name: d.name,
          quarter: i + 1,
          value: mode === 'indexed' ? (v / d.values[0]) * 100 : v,
        })),
      );
      return view(
        [
          panel(
            mode === 'indexed' ? 'Relative growth from the first quarter' : 'Original user counts',
            {
              ...base(width),
              color: seriesColor(['Atlas', 'Birch']),
              x: { domain: [1, 4], ticks: [1, 2, 3, 4], label: 'Quarter', labelAnchor: 'center' },
              y: {
                domain: mode === 'indexed' ? [0, 220] : [0, 1500],
                label: mode === 'indexed' ? 'Index (first quarter = 100)' : 'Users',
                grid: true,
                ticks: 5,
                labelAnchor: 'center',
              },
              marks: [
                Plot.line(rows, { x: 'quarter', y: 'value', stroke: 'name' }),
                Plot.dot(rows, {
                  x: 'quarter',
                  y: 'value',
                  stroke: 'name',
                  symbol: 'name',
                  tip: true,
                }),
              ],
            },
          ),
        ],
        fallback,
        seriesKey(['Atlas', 'Birch']),
      );
    }
    case 'resolve-overplotting': {
      const marks =
        mode === 'bins'
          ? [
              Plot.dot(
                D.repeatedPoints,
                Plot.hexbin({ fill: 'count' }, { x: 'x', y: 'y', binWidth: 24, tip: true }),
              ),
            ]
          : [
              Plot.dot(D.repeatedPoints, {
                x: (d) => d.x + (mode === 'jitter' ? d.jx : 0),
                y: (d) => d.y + (mode === 'jitter' ? d.jy : 0),
                r: 5,
                fill: green,
                fillOpacity: mode === 'alpha' ? 0.12 : 0.8,
              }),
            ];
      return view([
        panel(
          mode === 'bins'
            ? 'Hexagonal counts · darker means more cases'
            : 'Repeated observations at recorded or offset positions',
          {
            ...base(width),
            x: { domain: [0, 6], label: 'Recorded x', ticks: 6, labelAnchor: 'center' },
            y: { domain: [1, 9], label: 'Recorded y', ticks: 5, grid: true, labelAnchor: 'center' },
            color: { domain: [0, 25], range: ['#edf6f1', green] },
            marks,
          },
        ),
      ]);
    }
    case 'condition-on-groups':
      return view(
        [
          panel(
            mode === 'groups' ? 'Positive within both contexts' : 'Negative pooled association',
            {
              ...base(width),
              x: { domain: [0, 10], label: 'Hours', labelAnchor: 'center', ticks: 5 },
              y: { domain: [0, 12], label: 'Score', labelAnchor: 'center', grid: true, ticks: 4 },
              color: seriesColor(['A', 'B']),
              marks: [
                Plot.linearRegressionY(D.contexts, {
                  x: 'hours',
                  y: 'score',
                  stroke: mode === 'groups' ? 'group' : green,
                  ci: 0,
                }),
                Plot.dot(D.contexts, {
                  x: 'hours',
                  y: 'score',
                  fill: mode === 'groups' ? 'group' : green,
                  r: 5,
                  tip: true,
                }),
              ],
            },
          ),
        ],
        fallback,
        mode === 'groups' ? seriesKey(['A', 'B']) : undefined,
      );
    case 'show-the-smooth-with-the-raw': {
      const window = Number(state.window);
      return view(
        [
          panel(
            `${window}-day centered moving average${mode === 'raw' ? ' with observations' : ''}`,
            {
              ...base(width),
              x: { domain: [1, 15], label: 'Day', labelAnchor: 'center', ticks: 5 },
              y: { domain: [0, 40], label: 'Units', grid: true, labelAnchor: 'center' },
              marks: [
                ...(mode === 'raw'
                  ? [
                      Plot.dot(D.dailyReadings, {
                        x: 'day',
                        y: 'value',
                        fill: ink,
                        r: 3.5,
                        tip: true,
                      }),
                    ]
                  : []),
                Plot.line(D.movingAverage(window), {
                  x: 'day',
                  y: 'value',
                  stroke: green,
                  strokeWidth: 2.5,
                }),
              ],
            },
          ),
        ],
        `${window}-day centered average; only full windows are drawn. ${mode === 'raw' ? 'Raw readings include a drop to 3 units on day 7.' : 'The average hides the size of the day-seven drop.'}`,
        [
          { label: 'Moving average', color: green },
          ...(mode === 'raw' ? [{ label: 'Observed reading', color: ink, symbol: '●' }] : []),
        ],
      );
    }
    case 'decompose-the-change': {
      const rows = mode === 'steps' ? D.contributions : D.contributions.filter((d) => d.total);
      return view([
        panel('Reconciled workload · cases', {
          ...base(width, 300),
          marginLeft: 80,
          marginRight: 42,
          x: { domain: [0, 165], label: 'Cases', grid: true, ticks: 4, labelAnchor: 'center' },
          y: { domain: rows.map((d) => d.name), label: null, tickSize: 0 },
          marks: [
            Plot.rectX(rows, {
              x1: (d) => Math.min(d.from, d.to),
              x2: (d) => Math.max(d.from, d.to),
              y: 'name',
              insetTop: 5,
              insetBottom: 5,
              fill: (d) => (d.total ? ink : d.change < 0 ? orange : green),
            }),
            Plot.text(rows, {
              x: (d) => Math.max(d.from, d.to),
              y: 'name',
              text: (d) => `${d.total ? '' : d.change > 0 ? '+' : '−'}${Math.abs(d.change)}`,
              dx: 5,
              textAnchor: 'start',
            }),
            Plot.ruleX([0]),
          ],
        }),
      ]);
    }
    case 'reveal-multiplicative-differences':
      return view([
        panel(
          mode === 'log' ? 'Equal spacing for equal ratios' : 'Equal spacing for equal differences',
          {
            ...base(width, 230),
            marginLeft: 64,
            marginRight: 36,
            x: {
              type: mode === 'log' ? 'log' : 'linear',
              domain: mode === 'log' ? [0.7, 1500] : [0, 1150],
              ticks: mode === 'log' ? [1, 10, 100, 1000] : 4,
              label: `Units · ${mode === 'log' ? 'logarithmic' : 'linear'} scale`,
              grid: true,
              labelAnchor: 'center',
            },
            y: { domain: D.magnitudes.map((d) => d.name), label: null, tickSize: 0 },
            marks: [
              Plot.dot(D.magnitudes, { x: 'value', y: 'name', fill: green, r: 5, tip: true }),
            ],
          },
        ),
      ]);
    case 'show-the-cumulative-distribution': {
      const threshold = Number(state.threshold),
        count = D.waits.filter((v) => v <= threshold).length;
      const bins = Array.from({ length: 5 }, (_, i) => ({
        lo: i * 4,
        hi: i * 4 + 4,
        count: D.waits.filter((v) => v >= i * 4 && v < i * 4 + 4).length,
      }));
      return view(
        [
          panel(
            mode === 'cumulative'
              ? 'Share at or below each waiting time'
              : 'Four-minute bins · left edge included',
            {
              ...base(width),
              x: {
                domain: [0, 20],
                label: 'Waiting time (minutes)',
                ticks: 5,
                labelAnchor: 'center',
              },
              y:
                mode === 'cumulative'
                  ? {
                      domain: [0, 1],
                      label: 'Share at or below',
                      tickFormat: '%',
                      ticks: 4,
                      grid: true,
                      labelAnchor: 'center',
                    }
                  : {
                      domain: [0, 7],
                      label: 'Cases in bin',
                      ticks: 4,
                      grid: true,
                      labelAnchor: 'center',
                    },
              marks: [
                mode === 'cumulative'
                  ? Plot.line(D.cumulativeWaits(), {
                      x: 'minutes',
                      y: 'share',
                      curve: 'step-after',
                      stroke: green,
                      strokeWidth: 2,
                    })
                  : Plot.rectY(bins, {
                      x1: 'lo',
                      x2: 'hi',
                      y: 'count',
                      fill: green,
                      insetLeft: 1,
                      insetRight: 1,
                    }),
                Plot.ruleX([threshold], { stroke: orange, strokeDasharray: '4,3' }),
                Plot.ruleY([0]),
              ],
            },
          ),
        ],
        `${count} of ${D.waits.length} waits (${((count / D.waits.length) * 100).toFixed(1)}%) are at most ${threshold} minutes. The threshold includes equal values.`,
      );
    }
    case 'align-around-an-event':
      return view(
        [
          panel(
            mode === 'event'
              ? 'Launch aligned at day zero'
              : 'Different launch dates on a calendar',
            {
              ...base(width),
              color: seriesColor(['Atlas', 'Birch']),
              x: {
                domain: mode === 'event' ? [-2.5, 3.5] : [1, 14],
                label: mode === 'event' ? 'Days since launch' : 'Calendar day',
                ticks: 5,
                labelAnchor: 'center',
              },
              y: { domain: [0, 20], label: 'Units', grid: true, labelAnchor: 'center' },
              marks: [
                Plot.ruleX(mode === 'event' ? [0] : [4, 10], {
                  stroke: gray,
                  strokeDasharray: '4,3',
                }),
                Plot.line(D.launches, {
                  x: mode === 'event' ? 'since' : 'day',
                  y: 'value',
                  stroke: 'name',
                }),
                Plot.dot(D.launches, {
                  x: mode === 'event' ? 'since' : 'day',
                  y: 'value',
                  stroke: 'name',
                  symbol: 'name',
                  tip: true,
                }),
              ],
            },
          ),
        ],
        fallback,
        seriesKey(['Atlas', 'Birch']),
      );
    case 'compare-cohorts-at-equal-age':
      return view(
        [
          panel(mode === 'age' ? 'Retention at equivalent ages' : 'Retention by calendar month', {
            ...base(width),
            color: seriesColor(['January', 'March']),
            x: {
              domain: mode === 'age' ? [-0.2, 3.2] : [0.8, 6.2],
              label: mode === 'age' ? 'Months since signup' : 'Calendar month',
              ticks: mode === 'age' ? [0, 1, 2, 3] : [1, 2, 3, 4, 5, 6],
              labelAnchor: 'center',
            },
            y: {
              domain: [0, 110],
              label: 'Retained of 100 initial users',
              ticks: [0, 25, 50, 75, 100],
              grid: true,
              labelAnchor: 'center',
            },
            marks: [
              Plot.line(D.cohorts, {
                x: mode === 'age' ? 'age' : 'month',
                y: 'retained',
                stroke: 'name',
              }),
              Plot.dot(D.cohorts, {
                x: mode === 'age' ? 'age' : 'month',
                y: 'retained',
                stroke: 'name',
                symbol: 'name',
                tip: true,
              }),
            ],
          }),
        ],
        fallback,
        seriesKey(['January', 'March']),
      );
    case 'align-repeating-cycles':
      return view(
        [
          panel(mode === 'cycles' ? 'Each week aligned by weekday' : 'All three weeks in order', {
            ...base(width),
            color: seriesColor(['Week 1', 'Week 2', 'Week 3']),
            x:
              mode === 'cycles'
                ? {
                    domain: [-0.2, 6.2],
                    ticks: [0, 1, 2, 3, 4, 5, 6],
                    tickFormat: (d) => D.weekdays[Number(d)],
                    label: 'Weekday',
                    labelAnchor: 'center',
                  }
                : { domain: [1, 21], label: 'Day', ticks: 5, labelAnchor: 'center' },
            y: { domain: [0, 40], label: 'Requests', grid: true, labelAnchor: 'center' },
            marks: [
              Plot.line(D.weeks, {
                x: mode === 'cycles' ? 'weekday' : 'day',
                y: 'value',
                stroke: mode === 'cycles' ? 'week' : green,
              }),
              Plot.dot(D.weeks, {
                x: mode === 'cycles' ? 'weekday' : 'day',
                y: 'value',
                stroke: mode === 'cycles' ? 'week' : green,
                r: 2.5,
                tip: true,
              }),
            ],
          }),
        ],
        fallback,
        mode === 'cycles' ? seriesKey(['Week 1', 'Week 2', 'Week 3']) : undefined,
      );
    case 'show-duration-explicitly':
      return view(
        [
          panel(
            mode === 'intervals'
              ? 'Start and finish positions preserve duration'
              : 'Start times omit length and overlap',
            {
              ...base(width, 240),
              marginLeft: 70,
              x: {
                domain: [0, 10],
                label: 'Hours since opening',
                grid: true,
                ticks: 5,
                labelAnchor: 'center',
              },
              y: { domain: D.tasks.map((d) => d.name), label: null, tickSize: 0 },
              marks: [
                ...(mode === 'intervals'
                  ? [
                      Plot.barX(D.tasks, {
                        x1: 'start',
                        x2: 'end',
                        y: 'name',
                        fill: green,
                        fillOpacity: 0.3,
                        insetTop: 5,
                        insetBottom: 5,
                      }),
                      Plot.dot(D.tasks, {
                        x: 'end',
                        y: 'name',
                        fill: green,
                        symbol: 'square',
                        r: 4,
                      }),
                    ]
                  : []),
                Plot.dot(D.tasks, { x: 'start', y: 'name', fill: green, r: 4, tip: true }),
              ],
            },
          ),
        ],
        fallback,
        mode === 'intervals'
          ? [
              { label: 'Start', color: green, symbol: '●' },
              { label: 'Finish', color: green, symbol: '■' },
            ]
          : undefined,
      );
    case 'preserve-meaningful-geography': {
      const color: Plot.ScaleOptions = { domain: [0, 100], range: ['#edf6f1', green] };
      return view(
        [
          panel(
            mode === 'map'
              ? 'Fictional island · west coast at left · north at top'
              : 'Districts ranked by rate per 1,000',
            mode === 'map'
              ? {
                  ...base(width, 330),
                  margin: 12,
                  projection: {
                    type: 'identity',
                    domain: {
                      type: 'GeometryCollection',
                      geometries: D.island.map((d) => d.geometry),
                    },
                  },
                  color,
                  marks: [
                    Plot.geo(D.island, {
                      geometry: 'geometry',
                      fill: 'rate',
                      stroke: '#fff',
                      strokeWidth: 2,
                    }),
                    Plot.text(D.island, {
                      x: (d) => d.x + 0.5,
                      y: (d) => d.y + 0.5,
                      text: (d) => `${d.name}\n${d.rate}`,
                      fill: ink,
                      stroke: '#fff',
                      strokeWidth: 3,
                    }),
                  ],
                }
              : {
                  ...barChart(
                    width,
                    [...D.island].sort((a, b) => b.rate - a.rate),
                    (d) => d.rate,
                    100,
                    'Rate per 1,000',
                  ),
                  color,
                  marks: [
                    Plot.barX(D.island, { x: 'rate', y: 'name', fill: 'rate' }),
                    Plot.text(D.island, {
                      x: 'rate',
                      y: 'name',
                      text: 'rate',
                      dx: 5,
                      textAnchor: 'start',
                    }),
                  ],
                },
          ),
        ],
        fallback,
        [{ label: 'Rate per 1,000 · light = 0, dark = 100', color: green, symbol: '■' }],
      );
    }
    case 'show-intersections-explicitly': {
      if (mode === 'totals')
        return view([
          panel(
            'Overlapping category membership totals',
            barChart(
              width,
              ['A', 'B', 'C'].map((name) => ({
                name,
                n: D.intersections
                  .filter((d) => d.members.includes(name))
                  .reduce((s, d) => s + d.count, 0),
              })),
              (d) => d.n,
              15,
              'Memberships (people can appear more than once)',
            ),
          ),
        ]);
      const cells = D.intersections.flatMap((d) =>
        ['A', 'B', 'C'].map((set) => ({ name: d.name, set, included: d.members.includes(set) })),
      );
      const x = {
        domain: D.intersections.map((d) => d.name),
        label: null,
        padding: 0.4,
        tickSize: 0,
      };
      return view([
        panel('Exact intersection counts · each person counted once', {
          ...base(width, 220),
          marginBottom: 26,
          x,
          y: { domain: [0, 6], label: 'People', grid: true, labelAnchor: 'center', ticks: 3 },
          marks: [
            Plot.barY(D.intersections, { x: 'name', y: 'count', fill: green }),
            Plot.text(D.intersections, { x: 'name', y: 'count', text: 'count', dy: -9 }),
          ],
        }),
        panel('Filled dots identify the included categories', {
          ...base(width, 160),
          marginTop: 12,
          marginBottom: 30,
          x,
          y: { domain: ['A', 'B', 'C'], label: null, tickSize: 0 },
          marks: [
            Plot.dot(cells, {
              x: 'name',
              y: 'set',
              fill: (d) => (d.included ? green : '#e4e8e3'),
              r: 5,
            }),
            Plot.line(
              cells.filter((d) => d.included),
              { x: 'name', y: 'set', z: 'name', stroke: green },
            ),
          ],
        }),
      ]);
    }
    case 'expose-parent-child-structure':
      return view([
        panel('Catalogue hierarchy · line lengths have no quantitative meaning', {
          ...base(width, mode === 'expanded' ? 290 : 210),
          marginLeft: 78,
          marginRight: 65,
          marginTop: 20,
          marginBottom: 20,
          axis: null,
          x: { axis: null },
          y: { axis: null, grid: false },
          marks: [
            Plot.tree(
              mode === 'expanded' ? D.catalogue : ['Catalogue/Research', 'Catalogue/Delivery'],
              { stroke: green, fill: green, textStroke: '#fff', r: 4 },
            ),
          ],
        }),
      ]);
    case 'compare-state-transitions': {
      const states = ['New', 'Active', 'Paused'];
      const cells = states.flatMap((from) =>
        states.map((to) => ({
          from,
          to,
          n: D.transitions.filter((d) => d.from === from && d.to === to).length,
        })),
      );
      const chosen =
        mode === 'all' ? D.transitions : D.transitions.filter((d) => d.from.toLowerCase() === mode);
      return view(
        [
          panel('Rows: first status · columns: second status', {
            ...base(width, 290),
            marginLeft: 64,
            x: { domain: states, label: 'Second status', labelAnchor: 'center', tickSize: 0 },
            y: { domain: states, label: 'First status', labelAnchor: 'center', tickSize: 0 },
            color: { domain: [0, 4], range: ['#edf6f1', green] },
            marks: [
              Plot.cell(cells, {
                x: 'to',
                y: 'from',
                fill: 'n',
                inset: 3,
                fillOpacity: (d) => (mode === 'all' || d.from.toLowerCase() === mode ? 1 : 0.2),
              }),
              Plot.text(cells, {
                x: 'to',
                y: 'from',
                text: 'n',
                fill: (d) =>
                  d.n >= 3 && (mode === 'all' || d.from.toLowerCase() === mode) ? '#fff' : ink,
              }),
            ],
          }),
        ],
        `${chosen.length} of 12 members in focus: ${chosen.filter((d) => d.to === 'Active').length} end Active and ${chosen.filter((d) => d.to === 'Paused').length} end Paused. Counts in the full matrix remain visible. Darker cells mean more members (fixed scale 0–4).`,
      );
    }
    case 'overview-plus-detail': {
      const start = Number(state.start),
        end = start + 5;
      const detail = panel(`Detail · months ${start}–${end}`, {
        ...base(width),
        x: { domain: [start - 0.2, end + 0.2], label: 'Month', labelAnchor: 'center', ticks: 5 },
        y: { domain: [0, 70], label: 'Units', grid: true, labelAnchor: 'center' },
        marks: [
          Plot.line(
            D.months.filter((d) => d.month >= start && d.month <= end),
            { x: 'month', y: 'value', stroke: green },
          ),
          Plot.dot(
            D.months.filter((d) => d.month >= start && d.month <= end),
            { x: 'month', y: 'value', fill: green, tip: true },
          ),
        ],
      });
      return view(
        [
          ...(mode === 'context'
            ? [
                panel('Overview · shaded area locates the detail', {
                  ...base(width, 170),
                  x: { domain: [1, 24], label: 'Month', ticks: 5, labelAnchor: 'center' },
                  y: {
                    domain: [0, 70],
                    label: 'Units',
                    ticks: 3,
                    grid: true,
                    labelAnchor: 'center',
                  },
                  marks: [
                    Plot.rect([{ start, end }], {
                      x1: 'start',
                      x2: 'end',
                      y1: 0,
                      y2: 70,
                      fill: green,
                      fillOpacity: 0.12,
                    }),
                    Plot.line(D.months, { x: 'month', y: 'value', stroke: gray }),
                  ],
                }),
              ]
            : []),
          detail,
        ],
        `Detail covers months ${start}–${end}, six of 24 recorded months. ${start <= 19 && end >= 19 ? 'The 65-unit month-19 spike is inside this window.' : 'The 65-unit month-19 spike lies outside this window.'} Both views use a 0–70 value scale.`,
      );
    }
    case 'filter-to-focus': {
      const rows = D.filteredRequests(mode, Number(state.minimum));
      return view(
        [
          panel('Filtered requests · fixed axes', {
            ...requestAxes(width),
            color: seriesColor(['East', 'West']),
            marks: [
              Plot.dot(rows, {
                x: 'hours',
                y: 'completed',
                stroke: 'region',
                symbol: 'region',
                r: 5,
                tip: true,
              }),
              ...(rows.length
                ? []
                : [Plot.text(['No matching requests'], { x: 5.5, y: 5.5, fill: ink })]),
            ],
          }),
        ],
        `${rows.length} of 12 requests shown · ${mode === 'all' ? 'all regions' : mode === 'east' ? 'East' : 'West'} · at least ${state.minimum} hours. ${rows.length === 0 ? 'No observations match these filters; this is not a missing-data state.' : 'The original table and axis domains remain unchanged.'}`,
        seriesKey(['East', 'West']),
      );
    }
    case 'details-on-demand': {
      const chosen = D.requests.find((d) => d.id === Number(state.case)) ?? D.requests[0];
      return {
        ...view(
          [
            panel('Hover or tap for values · use the case selector for persistent details', {
              ...requestAxes(width),
              marks: [
                Plot.dot(D.requests, {
                  x: 'hours',
                  y: 'completed',
                  fill: gray,
                  r: 4,
                  tip: true,
                  title: (d) =>
                    `${d.name} · ${d.region}\n${d.hours} hours · ${d.completed} tasks\n${d.note}`,
                }),
                ...(mode === 'details'
                  ? [
                      Plot.dot([chosen], {
                        x: 'hours',
                        y: 'completed',
                        stroke: green,
                        strokeWidth: 2.5,
                        r: 8,
                        fill: 'none',
                      }),
                    ]
                  : []),
              ],
            }),
          ],
          mode === 'details'
            ? `${chosen.name} selected; all 12 observations remain in view.`
            : 'All 12 observations in overview. Hover or tap a point, or choose Show details and use the case selector.',
        ),
        account:
          mode === 'details'
            ? `${chosen.name} · ${chosen.region}. ${chosen.hours} hours; ${chosen.completed} completed tasks. ${chosen.note}. This fictional record describes activity, not task difficulty or quality.`
            : undefined,
      };
    }
    case 'brushing-and-linking': {
      const low = Math.min(Number(state.low), Number(state.high)),
        high = Math.max(Number(state.low), Number(state.high));
      const selected = mode === 'selected' ? D.selectedRequests(low, high) : D.requests;
      const ids = new Set(selected.map((d) => d.id));
      const bins = [0, 2, 4, 6, 8, 10].slice(0, -1).map((lo) => ({
        lo,
        hi: lo + 2,
        total: D.requests.filter((d) => d.completed >= lo && d.completed < lo + 2).length,
        selected: selected.filter((d) => d.completed >= lo && d.completed < lo + 2).length,
      }));
      return view(
        [
          panel('Drag horizontally to select hours · controls provide the same selection', {
            ...requestAxes(width),
            marks: [
              ...(mode === 'selected'
                ? [
                    Plot.rect([{ low, high }], {
                      x1: 'low',
                      x2: 'high',
                      y1: 0,
                      y2: 11,
                      fill: green,
                      fillOpacity: 0.1,
                    }),
                  ]
                : []),
              Plot.dot(D.requests, {
                x: 'hours',
                y: 'completed',
                r: 5,
                fill: (d) => (ids.has(d.id) ? green : gray),
              }),
            ],
          }),
          panel('Task distribution · selected cases within all cases', {
            ...base(width, 230),
            x: {
              domain: [0, 10],
              label: 'Completed tasks · left edge included',
              ticks: 5,
              labelAnchor: 'center',
            },
            y: {
              domain: [0, 6],
              label: 'Requests in bin',
              ticks: 3,
              grid: true,
              labelAnchor: 'center',
            },
            marks: [
              Plot.rectY(bins, {
                x1: 'lo',
                x2: 'hi',
                y: 'total',
                fill: gray,
                insetLeft: 1,
                insetRight: 1,
              }),
              Plot.rectY(bins, {
                x1: 'lo',
                x2: 'hi',
                y: 'selected',
                fill: green,
                insetLeft: 1,
                insetRight: 1,
              }),
            ],
          }),
        ],
        `${selected.length} of 12 requests selected${mode === 'selected' ? ` with ${low}–${high} hours (inclusive)` : ''}. ${selected.map((d) => d.name).join(', ') || 'No matching cases'}. Green shows those same identities in both views; gray preserves the full context.`,
        [
          { label: 'Selected cases', color: green, symbol: '●' },
          { label: 'All other cases', color: gray, symbol: '●' },
        ],
      );
    }
  }
}
