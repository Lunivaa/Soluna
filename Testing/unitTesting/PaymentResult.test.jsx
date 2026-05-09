// testing the payment result page
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import PaymentResult from '../../frontend/src/PaymentResult';

describe('PaymentResult Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    window.opener = { postMessage: vi.fn() };
    window.close = vi.fn();
  });

  // check if it shows success message
  test('displays activation message on success', async () => {
    render(
      <MemoryRouter initialEntries={['/payment/success?data=eyJ0cmFuc2FjdGlvbl91dWlkIjogIm1vbnRobHlfMTIzIn0=']}>
        <PaymentResult />
      </MemoryRouter>
    );
    expect(screen.getByText(/Activating Subscription/i)).toBeInTheDocument();
    expect(screen.getByText(/Your payment was successful/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  // check if it handles failure
  test('handles payment failure', async () => {
    render(
      <MemoryRouter initialEntries={['/payment/failure']}>
        <PaymentResult />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(window.opener.postMessage).toHaveBeenCalledWith(
        { type: 'ESEWA_FAILURE' },
        expect.any(String)
      );
      expect(window.close).toHaveBeenCalled();
    });
  });
});
