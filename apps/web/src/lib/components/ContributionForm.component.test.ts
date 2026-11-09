// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ContributionForm from './ContributionForm.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function fillMessage() {
  await fireEvent.input(screen.getByLabelText('Your email'), {
    target: { value: 'expert@example.com' },
  });
  await fireEvent.input(screen.getByLabelText('What would you like to contribute?'), {
    target: { value: 'My idea' },
  });
}

describe('contribution form', () => {
  it('keeps sending disabled when the delivery service is not ready', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ available: false }));
    vi.stubGlobal('fetch', fetch);
    render(ContributionForm);
    await screen.findByText(/form is temporarily unavailable/);
    expect(
      (screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('sends the form to the backend and confirms an accepted message', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ available: true }))
      .mockResolvedValueOnce(Response.json({ sent: true }));
    vi.stubGlobal('fetch', fetch);
    render(ContributionForm);
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
    await fillMessage();
    await fireEvent.submit(screen.getByRole('form', { name: 'Contribution idea' }));
    await screen.findByText(/Your message has been sent/);
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/contribute',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: '',
          email: 'expert@example.com',
          message: 'My idea',
          website: '',
        }),
      }),
    );
  });

  it('preserves the draft and reports delivery failures without a success message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ available: true }))
        .mockResolvedValueOnce(
          Response.json({ error: 'Please try again later.' }, { status: 503 }),
        ),
    );
    render(ContributionForm);
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
    await fillMessage();
    await fireEvent.submit(screen.getByRole('form', { name: 'Contribution idea' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Please try again later.');
    expect(
      (screen.getByLabelText('What would you like to contribute?') as HTMLTextAreaElement).value,
    ).toBe('My idea');
    expect(screen.queryByText(/Your message has been sent/)).toBeNull();
  });
});
