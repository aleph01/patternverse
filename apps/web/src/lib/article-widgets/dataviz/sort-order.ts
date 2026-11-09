import { barX, plot, ruleX, text } from '@observablehq/plot';
import { orderCounts, type SortOrder, type TicketCount } from './sort-order-data';

const chart = document.querySelector<HTMLElement>('#chart')!;
const readout = document.querySelector<HTMLElement>('#readout')!;
const table = document.querySelector<HTMLTableSectionElement>('#counts tbody')!;
let order: SortOrder = 'alphabetical';
let lastWidth = 0;

function render() {
  const rows = orderCounts(order);
  const width = Math.floor(chart.clientWidth);
  if (!width) return;
  lastWidth = width;
  const description =
    order === 'descending'
      ? 'Highest first: Billing leads with 124 tickets, followed by Subscription with 97. Feedback has the fewest, with 28.'
      : 'Alphabetical order makes categories easy to find by name. Switch to Highest first to compare their rank.';
  const graphic = plot({
    width,
    height: 340,
    marginLeft: 94,
    marginRight: 26,
    marginTop: 8,
    marginBottom: 42,
    style: { fontFamily: 'inherit', fontSize: '12px', background: 'transparent' },
    ariaLabel: 'Support tickets by category',
    ariaDescription: description + ' Fictional counts; the scale stays at zero to 140 tickets.',
    x: {
      domain: [0, 140],
      nice: false,
      grid: true,
      ticks: [0, 40, 80, 120],
      label: 'Tickets',
      labelAnchor: 'center',
    },
    y: { domain: rows.map((row) => row.category), label: null, tickSize: 0, padding: 0.25 },
    marks: [
      barX(rows, {
        x: 'tickets',
        y: 'category',
        fill: '#007a4d',
        ariaLabel: (row: TicketCount) => `${row.category}: ${row.tickets} tickets`,
      }),
      ruleX([0], { stroke: '#777c74', strokeWidth: 1 }),
      text(rows, {
        x: 'tickets',
        y: 'category',
        text: (row: TicketCount) => String(row.tickets),
        textAnchor: 'start',
        dx: 6,
        fill: '#252822',
        ariaHidden: 'true',
      }),
    ],
  });
  graphic.dataset.order = order;
  chart.replaceChildren(graphic);
  readout.textContent = description;
  table.replaceChildren(
    ...rows.map((row) => {
      const tr = document.createElement('tr');
      const category = document.createElement('th');
      category.scope = 'row';
      category.textContent = row.category;
      const count = document.createElement('td');
      count.textContent = String(row.tickets);
      tr.append(category, count);
      return tr;
    }),
  );
}

document.querySelectorAll<HTMLInputElement>('input[name="order"]').forEach((input) => {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    order = input.value === 'descending' ? 'descending' : 'alphabetical';
    render();
  });
});

new ResizeObserver(() => {
  if (Math.floor(chart.clientWidth) !== lastWidth) render();
}).observe(chart);
render();
