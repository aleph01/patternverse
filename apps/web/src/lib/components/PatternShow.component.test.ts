// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import PatternShow from './PatternShow.svelte';
import ShowContent from './ShowContent.svelte';
import type { ShowView } from '$lib/pattern-run/show-view';

afterEach(cleanup);
const view: ShowView = {
  spec: {
    source: 'initiatives',
    map: ['effort', 'impact'],
    group: 'category',
    order: null,
    link: 'affects',
    split: 'scenario',
  },
  axes: [
    { attribute: 'effort', kind: 'numeric', min: 1, max: 5, low: '1', high: '5', levels: [] },
    { attribute: 'impact', kind: 'numeric', min: 2, max: 5, low: '2', high: '5', levels: [] },
  ],
  panels: [
    {
      label: 'Expected',
      representation: 'cartesian',
      cyclic: true,
      items: [
        {
          id: 'a',
          label: 'Alpha',
          fields: { effort: '1', impact: '5', affects: 'b' },
          coordinates: [1, 5],
          group: 'Product',
        },
        {
          id: 'b',
          label: 'Beta',
          fields: { effort: '5', impact: '2', affects: 'a' },
          coordinates: [5, 2],
          group: 'Service',
        },
      ],
      edges: [
        { from: 'a', to: 'b', cyclic: true },
        { from: 'b', to: 'a', cyclic: true },
      ],
    },
  ],
  warnings: [],
};

describe('PatternShow shared renderer', () => {
  it('keeps coincident items visible together instead of hiding the earlier point', () => {
    const { container } = render(PatternShow, {
      view: {
        ...view,
        panels: [
          {
            ...view.panels[0],
            items: view.panels[0].items.map((item) => ({ ...item, coordinates: [1, 5] })),
          },
        ],
      },
    });
    expect(container.querySelectorAll('circle')).toHaveLength(1);
    expect(container.querySelector('text.item-number')?.textContent).toBe('1,2');
  });
  it('labels dimensions, contexts, groups and cyclic relationships without hover or colour alone', () => {
    const { container } = render(PatternShow, { view });
    expect(screen.getByRole('heading', { name: 'scenario: Expected' })).toBeTruthy();
    expect(screen.getByText('effort: 1–5 × impact: 2–5')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'category: Product' })).toBeTruthy();
    expect(screen.getByText('Alpha → Beta · cycle')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('aria-labelledby')).toBeTruthy();
    expect(container.querySelectorAll('path.cycle')).toHaveLength(2);
    expect(container.querySelectorAll('dl dd')).toHaveLength(6);
  });
  it('uses unique SVG and heading identifiers when repeated views are rendered', () => {
    render(PatternShow, { view });
    render(PatternShow, { view });
    const identifiers = [...document.querySelectorAll('[id]')].map((node) => node.id);
    expect(new Set(identifiers).size).toBe(identifiers.length);
    for (const graphic of screen.getAllByRole('img')) {
      for (const id of graphic.getAttribute('aria-labelledby')!.split(' '))
        expect(document.getElementById(id)).toBeTruthy();
    }
  });
  it('shows warnings and complete text fallbacks, treating authored strings as text', () => {
    render(PatternShow, {
      view: {
        ...view,
        axes: [],
        warnings: ['Unknown relationship target at bytes 10..20'],
        panels: [
          {
            ...view.panels[0],
            representation: 'collection',
            edges: [],
            items: [
              {
                ...view.panels[0].items[0],
                label: '<img src=x onerror=alert(1)>',
                coordinates: [],
              },
            ],
          },
        ],
      },
    });
    expect(screen.getByRole('status').textContent).toContain('bytes 10..20');
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });
  it('handles an empty collection and legacy or malformed show payloads', () => {
    render(PatternShow, {
      view: { ...view, panels: [{ ...view.panels[0], items: [], edges: [] }] },
    });
    expect(screen.getByText('No items yet.')).toBeTruthy();
    render(ShowContent, {
      effect: {
        run_id: 'run',
        effect_id: 'show',
        request: {
          kind: 'content.show',
          payload: { markdown: 'Original markdown remains readable', view: { bad: true } },
        },
      },
    });
    expect(screen.getByText('Original markdown remains readable')).toBeTruthy();
  });
});
