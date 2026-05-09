// testing the journal system
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../frontend/src/contexts/AuthContext';
import { SubscriptionContext } from '../../frontend/src/contexts/SubscriptionContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JournalPage from '../../frontend/src/JournalPage';
import axios from 'axios';
describe('JournalPage', () => {
  const mockSubscriptionContext = {
    incrementJournal: vi.fn(() => true),
    usage: { isPremium: true },
    setShowSubscriptionModal: vi.fn(),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: [] });
  });
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
  const render = (ui, { authValue = mockAuthValue, subscriptionValue = mockSubscriptionValue } = {}) =>
    rtlRender(
      <AuthContext.Provider value={authValue}>
        <SubscriptionContext.Provider value={subscriptionValue}>
          <MemoryRouter>{ui}</MemoryRouter>
        </SubscriptionContext.Provider>
      </AuthContext.Provider>
    );
  const renderJournal = (ui) => render(ui, { 
    authValue: { ...mockAuthValue, loading: false },
    subscriptionValue: { ...mockSubscriptionValue, isPremium: true, usage: { journal: 0, artwork: 0 }, loading: false }
  });
// check if it says empty when there are no entries
  it('renders "No previous entries" when empty', async () => {
    axios.get.mockResolvedValue({ data: [] });
    renderJournal(<JournalPage />);
    await waitFor(() => {
      expect(screen.getByText(/No previous entries/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
// try creating a new journal entry
  it('creates a new entry when clicking the button', async () => {
    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({ data: { id: 123, title: 'Untitled', content: '', modified: new Date().toISOString() } });
    renderJournal(<JournalPage />);
    const createBtn = await screen.findByText('+ New Entry', {}, { timeout: 3000 });
    fireEvent.click(createBtn);
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
  it('filters entries when typing in search', async () => {
    const mockEntries = [
      { id: 1, title: 'Morning Reflections', content: '...', modified: new Date().toISOString() },
      { id: 2, title: 'Night Thoughts', content: '...', modified: new Date().toISOString() }
    ];
    axios.get.mockResolvedValueOnce({ data: mockEntries });
    renderJournal(<JournalPage />);
    await waitFor(() => {
      expect(screen.getByText('Morning Reflections')).toBeDefined();
    });
    const searchInput = screen.getByPlaceholderText(/Search entries/i);
    fireEvent.change(searchInput, { target: { value: 'Night' } });
    expect(screen.queryByText('Morning Reflections')).toBeNull();
    expect(screen.getByText('Night Thoughts')).toBeDefined();
  });
});
