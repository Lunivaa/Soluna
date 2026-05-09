// testing the mood tracking feature
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../frontend/src/contexts/AuthContext';
import { SubscriptionContext } from '../../frontend/src/contexts/SubscriptionContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MoodTracker from '../../frontend/src/MoodTracker';
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
describe('MoodTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'mock-token');
    const mockFetch = vi.fn().mockImplementation((url) => {
      return Promise.resolve({ 
        ok: true, 
        json: async () => ({ history: {}, todayLogged: false }) 
      });
    });
    vi.stubGlobal('fetch', mockFetch);
  });
// checking if the mood page renders okay
  it('renders correctly', async () => {
    render(<MoodTracker />);
    expect(screen.getByText(/How are you feeling today\?/i)).toBeDefined();
  });
// logging a mood and checking if fetch was called
  it('shows log button and handles click', async () => {
    render(<MoodTracker />);
    await waitFor(() => {
      expect(screen.getByText(/Log Mood/i)).toBeDefined();
    });
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '8' } });
    const logBtn = screen.getByText(/Log Mood/i);
    fireEvent.click(logBtn);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
