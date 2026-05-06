// checking the chatbot interface
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../frontend/src/contexts/AuthContext';
import { SubscriptionContext } from '../../frontend/src/contexts/SubscriptionContext';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Chatbot from '../../frontend/src/Chatbot';
const mockAuthValue = {
  user: { id: 1, name: 'Test User', email: 'test@example.com', isAdmin: false },
  loading: false, login: vi.fn(), logout: vi.fn(), updateProfile: vi.fn(), isPreview: false
};
const mockSubscriptionValue = {
  isPremium: false, loading: false, usage: { journal: 0, artwork: 0, chatbot: 0, isPremium: false },
  activatePremium: vi.fn(), refreshSubscription: vi.fn(), incrementJournal: vi.fn(() => true),
  incrementArtwork: vi.fn(() => true), incrementLibrary: vi.fn(() => true),
  incrementChatbot: vi.fn(() => true), startMoodTracking: vi.fn(() => true),
  getRemainingUsage: vi.fn(() => 10), setShowSubscriptionModal: vi.fn(),
};
const render = (ui) =>
  rtlRender(
    <AuthContext.Provider value={mockAuthValue}>
      <SubscriptionContext.Provider value={mockSubscriptionValue}>
        <MemoryRouter>{ui}</MemoryRouter>
      </SubscriptionContext.Provider>
    </AuthContext.Provider>
  );
describe('Chatbot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'mock-token');
    const mockFetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/history')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes('/new')) {
        return Promise.resolve({ ok: true, json: async () => ({ chatId: '123' }) });
      }
      return Promise.resolve({ 
        ok: true, 
        json: async () => ({ 
          choices: [{ message: { content: 'Hello! I am here to help.' } }] 
        }) 
      });
    });
    vi.stubGlobal('fetch', mockFetch);
  });
// making sure the UI shows up
  it('renders chatbot interface', async () => {
    render(<Chatbot />);
    expect(screen.getByPlaceholderText(/Share what's on your mind/i)).toBeDefined();
    expect(screen.getByText(/How's your day going\?/i)).toBeDefined();
  });
// sending a message and checking the reply
  it('sends a message and displays it', async () => {
    render(<Chatbot />);
    const input = screen.getByPlaceholderText(/Share what's on your mind/i);
    fireEvent.change(input, { target: { value: 'I feel stressed' } });
    const sendBtn = screen.getByRole('button', { name: '' }); 
    fireEvent.click(sendBtn);
    await waitFor(() => {
      expect(screen.getByText('I feel stressed')).toBeDefined();
    });
    await waitFor(() => {
      expect(screen.getByText(/Hello! I am here to help/i)).toBeDefined();
    }, { timeout: 3000 });
  });
});
