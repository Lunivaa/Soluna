// testing the creative canvas / sketchpad
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../frontend/src/contexts/AuthContext';
import { SubscriptionContext } from '../../frontend/src/contexts/SubscriptionContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreativeCanvas from '../../frontend/src/CreativeCanvas';
import axios from 'axios';
vi.mock('react-canvas-draw', () => ({
  default: () => <div data-testid="canvas-mock">Canvas Draw Mock</div>
}));
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
describe('CreativeCanvas Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: [] });
  });
// check if it starts with the selection screen
  it('renders the selection screen by default', async () => {
    render(<CreativeCanvas />);
    expect(screen.getByText(/Creative Canvas/i)).toBeInTheDocument();
    expect(screen.getByText(/Color Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Sketchpad/i)).toBeInTheDocument();
  });
  it('enters sketchpad mode when "Start Drawing" is clicked', async () => {
    render(<CreativeCanvas />);
    const startDrawingBtn = screen.getByText(/Start Drawing/i);
    fireEvent.click(startDrawingBtn);
    await waitFor(() => {
      expect(screen.getByText(/Sketchpad/i)).toBeInTheDocument();
      expect(screen.getByTestId('canvas-mock')).toBeInTheDocument();
    });
  });
// testing the sketchpad mode tools
  it('shows drawing tools in sketchpad mode', async () => {
    render(<CreativeCanvas />);
    fireEvent.click(screen.getByText(/Start Drawing/i));
    await screen.findByTestId('canvas-mock');
    await waitFor(() => {
      expect(screen.getByText(/Clear/i)).toBeInTheDocument();
      expect(screen.getByText(/Save/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
