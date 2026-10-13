// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import LibraryRatingFilter from './LibraryRatingFilter.svelte';

afterEach(cleanup);
describe('compact rating control', () => {
  it('shows choices on demand, updates its label and returns focus after selecting', async () => {
    render(LibraryRatingFilter, { available: true });
    const trigger = screen.getByRole('button', { name: 'Your rating: Any rating' });
    expect(screen.queryByRole('group', { name: 'Your rating' })).toBeNull();
    await fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Any rating' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Useful or better' }));
    expect(trigger.textContent).toContain('Useful +');
    expect(document.activeElement).toBe(trigger);
    expect(screen.queryByRole('group', { name: 'Your rating' })).toBeNull();
    await fireEvent.click(trigger);
    await fireEvent.click(screen.getByRole('button', { name: 'Very useful only' }));
    expect(trigger.textContent).toContain('Very useful');
    await fireEvent.click(trigger);
    await fireEvent.click(screen.getByRole('button', { name: 'Any rating' }));
    expect(trigger.textContent).toContain('Your rating');
  });
  it('dismisses with Escape and outside clicks without altering selection', async () => {
    render(LibraryRatingFilter, { available: true, value: 'useful' });
    const trigger = screen.getByRole('button', { name: /^Your rating:/ });
    await fireEvent.click(trigger);
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(trigger);
    await fireEvent.pointerDown(document.body);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent).toContain('Useful +');
  });
  it('disables unavailable ratings but permits clearing an existing filter', async () => {
    const view = render(LibraryRatingFilter);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
    await view.rerender({ value: 'very', available: false });
    await fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'Useful or better' }).hasAttribute('disabled')).toBe(
      true,
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Any rating' }));
    expect(screen.getByRole('button').textContent).toContain('Your rating');
  });
});
