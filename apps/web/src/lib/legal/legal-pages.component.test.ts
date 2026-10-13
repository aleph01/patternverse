// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Impressum from '../../routes/impressum/+page.svelte';
import Privacy from '../../routes/privacy/+page.svelte';
import Safety from '../../routes/legal/+page.svelte';
import LegalLinks from './LegalLinks.svelte';
import { operator } from './operator';

afterEach(cleanup);

describe('public legal notices', () => {
  it('provides direct links to all three legal pages', () => {
    render(LegalLinks);
    const navigation = within(screen.getByRole('navigation', { name: 'Legal information' }));
    expect(navigation.getByRole('link', { name: 'legal notice' }).getAttribute('href')).toBe(
      '/impressum',
    );
    expect(navigation.getByRole('link', { name: 'privacy' }).getAttribute('href')).toBe('/privacy');
    expect(navigation.getByRole('link', { name: 'safety & use' }).getAttribute('href')).toBe(
      '/legal',
    );
  });

  it('identifies the operator and provides an email contact', () => {
    render(Impressum);
    expect(screen.getByRole('heading', { name: 'Legal notice', level: 1 })).toBeTruthy();
    expect(screen.getByText(operator.street, { exact: false })).toBeTruthy();
    expect(screen.getByText(operator.city, { exact: false })).toBeTruthy();
    expect(screen.getByRole('link', { name: operator.email }).getAttribute('href')).toBe(
      `mailto:${operator.email}`,
    );
    expect(screen.getByRole('main').getAttribute('lang')).toBe('en');
    expect(screen.getByRole('heading', { name: 'Website operator' })).toBeTruthy();
    expect(screen.getByText('Last updated: 2 October 2026')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'privacy' }).getAttribute('href')).toBe('/privacy');
  });

  it('explains external AI processing and local deletion without claiming total privacy', () => {
    render(Privacy);
    expect(screen.getByRole('main').getAttribute('lang')).toBe('en');
    expect(screen.getByRole('heading', { name: 'Privacy notice', level: 1 })).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: '4. AI on the web: data leaves your device' }),
    ).toBeTruthy();
    expect(screen.getByText(/not a guarantee of complete anonymity/)).toBeTruthy();
    expect(screen.getByText(/no automatic time-based deletion/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /State Commissioner/ })).toBeTruthy();
  });

  it('offers crisis contacts and preserves statutory rights rather than a blanket waiver', () => {
    render(Safety);
    expect(screen.getByRole('link', { name: '112' }).getAttribute('href')).toBe('tel:112');
    expect(screen.getByRole('link', { name: '116 123' }).getAttribute('href')).toBe('tel:116123');
    expect(screen.getByRole('main').getAttribute('lang')).toBe('en');
    expect(screen.getByText(/not a person, doctor, or psychotherapist/)).toBeTruthy();
    expect(screen.getByText(/Statutory liability rules apply/)).toBeTruthy();
    expect(screen.getByText(/no human supervision/)).toBeTruthy();
  });
});
